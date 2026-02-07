const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

router.get('/deep', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const dbConnected = mongoose.connection.readyState === 1;

    res.json({
      status: dbConnected ? 'healthy' : 'degraded',
      timestamp: new Date(),
      checks: {
        api: 'healthy',
        database: dbConnected ? 'connected' : 'disconnected',
        memory: {
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        },
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date(),
    });
  }
});

module.exports = router;
