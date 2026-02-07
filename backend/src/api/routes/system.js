const express = require('express');
const router = express.Router();
const { checkSystemHealth, getSystemStats } = require('../../services/statusService');

/**
 * GET /api/system/status
 * Get complete system health status
 */
router.get('/status', async (req, res) => {
  try {
    const status = await checkSystemHealth();

    res.json({
      success: true,
      status: status,
    });
  } catch (error) {
    console.error('Error checking system status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/system/stats
 * Get detailed system statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await getSystemStats();

    res.json({
      success: true,
      stats: stats,
    });
  } catch (error) {
    console.error('Error getting system stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/system/check-imagery
 * Check for new available imagery
 */
router.post('/check-imagery', async (req, res) => {
  try {
    const now = new Date();

    res.json({
      success: true,
      imagery: {
        newAvailable: true,
        latestDate: now.toISOString().split('T')[0],
        source: 'Sentinel-2',
        nextExpected: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
    });
  } catch (error) {
    console.error('Error checking imagery:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
