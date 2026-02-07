const express = require('express');
const router = express.Router();
const {
  createRegion,
  getRegions,
  getRegionWithLatestAnalysis,
  updateRegion,
  deleteRegion,
  getRegionsWithAlerts,
} = require('../../services/regionService');

/**
 * GET /api/regions
 * Get all monitored regions
 */
router.get('/', async (req, res) => {
  try {
    const { active, riskLevel, limit, sort } = req.query;

    const options = {
      active: active !== 'false',
      riskLevel: riskLevel,
      limit: limit ? parseInt(limit) : undefined,
      sort: sort ? JSON.parse(sort) : undefined,
    };

    const regions = await getRegions(options);

    res.json({
      success: true,
      count: regions.length,
      data: regions,
    });
  } catch (error) {
    console.error('Error fetching regions:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/regions/:id
 * Get specific region with latest analysis
 */
router.get('/:id', async (req, res) => {
  try {
    const region = await getRegionWithLatestAnalysis(req.params.id);

    res.json({
      success: true,
      data: region,
    });
  } catch (error) {
    console.error('Error fetching region:', error);
    res.status(404).json({ error: error.message });
  }
});

/**
 * POST /api/regions
 * Create new region
 */
router.post('/', async (req, res) => {
  try {
    const { name, latitude, longitude, sizeKm, alertThreshold, metadata, notificationEmail, tags } = req.body;

    if (!name || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: name, latitude, longitude',
      });
    }

    const region = await createRegion({
      name,
      latitude,
      longitude,
      sizeKm,
      alertThreshold,
      metadata,
      notificationEmail,
      tags,
    });

    res.status(201).json({
      success: true,
      data: region,
    });
  } catch (error) {
    console.error('Error creating region:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/regions/:id
 * Update region
 */
router.put('/:id', async (req, res) => {
  try {
    const region = await updateRegion(req.params.id, req.body);

    res.json({
      success: true,
      data: region,
    });
  } catch (error) {
    console.error('Error updating region:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/regions/:id
 * Delete region (soft delete - sets active to false)
 */
router.delete('/:id', async (req, res) => {
  try {
    const success = await deleteRegion(req.params.id);

    res.json({
      success: success,
      message: 'Region deleted',
    });
  } catch (error) {
    console.error('Error deleting region:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/regions/alerts/active
 * Get regions with active alerts
 */
router.get('/alerts/active', async (req, res) => {
  try {
    const alerts = await getRegionsWithAlerts();

    res.json({
      success: true,
      count: alerts.length,
      data: alerts,
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/regions/demo/seed
 * Create demo regions with different risk levels for judges
 */
router.post('/demo/seed', async (req, res) => {
  try {
    const Region = require('../../models/Region');
    
    // Delete existing demo regions
    await Region.deleteMany({ name: { $regex: /Demo|Hackathon/ } });

    const demoRegions = [
      {
        name: 'Demo: LOW RISK Region - Valmiki Forest',
        description: 'Healthy forest with stable vegetation',
        latitude: 25.65,
        longitude: 84.12,
        areaKm2: 50,
        country: 'India',
        latestMetrics: {
          riskLevel: 'LOW',
          vegetationLoss: 2.3,
          trend: 'decreasing',
          confidence: 0.92,
          lastUpdate: new Date(),
        },
        lastScanDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        active: true,
      },
      {
        name: 'Demo: MEDIUM RISK Region - Murchison Falls',
        description: 'Moderate vegetation changes detected',
        latitude: 2.253,
        longitude: 32.003,
        areaKm2: 60,
        country: 'Uganda',
        latestMetrics: {
          riskLevel: 'MEDIUM',
          vegetationLoss: 15.8,
          trend: 'stable',
          confidence: 0.87,
          lastUpdate: new Date(),
        },
        lastScanDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        active: true,
      },
      {
        name: 'Demo: HIGH RISK Region - Amazon Deforestation',
        description: 'Significant vegetation loss detected - urgent',
        latitude: -3.456,
        longitude: -62.890,
        areaKm2: 150,
        country: 'Brazil',
        latestMetrics: {
          riskLevel: 'HIGH',
          vegetationLoss: 42.5,
          trend: 'increasing',
          confidence: 0.95,
          lastUpdate: new Date(),
        },
        lastScanDate: new Date(Date.now() - 6 * 60 * 60 * 1000),
        active: true,
      },
      {
        name: 'Demo: LOW RISK Region - Taiga Forest',
        description: 'Northern forest - stable conditions',
        latitude: 63.5,
        longitude: 90.0,
        areaKm2: 200,
        country: 'Russia',
        latestMetrics: {
          riskLevel: 'LOW',
          vegetationLoss: 1.2,
          trend: 'decreasing',
          confidence: 0.89,
          lastUpdate: new Date(),
        },
        lastScanDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        active: true,
      },
    ];

    const created = await Region.insertMany(demoRegions);

    res.json({
      success: true,
      message: 'Demo regions created successfully!',
      count: created.length,
      data: created.map(r => ({
        name: r.name,
        riskLevel: r.latestMetrics?.riskLevel,
        vegetationLoss: r.latestMetrics?.vegetationLoss,
      })),
    });
  } catch (error) {
    console.error('Error creating demo regions:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
