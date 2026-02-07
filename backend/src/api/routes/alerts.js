const express = require('express');
const router = express.Router();
const { Alert, MonitoredRegion } = require('../../models');

/**
 * POST /api/alerts
 * Create a new alert
 */
router.post('/', async (req, res) => {
  try {
    const { regionName, alertType, threshold, notificationType } = req.body;

    if (!regionName || !alertType || !threshold) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: regionName, alertType, threshold',
      });
    }

    const alert = new Alert({
      regionName,
      alertType,
      threshold,
      notificationType: notificationType || 'in-app',
      isActive: true,
    });

    await alert.save();

    // Update MonitoredRegion to enable monitoring
    await MonitoredRegion.updateOne(
      { name: regionName },
      { monitoringEnabled: true, alertThreshold: threshold },
      { upsert: true }
    );

    res.status(201).json({
      success: true,
      message: `Alert created successfully for ${regionName}`,
      alert,
    });
  } catch (error) {
    console.error('Error creating alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create alert',
      error: error.message,
    });
  }
});

/**
 * GET /api/alerts
 * Get all active alerts
 */
router.get('/', async (req, res) => {
  try {
    const alerts = await Alert.find({ isActive: true }).sort({ createdAt: -1 });
    res.json({
      success: true,
      count: alerts.length,
      alerts,
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alerts',
      error: error.message,
    });
  }
});

/**
 * GET /api/alerts/:id
 * Get specific alert
 */
router.get('/:id', async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found',
      });
    }
    res.json({
      success: true,
      alert,
    });
  } catch (error) {
    console.error('Error fetching alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alert',
      error: error.message,
    });
  }
});

/**
 * PUT /api/alerts/:id
 * Update alert
 */
router.put('/:id', async (req, res) => {
  try {
    const { threshold, notificationType, isActive } = req.body;
    const updateData = {};

    if (threshold !== undefined) updateData.threshold = threshold;
    if (notificationType !== undefined) updateData.notificationType = notificationType;
    if (isActive !== undefined) updateData.isActive = isActive;

    const alert = await Alert.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found',
      });
    }

    res.json({
      success: true,
      message: 'Alert updated successfully',
      alert,
    });
  } catch (error) {
    console.error('Error updating alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update alert',
      error: error.message,
    });
  }
});

/**
 * DELETE /api/alerts/:id
 * Delete alert
 */
router.delete('/:id', async (req, res) => {
  try {
    const alert = await Alert.findByIdAndDelete(req.params.id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found',
      });
    }

    res.json({
      success: true,
      message: 'Alert deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete alert',
      error: error.message,
    });
  }
});

module.exports = router;
