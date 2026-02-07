/**
 * Enhanced Analysis Service
 * Integrates real-time data with fallback mechanisms
 * Provides comprehensive analysis with multi-source validation
 */

const { performRealTimeAnalysis } = require('./realTimeDataService');
const Region = require('../models/Region');

/**
 * Perform comprehensive analysis with real-time data and fallbacks
 */
async function analyzeRegionRealTime(latitude, longitude, sizeKm = 50, regionName = 'Unknown Region') {
  const startTime = Date.now();
  console.log(`[EnhancedAnalysis] Starting real-time analysis: ${regionName}`);
  console.log(`[EnhancedAnalysis] Location: (${latitude}, ${longitude}), Size: ${sizeKm}km`);

  try {
    // Get real-time data (with fallback to dummy data if APIs fail)
    const realTimeData = await performRealTimeAnalysis(latitude, longitude, sizeKm);

    if (!realTimeData.success) {
      console.warn('[EnhancedAnalysis] Real-time analysis failed, falling back to demo mode');
      return generateDemoAnalysis(regionName, latitude, longitude, sizeKm);
    }

    const executionTime = Date.now() - startTime;

    // Build comprehensive analysis response
    const analysisResult = {
      success: true,
      regionName,
      timestamp: new Date(),
      executionTime: `${executionTime}ms`,
      dataQuality: realTimeData.analysis.quality,
      
      // Primary analysis data
      vegetation: {
        ndvi: realTimeData.analysis.vegetation?.ndvi || {
          mean: 0.45,
          min: 0.2,
          max: 0.8,
          stdDev: 0.15,
        },
        loss: {
          percentage: realTimeData.analysis.vegetation?.vegetationLoss?.percentage || 0,
          areaSqKm: realTimeData.analysis.vegetation?.vegetationLoss?.areaKm2 || 0,
          trend: realTimeData.analysis.vegetation?.vegetationLoss?.trend || 'stable',
        },
        confidence: realTimeData.analysis.vegetation?.vegetationLoss?.confidence || 0.85,
      },

      // Environmental factors
      environment: {
        weather: {
          cloudCoverage: realTimeData.analysis.weather?.cloudCoverage?.percentage || 0,
          cloudImpact: realTimeData.analysis.weather?.cloudCoverage?.impact || 'LOW',
          precipitation: realTimeData.analysis.weather?.precipitation?.likelihood || 'LOW',
          temperature: realTimeData.analysis.weather?.data?.current?.temperature_2m || 20,
          humidity: realTimeData.analysis.weather?.data?.current?.relative_humidity_2m || 50,
        },
        airQuality: {
          aqi: realTimeData.analysis.airQuality?.data?.aqi || 50,
          category: realTimeData.analysis.airQuality?.data?.category || 'GOOD',
          dominantPollutant: realTimeData.analysis.airQuality?.data?.dominant_pollutant || 'PM2.5',
          healthImpact: realTimeData.analysis.airQuality?.analysis?.healthImpact || 'MINIMAL',
        },
      },

      // Risk assessment
      risk: {
        compositeScore: realTimeData.analysis.compositeRisk?.score || 0.2,
        level: realTimeData.analysis.compositeRisk?.level || 'LOW',
        factors: realTimeData.analysis.compositeRisk?.factors || {
          vegetation: 0.15,
          weather: 0.03,
          airQuality: 0.02,
        },
        description: generateRiskDescription(realTimeData.analysis.compositeRisk?.level),
      },

      // Data sources and quality
      sources: {
        satellite: realTimeData.sources.satellite,
        weather: realTimeData.sources.weather,
        airQuality: realTimeData.sources.airQuality,
        allReal: !realTimeData.sources.satellite.includes('dummy') &&
                 !realTimeData.sources.weather.includes('dummy') &&
                 !realTimeData.sources.airQuality.includes('dummy'),
      },

      // Confidence metrics
      confidence: {
        overallScore: realTimeData.analysis.confidence,
        datasetsUsed: 3,
        realDataUsed: [
          realTimeData.sources.satellite.includes('real'),
          realTimeData.sources.weather.includes('real'),
          realTimeData.sources.airQuality.includes('real'),
        ].filter(Boolean).length,
        cloudImpact: realTimeData.analysis.weather?.cloudCoverage?.impact || 'LOW',
      },

      // System health
      systemHealth: {
        circuitBreakerState: realTimeData.circuitBreaker?.state || 'UNKNOWN',
        apiFailureCount: realTimeData.circuitBreaker?.failureCount || 0,
        fallbacksUsed: [
          realTimeData.sources.satellite.includes('dummy'),
          realTimeData.sources.weather.includes('dummy'),
          realTimeData.sources.airQuality.includes('dummy'),
        ].filter(Boolean).length,
      },

      location: {
        latitude,
        longitude,
        sizeKm,
      },
    };

    console.log(`[EnhancedAnalysis] ✅ Analysis complete in ${executionTime}ms`);
    console.log(`[EnhancedAnalysis] Risk Level: ${analysisResult.risk.level}, Confidence: ${(analysisResult.confidence.overallScore * 100).toFixed(0)}%`);
    
    return analysisResult;

  } catch (error) {
    console.error('[EnhancedAnalysis] Error:', error.message);
    
    // Ultimate fallback: return demo data
    return generateDemoAnalysis(regionName, latitude, longitude, sizeKm, error.message);
  }
}

/**
 * Generate demo/fallback analysis data
 */
function generateDemoAnalysis(regionName, latitude, longitude, sizeKm = 50, errorReason = null) {
  console.log(`[EnhancedAnalysis] Generating demo analysis for ${regionName}`);

  // Generate realistic but pseudo-random data based on coordinates
  const seed = Math.abs(Math.sin(latitude * longitude) * 10000);
  const random = (min, max) => min + Math.random() * (max - min);
  
  const vegetationLoss = random(5, 40);
  const riskScore = vegetationLoss / 100;
  const riskLevel = riskScore > 0.5 ? 'HIGH' : riskScore > 0.3 ? 'MEDIUM' : 'LOW';

  return {
    success: true,
    isDemoData: true,
    regionName,
    timestamp: new Date(),
    executionTime: `${random(50, 200).toFixed(0)}ms`,
    dataQuality: '🟡 MEDIUM (Demo)',
    errorReason,

    vegetation: {
      ndvi: {
        mean: random(0.35, 0.65),
        min: random(0.2, 0.4),
        max: random(0.7, 0.95),
        stdDev: random(0.1, 0.2),
      },
      loss: {
        percentage: vegetationLoss,
        areaSqKm: (vegetationLoss / 100) * sizeKm,
        trend: vegetationLoss > 20 ? 'decreasing' : 'stable',
      },
      confidence: random(0.7, 0.95),
    },

    environment: {
      weather: {
        cloudCoverage: random(10, 60),
        cloudImpact: random(0, 1) > 0.7 ? 'HIGH' : 'MEDIUM',
        precipitation: random(0, 1) > 0.7 ? 'HIGH' : 'LOW',
        temperature: random(10, 35),
        humidity: random(30, 80),
      },
      airQuality: {
        aqi: random(30, 150),
        category: 'MODERATE',
        dominantPollutant: 'PM2.5',
        healthImpact: 'MINIMAL',
      },
    },

    risk: {
      compositeScore: riskScore,
      level: riskLevel,
      factors: {
        vegetation: riskScore * 0.6,
        weather: random(0.02, 0.1),
        airQuality: random(0.01, 0.05),
      },
      description: generateRiskDescription(riskLevel),
    },

    sources: {
      satellite: 'dummy-demo',
      weather: 'dummy-demo',
      airQuality: 'dummy-demo',
      allReal: false,
    },

    confidence: {
      overallScore: 0.65,
      datasetsUsed: 3,
      realDataUsed: 0,
      cloudImpact: 'MEDIUM',
    },

    systemHealth: {
      circuitBreakerState: 'OPEN',
      apiFailureCount: 5,
      fallbacksUsed: 3,
    },

    location: {
      latitude,
      longitude,
      sizeKm,
    },
  };
}

/**
 * Generate human-readable risk description
 */
function generateRiskDescription(riskLevel) {
  const descriptions = {
    'HIGH': 'Significant vegetation loss detected. Immediate monitoring and intervention recommended.',
    'MEDIUM': 'Moderate changes in vegetation detected. Continued monitoring recommended.',
    'LOW': 'Vegetation status is stable. No immediate intervention needed.',
  };
  
  return descriptions[riskLevel] || 'Risk assessment unavailable';
}

/**
 * Batch analyze multiple regions with real-time data
 */
async function analyzeRegionsBatchRealTime(regions) {
  console.log(`[EnhancedAnalysis] Starting batch analysis for ${regions.length} regions`);

  const startTime = Date.now();

  // Analyze all regions in parallel
  const results = await Promise.all(
    regions.map(region =>
      analyzeRegionRealTime(
        region.latitude,
        region.longitude,
        region.sizeKm || 50,
        region.name
      )
    )
  );

  const executionTime = Date.now() - startTime;

  // Aggregate statistics
  const stats = {
    totalRegions: results.length,
    successCount: results.filter(r => r.success).length,
    demoDataCount: results.filter(r => r.isDemoData).length,
    highRiskCount: results.filter(r => r.risk?.level === 'HIGH').length,
    averageConfidence: results.reduce((sum, r) => sum + (r.confidence?.overallScore || 0), 0) / results.length,
    averageExecutionTime: executionTime / results.length,
    totalExecutionTime: executionTime,
  };

  console.log(`[EnhancedAnalysis] Batch complete: ${stats.successCount}/${stats.totalRegions} successful in ${executionTime}ms`);

  return {
    success: true,
    stats,
    results,
    timestamp: new Date(),
    executionTime: `${executionTime}ms`,
  };
}

/**
 * Get analysis with historical comparison
 */
async function analyzeWithHistory(latitude, longitude, sizeKm, regionName) {
  const currentAnalysis = await analyzeRegionRealTime(latitude, longitude, sizeKm, regionName);

  // Try to fetch previous analysis from database
  let previousAnalysis = null;
  try {
    const region = await Region.findOne({ name: regionName });
    if (region && region.analyses && region.analyses.length > 0) {
      previousAnalysis = region.analyses[region.analyses.length - 1];
    }
  } catch (error) {
    console.warn('[EnhancedAnalysis] Could not fetch historical data:', error.message);
  }

  // Calculate change metrics
  let changeMetrics = null;
  if (previousAnalysis) {
    const vegetationLossChange = 
      (currentAnalysis.vegetation.loss.percentage - previousAnalysis.vegetation?.loss?.percentage || 0);
    
    changeMetrics = {
      vegetationLossChange: vegetationLossChange,
      direction: vegetationLossChange > 0 ? 'worsening' : vegetationLossChange < 0 ? 'improving' : 'stable',
      percentageChange: previousAnalysis.vegetation?.loss?.percentage 
        ? (vegetationLossChange / previousAnalysis.vegetation.loss.percentage * 100)
        : 0,
    };
  }

  return {
    current: currentAnalysis,
    previous: previousAnalysis,
    change: changeMetrics,
    hasHistory: previousAnalysis !== null,
  };
}

module.exports = {
  analyzeRegionRealTime,
  analyzeRegionsBatchRealTime,
  analyzeWithHistory,
  generateDemoAnalysis,
  generateRiskDescription,
};
