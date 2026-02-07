/**
 * Status Service
 * Monitors system health and real-time status
 */

const axios = require('axios');

const ML_API_URL = process.env.ML_API_URL || 'http://localhost:5001';

// Track last detection run
let lastDetectionRun = new Date();

/**
 * Check overall system health
 * @returns {Promise<Object>}
 */
async function checkSystemHealth() {
  try {
    const [mlStatus, dbStatus, imageryStatus] = await Promise.all([
      checkMLAPIStatus(),
      checkDatabaseStatus(),
      checkImageryAvailability(),
    ]);

    return {
      timestamp: new Date(),
      mlApi: mlStatus,
      database: dbStatus,
      imagery: imageryStatus,
      lastDetectionRun: lastDetectionRun,
      systemHealthy: mlStatus.connected && dbStatus.connected,
    };
  } catch (error) {
    console.error('Error checking system health:', error);
    return {
      timestamp: new Date(),
      systemHealthy: false,
      error: error.message,
    };
  }
}

/**
 * Check ML API connectivity and status
 * @returns {Promise<Object>}
 */
async function checkMLAPIStatus() {
  try {
    const startTime = Date.now();
    const response = await axios.get(`${ML_API_URL}/health`, { timeout: 5000 });
    const latency = Date.now() - startTime;

    return {
      connected: response.status === 200,
      latency: latency,
      lastChecked: new Date(),
      modelsLoaded: response.data?.models_loaded || 3,
      version: response.data?.version || 'unknown',
    };
  } catch (error) {
    console.error('ML API health check failed:', error.message);
    return {
      connected: false,
      error: error.message,
      lastChecked: new Date(),
      latency: null,
    };
  }
}

/**
 * Check database connectivity
 * @returns {Promise<Object>}
 */
async function checkDatabaseStatus() {
  try {
    const mongoose = require('mongoose');

    // Check connection state
    const connectionState = mongoose.connection.readyState;
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting

    const isConnected = connectionState === 1;

    // Get basic stats (this requires MongoDB connection)
    let regionsCount = 0;
    let analysesCount = 0;

    if (isConnected) {
      try {
        const { MonitoredRegion, AnalysisResult } = require('../models');

        regionsCount = await MonitoredRegion.countDocuments();
        analysesCount = await AnalysisResult.countDocuments();
      } catch (dbError) {
        console.error('Error counting documents:', dbError);
      }
    }

    return {
      connected: isConnected,
      connectionState: getConnectionStateName(connectionState),
      regionsMonitored: regionsCount,
      analysesCount: analysesCount,
      lastChecked: new Date(),
    };
  } catch (error) {
    console.error('Database health check error:', error);
    return {
      connected: false,
      error: error.message,
      lastChecked: new Date(),
    };
  }
}

/**
 * Check imagery availability
 * @returns {Promise<Object>}
 */
async function checkImageryAvailability() {
  try {
    // Simulate checking for new imagery
    // In production, this would query Sentinel-2/Landsat APIs

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    return {
      available: true,
      lastImageryDate: now.toISOString().split('T')[0],
      availableSources: ['Sentinel-2', 'Landsat-8'],
      newAvailable: true,
      nextExpectedImagery: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      lastChecked: new Date(),
    };
  } catch (error) {
    console.error('Imagery availability check error:', error);
    return {
      available: false,
      error: error.message,
      lastChecked: new Date(),
    };
  }
}

/**
 * Update timestamp of last detection run
 */
function updateLastDetectionRun() {
  lastDetectionRun = new Date();
}

/**
 * Get system statistics
 * @returns {Promise<Object>}
 */
async function getSystemStats() {
  try {
    const Region = require('../models/Region');
    const Analysis = require('../models/Analysis');

    const totalRegions = await Region.countDocuments();
    const activeRegions = await Region.countDocuments({ active: true });
    const totalAnalyses = await Analysis.countDocuments();

    // Get average processing time
    const recentAnalyses = await Analysis.find()
      .sort({ timestamp: -1 })
      .limit(100)
      .select('processingTime');

    const avgProcessingTime =
      recentAnalyses.length > 0
        ? recentAnalyses.reduce((sum, a) => sum + (a.processingTime || 0), 0) / recentAnalyses.length
        : 0;

    // Get risk distribution
    const riskDistribution = await Analysis.aggregate([
      { $group: { _id: '$riskClassification.level', count: { $sum: 1 } } },
    ]);

    return {
      timestamp: new Date(),
      regions: {
        total: totalRegions,
        active: activeRegions,
      },
      analyses: {
        total: totalAnalyses,
        avgProcessingTime: avgProcessingTime.toFixed(0),
      },
      riskDistribution: riskDistribution,
      systemUptime: process.uptime(),
    };
  } catch (error) {
    console.error('Error getting system stats:', error);
    return {
      error: error.message,
      timestamp: new Date(),
    };
  }
}

/**
 * Convert connection state number to readable string
 * @param {number} state
 * @returns {string}
 */
function getConnectionStateName(state) {
  const states = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting',
  };
  return states[state] || 'Unknown';
}

module.exports = {
  checkSystemHealth,
  checkMLAPIStatus,
  checkDatabaseStatus,
  checkImageryAvailability,
  updateLastDetectionRun,
  getSystemStats,
};
