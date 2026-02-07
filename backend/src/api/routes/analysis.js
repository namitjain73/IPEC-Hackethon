const express = require('express');
const router = express.Router();
const { performAnalysis, batchAnalyze } = require('../../services/analysisService');
const { performRealTimeAnalysis } = require('../../services/realTimeAnalysisService');
const { AnalysisResult, MonitoredRegion, Alert } = require('../../models');
const Region = require('../../models/Region');
const { generateMockHistoryForRegion } = require('../../utils/mockHistoryGenerator');

router.post('/analyze', async (req, res, next) => {
  try {
    console.log('[API] Analyze request body:', JSON.stringify(req.body));
    const { latitude, longitude, sizeKm, name } = req.body;

    console.log('[API] Parsed fields:', { latitude, longitude, sizeKm, name, nameType: typeof name });

    if (latitude === undefined || latitude === null || longitude === undefined || longitude === null || !name) {
      console.error('[API] Validation failed:', { latitude, longitude, name });
      return res.status(400).json({
        error: 'Missing required fields: latitude, longitude, name',
        received: { latitude, longitude, sizeKm, name },
      });
    }

    // Try to fetch region from database (with latestMetrics)
    let region = await Region.findOne({ name });
    
    console.log(`[API] Region lookup for "${name}":`, region ? `Found in DB` : `Not found in DB`);
    if (region) {
      console.log(`[API] Region details:`, {
        name: region.name,
        hasLatestMetrics: !!region.latestMetrics,
        latestMetrics: region.latestMetrics,
      });
    }
    
    // If not found in database, create from request data
    if (!region) {
      region = { latitude, longitude, sizeKm: sizeKm || 50, name };
    }
    
    const result = await performAnalysis(region);

    if (!result.success) {
      return res.status(500).json({ 
        success: false,
        error: result.error,
        regionName: result.regionName,
        timestamp: result.timestamp,
      });
    }

    const analysisRecord = new AnalysisResult({
      regionName: result.regionName,
      latitude: region.latitude,
      longitude: region.longitude,
      ndvi: result.ndvi.statistics,
      changeDetection: result.changeDetection?.statistics,
      riskClassification: result.riskClassification,
      satelliteData: result.satelliteData,
      executionTime: result.executionTime,
      status: 'success',
    });

    await analysisRecord.save();

    await MonitoredRegion.findOneAndUpdate(
      { name: region.name },
      {
        lastAnalysisDate: new Date(),
        riskLevel: result.riskClassification?.riskLevel || 'low',
      },
      { upsert: true }
    );

    // Auto-save custom region to Region collection for future reference
    const existingRegion = await Region.findOne({ name: region.name });
    if (!existingRegion) {
      // This is a new custom region - save it to the predefined regions
      const newRegion = new Region({
        name: region.name,
        latitude: region.latitude,
        longitude: region.longitude,
        sizeKm: region.sizeKm || 50,
        active: true,
        isCustom: true,  // Mark as custom region
        latestMetrics: {
          vegetationLoss: result.riskClassification?.vegetationLossPercentage || 0,
          riskLevel: (result.riskClassification?.riskLevel || 'low').toUpperCase(),
          confidence: result.riskClassification?.confidenceScore || 0.85,
          trend: 'stable',
          ndviValue: result.ndvi?.mean || 0,
          changePercentage: result.changeDetection?.statistics?.changePercentage || 0,
        },
        analysisHistory: [{
          date: new Date(),
          ndvi: result.ndvi?.mean || 0,
          riskLevel: (result.riskClassification?.riskLevel || 'low').toUpperCase(),
        }],
        lastScanDate: new Date(),
      });
      await newRegion.save();
      console.log(`\n✅ [REGION] New custom region SAVED to predefined regions: ${region.name}`);
      console.log(`   Location: ${region.latitude.toFixed(4)}, ${region.longitude.toFixed(4)}`);
      console.log(`   Risk Level: ${(result.riskClassification?.riskLevel || 'low').toUpperCase()}`);
      console.log(`   NDVI: ${(result.ndvi?.mean || 0).toFixed(4)}\n`);
    } else {
      // Update existing region with latest metrics and history
      const updatedRegion = await Region.findOneAndUpdate(
        { name: region.name },
        {
          $set: {
            latestMetrics: {
              vegetationLoss: result.riskClassification?.vegetationLossPercentage || 0,
              riskLevel: (result.riskClassification?.riskLevel || 'low').toUpperCase(),
              confidence: result.riskClassification?.confidenceScore || 0.85,
              trend: 'stable',
              ndviValue: result.ndvi?.mean || 0,
              changePercentage: result.changeDetection?.statistics?.changePercentage || 0,
            },
            lastScanDate: new Date(),
          },
          $push: {
            analysisHistory: {
              date: new Date(),
              ndvi: result.ndvi?.mean || 0,
              riskLevel: (result.riskClassification?.riskLevel || 'low').toUpperCase(),
            }
          }
        },
        { new: true }
      );
      console.log(`\n✅ [REGION] Region metrics updated: ${region.name}`);
      console.log(`   Risk Level: ${(result.riskClassification?.riskLevel || 'low').toUpperCase()}`);
      console.log(`   Total analyses: ${(updatedRegion.analysisHistory?.length || 0)}\n`);
    }

    // Build clean response object with proper NDVI flattening
    const analysisResponse = {
      id: analysisRecord._id,
      regionName: result.regionName,
      timestamp: result.timestamp,
      executionTime: result.executionTime,
      // Properly flatten NDVI statistics - use explicit fallback values
      ndvi: {
        mean: result.ndvi?.statistics?.mean !== undefined ? result.ndvi.statistics.mean : 0,
        min: result.ndvi?.statistics?.min !== undefined ? result.ndvi.statistics.min : -1,
        max: result.ndvi?.statistics?.max !== undefined ? result.ndvi.statistics.max : 1,
        stdDev: result.ndvi?.statistics?.stdDev !== undefined ? result.ndvi.statistics.stdDev : 0,
        validPixels: result.ndvi?.statistics?.validPixels || 0,
        totalPixels: result.ndvi?.statistics?.totalPixels || 0,
      },
      changeDetection: result.changeDetection?.statistics || {},
      riskClassification: result.riskClassification || {
        riskLevel: 'low',
        riskScore: 0,
        vegetationLossPercentage: 0,
        areaAffected: 0,
        confidenceScore: 0.85,
      },
      vegetationLossPercentage: result.riskClassification?.vegetationLossPercentage || 0,
      areaAffected: result.riskClassification?.areaAffected || 0,
      confidenceScore: result.riskClassification?.confidenceScore || 0.85,
      satelliteData: result.satelliteData,
    };

    res.json({
      success: true,
      analysis: analysisResponse,
      regionSaved: true,
      message: `Region "${region.name}" analyzed and saved to predefined regions list`,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/history/:regionName', async (req, res, next) => {
  try {
    const { regionName } = req.params;
    const { limit = 10, skip = 0 } = req.query;

    // Check if this is a demo region
    const region = await Region.findOne({ name: regionName });
    
    if (region && region.latestMetrics && region.latestMetrics.riskLevel) {
      // This is a demo region - return mock historical data
      console.log(`[API] Returning mock history for demo region: ${regionName}`);
      const mockHistory = generateMockHistoryForRegion(
        regionName,
        region.latestMetrics.riskLevel,
        region.latestMetrics.vegetationLoss
      );
      
      // Apply pagination
      const paginated = mockHistory.slice(skip, skip + parseInt(limit));
      return res.json({
        success: true,
        total: mockHistory.length,
        count: paginated.length,
        analyses: paginated,
        isDemo: true,
      });
    }

    // For non-demo regions, fetch from database
    const analyses = await AnalysisResult.find({ regionName })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await AnalysisResult.countDocuments({ regionName });

    res.json({
      success: true,
      total,
      count: analyses.length,
      analyses,
      isDemo: false,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/latest', async (req, res, next) => {
  try {
    const analyses = await AnalysisResult.aggregate([
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: '$regionName',
          doc: { $first: '$$ROOT' },
        },
      },
      { $replaceRoot: { newRoot: '$doc' } },
    ]);

    res.json({
      success: true,
      count: analyses.length,
      analyses,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/stats', async (req, res, next) => {
  try {
    const totalAnalyses = await AnalysisResult.countDocuments();
    const regions = await AnalysisResult.distinct('regionName');
    const failedAnalyses = await AnalysisResult.countDocuments({ status: 'failed' });

    const riskDistribution = await AnalysisResult.aggregate([
      {
        $group: {
          _id: '$riskClassification.riskLevel',
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      stats: {
        totalAnalyses,
        totalRegions: regions.length,
        failedAnalyses,
        successRate: ((totalAnalyses - failedAnalyses) / totalAnalyses * 100).toFixed(2),
        riskDistribution: Object.fromEntries(
          riskDistribution.map((r) => [r._id || 'unknown', r.count])
        ),
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// REAL-TIME ANALYSIS ENDPOINT
// ============================================
// Enhanced endpoint that uses real-time data with automatic fallback
router.post('/analyze-realtime', async (req, res, next) => {
  try {
    console.log('[API:RealTime] Real-time analysis request received');
    const { latitude, longitude, sizeKm, name } = req.body;

    // Validation
    if (latitude === undefined || latitude === null || longitude === undefined || longitude === null || !name) {
      return res.status(400).json({
        error: 'Missing required fields: latitude, longitude, name',
        received: { latitude, longitude, sizeKm, name },
      });
    }

    // Fetch or create region
    let region = await Region.findOne({ name });
    if (!region) {
      region = { latitude, longitude, sizeKm: sizeKm || 50, name };
    }

    console.log('[API:RealTime] Starting real-time analysis...');
    const result = await performRealTimeAnalysis(region, {
      enableAllDataSources: true,
      retryOnFailure: true,
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'Real-time analysis failed',
        details: result.error,
        timestamp: new Date(),
      });
    }

    // Save analysis result
    const analysisRecord = new AnalysisResult({
      regionName: result.regionName,
      latitude: region.latitude,
      longitude: region.longitude,
      ndvi: result.ndvi,
      riskClassification: result.riskClassification,
      satelliteData: result.satelliteData,
      mlInsights: result.mlInsights,
      executionTime: result.executionTime,
      status: 'success',
      dataSource: result.dataSource,
    });

    await analysisRecord.save();

    // Auto-save custom region
    const existingRegion = await Region.findOne({ name: region.name });
    if (!existingRegion) {
      const newRegion = new Region({
        name: region.name,
        latitude: region.latitude,
        longitude: region.longitude,
        sizeKm: region.sizeKm || 50,
        active: true,
        latestMetrics: {
          vegetationLoss: result.riskClassification?.vegetationLossPercentage || 0,
          riskLevel: (result.riskClassification?.riskLevel || 'low').toUpperCase(),
          confidence: result.riskClassification?.confidenceScore || 0.85,
          trend: result.riskClassification?.trend || 'stable',
        },
        lastScanDate: new Date(),
      });
      await newRegion.save();
      console.log(`[API:RealTime] New region saved: ${region.name}`);
    } else {
      await Region.findOneAndUpdate(
        { name: region.name },
        {
          latestMetrics: {
            vegetationLoss: result.riskClassification?.vegetationLossPercentage || 0,
            riskLevel: (result.riskClassification?.riskLevel || 'low').toUpperCase(),
            confidence: result.riskClassification?.confidenceScore || 0.85,
            trend: result.riskClassification?.trend || 'stable',
          },
          lastScanDate: new Date(),
        }
      );
      console.log(`[API:RealTime] Region updated: ${region.name}`);
    }

    // Update monitored region
    await MonitoredRegion.findOneAndUpdate(
      { name: region.name },
      {
        lastAnalysisDate: new Date(),
        riskLevel: result.riskClassification?.riskLevel || 'low',
      },
      { upsert: true }
    );

    // Create alerts if needed
    if (result.riskClassification?.riskLevel === 'HIGH') {
      const alert = new Alert({
        regionName: region.name,
        riskLevel: 'HIGH',
        message: `High risk detected in ${region.name}`,
        created: new Date(),
      });
      await alert.save();
    }

    console.log('[API:RealTime] Analysis complete and saved');

    res.json({
      success: true,
      ...result,
      regionSaved: true,
      message: `Real-time analysis complete for "${region.name}"`,
    });
  } catch (error) {
    console.error('[API:RealTime] Error:', error.message);
    next(error);
  }
});

module.exports = router;
