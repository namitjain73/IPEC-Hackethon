const express = require('express');
const axios = require('axios');
const router = express.Router();

// ML Server base URL
const ML_SERVER_URL = process.env.ML_SERVER_URL || 'http://localhost:5001';

// Health check for ML server
router.get('/health', async (req, res) => {
  try {
    const response = await axios.get(`${ML_SERVER_URL}/health`, {
      timeout: 5000
    });
    res.json({
      status: 'ok',
      ml_server: response.data
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'ML server unavailable',
      error: error.message
    });
  }
});

// NDVI Prediction
router.post('/predict/ndvi', async (req, res) => {
  try {
    const response = await axios.post(
      `${ML_SERVER_URL}/predict/ndvi`,
      req.body,
      { timeout: 10000 }
    );
    res.json(response.data);
  } catch (error) {
    console.error('[ML] NDVI prediction error:', error.message);
    res.status(400).json({
      success: false,
      error: error.message || 'NDVI prediction failed'
    });
  }
});

// Change Detection
router.post('/predict/change', async (req, res) => {
  try {
    const response = await axios.post(
      `${ML_SERVER_URL}/predict/change`,
      req.body,
      { timeout: 10000 }
    );
    res.json(response.data);
  } catch (error) {
    console.error('[ML] Change detection error:', error.message);
    res.status(400).json({
      success: false,
      error: error.message || 'Change detection failed'
    });
  }
});

// Risk Assessment
router.post('/predict/risk', async (req, res) => {
  try {
    const response = await axios.post(
      `${ML_SERVER_URL}/predict/risk`,
      req.body,
      { timeout: 10000 }
    );
    res.json(response.data);
  } catch (error) {
    console.error('[ML] Risk assessment error:', error.message);
    res.status(400).json({
      success: false,
      error: error.message || 'Risk assessment failed'
    });
  }
});

// All Predictions (Combined)
router.post('/predict/all', async (req, res) => {
  try {
    const response = await axios.post(
      `${ML_SERVER_URL}/predict/all`,
      req.body,
      { timeout: 10000 }
    );
    res.json(response.data);
  } catch (error) {
    console.error('[ML] Combined prediction error:', error.message);
    res.status(400).json({
      success: false,
      error: error.message || 'Combined prediction failed'
    });
  }
});

// Batch predictions for multiple regions
router.post('/predict/batch', async (req, res) => {
  try {
    const { regions } = req.body;
    
    if (!Array.isArray(regions)) {
      return res.status(400).json({
        success: false,
        error: 'regions must be an array'
      });
    }

    const predictions = [];
    
    for (const region of regions) {
      try {
        const response = await axios.post(
          `${ML_SERVER_URL}/predict/all`,
          region,
          { timeout: 10000 }
        );
        predictions.push({
          region_id: region.region_id || 'unknown',
          success: true,
          data: response.data
        });
      } catch (error) {
        predictions.push({
          region_id: region.region_id || 'unknown',
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      total: regions.length,
      successful: predictions.filter(p => p.success).length,
      predictions
    });
  } catch (error) {
    console.error('[ML] Batch prediction error:', error.message);
    res.status(400).json({
      success: false,
      error: error.message || 'Batch prediction failed'
    });
  }
});

module.exports = router;
