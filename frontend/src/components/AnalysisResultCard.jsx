import React from 'react';

export function AnalysisResultCard({ analysis }) {
  if (!analysis) {
    return (
      <div className="unified-card unified-card-primary">
        <div className="unified-card-header">
          <span className="unified-card-icon">📊</span>
          <span className="unified-card-title">No Results Available</span>
        </div>
        <div className="unified-card-description">
          Run an analysis on a region to see detailed results here. Select a region and click "Run Analysis" to begin.
        </div>
      </div>
    );
  }

  if (!analysis.success) {
    const errorMessage = analysis.error || 'Unknown error occurred';
    return (
      <div className="unified-card unified-card-danger">
        <div className="unified-card-header">
          <span className="unified-card-icon">❌</span>
          <span className="unified-card-title">Analysis Failed</span>
        </div>
        <div className="unified-card-body">
          <div className="unified-card-description">
            {errorMessage || '(No error message provided)'}
          </div>
          {analysis.regionName && (
            <div className="unified-card-status">Region: {analysis.regionName}</div>
          )}
        </div>
      </div>
    );
  }

  const getRiskColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'high': return { variant: 'unified-card-danger', color: '#dc2626' };
      case 'medium': return { variant: 'unified-card-warning', color: '#f97316' };
      case 'low': return { variant: 'unified-card-success', color: '#22c55e' };
      default: return { variant: 'unified-card-primary', color: '#3b82f6' };
    }
  };

  const riskLevel = (analysis.riskClassification?.riskLevel || 'low').toLowerCase();
  const riskStyle = getRiskColor(riskLevel);
  
  const getRiskEmoji = (level) => {
    switch (level?.toLowerCase()) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  return (
    <div className="analysis-result-container">
      {/* Data Source Indicator */}
      {analysis.satelliteData?.fallbackUsed && (
        <div style={{
          background: '#fef3c7',
          border: '2px solid #f59e0b',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span style={{fontSize: '20px'}}>⚠️</span>
          <div>
            <div style={{fontSize: '14px', fontWeight: '600', color: '#92400e'}}>
              Using Simulated Satellite Data
            </div>
            <div style={{fontSize: '12px', color: '#b45309', marginTop: '2px'}}>
              Real satellite API unavailable - System using mock data for analysis (Results are representative)
            </div>
          </div>
        </div>
      )}

      {/* Real Data Indicator */}
      {analysis.satelliteData?.fallbackUsed === false && (
        <div style={{
          background: '#d1fae5',
          border: '2px solid #10b981',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span style={{fontSize: '20px'}}>✅</span>
          <div>
            <div style={{fontSize: '14px', fontWeight: '600', color: '#065f46'}}>
              Real Satellite Data
            </div>
            <div style={{fontSize: '12px', color: '#047857', marginTop: '2px'}}>
              Analysis using actual {analysis.satelliteData?.dataSource || 'satellite'} imagery
            </div>
          </div>
        </div>
      )}

      {/* Header Card */}
      <div className={`unified-card ${riskStyle.variant}`}>
        <div className="unified-card-header">
          <span className="unified-card-icon">📍</span>
          <div>
            <span className="unified-card-title">{analysis.regionName || 'Unknown Region'}</span>
            <div style={{fontSize: '12px', color: '#6b7280', marginTop: '4px'}}>
              {analysis.timestamp ? new Date(analysis.timestamp).toLocaleString() : 'N/A'}
            </div>
          </div>
        </div>
        <div className="unified-card-body">
          <div className="unified-card-value" style={{color: riskStyle.color}}>
            {getRiskEmoji(riskLevel)} {riskLevel.toUpperCase()}
          </div>
          <div className="unified-card-description">
            {riskLevel === 'low' && 
              "✅ This region appears healthy with stable vegetation coverage. No significant vegetation loss detected. The vegetation is growing well and the ecosystem looks stable."}
            {riskLevel === 'medium' && 
              "⚠️ This region shows moderate vegetation changes. Some vegetation loss is visible. This area should be monitored closely to ensure it doesn't deteriorate further."}
            {riskLevel === 'high' && 
              "🚨 This region shows significant vegetation loss. Substantial changes detected in the landscape. Immediate attention and investigation are strongly recommended."}
          </div>
        </div>
      </div>

      {/* Risk Assessment Section */}
      <div className="card-section-title">🎯 Risk Assessment</div>
      <div className="unified-card-grid unified-card-grid-2col">
        <div className={`unified-card ${riskStyle.variant}`}>
          <div className="unified-card-header">
            <span className="unified-card-icon">📈</span>
            <span className="unified-card-title">Risk Level</span>
          </div>
          <div className="unified-card-body">
            <div className="unified-card-value" style={{color: riskStyle.color}}>
              {riskLevel.toUpperCase()}
            </div>
            <div className="unified-card-status">Classification</div>
            <div className="unified-card-description">
              How severe the forest degradation is. LOW = Safe and stable, MEDIUM = Needs monitoring, HIGH = Requires immediate action.
            </div>
          </div>
        </div>

        <div className="unified-card unified-card-primary">
          <div className="unified-card-header">
            <span className="unified-card-icon">🎯</span>
            <span className="unified-card-title">Risk Score</span>
          </div>
          <div className="unified-card-body">
            <div className="unified-card-value">
              {(analysis.riskClassification?.riskScore * 100 || 0).toFixed(0)}%
            </div>
            <div className="unified-card-status">Quantified Risk</div>
            <div className="unified-card-description">
              A numerical score from 0-100%. Shows how much risk is present. 0% = completely safe, 100% = maximum risk detected.
            </div>
          </div>
        </div>
      </div>

      {/* Vegetation Health Section */}
      <div className="card-section-title">🌿 Vegetation Health</div>
      <div className="unified-card-grid unified-card-grid-2col">
        <div className="unified-card unified-card-danger">
          <div className="unified-card-header">
            <span className="unified-card-icon">📉</span>
            <span className="unified-card-title">Vegetation Loss</span>
          </div>
          <div className="unified-card-body">
            <div className="unified-card-value" style={{color: '#dc2626'}}>
              {(analysis.vegetationLossPercentage || 0).toFixed(1)}%
            </div>
            <div className="unified-card-status">Percentage Lost</div>
            <div className="unified-card-description">
              The percentage of vegetation that has been lost or degraded in this region. Lower is better. 0% = no loss, 100% = complete degradation.
            </div>
          </div>
        </div>

        <div className="unified-card unified-card-warning">
          <div className="unified-card-header">
            <span className="unified-card-icon">📍</span>
            <span className="unified-card-title">Area Affected</span>
          </div>
          <div className="unified-card-body">
            <div className="unified-card-value" style={{color: '#f97316'}}>
              {(analysis.areaAffected || 0).toFixed(1)} km²
            </div>
            <div className="unified-card-status">Square Kilometers</div>
            <div className="unified-card-description">
              The actual physical size of the area experiencing vegetation loss. Measured in square kilometers. Larger areas indicate more widespread degradation.
            </div>
          </div>
        </div>
      </div>

      {/* NDVI Statistics */}
      {analysis.ndvi && typeof analysis.ndvi === 'object' && (
        <>
          <div className="card-section-title">📊 Vegetation Index (NDVI) Analysis</div>
          <div className="unified-card unified-card-primary">
            <div className="unified-card-header">
              <span className="unified-card-icon">ℹ️</span>
              <span className="unified-card-title">What is NDVI?</span>
            </div>
            <div className="unified-card-description">
              NDVI (Normalized Difference Vegetation Index) measures vegetation health using satellite data. Range: -1 to +1. 
              Negative values = no vegetation. 0 = non-vegetated. Positive values = living vegetation. Closer to +1 = healthier vegetation.
            </div>
          </div>

          <div className="unified-card-grid unified-card-grid-4col">
            <div className="unified-card unified-card-primary">
              <div className="unified-card-header">
                <span className="unified-card-icon">📈</span>
                <span className="unified-card-title">Average Health</span>
              </div>
              <div className="unified-card-body">
                <div className="unified-card-value">
                  {analysis.ndvi.mean?.toFixed(3) || 'N/A'}
                </div>
                <div className="unified-card-status">Mean NDVI</div>
                <div className="unified-card-description">
                  The average vegetation health across the entire region. Higher values indicate healthier vegetation overall.
                </div>
              </div>
            </div>

            <div className="unified-card unified-card-success">
              <div className="unified-card-header">
                <span className="unified-card-icon">🟢</span>
                <span className="unified-card-title">Healthiest Area</span>
              </div>
              <div className="unified-card-body">
                <div className="unified-card-value" style={{color: '#22c55e'}}>
                  {analysis.ndvi.max?.toFixed(3) || 'N/A'}
                </div>
                <div className="unified-card-status">Maximum NDVI</div>
                <div className="unified-card-description">
                  The highest vegetation health value found in this region. Shows the best-condition vegetation areas.
                </div>
              </div>
            </div>

            <div className="unified-card unified-card-danger">
              <div className="unified-card-header">
                <span className="unified-card-icon">🔴</span>
                <span className="unified-card-title">Least Healthy Area</span>
              </div>
              <div className="unified-card-body">
                <div className="unified-card-value" style={{color: '#dc2626'}}>
                  {analysis.ndvi.min?.toFixed(3) || 'N/A'}
                </div>
                <div className="unified-card-status">Minimum NDVI</div>
                <div className="unified-card-description">
                  The lowest vegetation health value found. Shows the most degraded or bare areas in the region.
                </div>
              </div>
            </div>

            <div className="unified-card unified-card-warning">
              <div className="unified-card-header">
                <span className="unified-card-icon">📊</span>
                <span className="unified-card-title">Variation</span>
              </div>
              <div className="unified-card-body">
                <div className="unified-card-value" style={{color: '#f97316'}}>
                  {analysis.ndvi.stdDev?.toFixed(3) || 'N/A'}
                </div>
                <div className="unified-card-status">Standard Deviation</div>
                <div className="unified-card-description">
                  How much vegetation health varies across the region. Higher = more inconsistent vegetation. Lower = more uniform.
                </div>
              </div>
            </div>
          </div>

          <div className="unified-card unified-card-primary">
            <div className="unified-card-header">
              <span className="unified-card-icon">✅</span>
              <span className="unified-card-title">Data Quality</span>
            </div>
            <div className="unified-card-body">
              <div style={{fontSize: '14px', color: '#1f2937', fontWeight: '600'}}>
                {analysis.ndvi.validPixels?.toLocaleString()} valid pixels analyzed
              </div>
              <div style={{fontSize: '12px', color: '#6b7280', marginTop: '6px'}}>
                out of {analysis.ndvi.totalPixels?.toLocaleString()} total pixels
              </div>
              <div style={{marginTop: '12px'}}>
                <div style={{width: '100%', background: '#e5e7eb', borderRadius: '8px', height: '6px'}}>
                  <div 
                    style={{
                      width: `${((analysis.ndvi.validPixels || 0) / (analysis.ndvi.totalPixels || 1)) * 100}%`,
                      background: '#3b82f6',
                      borderRadius: '8px',
                      height: '100%',
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>
              </div>
              <div className="unified-card-description" style={{marginTop: '12px'}}>
                The percentage of pixels with valid data. Clouds and water may cause invalid pixels. Higher = better quality analysis.
              </div>
            </div>
          </div>
        </>
      )}

      {/* Change Detection Section - Pixel Analysis */}
      {analysis.changeDetection && typeof analysis.changeDetection === 'object' && (
        <>
          <div className="card-section-title">🔄 Pixel Change Analysis</div>
          <div className="unified-card unified-card-primary">
            <div className="unified-card-header">
              <span className="unified-card-icon">📍</span>
              <span className="unified-card-title">Pixel Distribution</span>
            </div>
            <div className="unified-card-body">
              <div style={{fontSize: '14px', fontWeight: '600', color: '#1f2937', marginBottom: '16px'}}>
                Total pixels analyzed: {(analysis.changeDetection.decreaseCount + analysis.changeDetection.stableCount + (analysis.changeDetection.increaseCount || 0))?.toLocaleString()}
              </div>
              
              {/* Pixel breakdown grid */}
              <div className="unified-card-grid unified-card-grid-3col" style={{marginTop: '12px', gap: '8px'}}>
                <div style={{padding: '12px', background: '#fee2e2', borderRadius: '6px', textAlign: 'center'}}>
                  <div style={{fontSize: '18px', fontWeight: '700', color: '#dc2626'}}>
                    {analysis.changeDetection.decreaseCount?.toLocaleString() || 0}
                  </div>
                  <div style={{fontSize: '11px', color: '#991b1b', marginTop: '4px', fontWeight: '500'}}>
                    DECREASED VEGETATION
                  </div>
                  <div style={{fontSize: '10px', color: '#7f1d1d', marginTop: '2px'}}>
                    {((analysis.changeDetection.decreaseCount || 0) / (analysis.changeDetection.decreaseCount + analysis.changeDetection.stableCount + (analysis.changeDetection.increaseCount || 0)) * 100).toFixed(1)}%
                  </div>
                </div>

                <div style={{padding: '12px', background: '#dbeafe', borderRadius: '6px', textAlign: 'center'}}>
                  <div style={{fontSize: '18px', fontWeight: '700', color: '#2563eb'}}>
                    {analysis.changeDetection.stableCount?.toLocaleString() || 0}
                  </div>
                  <div style={{fontSize: '11px', color: '#1e40af', marginTop: '4px', fontWeight: '500'}}>
                    STABLE VEGETATION
                  </div>
                  <div style={{fontSize: '10px', color: '#1e3a8a', marginTop: '2px'}}>
                    {((analysis.changeDetection.stableCount || 0) / (analysis.changeDetection.decreaseCount + analysis.changeDetection.stableCount + (analysis.changeDetection.increaseCount || 0)) * 100).toFixed(1)}%
                  </div>
                </div>

                <div style={{padding: '12px', background: '#dcfce7', borderRadius: '6px', textAlign: 'center'}}>
                  <div style={{fontSize: '18px', fontWeight: '700', color: '#16a34a'}}>
                    {analysis.changeDetection.increaseCount?.toLocaleString() || 0}
                  </div>
                  <div style={{fontSize: '11px', color: '#166534', marginTop: '4px', fontWeight: '500'}}>
                    INCREASED VEGETATION
                  </div>
                  <div style={{fontSize: '10px', color: '#15803d', marginTop: '2px'}}>
                    {((analysis.changeDetection.increaseCount || 0) / (analysis.changeDetection.decreaseCount + analysis.changeDetection.stableCount + (analysis.changeDetection.increaseCount || 0)) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Visual bar chart */}
              <div style={{marginTop: '16px', marginBottom: '12px'}}>
                <div style={{width: '100%', display: 'flex', gap: '2px', borderRadius: '6px', overflow: 'hidden', height: '20px'}}>
                  <div 
                    style={{
                      flex: (analysis.changeDetection.decreaseCount || 0) / (analysis.changeDetection.decreaseCount + analysis.changeDetection.stableCount + (analysis.changeDetection.increaseCount || 0)),
                      background: '#dc2626',
                      transition: 'flex 0.3s ease'
                    }}
                    title={`Decreased: ${analysis.changeDetection.decreaseCount?.toLocaleString()}`}
                  />
                  <div 
                    style={{
                      flex: (analysis.changeDetection.stableCount || 0) / (analysis.changeDetection.decreaseCount + analysis.changeDetection.stableCount + (analysis.changeDetection.increaseCount || 0)),
                      background: '#3b82f6',
                      transition: 'flex 0.3s ease'
                    }}
                    title={`Stable: ${analysis.changeDetection.stableCount?.toLocaleString()}`}
                  />
                  <div 
                    style={{
                      flex: (analysis.changeDetection.increaseCount || 0) / (analysis.changeDetection.decreaseCount + analysis.changeDetection.stableCount + (analysis.changeDetection.increaseCount || 0)),
                      background: '#22c55e',
                      transition: 'flex 0.3s ease'
                    }}
                    title={`Increased: ${analysis.changeDetection.increaseCount?.toLocaleString()}`}
                  />
                </div>
              </div>

              <div className="unified-card-description">
                Shows the distribution of pixel-level changes detected in the satellite imagery. Red = vegetation loss, Blue = stable/unchanged, Green = vegetation growth.
              </div>
            </div>
          </div>
        </>
      )}

      {/* Confidence Section */}
      <div className="card-section-title">🎯 Analysis Confidence</div>
      <div className="unified-card unified-card-success">
        <div className="unified-card-header">
          <span className="unified-card-icon">✅</span>
          <span className="unified-card-title">Reliability Score</span>
        </div>
        <div className="unified-card-body">
          <div className="unified-card-value" style={{color: '#22c55e'}}>
            {(analysis.confidenceScore * 100 || 0).toFixed(0)}%
          </div>
          <div className="unified-card-status">Confidence Level</div>
          <div style={{width: '100%', background: '#e5e7eb', borderRadius: '8px', height: '8px', marginTop: '12px'}}>
            <div 
              style={{
                width: `${(analysis.confidenceScore * 100 || 0)}%`,
                background: '#22c55e',
                borderRadius: '8px',
                height: '100%',
                transition: 'width 0.3s ease'
              }}
            />
          </div>
          <div className="unified-card-description" style={{marginTop: '12px'}}>
            How reliable and accurate these results are. 0% = unreliable, 100% = highly reliable. Higher confidence means you can trust these results more.
          </div>
        </div>
      </div>
    </div>
  );
}
