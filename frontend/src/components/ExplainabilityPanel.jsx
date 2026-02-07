import React, { useState, useEffect } from 'react';
import './ExplainabilityPanel.css';

/**
 * ExplainabilityPanel Component
 * Supports both dummy data and API calls
 * 
 * Usage with dummy data:
 *   <ExplainabilityPanel analysis={analysisObject} />
 * 
 * Usage with API (future):
 *   <ExplainabilityPanel analysisId={id} />
 */
export function ExplainabilityPanel({ analysis, analysisId }) {
  const [explanation, setExplanation] = useState(null);
  const [loading, setLoading] = useState(!!analysisId);
  const [error, setError] = useState(null);
  const [expandedReasons, setExpandedReasons] = useState({});

  useEffect(() => {
    if (analysisId) {
      // API mode - fetch from backend
      fetchExplanationFromAPI(analysisId);
    } else if (analysis) {
      // Dummy data mode - generate locally
      const exp = generateExplanation(analysis);
      setExplanation(exp);
      setLoading(false);
    }
  }, [analysisId, analysis]);

  /**
   * Fetch explanation from API (for future use)
   * @param {string} id - Analysis ID to fetch
   */
  const fetchExplanationFromAPI = async (id) => {
    try {
      setLoading(true);
      setError(null);

      // Create abort controller with 3 second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`/api/analysis/${id}/explanation`, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();
      
      // API response should have explanation object
      if (data.explanation) {
        setExplanation(data.explanation);
      } else if (data.data) {
        // Alternative API response format
        setExplanation(data.data);
      } else {
        throw new Error('Invalid API response format');
      }
    } catch (err) {
      console.warn('API fetch failed, this will be handled when API is implemented:', err.message);
      // Don't set error state yet - API not implemented
      setLoading(false);
    }
  };

  const toggleReason = (idx) => {
    setExpandedReasons(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  // Loading state (when API mode)
  if (loading && analysisId) {
    return (
      <div className="explainability-panel-wrapper">
        <div className="explainability-panel loading">
          <div className="spinner"></div>
          <p>Analyzing detection reasons...</p>
        </div>
      </div>
    );
  }

  // Error state (when API mode)
  if (error && analysisId) {
    return (
      <div className="explainability-panel-wrapper">
        <div className="explainability-panel error">
          <p>❌ Error: {error}</p>
        </div>
      </div>
    );
  }

  // No data state
  if (!explanation) {
    return (
      <div className="explainability-panel-wrapper">
        <div className="explainability-panel empty">
          <p>No analysis data available. Select a region and run analysis.</p>
        </div>
      </div>
    );
  }

  const riskColors = {
    HIGH: '#dc2626',
    MEDIUM: '#f97316',
    LOW: '#22c55e',
    CRITICAL: '#8b0000',
    UNKNOWN: '#6b7280'
  };

  return (
    <div className="explainability-panel-wrapper">
      <div className="explainability-panel">
        <div className="panel-header">
          <h3>❓ Why Was This Flagged?</h3>
          {explanation.timestamp && explanation.timestamp !== 'Unknown' && (
            <div className="analysis-date">Analyzed: {explanation.timestamp}</div>
          )}
        </div>

        {/* Summary Section */}
        <div className="summary-section">
          <p className="summary-text">{explanation.summary}</p>

          <div className="risk-badge" style={{ borderColor: riskColors[explanation.riskLevel] }}>
            <span className="label">Risk Level:</span>
            <span className="value" style={{ color: riskColors[explanation.riskLevel] }}>
              {explanation.riskLevel}
            </span>
          </div>

          {/* Confidence Bar */}
          <div className="confidence-indicator">
            <div className="confidence-label">Detection Confidence</div>
            <div className="confidence-bar">
              <div
                className="confidence-fill"
                style={{
                  width: `${explanation.confidence * 100}%`,
                  backgroundColor: getConfidenceColor(explanation.confidence)
                }}
              />
            </div>
            <div className="confidence-text">{(explanation.confidence * 100).toFixed(0)}%</div>
          </div>
        </div>

        {/* Reasons Section */}
        {explanation.reasons && explanation.reasons.length > 0 ? (
          <div className="reasons-section">
            <h4>📋 Key Factors That Triggered Detection</h4>
            <div className="reasons-list">
              {explanation.reasons.map((reason, idx) => (
                <div
                  key={idx}
                  className={`reason-card severity-${reason.severity} ${expandedReasons[idx] ? 'expanded' : ''}`}
                >
                  <div className="reason-header" onClick={() => toggleReason(idx)}>
                    <div className="reason-title-section">
                      <span className="severity-icon">
                        {reason.severity === 'high' ? '🔴' : reason.severity === 'medium' ? '🟡' : '🟢'}
                      </span>
                      <div className="reason-title">{reason.title}</div>
                    </div>
                    <div className="reason-metric">{reason.metric}</div>
                    <span className="expand-icon">{expandedReasons[idx] ? '▼' : '▶'}</span>
                  </div>

                  {expandedReasons[idx] && (
                    <div className="reason-details">
                      <p className="reason-explanation">{reason.explanation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="no-data-message">
            <p>No specific analysis data available.</p>
          </div>
        )}

        {/* Recommendation Section */}
        <div className="recommendation-section">
          <h4>🎯 Recommended Actions</h4>
          <ul className="recommendation-list">
            <li>Field verification of the flagged region to confirm satellite observations</li>
            <li>High-resolution imagery analysis for detailed damage assessment</li>
            <li>Investigation into potential causes (deforestation, fire, disease, drought)</li>
            <li>Plan intervention or monitoring strategies based on findings</li>
          </ul>
        </div>

        {/* Info Footer */}
        <div className="panel-footer">
          <p className="footer-text">
            💡 This explanation uses satellite NDVI data and risk classification algorithms to provide
            non-technical stakeholders with understandable reasons for vegetation loss detection.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Generate explanation from dummy/local analysis data
 * This function will continue to work when API is added
 * @param {Object} analysis - Local analysis data
 * @returns {Object} Explanation object
 */
function generateExplanation(analysis) {
  if (!analysis) {
    return {
      summary: 'No analysis data available. Select a region to analyze.',
      reasons: [],
      riskLevel: 'UNKNOWN',
      confidence: 0
    };
  }

  const reasons = [];
  const vegetationLoss = analysis.vegetationLossPercentage || 0;
  const ndvi = analysis.ndvi?.mean || 0;
  const confidence = analysis.riskClassification?.confidenceScore || 0.75;
  const riskLevel = analysis.riskClassification?.level || 'MEDIUM';

  // Reason 1: Vegetation Loss Percentage
  if (vegetationLoss > 5) {
    reasons.push({
      title: 'Significant Vegetation Loss Detected',
      explanation: `The region shows ${vegetationLoss.toFixed(1)}% vegetation loss. This indicates substantial degradation of forest cover or vegetation density. Such loss is typically caused by deforestation, forest fires, disease, or drought stress.`,
      metric: `${vegetationLoss.toFixed(1)}% loss`,
      severity: vegetationLoss > 20 ? 'high' : 'medium'
    });
  }

  // Reason 2: NDVI Health Status
  if (ndvi < 0.4) {
    reasons.push({
      title: 'Low Vegetation Health Index (NDVI)',
      explanation: `NDVI value of ${ndvi.toFixed(3)} indicates poor vegetation health. NDVI (Normalized Difference Vegetation Index) ranges from -1 to 1, where higher values mean healthier vegetation. This low value suggests vegetation stress, sparse coverage, or degraded land.`,
      metric: `NDVI: ${ndvi.toFixed(3)}`,
      severity: ndvi < 0.2 ? 'high' : 'medium'
    });
  }

  // Reason 3: Risk Classification
  if (riskLevel !== 'LOW') {
    reasons.push({
      title: `${riskLevel} Risk Level Assigned`,
      explanation: `The risk classification algorithm has flagged this region as "${riskLevel}" risk. This classification is based on the severity of vegetation loss, rate of change, and environmental conditions in the monitored area.`,
      metric: `Risk: ${riskLevel}`,
      severity: riskLevel === 'CRITICAL' ? 'high' : riskLevel === 'HIGH' ? 'high' : 'medium'
    });
  }

  // Reason 4: Detection Confidence
  if (confidence > 0.7) {
    reasons.push({
      title: 'High Detection Confidence',
      explanation: `The detection has ${(confidence * 100).toFixed(0)}% confidence score. This high confidence indicates the flagged vegetation loss is real and consistent across multiple satellite observations, not a temporary artifact or sensor error.`,
      metric: `${(confidence * 100).toFixed(0)}% confident`,
      severity: 'low'
    });
  }

  const summary = `This region was flagged due to detected vegetation loss and degradation. Analysis shows ${vegetationLoss.toFixed(1)}% vegetation loss with NDVI of ${ndvi.toFixed(3)}, classified as ${riskLevel} risk with ${(confidence * 100).toFixed(0)}% confidence.`;

  return {
    summary,
    reasons,
    riskLevel,
    confidence,
    timestamp: analysis.timestamp ? new Date(analysis.timestamp).toLocaleDateString() : 'Unknown'
  };
}

function getConfidenceColor(confidence) {
  if (confidence >= 0.8) return '#22c55e';
  if (confidence >= 0.6) return '#f97316';
  return '#dc2626';
}

export default ExplainabilityPanel;
