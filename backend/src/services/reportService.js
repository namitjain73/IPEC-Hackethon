const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { format } = require('date-fns');

const REPORTS_DIR = path.join(__dirname, '../../reports');

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

/**
 * Generate a professional PDF report for an analysis
 * @param {Object} analysis - Analysis document from MongoDB
 * @param {Object} region - Region document from MongoDB
 * @returns {Promise<{path: string, filename: string}>}
 */
async function generatePDFReport(analysis, region) {
  return new Promise((resolve, reject) => {
    try {
      const filename = `Report_${region.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.pdf`;
      const filepath = path.join(REPORTS_DIR, filename);

      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
      });

      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      // Title
      doc
        .fontSize(24)
        .font('Helvetica-Bold')
        .text('Satellite Change Detection Report', { align: 'center' })
        .moveDown(0.5);

      // Report metadata
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(`Generated: ${format(new Date(), 'PPpp')}`, { align: 'center' })
        .moveDown(1);

      // Region information section
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('Region Information', { underline: true })
        .moveDown(0.3);

      doc
        .fontSize(11)
        .font('Helvetica')
        .text(`Region Name: ${region.name}`)
        .text(`Coordinates: ${region.latitude.toFixed(4)}, ${region.longitude.toFixed(4)}`)
        .text(`Area of Interest: ${region.sizeKm} km²`)
        .text(`Jurisdiction: ${region.metadata?.jurisdiction || 'Not specified'}`)
        .text(`Ecosystem Type: ${region.metadata?.ecosystem || 'Tropical Forest'}`)
        .moveDown(1);

      // Analysis summary section
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('Analysis Summary', { underline: true })
        .moveDown(0.3);

      const vegetationLoss = analysis.vegetationLossPercentage || 0;
      const confidence = (analysis.confidenceScore * 100).toFixed(1);
      const riskLevel = analysis.riskClassification?.level || 'MEDIUM';

      doc
        .fontSize(11)
        .font('Helvetica')
        .text(`Analysis Date: ${format(new Date(analysis.timestamp), 'PPp')}`)
        .text(`Detection Method: ${analysis.detectionMethod === 'ml' ? 'ML Model' : 'Fallback Algorithm'}`)
        .moveDown(0.5);

      // Key metrics in a table-like format
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('Key Metrics:', { underline: true })
        .moveDown(0.2);

      doc
        .fontSize(10)
        .font('Helvetica');

      // Vegetation Loss
      doc.text(`• Vegetation Loss: ${vegetationLoss.toFixed(2)}%`);

      // Risk Level
      const riskColor = {
        LOW: 'Green',
        MEDIUM: 'Yellow/Orange',
        HIGH: 'Red',
      };
      doc.text(`• Risk Level: ${riskLevel} (${riskColor[riskLevel]})`);

      // Confidence
      doc.text(`• Detection Confidence: ${confidence}%`);

      // Cloud coverage
      doc.text(`• Cloud Coverage: ${analysis.cloudCoverage || 0}%`);

      doc.moveDown(0.8);

      // Explainability section
      if (analysis.explainability && analysis.explainability.reasons) {
        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .text('Why Was This Flagged?', { underline: true })
          .moveDown(0.3);

        doc.fontSize(10).font('Helvetica');

        analysis.explainability.reasons.forEach((reason, idx) => {
          doc
            .font('Helvetica-Bold')
            .text(`${idx + 1}. ${reason.title}`);

          doc
            .font('Helvetica')
            .text(`   ${reason.explanation}`)
            .text(`   Metric: ${reason.metric}`)
            .moveDown(0.3);
        });

        doc.moveDown(0.5);
      }

      // Detection details
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('Detection Details', { underline: true })
        .moveDown(0.3);

      doc
        .fontSize(10)
        .font('Helvetica');

      if (analysis.changeDetection && analysis.changeDetection.statistics) {
        const stats = analysis.changeDetection.statistics;
        doc.text(`• Pixels with Decrease: ${stats.decreaseCount || 0}`);
        doc.text(`• Pixels with Increase: ${stats.increaseCount || 0}`);
        doc.text(`• Stable Pixels: ${stats.stableCount || 0}`);
        doc.text(`• Mean Change: ${(stats.meanChange || 0).toFixed(4)} NDVI`);
      }

      doc.moveDown(0.8);

      // Satellite data info
      if (analysis.satelliteData) {
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('Satellite Data Source', { underline: true })
          .moveDown(0.2);

        doc
          .fontSize(10)
          .font('Helvetica')
          .text(`• Source: ${analysis.satelliteData.dataSource || 'Sentinel-2'}`)
          .text(`• Status: ${analysis.satelliteData.mlApiStatus || 'Processed'}`)
          .moveDown(0.5);
      }

      // Footer
      doc
        .fontSize(9)
        .font('Helvetica')
        .text('This report was automatically generated by the Satellite Change Detection System.', 100, 750, {
          align: 'center',
        })
        .text('For verification and detailed analysis, please consult with environmental specialists.', 100, 770, {
          align: 'center',
        });

      // Finalize PDF
      doc.end();

      stream.on('finish', () => {
        resolve({
          path: filepath,
          filename: filename,
          url: `/api/reports/download/${filename}`,
        });
      });

      stream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * List all PDF reports for a region
 * @param {string} regionId - Region ID
 * @returns {Promise<Array>}
 */
async function listReportsForRegion(regionId) {
  try {
    if (!fs.existsSync(REPORTS_DIR)) {
      return [];
    }

    const files = fs.readdirSync(REPORTS_DIR);
    return files
      .filter(f => f.endsWith('.pdf'))
      .map(filename => ({
        filename,
        path: `/api/reports/download/${filename}`,
        createdAt: fs.statSync(path.join(REPORTS_DIR, filename)).birthtime,
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error('Error listing reports:', error);
    return [];
  }
}

/**
 * Delete a PDF report
 * @param {string} filename - Filename to delete
 * @returns {Promise<boolean>}
 */
async function deleteReport(filename) {
  try {
    const filepath = path.join(REPORTS_DIR, filename);

    // Security: Prevent path traversal
    if (!filepath.startsWith(REPORTS_DIR)) {
      throw new Error('Invalid file path');
    }

    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting report:', error);
    return false;
  }
}

/**
 * Get file stream for downloading a report
 * @param {string} filename - Filename to download
 * @returns {fs.ReadStream}
 */
function getReportStream(filename) {
  const filepath = path.join(REPORTS_DIR, filename);

  // Security: Prevent path traversal
  if (!filepath.startsWith(REPORTS_DIR)) {
    throw new Error('Invalid file path');
  }

  if (!fs.existsSync(filepath)) {
    throw new Error('File not found');
  }

  return fs.createReadStream(filepath);
}

module.exports = {
  generatePDFReport,
  listReportsForRegion,
  deleteReport,
  getReportStream,
  REPORTS_DIR,
};
