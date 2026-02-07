const axios = require('axios');

// ============================================
// AGROMONITORING API SERVICE
// Fallback when Sentinel Hub fails
// ============================================

const AGROMONITORING_API_KEY = process.env.AGROMONITORING_API_KEY || '341290ceba84331ec7d5873d3043dbb7';
const AGROMONITORING_BASE_URL = 'http://api.agromonitoring.com/agro/1.0';

const TIMEOUT = 15000; // 15 seconds
const RETRY_ATTEMPTS = 2;

console.log(`[AgromonitoringService] Initialized - API Key: ${AGROMONITORING_API_KEY ? 'LOADED ✓' : 'MISSING ✗'}`);

// Retry logic
async function retryWithBackoff(fn, attempts = RETRY_ATTEMPTS) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      console.warn(`[Agromonitoring Retry] Attempt ${i + 1}/${attempts} failed:`, error.message);
      if (i < attempts - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
      }
    }
  }
  throw new Error('All retry attempts failed');
}

async function createPolygon(latitude, longitude, sizeKm, regionName) {
  try {
    const degreesPerKm = 0.009;
    const halfSizeDegrees = (sizeKm / 2) * degreesPerKm;

    const coordinates = [[
      [longitude - halfSizeDegrees, latitude - halfSizeDegrees],
      [longitude + halfSizeDegrees, latitude - halfSizeDegrees],
      [longitude + halfSizeDegrees, latitude + halfSizeDegrees],
      [longitude - halfSizeDegrees, latitude + halfSizeDegrees],
      [longitude - halfSizeDegrees, latitude - halfSizeDegrees],
    ]];

    const polygonName = `${regionName}-${Date.now()}`;
    console.log(`[Agromonitoring] Creating polygon for ${regionName}...`);
    console.log(`[Agromonitoring] Attempting GeoJSON Feature format...`);

    const payload = {
      name: polygonName,
      geo_json: {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: coordinates,
        },
        properties: {}
      }
    };

    const response = await axios.post(
      `${AGROMONITORING_BASE_URL}/polygons?appid=${AGROMONITORING_API_KEY}`,
      payload,
      { timeout: TIMEOUT, headers: { 'Content-Type': 'application/json' } }
    );

    if (response.data?.id) {
      console.log(`[Agromonitoring] ✅ Polygon created: ${response.data.id}`);
      return { success: true, polygonId: response.data.id, name: regionName };
    }

    return { success: false, error: 'No polygon ID in response' };
  } catch (error) {
    console.error('[Agromonitoring] Polygon creation failed:', error.message);
    if (error.response?.status === 422) {
      console.error('[Agromonitoring] 422 Validation Error - API format issue');
      console.error('[Agromonitoring] Response:', JSON.stringify(error.response.data).substring(0, 200));
    }
    return { success: false, error: error.message };
  }
}

// ============================================
// Fetch satellite imagery and NDVI data
// ============================================
async function fetchSatelliteData(polygonId, startDate, endDate) {
  try {
    // Convert dates to Unix timestamps
    const start = Math.floor(new Date(startDate).getTime() / 1000);
    const end = Math.floor(new Date(endDate).getTime() / 1000);

    console.log(`[Agromonitoring] Searching imagery for polygon ${polygonId}...`);
    console.log(`[Agromonitoring] Date range: ${startDate} to ${endDate}`);

    const response = await retryWithBackoff(() =>
      axios.get(`${AGROMONITORING_BASE_URL}/image/search`, {
        timeout: TIMEOUT,
        params: {
          start: start,
          end: end,
          polyid: polygonId,
          appid: AGROMONITORING_API_KEY,
        },
      })
    );

    const images = response.data;
    console.log(`[Agromonitoring] ✅ Found ${images.length} images`);

    if (images.length === 0) {
      console.warn('[Agromonitoring] No images found for date range');
      return {
        success: false,
        error: 'No satellite images available for this period',
        data: [],
      };
    }

    // Log details about images
    images.forEach((img, idx) => {
      console.log(`[Agromonitoring] Image ${idx + 1}: Date=${img.acquired}, NDVI=${img.ndvi?.toFixed(2) || 'N/A'}, CloudCover=${img.cloudCover}%`);
    });

    return {
      success: true,
      data: images,
      count: images.length,
      latestImage: images[0],
      source: 'agromonitoring',
    };
  } catch (error) {
    console.error('[Agromonitoring] Image search failed:', error.message);
    if (error.response) {
      console.error('[Agromonitoring] Status:', error.response.status);
      console.error('[Agromonitoring] Data:', error.response.data);
    }
    return {
      success: false,
      error: error.message,
      source: 'agromonitoring',
    };
  }
}

// ============================================
// Main function: Get satellite data via Agromonitoring
// ============================================
async function fetchLatestImagery(latitude, longitude, sizeKm, regionName = 'Forest Region') {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

  const formattedStartDate = startDate.toISOString().split('T')[0];
  const formattedEndDate = endDate.toISOString().split('T')[0];

  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║   AGROMONITORING API - SATELLITE DATA FETCH        ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  const fetchStartTime = Date.now();

  // Step 1: Create polygon
  const polygonResult = await createPolygon(latitude, longitude, sizeKm, regionName);
  if (!polygonResult.success) {
    console.log('❌ Polygon creation failed, cannot proceed\n');
    return {
      success: false,
      error: 'Failed to create polygon',
      source: 'agromonitoring',
    };
  }

  // Step 2: Fetch imagery
  const imageResult = await fetchSatelliteData(
    polygonResult.polygonId,
    formattedStartDate,
    formattedEndDate
  );

  const fetchDuration = ((Date.now() - fetchStartTime) / 1000).toFixed(2);
  console.log(`[AgromonitoringService] Fetch completed in ${fetchDuration}s\n`);

  if (!imageResult.success || imageResult.count === 0) {
    console.log('⚠️  No satellite data available\n');
    return {
      success: false,
      error: imageResult.error,
      source: 'agromonitoring',
      fetchDuration: parseFloat(fetchDuration),
    };
  }

  // Extract NDVI from latest image
  const latestImage = imageResult.latestImage;
  console.log('✅ AGROMONITORING DATA SUCCESSFULLY FETCHED');
  console.log(`   Latest image: ${latestImage.acquired}`);
  console.log(`   NDVI: ${latestImage.ndvi?.toFixed(4) || 'N/A'}`);
  console.log(`   Cloud cover: ${latestImage.cloudCover}%\n`);

  return {
    success: true,
    data: imageResult.data,
    latestImage: latestImage,
    ndviValue: latestImage.ndvi,
    source: 'agromonitoring',
    apiStatus: 'SUCCESS - Agromonitoring data',
    fetchDuration: parseFloat(fetchDuration),
    polygonId: polygonResult.polygonId,
  };
}

// ============================================
// Generate mock NDVI data (fallback for Agromonitoring too)
// ============================================
function generateMockData(latitude, longitude) {
  const width = 256;
  const height = 256;

  const ndvi = Array(width * height).fill(null).map(() => Math.random() * 0.8 + 0.2);

  return {
    success: true,
    data: [{
      acquired: new Date().toISOString(),
      ndvi: 0.65,
      cloudCover: 15,
      systemId: 'Sentinel-2',
    }],
    source: 'mock',
  };
}

module.exports = {
  fetchLatestImagery,
  createPolygon,
  fetchSatelliteData,
  generateMockData,
  AGROMONITORING_API_KEY,
};
