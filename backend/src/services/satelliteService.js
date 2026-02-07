const axios = require('axios');
const { fetchLatestImagery: fetchAgromonitoring, generateMockData: generateAgroMockData } = require('./agromonitoringService');
const { getSentinelHubAuthHeader } = require('./sentinelHubAuth');

// ============================================
// Configuration - SENTINEL HUB PRIMARY
// AGROMONITORING FALLBACK
// ============================================
const ENABLE_REAL_SATELLITE_API = process.env.ENABLE_REAL_SATELLITE_API === 'true';
const SENTINEL_HUB_AUTH_TOKEN = process.env.SENTINEL_HUB_TOKEN;
const SENTINEL_HUB_REGION = process.env.SENTINEL_HUB_REGION || 'eu'; // 'eu' or 'us'

// API Endpoints
const APIs = {
  CATALOG: 'https://services.sentinel-hub.com/api/v1/catalog/1.0.0/search',
  PROCESS: 'https://services.sentinel-hub.com/api/v1/process',
  STATISTICS_EU: 'https://services.sentinel-hub.com/api/v1/statistics',
  STATISTICS_US: 'https://services-uswest2.sentinel-hub.com/api/v1/statistics',
};

// Get the appropriate Statistics endpoint based on region
const getStatisticsEndpoint = () => {
  return SENTINEL_HUB_REGION === 'us' ? APIs.STATISTICS_US : APIs.STATISTICS_EU;
};

const SENTINEL_HUB_TIMEOUT = 10000; // 10 seconds
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // 1 second between retries

// Debug log
console.log(`[SatelliteService] DEBUG - ENABLE_REAL_SATELLITE_API env value: "${process.env.ENABLE_REAL_SATELLITE_API}"`);
console.log(`[SatelliteService] DEBUG - Token loaded: ${SENTINEL_HUB_AUTH_TOKEN ? 'YES ✓' : 'NO ✗'}`);
console.log(`[SatelliteService] Initialized - Real API: ${ENABLE_REAL_SATELLITE_API ? 'ENABLED ✅' : 'DISABLED (using mock data)'}`);
console.log(`[SatelliteService] Region: ${SENTINEL_HUB_REGION.toUpperCase()} | Statistics Endpoint: ${getStatisticsEndpoint()}`);

// Retry with exponential backoff
async function retryWithBackoff(fn, attempts = RETRY_ATTEMPTS) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      console.warn(`[SatelliteService Retry] Attempt ${i + 1}/${attempts} failed:`, error.message);
      if (i < attempts - 1) {
        const delayMs = RETRY_DELAY * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  throw new Error('All retry attempts failed');
}

// ============================================
// API #1: CATALOG API - Search for satellite imagery
// ============================================
async function catalogSearch(latitude, longitude, sizeKm, startDate, endDate) {
  if (!ENABLE_REAL_SATELLITE_API) {
    console.log('[Catalog API] Real API disabled - will use mock data');
    return { success: false, source: 'disabled' };
  }

  try {
    const degreesPerKm = 0.009;
    const halfSizeDegrees = (sizeKm / 2) * degreesPerKm;

    const bbox = {
      north: latitude + halfSizeDegrees,
      south: latitude - halfSizeDegrees,
      east: longitude + halfSizeDegrees,
      west: longitude - halfSizeDegrees,
    };

    console.log('[Catalog API] Searching for satellite imagery...');
    console.log(`[Catalog API] Search parameters: Bbox=[${bbox.west.toFixed(4)}, ${bbox.south.toFixed(4)}, ${bbox.east.toFixed(4)}, ${bbox.north.toFixed(4)}]`);
    console.log(`[Catalog API] Date range: ${startDate} to ${endDate}`);
    console.log(`[Catalog API] Collection: sentinel-2-l2a`);

    const response = await retryWithBackoff(
      async () => {
        const authHeader = await getSentinelHubAuthHeader();
        return axios.post(APIs.CATALOG, {
          bbox: [bbox.west, bbox.south, bbox.east, bbox.north],
          datetime: `${startDate}T00:00:00Z/${endDate}T23:59:59Z`,
          collections: ['sentinel-2-l2a'],
          limit: 10,
        }, {
          timeout: SENTINEL_HUB_TIMEOUT,
          headers: authHeader,
        });
      },
      RETRY_ATTEMPTS
    );

    const featuresCount = response.data?.features?.length || 0;
    console.log(`[Catalog API] ✅ Successfully found imagery`);
    console.log(`[Catalog API] Features found: ${featuresCount}`);
    
    if (featuresCount > 0) {
      const firstFeature = response.data.features[0];
      console.log(`[Catalog API] First imagery: ${firstFeature.properties?.datetime || 'N/A'}`);
      console.log(`[Catalog API] Cloud coverage: ${firstFeature.properties?.['eo:cloud_cover'] || 'N/A'}%`);
      console.log(`[Catalog API] Platform: ${firstFeature.properties?.platform || 'N/A'}`);
    }

    return {
      success: true,
      data: response.data,
      bbox: bbox,
      source: 'catalog-api',
      featuresCount: featuresCount,
      timestamp: new Date(),
    };
  } catch (error) {
    console.warn('[Catalog API] ❌ Failed:', error.message);
    if (error.response) {
      console.error('[Catalog API] HTTP Status:', error.response.status);
      console.error('[Catalog API] Error Response:', error.response.data);
      
      if (error.response.status === 401) {
        console.error('[Catalog API] 🔐 AUTHENTICATION ERROR - Invalid or expired token');
      }
    }
    return {
      success: false,
      error: error.message,
      statusCode: error.response?.status,
      source: 'catalog-api',
      timestamp: new Date(),
    };
  }
}

// ============================================
// NOTE: Process & Statistical APIs removed
// ML models handle NDVI/NDBI calculation & analysis
// Satellite service now only fetches raw data
// ============================================

// ============================================
// Main function: Fetch raw satellite imagery
// Analysis delegated to ML models
// ============================================
async function fetchLatestImagery(latitude, longitude, sizeKm) {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

  const formattedStartDate = startDate.toISOString().split('T')[0];
  const formattedEndDate = endDate.toISOString().split('T')[0];

  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║         SATELLITE DATA FETCH INITIATED              ║');
  console.log('║  Primary: Sentinel Hub | Fallback: Agromonitoring  ║');
  console.log('╚════════════════════════════════════════════════════╝\n');
  
  console.log(`[SatelliteService] Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
  console.log(`[SatelliteService] Area size: ${sizeKm}km × ${sizeKm}km`);
  console.log(`[SatelliteService] Date range: ${formattedStartDate} to ${formattedEndDate}`);
  console.log(`[SatelliteService] Attempting Sentinel Hub first...\n`);

  const fetchStartTime = Date.now();

  // Try Sentinel Hub first
  const catalogResult = await catalogSearch(latitude, longitude, sizeKm, formattedStartDate, formattedEndDate);
  
  // If Sentinel Hub fails, try Agromonitoring
  if (!catalogResult.success) {
    console.log('⚠️  [SatelliteService] Sentinel Hub failed, trying Agromonitoring fallback...\n');
    const agroResult = await fetchAgromonitoring(latitude, longitude, sizeKm, 'Forest Region');
    
    if (agroResult.success) {
      const fetchDuration = ((Date.now() - fetchStartTime) / 1000).toFixed(2);
      console.log(`[SatelliteService] Total fetch time: ${fetchDuration}s\n`);
      
      return {
        success: true,
        data: agroResult.data,
        source: 'agromonitoring',
        apiStatus: 'FALLBACK - Using Agromonitoring API ✅',
        timestamp: new Date(),
        location: { latitude, longitude, sizeKm },
        dateRange: { startDate: formattedStartDate, endDate: formattedEndDate },
        fetchDuration: parseFloat(fetchDuration),
        analysisNote: 'Data fetched via Agromonitoring. NDVI/NDBI analysis performed by ML models.',
      };
    }
    
    // Both APIs failed, use mock data
    console.log('❌ [SatelliteService] All APIs failed, using mock data\n');
    const fetchDuration = ((Date.now() - fetchStartTime) / 1000).toFixed(2);
    return {
      success: false,
      fallbackData: generateMockSatelliteData(latitude, longitude),
      source: 'mock',
      apiStatus: 'FAILED - Using mock data for demo',
      timestamp: new Date(),
      location: { latitude, longitude, sizeKm },
      dateRange: { startDate: formattedStartDate, endDate: formattedEndDate },
      fetchDuration: parseFloat(fetchDuration),
    };
  }
  
  const fetchDuration = ((Date.now() - fetchStartTime) / 1000).toFixed(2);
  console.log(`[SatelliteService] Fetch completed in ${fetchDuration}s\n`);

  console.log('✅ [SatelliteService] SENTINEL HUB DATA SUCCESSFULLY FETCHED');
  console.log(`[SatelliteService] Data ready for ML model analysis\n`);
  
  return {
    success: true,
    data: catalogResult.data,
    source: 'sentinel-hub',
    apiStatus: 'SUCCESS - Sentinel Hub API ✅',
    timestamp: new Date(),
    location: { latitude, longitude, sizeKm },
    dateRange: { startDate: formattedStartDate, endDate: formattedEndDate },
    fetchDuration: parseFloat(fetchDuration),
    featuresFound: catalogResult.featuresCount,
    analysisNote: 'Data fetched from Sentinel Hub. NDVI/NDBI analysis performed by ML models.',
  };
}

function generateMockSatelliteData(latitude, longitude) {
  const width = 256;
  const height = 256;

  const nirBand = Array(width * height).fill(null).map(() => Math.random() * 255);
  const redBand = Array(width * height).fill(null).map(() => Math.random() * 255);

  return {
    success: true,
    data: {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: { platform: 'Sentinel-2', date: new Date().toISOString() },
        geometry: { type: 'Point', coordinates: [longitude, latitude] },
      }],
    },
    bands: { NIR: nirBand, RED: redBand, width, height },
    timestamp: new Date(),
  };
}

module.exports = {
  // Main entry point - fetches raw satellite data
  fetchLatestImagery,
  
  // Catalog API for searching imagery
  catalogSearch,
  
  // Mock data generator for fallback
  generateMockSatelliteData,
  
  // Configuration
  getStatisticsEndpoint,
  API_ENDPOINTS: APIs,
};
