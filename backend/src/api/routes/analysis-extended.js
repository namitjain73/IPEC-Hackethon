const express = require('express');
const router = express.Router();
const { AnalysisResult, MonitoredRegion } = require('../../models');
const {
  generateExplanation,
} = require('../../services/explainabilityService');
const { calculateConfidenceScore } = require('../../services/confidenceService');
const {
  generatePDFReport,
  listReportsForRegion,
  deleteReport,
  getReportStream,
} = require('../../services/reportService');
const { performAnalysis } = require('../../services/analysisService');
const { updateRegionMetrics, getLatestAnalysesForRegions } = require('../../services/regionService');

// ===== TIMELINE & PLAYBACK ENDPOINTS =====

/**
 * GET /api/analysis/history
 * Fetch historical analyses for a region (for timeline playback)
 */
router.get('/history', async (req, res) => {
  try {
    const { regionId, limit = 30 } = req.query;

    if (!regionId) {
      return res.status(400).json({ error: 'Missing regionId' });
    }

    const analyses = await Analysis.find({ regionId: regionId })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .select('timestamp ndvi vegetationLossPercentage riskClassification cloudCoverage');

    res.json({
      success: true,
      count: analyses.length,
      data: analyses.reverse(), // Reverse for chronological order
    });
  } catch (error) {
    console.error('Error fetching analysis history:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analysis/timeline-data
 * Fetch time-series data for animation
 */
router.get('/timeline-data', async (req, res) => {
  try {
    const { regionId, startDate, endDate } = req.query;

    if (!regionId) {
      return res.status(400).json({ error: 'Missing regionId' });
    }

    const query = { regionId: regionId };

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const analyses = await Analysis.find(query)
      .sort({ timestamp: 1 })
      .select('timestamp ndvi vegetationLossPercentage');

    res.json({
      success: true,
      timeseriesData: analyses,
    });
  } catch (error) {
    console.error('Error fetching timeline data:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== COMPARISON ENDPOINTS =====

/**
 * GET /api/analysis/comparison
 * Compare two analyses side-by-side
 */
router.get('/comparison', async (req, res) => {
  try {
    const { beforeId, afterId } = req.query;

    if (!beforeId || !afterId) {
      return res.status(400).json({ error: 'Missing beforeId or afterId' });
    }

    const beforeAnalysis = await Analysis.findById(beforeId);
    const afterAnalysis = await Analysis.findById(afterId);

    if (!beforeAnalysis || !afterAnalysis) {
      return res.status(404).json({ error: 'One or both analyses not found' });
    }

    // Calculate delta
    const beforeLoss = beforeAnalysis.vegetationLossPercentage || 0;
    const afterLoss = afterAnalysis.vegetationLossPercentage || 0;
    const percentChange = ((afterLoss - beforeLoss) / Math.max(beforeLoss, 1)) * 100;

    res.json({
      success: true,
      comparison: {
        before: {
          id: beforeAnalysis._id,
          date: beforeAnalysis.timestamp,
          vegetationLoss: beforeLoss,
          riskLevel: beforeAnalysis.riskClassification?.level,
          confidence: beforeAnalysis.confidenceScore,
        },
        after: {
          id: afterAnalysis._id,
          date: afterAnalysis.timestamp,
          vegetationLoss: afterLoss,
          riskLevel: afterAnalysis.riskClassification?.level,
          confidence: afterAnalysis.confidenceScore,
        },
        delta: {
          percentChange: percentChange,
          absoluteChange: afterLoss - beforeLoss,
          daysElapsed: Math.floor((afterAnalysis.timestamp - beforeAnalysis.timestamp) / (1000 * 60 * 60 * 24)),
          severity: afterLoss > beforeLoss ? 'worsening' : 'improving',
        },
      },
    });
  } catch (error) {
    console.error('Error comparing analyses:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== EXPLAINABILITY ENDPOINTS =====

/**
 * GET /api/analysis/:id/explanation
 * Get detailed explanation for why region was flagged
 */
router.get('/:id/explanation', async (req, res) => {
  try {
    const analysis = await Analysis.findById(req.params.id).populate('regionId');

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    const explanation = generateExplanation(analysis, analysis.regionId);

    res.json({
      success: true,
      explanation: explanation,
    });
  } catch (error) {
    console.error('Error generating explanation:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== CONFIDENCE ENDPOINTS =====

/**
 * GET /api/analysis/:id/confidence
 * Get confidence score breakdown
 */
router.get('/:id/confidence', async (req, res) => {
  try {
    const analysis = await Analysis.findById(req.params.id);

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    const confidenceData = calculateConfidenceScore(analysis);

    res.json({
      success: true,
      confidence: confidenceData,
    });
  } catch (error) {
    console.error('Error calculating confidence:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== REPORT ENDPOINTS =====

/**
 * POST /api/reports/generate
 * Generate PDF report for an analysis
 */
router.post('/generate', async (req, res) => {
  try {
    const { analysisId, regionId } = req.body;

    if (!analysisId || !regionId) {
      return res.status(400).json({ error: 'Missing analysisId or regionId' });
    }

    const analysis = await Analysis.findById(analysisId);
    const region = await Region.findById(regionId);

    if (!analysis || !region) {
      return res.status(404).json({ error: 'Analysis or region not found' });
    }

    const report = await generatePDFReport(analysis, region);

    // Update analysis with report path
    analysis.pdfReportPath = report.path;
    analysis.reportGeneratedAt = new Date();
    await analysis.save();

    res.json({
      success: true,
      report: {
        filename: report.filename,
        downloadUrl: report.url,
        generatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Error generating PDF report:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/reports/download/:filename
 * Download PDF report
 */
router.get('/download/:filename', (req, res) => {
  try {
    const stream = getReportStream(req.params.filename);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.filename}"`);

    stream.pipe(res);
  } catch (error) {
    console.error('Error downloading report:', error);
    res.status(404).json({ error: 'Report not found' });
  }
});

/**
 * GET /api/reports/list
 * List all reports for a region
 */
router.get('/list', async (req, res) => {
  try {
    const { regionId } = req.query;

    if (!regionId) {
      return res.status(400).json({ error: 'Missing regionId' });
    }

    const reports = await listReportsForRegion(regionId);

    res.json({
      success: true,
      reports: reports,
    });
  } catch (error) {
    console.error('Error listing reports:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/reports/delete/:filename
 * Delete a PDF report
 */
router.delete('/delete/:filename', async (req, res) => {
  try {
    const success = await deleteReport(req.params.filename);

    if (!success) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({
      success: true,
      message: 'Report deleted',
    });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== LATEST BATCH ENDPOINT =====

/**
 * GET /api/analysis/latest-batch
 * Get latest analysis for multiple regions
 */
router.get('/latest-batch', async (req, res) => {
  try {
    const { regionIds } = req.query;

    if (!regionIds) {
      return res.status(400).json({ error: 'Missing regionIds' });
    }

    const ids = typeof regionIds === 'string' ? regionIds.split(',') : regionIds;

    // Fetch latest for each region
    const latestAnalyses = await Promise.all(
      ids.map(id =>
        Analysis.findOne({ regionId: id })
          .sort({ timestamp: -1 })
          .limit(1)
      )
    );

    res.json({
      success: true,
      analyses: latestAnalyses.filter(a => a !== null),
    });
  } catch (error) {
    console.error('Error fetching latest batch:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
