/**
 * Region Service
 * Manages multi-region monitoring operations
 */

const { MonitoredRegion, AnalysisResult } = require('../models');
const Region = require('../models/Region');

/**
 * Create a new region to monitor
 * @param {Object} regionData
 * @returns {Promise<Object>}
 */
async function createRegion(regionData) {
  try {
    const region = new MonitoredRegion({
      name: regionData.name,
      latitude: regionData.latitude,
      longitude: regionData.longitude,
      sizeKm: regionData.sizeKm || 50,
      alertThreshold: regionData.alertThreshold || 15,
      metadata: regionData.metadata || {},
      notificationEmail: regionData.notificationEmail,
      tags: regionData.tags || [],
    });

    await MonitoredRegion.save();
    console.log(`[Region] Created: ${MonitoredRegion.name} (${MonitoredRegion._id})`);

    return region;
  } catch (error) {
    console.error('Error creating region:', error);
    throw error;
  }
}

/**
 * Get all regions with their latest analysis
 * @param {Object} options - Filter/sort options
 * @returns {Promise<Array>}
 */
async function getRegions(options = {}) {
  try {
    const filter = { active: options.active !== undefined ? options.active : true };

    if (options.riskLevel) {
      filter['latestMetrics.riskLevel'] = options.riskLevel;
    }

    // Get regions from both Region model (custom analyzed regions) and MonitoredRegion model
    let regionQuery = Region.find(filter);
    let monitoredQuery = MonitoredRegion.find(filter);

    if (options.sort) {
      regionQuery = regionQuery.sort(options.sort);
      monitoredQuery = monitoredQuery.sort(options.sort);
    } else {
      regionQuery = regionQuery.sort({ createdAt: -1 });
      monitoredQuery = monitoredQuery.sort({ createdAt: -1 });
    }

    if (options.limit) {
      regionQuery = regionQuery.limit(options.limit);
      monitoredQuery = monitoredQuery.limit(options.limit);
    }

    const [customRegions, monitoredRegions] = await Promise.all([
      regionQuery.exec(),
      monitoredQuery.exec()
    ]);

    // Merge and deduplicate by name
    const allRegions = [...customRegions, ...monitoredRegions];
    const regionMap = new Map();
    
    allRegions.forEach(region => {
      const key = region.name;
      if (!regionMap.has(key)) {
        regionMap.set(key, region);
      }
    });

    const regions = Array.from(regionMap.values());
    
    // Sort the final merged array if limit was specified
    if (options.limit) {
      regions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return regions.slice(0, options.limit);
    }

    return regions;
  } catch (error) {
    console.error('Error fetching regions:', error);
    throw error;
  }
}

/**
 * Get a specific region by ID with its latest analysis
 * @param {string} regionId
 * @returns {Promise<Object>}
 */
async function getRegionWithLatestAnalysis(regionId) {
  try {
    const region = await MonitoredRegion.findById(regionId);

    if (!region) {
      throw new Error('Region not found');
    }

    // Get latest analysis for this region
    const latestAnalysis = await AnalysisResult.findOne({ regionId: regionId }).sort({ timestamp: -1 });

    return {
      ...MonitoredRegion.toObject(),
      latestAnalysis: latestAnalysis,
    };
  } catch (error) {
    console.error('Error fetching region with analysis:', error);
    throw error;
  }
}

/**
 * Update a region
 * @param {string} regionId
 * @param {Object} updateData
 * @returns {Promise<Object>}
 */
async function updateRegion(regionId, updateData) {
  try {
    const region = await MonitoredRegion.findByIdAndUpdate(regionId, updateData, {
      new: true,
      runValidators: true,
    });

    if (!region) {
      throw new Error('Region not found');
    }

    console.log(`[Region] Updated: ${MonitoredRegion.name}`);
    return region;
  } catch (error) {
    console.error('Error updating region:', error);
    throw error;
  }
}

/**
 * Delete a region (soft delete)
 * @param {string} regionId
 * @returns {Promise<boolean>}
 */
async function deleteRegion(regionId) {
  try {
    const region = await MonitoredRegion.findByIdAndUpdate(regionId, { active: false }, { new: true });

    if (!region) {
      throw new Error('Region not found');
    }

    console.log(`[Region] Deleted: ${MonitoredRegion.name}`);
    return true;
  } catch (error) {
    console.error('Error deleting region:', error);
    throw error;
  }
}

/**
 * Get latest analyses for multiple regions
 * @param {Array} regionIds
 * @returns {Promise<Array>}
 */
async function getLatestAnalysesForRegions(regionIds) {
  try {
    const analyses = await AnalysisResult.aggregate([
      { $match: { regionId: { $in: regionIds.map(id => require('mongoose').Types.ObjectId(id)) } } },
      { $sort: { timestamp: -1 } },
      { $group: { _id: '$regionId', latest: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$latest' } },
    ]);

    return analyses;
  } catch (error) {
    console.error('Error fetching latest analyses:', error);
    throw error;
  }
}

/**
 * Update region metrics based on latest analysis
 * @param {string} regionId
 * @param {Object} analysisData
 * @returns {Promise<Object>}
 */
async function updateRegionMetrics(regionId, analysisData) {
  try {
    const vegetationLoss = analysisData.vegetationLossPercentage || 0;
    const riskLevel = analysisData.riskClassification?.level || 'MEDIUM';
    const confidence = analysisData.confidenceScore || 0;

    // Determine trend
    const previousAnalysis = await AnalysisResult.findOne({ regionId: regionId, timestamp: { $lt: analysisData.timestamp } })
      .sort({ timestamp: -1 });

    let trend = 'stable';
    if (previousAnalysis && previousAnalysis.vegetationLossPercentage) {
      if (vegetationLoss > previousAnalysis.vegetationLossPercentage + 1) {
        trend = 'increasing';
      } else if (vegetationLoss < previousAnalysis.vegetationLossPercentage - 1) {
        trend = 'decreasing';
      }
    }

    const region = await MonitoredRegion.findByIdAndUpdate(
      regionId,
      {
        lastScanDate: new Date(),
        'latestMetrics.vegetationLoss': vegetationLoss,
        'latestMetrics.riskLevel': riskLevel,
        'latestMetrics.confidence': confidence,
        'latestMetrics.trend': trend,
      },
      { new: true }
    );

    return region;
  } catch (error) {
    console.error('Error updating region metrics:', error);
    throw error;
  }
}

/**
 * Get regions with alerts
 * Regions where latest vegetation loss exceeds alert threshold
 * @returns {Promise<Array>}
 */
async function getRegionsWithAlerts() {
  try {
    const regions = await MonitoredRegion.find({ active: true });

    const alerts = [];

    for (const region of regions) {
      const latestAnalysis = await AnalysisResult.findOne({ regionId: MonitoredRegion._id }).sort({ timestamp: -1 });

      if (latestAnalysis && latestAnalysis.vegetationLossPercentage > MonitoredRegion.alertThreshold) {
        alerts.push({
          region: region,
          analysis: latestAnalysis,
          exceededBy: latestAnalysis.vegetationLossPercentage - MonitoredRegion.alertThreshold,
        });
      }
    }

    return alerts;
  } catch (error) {
    console.error('Error fetching regions with alerts:', error);
    throw error;
  }
}

module.exports = {
  createRegion,
  getRegions,
  getRegionWithLatestAnalysis,
  updateRegion,
  deleteRegion,
  getLatestAnalysesForRegions,
  updateRegionMetrics,
  getRegionsWithAlerts,
};
