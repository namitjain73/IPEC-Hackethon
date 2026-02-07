/**
 * Real-Time Data Service
 * Handles real-time data fetching with intelligent fallback to dummy data
 * Supports multiple APIs with circuit breaker pattern
 */

const axios = require('axios');
const { getSentinelHubAuthHeader } = require('./sentinelHubAuth');

// Configuration
const CONFIG = {
  ENABLE_REAL_API: process.env.ENABLE_REAL_SATELLITE_API === 'true',
  ENABLE_DUMMY_DATA: process.env.ENABLE_DUMMY_DATA !== 'false', // Fallback enabled by default
  SENTINEL_HUB_REGION: process.env.SENTINEL_HUB_REGION || 'eu',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  CIRCUIT_BREAKER_THRESHOLD: 5, // Fail count before circuit opens
  CIRCUIT_BREAKER_RESET_TIME: 60000, // 1 minute
};

// Circuit Breaker Status
const circuitBreaker = {
  state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
  failureCount: 0,
  lastFailureTime: null,
  successCount: 0,
};

// ============================================
// CIRCUIT BREAKER PATTERN
// ============================================
function checkCircuitBreaker() {
  if (circuitBreaker.state === 'OPEN') {
    const timeSinceFailure = Date.now() - circuitBreaker.lastFailureTime;
    if (timeSinceFailure > CONFIG.CIRCUIT_BREAKER_RESET_TIME) {
      console.log('[CircuitBreaker] ⚡ Attempting recovery (HALF_OPEN)');
      circuitBreaker.state = 'HALF_OPEN';
      circuitBreaker.successCount = 0;
    } else {
      console.log('[CircuitBreaker] 🔴 Circuit is OPEN - using fallback data');
      return false;
    }
  }
  return true;
}

function recordSuccess() {
  if (circuitBreaker.state === 'HALF_OPEN') {
    circuitBreaker.successCount++;
    if (circuitBreaker.successCount >= 2) {
      console.log('[CircuitBreaker] ✅ Recovery successful - CLOSED');
      circuitBreaker.state = 'CLOSED';
      circuitBreaker.failureCount = 0;
    }
  } else {
    circuitBreaker.failureCount = Math.max(0, circuitBreaker.failureCount - 1);
  }
}

function recordFailure() {
  circuitBreaker.failureCount++;
  circuitBreaker.lastFailureTime = Date.now();
  
  if (circuitBreaker.failureCount >= CONFIG.CIRCUIT_BREAKER_THRESHOLD) {
    console.log('[CircuitBreaker] 🔴 Circuit OPEN - too many failures');
    circuitBreaker.state = 'OPEN';
  }
}

// ============================================
// RETRY LOGIC WITH EXPONENTIAL BACKOFF
// ============================================
async function retryWithBackoff(fn, context = 'API Call', attempts = CONFIG.RETRY_ATTEMPTS) {
  for (let i = 0; i < attempts; i++) {
    try {
      const result = await fn();
      recordSuccess();
      return result;
    } catch (error) {
      const isLastAttempt = i === attempts - 1;
      const delayMs = CONFIG.RETRY_DELAY * Math.pow(2, i);
      
      console.warn(`[Retry] Attempt ${i + 1}/${attempts} failed: ${error.message}`);
      
      if (!isLastAttempt) {
        console.log(`[Retry] Retrying ${context} in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  recordFailure();
  throw new Error(`${context} failed after ${attempts} attempts`);
}

// ============================================
// MULTI-SOURCE REAL-TIME DATA FETCH
// ============================================

/**
 * Fetch real-time satellite data from Sentinel Hub with fallback to dummy data
 */
async function fetchRealTimeSatelliteData(latitude, longitude, sizeKm) {
  console.log(`[RealTimeData] Fetching satellite data for (${latitude}, ${longitude}), size: ${sizeKm}km`);

  // If real API disabled, skip directly to fallback
  if (!CONFIG.ENABLE_REAL_API) {
    console.log('[RealTimeData] Real API disabled - using fallback data');
    return generateDummySatelliteData(latitude, longitude, sizeKm, 'disabled');
  }

  // Check circuit breaker
  if (!checkCircuitBreaker()) {
    return generateDummySatelliteData(latitude, longitude, sizeKm, 'circuit-open');
  }

  try {
    // Try real API
    const data = await retryWithBackoff(
      async () => {
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

        const authHeader = await getSentinelHubAuthHeader();
        const response = await axios.get(
          'https://services.sentinel-hub.com/api/v1/catalog/search',
          {
            params: {
              bbox: `${longitude - 0.1},${latitude - 0.1},${longitude + 0.1},${latitude + 0.1}`,
              datetime: `${startDate.toISOString().split('T')[0]}/${endDate.toISOString().split('T')[0]}`,
              collections: ['sentinel-2-l2a'],
              limit: 5,
            },
            headers: {
              ...authHeader,
              'Content-Type': 'application/json',
            },
            timeout: CONFIG.TIMEOUT,
          }
        );

        console.log('[RealTimeData] ✅ Successfully fetched from Sentinel Hub');
        return {
          success: true,
          source: 'sentinel-hub-real-api',
          data: response.data,
          timestamp: new Date(),
        };
      },
      'Sentinel Hub API'
    );

    return {
      ...data,
      latitude,
      longitude,
      sizeKm,
      quality: 'HIGH',
      dataPoints: data.data?.features?.length || 0,
    };
  } catch (error) {
    console.warn(`[RealTimeData] Real API failed: ${error.message}`);
    
    // Fallback to dummy data
    if (CONFIG.ENABLE_DUMMY_DATA) {
      console.log('[RealTimeData] Falling back to dummy satellite data');
      return generateDummySatelliteData(latitude, longitude, sizeKm, 'fallback-from-api-error');
    }

    throw error;
  }
}

/**
 * Fetch real-time weather data (for cloud coverage, precipitation, etc.)
 */
async function fetchRealTimeWeatherData(latitude, longitude) {
  console.log(`[RealTimeData] Fetching weather data for (${latitude}, ${longitude})`);

  try {
    const data = await retryWithBackoff(
      async () => {
        // Using Open-Meteo API (free, no API key needed)
        const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
          params: {
            latitude,
            longitude,
            current: 'temperature_2m,relative_humidity_2m,cloud_cover,precipitation',
            timezone: 'auto',
          },
          timeout: CONFIG.TIMEOUT,
        });

        console.log('[RealTimeData] ✅ Successfully fetched weather data');
        return {
          success: true,
          source: 'open-meteo-real-api',
          data: response.data,
          timestamp: new Date(),
        };
      },
      'Weather API'
    );

    return {
      ...data,
      quality: 'MEDIUM',
    };
  } catch (error) {
    console.warn(`[RealTimeData] Weather API failed: ${error.message}`);
    
    // Fallback to dummy data
    if (CONFIG.ENABLE_DUMMY_DATA) {
      return generateDummyWeatherData(latitude, longitude);
    }
    
    throw error;
  }
}

/**
 * Fetch real-time air quality data
 */
async function fetchRealTimeAirQualityData(latitude, longitude) {
  console.log(`[RealTimeData] Fetching air quality data for (${latitude}, ${longitude})`);

  try {
    const data = await retryWithBackoff(
      async () => {
        // Using IQAir API (free tier available)
        const response = await axios.get('https://api.waqi.info/feed/geo:' + latitude + ';' + longitude + '/', {
          params: {
            token: process.env.WAQI_API_KEY || 'demo',
          },
          timeout: CONFIG.TIMEOUT,
        });

        if (response.data.status === 'ok') {
          console.log('[RealTimeData] ✅ Successfully fetched air quality data');
          return {
            success: true,
            source: 'waqi-real-api',
            data: response.data.data,
            timestamp: new Date(),
          };
        }
        throw new Error('API returned error status');
      },
      'Air Quality API'
    );

    return {
      ...data,
      quality: 'MEDIUM',
    };
  } catch (error) {
    console.warn(`[RealTimeData] Air Quality API failed: ${error.message}`);
    
    // Fallback to dummy data
    if (CONFIG.ENABLE_DUMMY_DATA) {
      return generateDummyAirQualityData(latitude, longitude);
    }
    
    throw error;
  }
}

/**
 * Fetch real-time environmental data from multiple sources
 */
async function fetchAllRealTimeData(latitude, longitude, sizeKm = 50) {
  console.log('[RealTimeData] 🌍 Starting multi-source real-time data fetch...');
  
  const startTime = Date.now();

  // Fetch all data sources in parallel
  const [satelliteResult, weatherResult, airQualityResult] = await Promise.allSettled([
    fetchRealTimeSatelliteData(latitude, longitude, sizeKm),
    fetchRealTimeWeatherData(latitude, longitude),
    fetchRealTimeAirQualityData(latitude, longitude),
  ]);

  const results = {
    satellite: satelliteResult.status === 'fulfilled' ? satelliteResult.value : { success: false, error: satelliteResult.reason?.message, source: 'fallback' },
    weather: weatherResult.status === 'fulfilled' ? weatherResult.value : { success: false, error: weatherResult.reason?.message, source: 'fallback' },
    airQuality: airQualityResult.status === 'fulfilled' ? airQualityResult.value : { success: false, error: airQualityResult.reason?.message, source: 'fallback' },
    timestamp: new Date(),
    executionTime: Date.now() - startTime,
    location: { latitude, longitude, sizeKm },
  };

  console.log(`[RealTimeData] ✅ Multi-source data fetch complete (${results.executionTime}ms)`);
  console.log(`[RealTimeData] Satellite: ${results.satellite.source}, Weather: ${results.weather.source}, AirQuality: ${results.airQuality.source}`);

  return results;
}

// ============================================
// DUMMY/FALLBACK DATA GENERATORS
// ============================================

/**
 * Generate realistic dummy satellite data with variation based on location
 */
function generateDummySatelliteData(latitude, longitude, sizeKm = 50, reason = 'manual') {
  const seed = Math.abs(Math.sin(latitude * longitude) * 10000);
  const random = (min = 0, max = 1) => {
    const value = Math.sin(seed + Date.now() * 0.001) * 0.5 + 0.5;
    return min + value * (max - min);
  };

  const ndviMean = 0.35 + random(-0.15, 0.15); // Vegetation index
  const ndviStdDev = random(0.1, 0.25);
  const vegetationLoss = random(5, 35); // Percentage loss

  return {
    success: true,
    source: `dummy-${reason}`,
    quality: 'LOW',
    data: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            platform: 'Sentinel-2 (Mock)',
            date: new Date().toISOString(),
            cloudCover: random(10, 50),
          },
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [longitude - 0.05, latitude - 0.05],
              [longitude + 0.05, latitude - 0.05],
              [longitude + 0.05, latitude + 0.05],
              [longitude - 0.05, latitude + 0.05],
              [longitude - 0.05, latitude - 0.05],
            ]],
          },
        },
      ],
    },
    analysis: {
      ndvi: {
        mean: ndviMean,
        stdDev: ndviStdDev,
        min: Math.max(-1, ndviMean - ndviStdDev * 2),
        max: Math.min(1, ndviMean + ndviStdDev * 2),
        validPixels: Math.floor(random(50000, 65000)),
        totalPixels: 65536,
      },
      vegetationLoss: {
        percentage: vegetationLoss,
        areaKm2: (vegetationLoss / 100) * sizeKm,
        trend: vegetationLoss > 20 ? 'decreasing' : vegetationLoss > 10 ? 'stable' : 'improving',
        confidence: random(0.75, 0.95),
      },
      bands: {
        NIR: Array(256 * 256).fill(null).map(() => Math.random() * 255),
        RED: Array(256 * 256).fill(null).map(() => Math.random() * 255),
        width: 256,
        height: 256,
      },
    },
    timestamp: new Date(),
    latitude,
    longitude,
    sizeKm,
  };
}

/**
 * Generate realistic dummy weather data
 */
function generateDummyWeatherData(latitude, longitude) {
  const cloudCover = Math.floor(Math.random() * 100);
  const temperature = 15 + Math.random() * 25; // 15-40°C
  const humidity = 30 + Math.random() * 60; // 30-90%

  return {
    success: true,
    source: 'dummy-weather',
    quality: 'LOW',
    data: {
      current: {
        temperature_2m: temperature,
        relative_humidity_2m: humidity,
        cloud_cover: cloudCover,
        precipitation: Math.random() * 10, // 0-10mm
        weather_code: Math.floor(Math.random() * 100),
      },
      timezone: 'UTC',
    },
    analysis: {
      cloudCoverage: {
        percentage: cloudCover,
        impact: cloudCover > 50 ? 'HIGH' : cloudCover > 25 ? 'MEDIUM' : 'LOW',
        suitableForAnalysis: cloudCover < 60,
      },
      precipitation: {
        likelihood: Math.random() > 0.7 ? 'HIGH' : 'LOW',
        mayAffectAnalysis: Math.random() > 0.8,
      },
    },
    timestamp: new Date(),
    latitude,
    longitude,
  };
}

/**
 * Generate realistic dummy air quality data
 */
function generateDummyAirQualityData(latitude, longitude) {
  const aqi = Math.floor(Math.random() * 300);
  
  let aqiCategory = 'GOOD';
  if (aqi > 200) aqiCategory = 'HAZARDOUS';
  else if (aqi > 150) aqiCategory = 'UNHEALTHY';
  else if (aqi > 100) aqiCategory = 'UNHEALTHY_FOR_SENSITIVE';
  else if (aqi > 50) aqiCategory = 'MODERATE';

  return {
    success: true,
    source: 'dummy-air-quality',
    quality: 'LOW',
    data: {
      aqi: aqi,
      category: aqiCategory,
      dominant_pollutant: ['PM2.5', 'PM10', 'O3', 'NO2', 'SO2'][Math.floor(Math.random() * 5)],
      pollutants: {
        pm25: random(5, 150),
        pm10: random(10, 200),
        o3: random(20, 100),
        no2: random(10, 150),
        so2: random(5, 100),
      },
    },
    analysis: {
      overallQuality: aqiCategory,
      healthImpact: aqi > 150 ? 'SEVERE' : aqi > 100 ? 'MODERATE' : 'MINIMAL',
      affectsAnalysis: aqi > 200,
    },
    timestamp: new Date(),
    latitude,
    longitude,
  };
}

function random(min, max) {
  return Math.random() * (max - min) + min;
}

// ============================================
// COMPOSITE DATA SERVICE
// ============================================

/**
 * Complete real-time analysis combining satellite, weather, and air quality
 */
async function performRealTimeAnalysis(latitude, longitude, sizeKm = 50) {
  console.log(`[RealTimeAnalysis] Starting comprehensive real-time analysis...`);

  try {
    // Fetch all real-time data
    const allData = await fetchAllRealTimeData(latitude, longitude, sizeKm);

    // Enrich with analysis
    const satelliteAnalysis = allData.satellite.analysis || {};
    const weatherAnalysis = allData.weather.analysis || {};
    const airQualityAnalysis = allData.airQuality.analysis || {};

    // Calculate composite risk score
    const vegetationRisk = (satelliteAnalysis.vegetationLoss?.percentage || 15) / 100;
    const weatherRisk = weatherAnalysis.cloudCoverage?.impact === 'HIGH' ? 0.3 : 
                        weatherAnalysis.cloudCoverage?.impact === 'MEDIUM' ? 0.15 : 0;
    const airQualityRisk = (airQualityAnalysis.healthImpact === 'SEVERE' ? 0.3 : 
                            airQualityAnalysis.healthImpact === 'MODERATE' ? 0.15 : 0);

    const compositeRisk = (vegetationRisk * 0.6 + weatherRisk * 0.2 + airQualityRisk * 0.2);
    const riskLevel = compositeRisk > 0.5 ? 'HIGH' : compositeRisk > 0.3 ? 'MEDIUM' : 'LOW';
    const confidence = (
      (allData.satellite.success ? 0.4 : 0.2) +
      (allData.weather.success ? 0.3 : 0.15) +
      (allData.airQuality.success ? 0.3 : 0.15)
    );

    return {
      success: true,
      timestamp: new Date(),
      location: { latitude, longitude, sizeKm },
      sources: {
        satellite: allData.satellite.source,
        weather: allData.weather.source,
        airQuality: allData.airQuality.source,
      },
      analysis: {
        vegetation: satelliteAnalysis.vegetationLoss,
        weather: weatherAnalysis,
        airQuality: airQualityAnalysis,
        compositeRisk: {
          score: compositeRisk,
          level: riskLevel,
          factors: {
            vegetation: vegetationRisk,
            weather: weatherRisk,
            airQuality: airQualityRisk,
          },
        },
        confidence: confidence,
        quality: `${
          allData.satellite.quality === 'HIGH' ? '🟢' : 
          allData.satellite.quality === 'MEDIUM' ? '🟡' : '🔴'
        } ${allData.satellite.quality}`,
      },
      executionTime: allData.executionTime,
      circuitBreaker: {
        state: circuitBreaker.state,
        failureCount: circuitBreaker.failureCount,
      },
    };
  } catch (error) {
    console.error('[RealTimeAnalysis] Error:', error.message);
    return {
      success: false,
      error: error.message,
      timestamp: new Date(),
      fallbackAvailable: CONFIG.ENABLE_DUMMY_DATA,
    };
  }
}

module.exports = {
  // Main functions
  fetchAllRealTimeData,
  performRealTimeAnalysis,
  fetchRealTimeSatelliteData,
  fetchRealTimeWeatherData,
  fetchRealTimeAirQualityData,

  // Fallback generators
  generateDummySatelliteData,
  generateDummyWeatherData,
  generateDummyAirQualityData,

  // Circuit breaker
  getCircuitBreakerStatus: () => circuitBreaker,
  resetCircuitBreaker: () => {
    circuitBreaker.state = 'CLOSED';
    circuitBreaker.failureCount = 0;
    circuitBreaker.lastFailureTime = null;
    circuitBreaker.successCount = 0;
  },

  // Configuration
  getConfig: () => CONFIG,
  setConfig: (newConfig) => Object.assign(CONFIG, newConfig),
};
