/**
 * Explainability Service
 * Converts analysis data to human-readable explanations
 * Designed for non-technical stakeholders
 */

/**
 * Generate comprehensive explanation for why a region was flagged
 * @param {Object} analysis - Analysis data from MongoDB
 * @param {Object} region - Region data from MongoDB
 * @returns {Object} Explanation breakdown
 */
function generateExplanation(analysis, region = {}) {
  try {
    const reasons = [];

    // Reason 1: NDVI Drop Magnitude
    const ndviDrop = generateNDVIReason(analysis);
    if (ndviDrop) reasons.push(ndviDrop);

    // Reason 2: Area Affected
    const areaReason = generateAreaReason(analysis, region);
    if (areaReason) reasons.push(areaReason);

    // Reason 3: Time Correlation
    const timeReason = generateTimeReason(analysis);
    if (timeReason) reasons.push(timeReason);

    // Reason 4: Pattern Consistency
    const patternReason = generatePatternReason(analysis);
    if (patternReason) reasons.push(patternReason);

    // Reason 5: Cloud Impact (if significant)
    if ((analysis.cloudCoverage || 0) > 30) {
      const cloudReason = generateCloudReason(analysis);
      if (cloudReason) reasons.push(cloudReason);
    }

    // Determine primary factor
    const primaryFactor =
      reasons.length > 0
        ? reasons.reduce((prev, current) => (current.severity === 'high' ? current : prev)).title
        : 'Unknown';

    return {
      reasons: reasons,
      primaryFactor: primaryFactor,
      secondaryFactors: reasons.slice(1).map(r => r.title),
      riskLevel: analysis.riskClassification?.level || 'MEDIUM',
      confidence: analysis.confidenceScore || 0,
      summary: generateSummary(reasons, analysis),
    };
  } catch (error) {
    console.error('Error generating explanation:', error);
    return {
      reasons: [],
      primaryFactor: 'Analysis Error',
      secondaryFactors: [],
      summary: 'Unable to generate explanation. Please try again.',
    };
  }
}

/**
 * Generate reason for NDVI drop
 * @param {Object} analysis
 * @returns {Object|null}
 */
function generateNDVIReason(analysis) {
  const stats = analysis.changeDetection?.statistics || {};
  const meanChange = Math.abs(stats.meanChange || 0);

  if (meanChange < 0.1) return null;

  let severity = 'medium';
  let explanation = '';

  if (meanChange > 0.5) {
    severity = 'high';
    explanation = `NDVI values dropped significantly by ${meanChange.toFixed(2)} units. This indicates a substantial loss of vegetation health and density. NDVI (Normalized Difference Vegetation Index) is a standard measure where lower values indicate less healthy or sparse vegetation.`;
  } else if (meanChange > 0.3) {
    severity = 'high';
    explanation = `NDVI values dropped by ${meanChange.toFixed(2)} units, exceeding the threshold for moderate vegetation loss. This change was detected across multiple pixels in the region.`;
  } else {
    severity = 'medium';
    explanation = `NDVI values showed a measurable decline of ${meanChange.toFixed(3)} units, indicating vegetation stress or loss in the analyzed area.`;
  }

  return {
    title: 'Significant Vegetation Loss Detected',
    explanation: explanation,
    metric: `${meanChange.toFixed(3)} NDVI units`,
    severity: severity,
  };
}

/**
 * Generate reason for area affected
 * @param {Object} analysis
 * @param {Object} region
 * @returns {Object|null}
 */
function generateAreaReason(analysis, region) {
  const stats = analysis.changeDetection?.statistics || {};
  const decreaseCount = stats.decreaseCount || 0;
  const totalPixels = (stats.decreaseCount || 0) + (stats.increaseCount || 0) + (stats.stableCount || 0);

  if (totalPixels === 0) return null;

  const percentageAffected = (decreaseCount / totalPixels) * 100;
  const sizeKm = region.sizeKm || 50;
  const hectaresPerPixel = (sizeKm * sizeKm * 100) / totalPixels;
  const affectedHectares = decreaseCount * hectaresPerPixel;

  let severity = 'medium';
  let explanation = '';

  if (percentageAffected > 30) {
    severity = 'high';
    explanation = `The vegetation loss affects approximately ${affectedHectares.toFixed(0)} hectares of the monitored region (${percentageAffected.toFixed(1)}% of the area). This is a substantial area, indicating either large-scale clearing or significant environmental disturbance.`;
  } else if (percentageAffected > 15) {
    severity = 'high';
    explanation = `Approximately ${affectedHectares.toFixed(0)} hectares (${percentageAffected.toFixed(1)}% of the region) show vegetation loss. This indicates notable environmental change requiring investigation.`;
  } else {
    severity = 'medium';
    explanation = `About ${affectedHectares.toFixed(0)} hectares of the region (${percentageAffected.toFixed(1)}%) have experienced vegetation loss. While limited in scale, the change is concentrated enough to warrant attention.`;
  }

  return {
    title: 'Significant Area Affected',
    explanation: explanation,
    metric: `${affectedHectares.toFixed(0)} hectares (${percentageAffected.toFixed(1)}%)`,
    severity: severity,
  };
}

/**
 * Generate reason for time correlation
 * @param {Object} analysis
 * @returns {Object|null}
 */
function generateTimeReason(analysis) {
  // Simulate multi-date verification (in production, check against historical data)
  const daysSinceDetection = Math.floor((Date.now() - new Date(analysis.timestamp).getTime()) / (1000 * 60 * 60 * 24));

  if (daysSinceDetection > 30) {
    return {
      title: 'Recent Detection Requires Verification',
      explanation: `This change was detected ${daysSinceDetection} days ago. While recent, it would benefit from cross-verification with more recent imagery to confirm the change is ongoing or if recovery has begun.`,
      metric: `${daysSinceDetection} days ago`,
      severity: 'low',
    };
  }

  if (daysSinceDetection <= 7 && analysis.multiDateConfirmed) {
    return {
      title: 'Recent and Verified Detection',
      explanation: `This vegetation loss was detected within the last 7 days and has been verified across multiple satellite passes, indicating an active, ongoing environmental change. Immediate investigation is recommended.`,
      metric: `${daysSinceDetection} days ago (verified)`,
      severity: 'high',
    };
  }

  if (daysSinceDetection <= 7) {
    return {
      title: 'Recently Detected Change',
      explanation: `The vegetation loss was detected within the last week, indicating a recent environmental disturbance. Further monitoring is recommended to confirm if the change persists or is temporary.`,
      metric: `${daysSinceDetection} days ago`,
      severity: 'medium',
    };
  }

  return null;
}

/**
 * Generate reason for pattern consistency
 * @param {Object} analysis
 * @returns {Object|null}
 */
function generatePatternReason(analysis) {
  const consistency = analysis.pixelConsistency || 0;
  const consistencyPercent = consistency * 100;

  if (consistencyPercent < 50) return null;

  let severity = 'medium';
  let explanation = '';

  if (consistencyPercent > 80) {
    severity = 'high';
    explanation = `The detected changes show high spatial consistency (${consistencyPercent.toFixed(0)}%), meaning adjacent pixels exhibit similar vegetation loss patterns. This suggests a genuine, concentrated environmental event rather than isolated noise, consistent with deforestation or mining activities.`;
  } else if (consistencyPercent > 65) {
    severity = 'medium';
    explanation = `Change patterns show moderate to good spatial consistency (${consistencyPercent.toFixed(0)}%), indicating the detected vegetation loss is concentrated in a coherent area rather than scattered randomly.`;
  } else {
    severity = 'low';
    explanation = `The detected changes show moderate consistency (${consistencyPercent.toFixed(0)}%), though some scattered changes are present.`;
  }

  return {
    title: 'Concentrated Change Pattern',
    explanation: explanation,
    metric: `${consistencyPercent.toFixed(0)}% spatial consistency`,
    severity: severity,
  };
}

/**
 * Generate reason for cloud impact
 * @param {Object} analysis
 * @returns {Object|null}
 */
function generateCloudReason(analysis) {
  const cloudCoverage = analysis.cloudCoverage || 0;

  if (cloudCoverage < 30) return null;

  return {
    title: 'High Cloud Coverage May Affect Accuracy',
    explanation: `Cloud coverage of ${cloudCoverage}% in this image may partially obscure the ground and affect detection accuracy. The results are based on the visible areas, but hidden areas under clouds may contain additional vegetation loss.`,
    metric: `${cloudCoverage}% cloud coverage`,
    severity: 'medium',
  };
}

/**
 * Generate human-readable summary
 * @param {Array} reasons
 * @param {Object} analysis
 * @returns {string}
 */
function generateSummary(reasons, analysis) {
  if (reasons.length === 0) {
    return 'No significant vegetation loss detected in this analysis.';
  }

  const riskLevel = analysis.riskClassification?.level || 'MEDIUM';
  const confidence = ((analysis.confidenceScore || 0.5) * 100).toFixed(0);

  let summary = `Vegetation loss has been detected with a risk level of ${riskLevel} (${confidence}% confidence). `;

  if (reasons.length === 1) {
    summary += `The primary factor is: ${reasons[0].title}.`;
  } else {
    summary += `Multiple factors contribute: ${reasons[0].title}; ${reasons[1].title}.`;
    if (reasons.length > 2) {
      summary += ` Additional factors include ${reasons
        .slice(2)
        .map(r => r.title.toLowerCase())
        .join(', ')}.`;
    }
  }

  summary += ' Further investigation is recommended.';

  return summary;
}

module.exports = {
  generateExplanation,
  generateNDVIReason,
  generateAreaReason,
  generateTimeReason,
  generatePatternReason,
  generateCloudReason,
  generateSummary,
};
