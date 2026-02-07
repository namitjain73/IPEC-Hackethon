/**
 * Confidence Score Calculation Service
 * Determines how confident the system is in its detection
 */

/**
 * Calculate overall confidence score based on multiple factors
 * @param {Object} analysis - Analysis data
 * @param {Object} metadata - Additional metadata
 * @returns {Object} Confidence breakdown and final score
 */
function calculateConfidenceScore(analysis, metadata = {}) {
  try {
    // Factor 1: Cloud Coverage Impact (0-1)
    // Lower cloud coverage = higher confidence
    const cloudCoverage = analysis.cloudCoverage || metadata.cloudCoverage || 0;
    const cloudCoverageScore = Math.max(0, 1 - cloudCoverage / 100);

    // Factor 2: Pixel Consistency (0-1)
    // How many adjacent pixels show similar NDVI changes
    const pixelConsistency = analysis.pixelConsistency || metadata.pixelConsistency || 0;
    const consistencyScore = Math.min(1, Math.max(0, pixelConsistency));

    // Factor 3: Multi-Date Verification (0-1)
    // How many dates confirm the change pattern
    const multiDateConfirmed = analysis.multiDateConfirmed || metadata.multiDateConfirmed || false;
    const multiDateScore = multiDateConfirmed ? 1 : 0.5;

    // Factor 4: Detection Method (0-1)
    // ML models typically have higher confidence than fallback
    const detectionMethod = analysis.detectionMethod || 'fallback';
    const methodScore = detectionMethod === 'ml' ? 0.95 : 0.75;

    // Factor 5: Change Magnitude (0-1)
    // Larger changes are more confident
    const changeStats = analysis.changeDetection?.statistics || {};
    const meanChange = Math.abs(changeStats.meanChange || 0);
    const magnitudeScore = Math.min(1, meanChange / 0.5); // Normalize to 0.5 NDVI units

    // Weighted average
    const finalScore =
      cloudCoverageScore * 0.2 +
      consistencyScore * 0.25 +
      multiDateScore * 0.2 +
      methodScore * 0.2 +
      magnitudeScore * 0.15;

    // Clamp to 0-1
    const clampedScore = Math.min(1, Math.max(0, finalScore));

    return {
      score: clampedScore,
      factors: {
        cloudCoverage: {
          value: cloudCoverageScore,
          weight: 0.2,
          percentage: cloudCoverage,
        },
        pixelConsistency: {
          value: consistencyScore,
          weight: 0.25,
          percentage: pixelConsistency * 100,
        },
        multiDateVerification: {
          value: multiDateScore,
          weight: 0.2,
          confirmed: multiDateConfirmed,
        },
        detectionMethod: {
          value: methodScore,
          weight: 0.2,
          method: detectionMethod,
        },
        changeMagnitude: {
          value: magnitudeScore,
          weight: 0.15,
          magnitude: meanChange,
        },
      },
      colorCode: getConfidenceColor(clampedScore),
      interpretation: getConfidenceInterpretation(clampedScore),
    };
  } catch (error) {
    console.error('Error calculating confidence score:', error);
    return {
      score: 0.5,
      factors: {},
      colorCode: 'yellow',
      interpretation: 'Unable to calculate confidence',
    };
  }
}

/**
 * Get color code for confidence score
 * @param {number} score - Score 0-1
 * @returns {string} Color code
 */
function getConfidenceColor(score) {
  if (score >= 0.8) return 'green';
  if (score >= 0.6) return 'yellow';
  return 'red';
}

/**
 * Get human-readable interpretation of confidence
 * @param {number} score - Score 0-1
 * @returns {string}
 */
function getConfidenceInterpretation(score) {
  if (score >= 0.85) return 'Very High Confidence';
  if (score >= 0.7) return 'High Confidence';
  if (score >= 0.55) return 'Moderate Confidence';
  if (score >= 0.4) return 'Low Confidence';
  return 'Very Low Confidence - Verify Manually';
}

/**
 * Calculate cloud coverage score impact
 * @param {number} cloudPercentage - Cloud coverage 0-100
 * @returns {number} Score 0-1
 */
function computeCloudImpact(cloudPercentage) {
  // Exponential penalty for cloud coverage
  // 0% clouds = 1.0 confidence
  // 50% clouds = 0.6 confidence
  // 100% clouds = 0.0 confidence
  const normalized = cloudPercentage / 100;
  return Math.max(0, 1 - normalized * normalized);
}

/**
 * Calculate pixel consistency score
 * @param {Array} ndviGrid - NDVI values
 * @param {number} threshold - Change threshold
 * @returns {number} Score 0-1
 */
function calculateConsistency(ndviGrid, threshold = 0.3) {
  if (!ndviGrid || ndviGrid.length === 0) return 0;

  const size = Math.sqrt(ndviGrid.length);
  if (size % 1 !== 0) return 0; // Must be square grid

  let consistentPixels = 0;
  const gridInt = Math.floor(size);

  for (let i = 1; i < gridInt - 1; i++) {
    for (let j = 1; j < gridInt - 1; j++) {
      const idx = i * gridInt + j;
      const center = ndviGrid[idx];

      // Check if neighbors have similar changes
      const neighbors = [
        ndviGrid[(i - 1) * gridInt + j],
        ndviGrid[(i + 1) * gridInt + j],
        ndviGrid[i * gridInt + (j - 1)],
        ndviGrid[i * gridInt + (j + 1)],
      ];

      const similarNeighbors = neighbors.filter(n => Math.abs(n - center) < threshold).length;

      if (similarNeighbors >= 2) {
        consistentPixels++;
      }
    }
  }

  const totalCheckable = (gridInt - 2) * (gridInt - 2);
  return totalCheckable > 0 ? consistentPixels / totalCheckable : 0;
}

/**
 * Calculate model agreement score
 * @param {Object} predictions - Predictions from multiple models
 * @returns {number} Score 0-1
 */
function computeModelAgreement(predictions = {}) {
  const models = Object.keys(predictions);
  if (models.length === 0) return 0.5;

  const agreeing = models.filter(model => predictions[model].flagged === true).length;
  return agreeing / models.length;
}

module.exports = {
  calculateConfidenceScore,
  getConfidenceColor,
  getConfidenceInterpretation,
  computeCloudImpact,
  calculateConsistency,
  computeModelAgreement,
};
