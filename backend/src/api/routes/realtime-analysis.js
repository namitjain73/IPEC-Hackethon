/**
 * Real-Time Analysis Routes
 * Endpoints for real-time analysis with API fallback to dummy data
 */

const express = require('express');
const { analyzeRegionRealTime, analyzeRegionsBatchRealTime, analyzeWithHistory } = require('../../services/enhancedAnalysisService');
const { getCircuitBreakerStatus, resetCircuitBreaker } = require('../../services/realTimeDataService');

const router = express.Router();

/**
 * POST /api/analysis/realtime
 * Analyze a region using real-time data (with fallback to dummy data)
 */
router.post('/realtime', async (req, res) => {
  try {
    const { latitude, longitude, sizeKm, name } = req.body;

    // Validate input
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'latitude and longitude are required',
      });
    }

    console.log(`[API] POST /api/analysis/realtime - ${name || 'Unknown Region'}`);

    const analysis = await analyzeRegionRealTime(
      parseFloat(latitude),
      parseFloat(longitude),
      parseFloat(sizeKm) || 50,
      name || `Region (${latitude}, ${longitude})`
    );

    res.json({
      success: true,
      analysis,
    });

  } catch (error) {
    console.error('[API] Error in realtime analysis:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/analysis/realtime-with-history
 * Analyze region with historical comparison
 */
router.post('/realtime-with-history', async (req, res) => {
  try {
    const { latitude, longitude, sizeKm, name } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'latitude and longitude are required',
      });
    }

    console.log(`[API] POST /api/analysis/realtime-with-history - ${name || 'Unknown Region'}`);

    const analysisWithHistory = await analyzeWithHistory(
      parseFloat(latitude),
      parseFloat(longitude),
      parseFloat(sizeKm) || 50,
      name || `Region (${latitude}, ${longitude})`
    );

    res.json({
      success: true,
      data: analysisWithHistory,
    });

  } catch (error) {
    console.error('[API] Error in realtime with history:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/analysis/realtime-batch
 * Analyze multiple regions in batch
 */
router.post('/realtime-batch', async (req, res) => {
  try {
    const { regions } = req.body;

    if (!Array.isArray(regions) || regions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'regions array is required and must not be empty',
      });
    }

    console.log(`[API] POST /api/analysis/realtime-batch - ${regions.length} regions`);

    const batchResults = await analyzeRegionsBatchRealTime(regions);

    res.json({
      success: true,
      data: batchResults,
    });

  } catch (error) {
    console.error('[API] Error in batch analysis:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/analysis/system/status
 * Get system health and circuit breaker status
 */
router.get('/system/status', (req, res) => {
  try {
    const circuitStatus = getCircuitBreakerStatus();
    
    res.json({
      success: true,
      system: {
        timestamp: new Date(),
        circuitBreaker: {
          state: circuitStatus.state,
          failureCount: circuitStatus.failureCount,
          lastFailureTime: circuitStatus.lastFailureTime,
        },
        apiStatus: circuitStatus.state === 'CLOSED' ? 'HEALTHY' : 
                   circuitStatus.state === 'HALF_OPEN' ? 'RECOVERING' : 'UNHEALTHY',
        fallbackAvailable: true,
        description: `Circuit breaker is ${circuitStatus.state.toLowerCase()}. ${
          circuitStatus.state === 'OPEN' ? 'Using fallback data.' :
          circuitStatus.state === 'HALF_OPEN' ? 'Attempting recovery.' :
          'APIs operational.'
        }`,
      },
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/analysis/system/reset-circuit-breaker
 * Reset circuit breaker (admin only)
 */
router.post('/system/reset-circuit-breaker', (req, res) => {
  try {
    resetCircuitBreaker();
    
    res.json({
      success: true,
      message: 'Circuit breaker reset successfully',
      status: getCircuitBreakerStatus(),
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/analysis/health
 * Simple health check
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'operational',
    realTimeDataAvailable: true,
    fallbackDataAvailable: true,
    timestamp: new Date(),
  });
});

module.exports = router;
