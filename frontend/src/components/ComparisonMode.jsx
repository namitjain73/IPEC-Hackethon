import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Popup, Polyline, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import './ComparisonMode.css';

/**
 * ComparisonMode Component - Enhanced with Visual Elements
 * Enables side-by-side or overlay comparison of:
 * 1. Two time periods from same region (temporal comparison)
 * 2. Multiple regions at same time period (regional comparison)
 */
export function ComparisonMode({ analysisHistory = [], regions = [] }) {
  const [comparisonType, setComparisonType] = useState('temporal');
  const [beforeIndex, setBeforeIndex] = useState(0);
  const [afterIndex, setAfterIndex] = useState(Math.max(0, analysisHistory?.length - 1));
  const [selectedRegions, setSelectedRegions] = useState([]);
  const [comparisonData, setComparisonData] = useState(null);
  const mapRef = React.useRef(null);

  // Effect to fit map bounds when regional comparison data changes
  useEffect(() => {
    if (comparisonData?.type === 'regional' && comparisonData?.data?.regions && mapRef.current) {
      const data = comparisonData.data;
      const lats = data.regions.map(r => r.latitude);
      const lons = data.regions.map(r => r.longitude);
      
      if (lats.length === 0) return;
      
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLon = Math.min(...lons);
      const maxLon = Math.max(...lons);
      
      const isTwoRegionComparison = data.regions.length === 2;
      let latPadding = Math.max(5, (maxLat - minLat) * 0.4);
      let lonPadding = Math.max(5, (maxLon - minLon) * 0.4);
      
      if (isTwoRegionComparison) {
        latPadding = Math.max(2, (maxLat - minLat) * 0.25);
        lonPadding = Math.max(2, (maxLon - minLon) * 0.25);
      }
      
      const bounds = [
        [minLat - latPadding, minLon - lonPadding],
        [maxLat + latPadding, maxLon + lonPadding]
      ];
      
      setTimeout(() => {
        mapRef.current?.fitBounds(bounds, { padding: [100, 100], maxZoom: isTwoRegionComparison ? 9 : 8 });
      }, 150);
    }
  }, [comparisonData]);

  const beforeAnalysis = analysisHistory?.[beforeIndex];
  const afterAnalysis = analysisHistory?.[afterIndex];

  // Handle temporal comparison
  const handleTemporalCompare = () => {
    if (beforeAnalysis && afterAnalysis) {
      const delta = {
        beforeDate: beforeAnalysis.timestamp,
        afterDate: afterAnalysis.timestamp,
        beforeLoss: beforeAnalysis.vegetationLossPercentage || 0,
        afterLoss: afterAnalysis.vegetationLossPercentage || 0,
        beforeNDVI: beforeAnalysis.ndvi?.mean || 0,
        afterNDVI: afterAnalysis.ndvi?.mean || 0,
        beforeConfidence: beforeAnalysis.riskClassification?.confidenceScore || 0,
        afterConfidence: afterAnalysis.riskClassification?.confidenceScore || 0,
        percentChange: (afterAnalysis.vegetationLossPercentage || 0) - (beforeAnalysis.vegetationLossPercentage || 0),
        ndviChange: (afterAnalysis.ndvi?.mean || 0) - (beforeAnalysis.ndvi?.mean || 0),
        daysElapsed: Math.floor(
          (new Date(afterAnalysis.timestamp) - new Date(beforeAnalysis.timestamp)) / (1000 * 60 * 60 * 24)
        ),
      };

      setComparisonData({ type: 'temporal', data: delta });
    }
  };

  // Handle regional comparison
  const handleRegionalCompare = () => {
    if (selectedRegions.length >= 2) {
      const comparedRegions = selectedRegions.map(regionName => {
        const region = regions.find(r => r.name === regionName);
        return {
          name: regionName,
          loss: region?.latestMetrics?.vegetationLoss || 0,
          ndvi: region?.latestMetrics?.ndvi || 0,
          confidence: region?.latestMetrics?.confidence || 0,
          riskLevel: region?.latestMetrics?.riskLevel || 'MEDIUM',
          latitude: region?.latestMetrics?.latitude || 0,
          longitude: region?.latestMetrics?.longitude || 0,
        };
      });

      const avgLoss = comparedRegions.reduce((sum, r) => sum + r.loss, 0) / comparedRegions.length;
      const maxLoss = Math.max(...comparedRegions.map(r => r.loss));
      const minLoss = Math.min(...comparedRegions.map(r => r.loss));

      setComparisonData({
        type: 'regional',
        data: {
          regions: comparedRegions,
          avgLoss,
          maxLoss,
          minLoss,
          range: maxLoss - minLoss,
        },
      });
    }
  };

  const toggleRegionSelection = (regionName) => {
    setSelectedRegions(prev =>
      prev.includes(regionName) ? prev.filter(r => r !== regionName) : [...prev, regionName]
    );
  };

  const swapAnalyses = () => {
    const temp = beforeIndex;
    setBeforeIndex(afterIndex);
    setAfterIndex(temp);
  };

  if (comparisonType === 'temporal' && (!analysisHistory || analysisHistory.length < 2)) {
    return (
      <div className="comparison-container">
        <div className="comparison-type-selector">
          <button
            className={`type-btn ${comparisonType === 'temporal' ? 'active' : ''}`}
            onClick={() => setComparisonType('temporal')}
          >
            ⏳ Temporal (Time Period)
          </button>
          <button
            className={`type-btn ${comparisonType === 'regional' ? 'active' : ''}`}
            onClick={() => setComparisonType('regional')}
          >
            🌍 Regional (Regions)
          </button>
        </div>

        <div className="comparison-mode empty">
          <p>⚠️ Need at least 2 analyses to compare</p>
          <p style={{ fontSize: '14px', marginTop: '10px' }}>
            Run analysis on a region to generate historical data
          </p>
        </div>
      </div>
    );
  }

  if (comparisonType === 'regional' && regions.length < 2) {
    return (
      <div className="comparison-container">
        <div className="comparison-type-selector">
          <button
            className={`type-btn ${comparisonType === 'temporal' ? 'active' : ''}`}
            onClick={() => setComparisonType('temporal')}
          >
            ⏳ Temporal (Time Period)
          </button>
          <button
            className={`type-btn ${comparisonType === 'regional' ? 'active' : ''}`}
            onClick={() => setComparisonType('regional')}
          >
            🌍 Regional (Regions)
          </button>
        </div>

        <div className="comparison-mode empty">
          <p>⚠️ Need at least 2 regions to compare</p>
          <p style={{ fontSize: '14px', marginTop: '10px' }}>
            Analyze multiple regions from the Dashboard first
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="comparison-container">
      <div className="comparison-type-selector">
        <button
          className={`type-btn ${comparisonType === 'temporal' ? 'active' : ''}`}
          onClick={() => setComparisonType('temporal')}
        >
          ⏳ Temporal (Time Period)
        </button>
        <button
          className={`type-btn ${comparisonType === 'regional' ? 'active' : ''}`}
          onClick={() => setComparisonType('regional')}
        >
          🌍 Regional (Regions)
        </button>
      </div>

      {comparisonType === 'temporal' && (
        <div className="comparison-mode">
          <div className="comparison-header">
            <h3>⏳ Temporal Comparison</h3>
            <p className="subtitle">Compare vegetation loss across time periods</p>
          </div>

          <div className="temporal-selector-grid">
            <div className="temporal-selector-card before-card">
              <div className="temporal-selector-header">
                <span className="temporal-selector-icon">📍</span>
                <div>
                  <div className="temporal-selector-label">BEFORE</div>
                  <select 
                    value={beforeIndex} 
                    onChange={e => setBeforeIndex(parseInt(e.target.value))}
                    className="temporal-selector-dropdown"
                  >
                    {analysisHistory.map((analysis, idx) => (
                      <option key={idx} value={idx}>
                        Month {idx + 1} - {(analysis.vegetationLossPercentage || 0).toFixed(1)}% loss
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="temporal-selector-metrics">
                <div className="temporal-metric-item">
                  <div className="temporal-metric-value loss" style={{color: '#dc2626'}}>
                    {(beforeAnalysis?.vegetationLossPercentage || 0).toFixed(2)}%
                  </div>
                  <div className="temporal-metric-label">Vegetation Loss</div>
                  <div className="temporal-metric-description">
                    The percentage of vegetation that had degraded at this time period
                  </div>
                </div>
                
                <div className="temporal-metric-item">
                  <div className="temporal-metric-value ndvi" style={{color: '#3b82f6'}}>
                    {(beforeAnalysis?.ndvi?.mean || 0).toFixed(2)}
                  </div>
                  <div className="temporal-metric-label">NDVI Health Index</div>
                  <div className="temporal-metric-description">
                    Vegetation health score from -1 to +1. Higher = healthier vegetation
                  </div>
                </div>
              </div>
            </div>

            <button className="temporal-btn-swap" onClick={swapAnalyses} title="Swap before/after">
              ⇄
            </button>

            <div className="temporal-selector-card after-card">
              <div className="temporal-selector-header">
                <span className="temporal-selector-icon">📍</span>
                <div>
                  <div className="temporal-selector-label">AFTER</div>
                  <select 
                    value={afterIndex} 
                    onChange={e => setAfterIndex(parseInt(e.target.value))}
                    className="temporal-selector-dropdown"
                  >
                    {analysisHistory.map((analysis, idx) => (
                      <option key={idx} value={idx}>
                        Month {idx + 1} - {(analysis.vegetationLossPercentage || 0).toFixed(1)}% loss
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="temporal-selector-metrics">
                <div className="temporal-metric-item">
                  <div className="temporal-metric-value loss" style={{color: '#dc2626'}}>
                    {(afterAnalysis?.vegetationLossPercentage || 0).toFixed(2)}%
                  </div>
                  <div className="temporal-metric-label">Vegetation Loss</div>
                  <div className="temporal-metric-description">
                    The percentage of vegetation that had degraded at this time period
                  </div>
                </div>
                
                <div className="temporal-metric-item">
                  <div className="temporal-metric-value ndvi" style={{color: '#3b82f6'}}>
                    {(afterAnalysis?.ndvi?.mean || 0).toFixed(2)}
                  </div>
                  <div className="temporal-metric-label">NDVI Health Index</div>
                  <div className="temporal-metric-description">
                    Vegetation health score from -1 to +1. Higher = healthier vegetation
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button className="btn-compare" onClick={handleTemporalCompare}>
            🔍 Analyze Temporal Change
          </button>

          {comparisonData?.type === 'temporal' && renderTemporalResults(comparisonData.data)}
        </div>
      )}

      {comparisonType === 'regional' && (
        <div className="comparison-mode">
          <div className="comparison-header">
            <h3>🌍 Regional Comparison</h3>
            <p className="subtitle">Compare vegetation loss across regions</p>
          </div>

          <div className="region-selector">
            <label>Select 2+ regions to compare:</label>
            <div className="region-grid">
              {regions.map(region => (
                <label key={region.name} className="region-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedRegions.includes(region.name)}
                    onChange={() => toggleRegionSelection(region.name)}
                  />
                  <span className="region-label">
                    <span className="region-name">{region.name}</span>
                    <span className="region-risk" style={{ color: getRiskColor(region.latestMetrics?.riskLevel) }}>
                      {region.latestMetrics?.riskLevel || 'MEDIUM'}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <button
            className="btn-compare"
            onClick={handleRegionalCompare}
            disabled={selectedRegions.length < 2}
          >
            🔍 Compare {selectedRegions.length} Region{selectedRegions.length !== 1 ? 's' : ''}
          </button>

          {comparisonData?.type === 'regional' && renderRegionalResults(comparisonData.data, mapRef)}
        </div>
      )}
    </div>
  );
}

// Temporal Results with Visual Elements
function renderTemporalResults(data) {
  return (
    <div className="comparison-results">
      <h4>📊 Temporal Analysis Results</h4>

      {/* Side-by-Side Maps */}
      <div className="temporal-maps-section">
        <div className="temporal-map-pair">
          {/* Before Map */}
          <div className="temporal-map-container">
            <div className="temporal-map-title">📍 Before State</div>
            <MapContainer
              center={[0, 20]}
              zoom={5}
              className="temporal-map"
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap'
              />
              <Circle
                center={[0, 20]}
                radius={data.beforeLoss * 5000}
                color={getLossColor(data.beforeLoss).hex}
                fillOpacity={0.3}
                weight={3}
              >
                <Popup>
                  <div style={{ textAlign: 'center', fontSize: '12px' }}>
                    <strong>Before Period</strong><br/>
                    Loss: {data.beforeLoss.toFixed(1)}%<br/>
                    NDVI: {(data.beforeNDVI * 100).toFixed(0)}
                  </div>
                </Popup>
              </Circle>
            </MapContainer>
            <div className="temporal-map-stats">
              <div className="stat-item">
                <span className="stat-label">Loss %</span>
                <span className="stat-value" style={{color: getLossColor(data.beforeLoss).hex}}>
                  {data.beforeLoss.toFixed(1)}%
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">NDVI</span>
                <span className="stat-value">{(data.beforeNDVI * 100).toFixed(0)}</span>
              </div>
            </div>
          </div>

          {/* Comparison Arrow */}
          <div className="temporal-maps-arrow">
            <div className="arrow-icon">→</div>
            <div className="arrow-label">CHANGE</div>
          </div>

          {/* After Map */}
          <div className="temporal-map-container">
            <div className="temporal-map-title">📍 After State</div>
            <MapContainer
              center={[0, 20]}
              zoom={5}
              className="temporal-map"
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap'
              />
              <Circle
                center={[0, 20]}
                radius={data.afterLoss * 5000}
                color={getLossColor(data.afterLoss).hex}
                fillOpacity={0.5}
                weight={3}
              >
                <Popup>
                  <div style={{ textAlign: 'center', fontSize: '12px' }}>
                    <strong>After Period</strong><br/>
                    Loss: {data.afterLoss.toFixed(1)}%<br/>
                    NDVI: {(data.afterNDVI * 100).toFixed(0)}
                  </div>
                </Popup>
              </Circle>
            </MapContainer>
            <div className="temporal-map-stats">
              <div className="stat-item">
                <span className="stat-label">Loss %</span>
                <span className="stat-value" style={{color: getLossColor(data.afterLoss).hex}}>
                  {data.afterLoss.toFixed(1)}%
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">NDVI</span>
                <span className="stat-value">{(data.afterNDVI * 100).toFixed(0)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Statistics Grid with Descriptions */}
      <div className="unified-card-grid unified-card-grid-4col">
        <div className="unified-card unified-card-primary">
          <div className="unified-card-header">
            <span className="unified-card-icon">⏱️</span>
            <span className="unified-card-title">Time Period</span>
          </div>
          <div className="unified-card-body">
            <div className="unified-card-value">{data.daysElapsed}</div>
            <div className="unified-card-unit">Days</div>
            <div className="unified-card-description">
              The observation period between before and after measurements. Longer periods help distinguish natural variations from trends.
            </div>
          </div>
        </div>

        <div className="unified-card unified-card-primary">
          <div className="unified-card-header">
            <span className="unified-card-icon">📈</span>
            <span className="unified-card-title">Rate of Change</span>
          </div>
          <div className="unified-card-body">
            <div className="unified-card-value">{(data.percentChange / Math.max(data.daysElapsed, 1)).toFixed(3)}</div>
            <div className="unified-card-unit">% Per Day</div>
            <div className="unified-card-description">
              How fast vegetation is being lost (or recovering). Higher values indicate more rapid change—whether positive or negative.
            </div>
          </div>
        </div>

        <div className="unified-card unified-card-success">
          <div className="unified-card-header">
            <span className="unified-card-icon">🌿</span>
            <span className="unified-card-title">Vegetation Health Change</span>
          </div>
          <div className="unified-card-body">
            <div className="unified-card-value" style={{color: data.ndviChange < 0 ? '#dc2626' : '#22c55e'}}>
              {data.ndviChange < 0 ? '−' : '+'}{Math.abs(data.ndviChange).toFixed(3)}
            </div>
            <div className="unified-card-unit">NDVI Change</div>
            <div className="unified-card-description">
              Measures photosynthetic activity change. Negative values mean less healthy vegetation; positive means recovery and growth.
            </div>
          </div>
        </div>

        <div className={`unified-card ${data.percentChange > 0.5 ? 'unified-card-danger' : data.percentChange < -0.5 ? 'unified-card-success' : 'unified-card-primary'}`}>
          <div className="unified-card-header">
            <span className="unified-card-icon">🎯</span>
            <span className="unified-card-title">Overall Trend</span>
          </div>
          <div className="unified-card-body">
            <div className="unified-card-value" style={{
              color: data.percentChange > 0.5 ? '#dc2626' : data.percentChange < -0.5 ? '#22c55e' : '#6b7280'
            }}>
              {data.percentChange > 0.5 ? '📉' : data.percentChange < -0.5 ? '📈' : '→'}
            </div>
            <div className="unified-card-unit">
              {data.percentChange > 0.5 ? 'Worsening' : data.percentChange < -0.5 ? 'Improving' : 'Stable'}
            </div>
            <div className="unified-card-description">
              {data.percentChange > 0.5 
                ? "Forest is degrading rapidly. This trend suggests active threats like deforestation or disease."
                : data.percentChange < -0.5
                ? "Forest is recovering and healing. Conservation efforts or natural regrowth is working."
                : "Forest condition is stable. Current management practices are maintaining the status quo without significant change."}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards Section */}
      <div className="unified-card-grid unified-card-grid-4col">
        {/* Loss Before Card */}
        <div className={`unified-card unified-card-warning`}>
          <div className="unified-card-header">
            <span className="unified-card-icon">📉</span>
            <span className="unified-card-title">Vegetation Loss - Before</span>
          </div>
          <div className="unified-card-body">
            <div className="unified-card-value" style={{color: getLossColor(data.beforeLoss).hex}}>
              {data.beforeLoss.toFixed(1)}%
            </div>
            <div className="unified-card-status">{getLossInterpretation(data.beforeLoss)}</div>
            <div className="unified-card-description">
              {data.beforeLoss < 5 
                ? "✅ Minimal vegetation damage. The area is in good condition with healthy forest cover."
                : data.beforeLoss < 15
                ? "⚠️ Moderate vegetation loss. Some areas show degradation but recovery is still possible."
                : "🔴 Significant vegetation loss. Immediate intervention may be needed to prevent further damage."}
            </div>
          </div>
        </div>

        {/* Loss After Card */}
        <div className={`unified-card unified-card-danger`}>
          <div className="unified-card-header">
            <span className="unified-card-icon">📊</span>
            <span className="unified-card-title">Vegetation Loss - After</span>
          </div>
          <div className="unified-card-body">
            <div className="unified-card-value" style={{color: getLossColor(data.afterLoss).hex}}>
              {data.afterLoss.toFixed(1)}%
            </div>
            <div className="unified-card-status">{getLossInterpretation(data.afterLoss)}</div>
            <div className="unified-card-description">
              {data.afterLoss < 5 
                ? "✅ Minimal vegetation damage. The area is in good condition with healthy forest cover."
                : data.afterLoss < 15
                ? "⚠️ Moderate vegetation loss. Some areas show degradation but recovery is still possible."
                : "🔴 Significant vegetation loss. Immediate intervention may be needed to prevent further damage."}
            </div>
          </div>
        </div>

        {/* NDVI Card */}
        <div className={`unified-card unified-card-success`}>
          <div className="unified-card-header">
            <span className="unified-card-icon">🌿</span>
            <span className="unified-card-title">Vegetation Health Index (NDVI)</span>
          </div>
          <div className="unified-card-body">
            <div className="unified-card-value" style={{color: data.afterNDVI > 0.6 ? '#22c55e' : data.afterNDVI > 0.4 ? '#eab308' : '#dc2626'}}>
              {(data.afterNDVI * 100).toFixed(1)}/100
            </div>
            <div className="unified-card-status">{getNDVIInterpretation(data.afterNDVI)}</div>
            <div className="unified-card-description">
              {data.afterNDVI > 0.6
                ? "✅ Excellent vegetation health. Strong photosynthetic activity indicates robust forest growth."
                : data.afterNDVI > 0.4
                ? "⚠️ Moderate vegetation health. Plants are stressed but still functioning. Monitoring is recommended."
                : "🔴 Poor vegetation health. Vegetation is severely stressed or dead. Urgent action required."}
            </div>
          </div>
        </div>

        {/* Change Severity Card */}
        <div className={`unified-card ${data.percentChange > 0.5 ? 'unified-card-danger' : data.percentChange < -0.5 ? 'unified-card-success' : 'unified-card-primary'}`}>
          <div className="unified-card-header">
            <span className="unified-card-icon">{data.percentChange > 0 ? '📈' : '📉'}</span>
            <span className="unified-card-title">Change in Vegetation Loss</span>
          </div>
          <div className="unified-card-body">
            <div className="unified-card-value" style={{color: data.percentChange > 0 ? '#dc2626' : '#22c55e'}}>
              {data.percentChange > 0 ? '+' : ''}{data.percentChange.toFixed(1)}%
            </div>
            <div className="unified-card-status">
              {data.percentChange > 0.5 ? '🚨 Worsening' : data.percentChange < -0.5 ? '✅ Improving' : '→ Stable'}
            </div>
            <div className="unified-card-description">
              {data.percentChange > 0.5
                ? `Vegetation loss has increased by ${Math.abs(data.percentChange).toFixed(1)}%. This indicates accelerating forest degradation that requires immediate attention.`
                : data.percentChange < -0.5
                ? `Vegetation loss has decreased by ${Math.abs(data.percentChange).toFixed(1)}%. This indicates recovery and healing of the forest ecosystem.`
                : `Vegetation loss has remained relatively stable with minimal change. Current conservation efforts are maintaining status quo.`}
            </div>
          </div>
        </div>
      </div>

      {/* Narrative */}
      <div className="comparison-narrative">
        <p>
          Between <strong>{new Date(data.beforeDate).toLocaleDateString()}</strong> and{' '}
          <strong>{new Date(data.afterDate).toLocaleDateString()}</strong>, vegetation loss{' '}
          {data.percentChange > 0 ? 'increased' : 'decreased'} by{' '}
          <strong>{Math.abs(data.percentChange).toFixed(2)}%</strong> over{' '}
          <strong>{data.daysElapsed} days</strong> (average <strong>{(data.percentChange / Math.max(data.daysElapsed, 1)).toFixed(3)}%</strong> per day).
          This represents a <strong>
            {data.percentChange > 0.5
              ? 'significant worsening'
              : data.percentChange < -0.5
              ? 'recovery'
              : 'stable'}
          </strong>{' '}
          in vegetation health.
        </p>
      </div>
    </div>
  );
}

// Regional Results with Map and Visual Elements
function renderRegionalResults(data, mapRef) {
  // Check if this is a 2-region comparison (special focused view)
  const isTwoRegionComparison = data.regions.length === 2;
  
  // For 2-region comparison
  const region1 = isTwoRegionComparison ? data.regions[0] : null;
  const region2 = isTwoRegionComparison ? data.regions[1] : null;
  
  const lossDiff = isTwoRegionComparison ? Math.abs(region1.loss - region2.loss) : 0;
  const ndviDiff = isTwoRegionComparison ? Math.abs(region1.ndvi - region2.ndvi) : 0;
  const region1HasMoreLoss = isTwoRegionComparison && region1.loss > region2.loss;

  // Calculate map bounds to fit all regions with better zoom out
  const calculateBounds = () => {
    if (data.regions.length === 0) return [[0, 20], [0, 20]];
    const lats = data.regions.map(r => r.latitude);
    const lons = data.regions.map(r => r.longitude);
    
    // Calculate center and span
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    
    // Add larger margins for better zoom-out effect
    let latPadding = Math.max(5, (maxLat - minLat) * 0.4);
    let lonPadding = Math.max(5, (maxLon - minLon) * 0.4);
    
    // For 2-region comparison, zoom closer
    if (isTwoRegionComparison) {
      latPadding = Math.max(2, (maxLat - minLat) * 0.25);
      lonPadding = Math.max(2, (maxLon - minLon) * 0.25);
    }
    
    return [
      [minLat - latPadding, minLon - lonPadding],
      [maxLat + latPadding, maxLon + lonPadding]
    ];
  };

  const MapContent = () => {

    return (
      <>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        
        {/* For 2-region comparison: highlight and connect with arrow */}
        {isTwoRegionComparison && region1 && region2 && (
          <React.Fragment>
            {/* Thick solid comparison line */}
            <Polyline
              positions={[
                [region1.latitude, region1.longitude],
                [region2.latitude, region2.longitude],
              ]}
              pathOptions={{
                color: '#f59e0b',
                weight: 4,
                opacity: 0.8,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            
            {/* Arrow at midpoint */}
            <CircleMarker
              center={[
                (region1.latitude + region2.latitude) / 2,
                (region1.longitude + region2.longitude) / 2,
              ]}
              radius={14}
              pathOptions={{
                color: '#f59e0b',
                fillColor: '#fff',
                weight: 4,
                opacity: 1,
                fillOpacity: 1,
              }}
            >
              <Popup>
                <div style={{ fontSize: '13px', fontWeight: 'bold', minWidth: '180px' }}>
                  Comparing Two Regions:<br/>
                  <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 'normal' }}>
                    {region1.name} ↔ {region2.name}<br/>
                    Loss Difference: {lossDiff.toFixed(2)}%<br/>
                    NDVI Difference: {ndviDiff.toFixed(3)}
                  </span>
                </div>
              </Popup>
            </CircleMarker>

            {/* Large, distinct circles for both regions */}
            <Circle
              center={[region1.latitude, region1.longitude]}
              radius={Math.max(region1.loss * 5000, 15000)}
              pathOptions={{
                color: '#dc2626',
                fillColor: '#dc2626',
                fillOpacity: 0.35,
                weight: 5,
              }}
            >
              <Popup>
                <div style={{ minWidth: '200px', fontSize: '13px' }}>
                  <strong style={{ fontSize: '15px', color: '#dc2626' }}>{region1.name}</strong><br/>
                  Loss: <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#dc2626' }}>{region1.loss.toFixed(2)}%</span><br/>
                  NDVI: {region1.ndvi.toFixed(3)}<br/>
                  Risk: <span style={{ color: '#dc2626', fontWeight: 'bold' }}>{region1.riskLevel}</span>
                </div>
              </Popup>
            </Circle>

            <Circle
              center={[region2.latitude, region2.longitude]}
              radius={Math.max(region2.loss * 5000, 15000)}
              pathOptions={{
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.35,
                weight: 5,
              }}
            >
              <Popup>
                <div style={{ minWidth: '200px', fontSize: '13px' }}>
                  <strong style={{ fontSize: '15px', color: '#3b82f6' }}>{region2.name}</strong><br/>
                  Loss: <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#3b82f6' }}>{region2.loss.toFixed(2)}%</span><br/>
                  NDVI: {region2.ndvi.toFixed(3)}<br/>
                  Risk: <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>{region2.riskLevel}</span>
                </div>
              </Popup>
            </Circle>
          </React.Fragment>
        )}
        
        {/* For multi-region comparison (3+ regions) */}
        {!isTwoRegionComparison && data.regions.length > 1 && (
          <React.Fragment>
            {data.regions.map((region1, i) =>
              data.regions.slice(i + 1).map((region2, j) => (
                <React.Fragment key={`line-${i}-${i + 1 + j}`}>
                  {/* Connecting line */}
                  <Polyline
                    positions={[
                      [region1.latitude, region1.longitude],
                      [region2.latitude, region2.longitude],
                    ]}
                    pathOptions={{
                      color: '#3b82f6',
                      weight: 2,
                      opacity: 0.5,
                      dashArray: '5, 5',
                    }}
                  />
                  {/* Comparison indicator at midpoint */}
                  <CircleMarker
                    center={[
                      (region1.latitude + region2.latitude) / 2,
                      (region1.longitude + region2.longitude) / 2,
                    ]}
                    radius={10}
                    pathOptions={{
                      color: '#f97316',
                      fillColor: '#fff',
                      weight: 3,
                      opacity: 1,
                      fillOpacity: 1,
                    }}
                  >
                    <Popup>
                      <div style={{ fontSize: '12px', fontWeight: 'bold' }}>
                        Comparing:<br/>
                        {region1.name} vs {region2.name}<br/>
                        Difference: {Math.abs(region1.loss - region2.loss).toFixed(1)}%
                      </div>
                    </Popup>
                  </CircleMarker>
                </React.Fragment>
              ))
            )}
          </React.Fragment>
        )}

        {/* Region circles and markers */}
        {data.regions.map((region, idx) => {
          const isHighestLoss = region.loss === data.maxLoss;
          const isLowestLoss = region.loss === data.minLoss;
          
          // Skip if already rendered in 2-region comparison
          if (isTwoRegionComparison) return null;
          
          return (
            <React.Fragment key={idx}>
              {/* Main loss circle */}
              <Circle
                center={[region.latitude, region.longitude]}
                radius={Math.max(region.loss * 5000, 10000)}
                pathOptions={{
                  color: getRiskColor(region.riskLevel),
                  fillColor: getRiskColor(region.riskLevel),
                  fillOpacity: isHighestLoss ? 0.5 : isLowestLoss ? 0.3 : 0.4,
                  weight: isHighestLoss || isLowestLoss ? 4 : 2,
                  dashArray: isHighestLoss ? '5, 5' : 'none',
                }}
              >
                <Popup>
                  <div style={{ minWidth: '150px', fontSize: '13px' }}>
                    <strong style={{ fontSize: '14px' }}>{region.name}</strong><br/>
                    Loss: <span style={{ color: getRiskColor(region.riskLevel), fontWeight: 'bold' }}>{region.loss.toFixed(2)}%</span><br/>
                    NDVI: {region.ndvi.toFixed(3)}<br/>
                    Risk: <span style={{ color: getRiskColor(region.riskLevel) }}>{region.riskLevel}</span><br/>
                    {isHighestLoss && <span style={{ color: '#dc2626', fontWeight: 'bold' }}>⚠️ Highest Loss</span>}
                    {isLowestLoss && <span style={{ color: '#22c55e', fontWeight: 'bold' }}>✅ Best Condition</span>}
                  </div>
                </Popup>
              </Circle>

              {/* Region label marker */}
              <Marker position={[region.latitude, region.longitude]}>
                <Popup>
                  <div style={{ textAlign: 'center', fontWeight: 'bold' }}>
                    {region.name}
                    <br/>
                    <span style={{ fontSize: '12px', color: getRiskColor(region.riskLevel) }}>
                      {region.loss.toFixed(1)}% Loss
                    </span>
                  </div>
                </Popup>
              </Marker>

              {/* Highlight badges for highest/lowest */}
              {isHighestLoss && (
                <CircleMarker
                  center={[region.latitude + 0.3, region.longitude]}
                  radius={8}
                  pathOptions={{
                    color: '#dc2626',
                    fillColor: '#dc2626',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 1,
                  }}
                >
                  <Popup>Highest Loss Region</Popup>
                </CircleMarker>
              )}

              {isLowestLoss && (
                <CircleMarker
                  center={[region.latitude - 0.3, region.longitude]}
                  radius={8}
                  pathOptions={{
                    color: '#22c55e',
                    fillColor: '#22c55e',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 1,
                  }}
                >
                  <Popup>Best Condition Region</Popup>
                </CircleMarker>
              )}
            </React.Fragment>
          );
        })}
      </>
    );
  };

  return (
    <div className="comparison-results">
      <h4>📊 Regional Comparison Results</h4>

      {/* Interactive comparison map */}
      <div className="comparison-map-container" style={{ position: 'relative' }}>
        <div className="map-legend">
          <div className="legend-item">
            <span style={{ color: '#dc2626', fontWeight: 'bold' }}>●</span> Highest Loss
          </div>
          <div className="legend-item">
            <span style={{ color: '#22c55e', fontWeight: 'bold' }}>●</span> Best Condition
          </div>
          <div className="legend-item">
            <span style={{ color: '#f97316', fontWeight: 'bold' }}>◆</span> Comparison Indicator
          </div>
          <div className="legend-item">
            <span style={{ color: '#3b82f6' }}>- - -</span> Region Comparison Line
          </div>
        </div>
        <MapContainer
          center={[
            data.regions.reduce((sum, r) => sum + r.latitude, 0) / data.regions.length,
            data.regions.reduce((sum, r) => sum + r.longitude, 0) / data.regions.length,
          ]}
          zoom={4}
          className="comparison-map"
          style={{ position: 'relative' }}
          ref={mapRef}
        >
          <MapContent />
        </MapContainer>
      </div>

      {/* Special 2-Region Comparison Stats */}
      {isTwoRegionComparison && region1 && region2 && (
        <div className="two-region-comparison-stats">
          <h4>🔄 Direct Comparison: {region1.name} vs {region2.name}</h4>
          
          <div className="comparison-stats-grid">
            {/* Region 1 Stats */}
            <div className="region-stat-card region-1">
              <div className="stat-region-name">{region1.name}</div>
              <div className="stat-metric">
                <div className="stat-label">Vegetation Loss</div>
                <div className="stat-value" style={{color: '#dc2626'}}>{region1.loss.toFixed(2)}%</div>
              </div>
              <div className="stat-metric">
                <div className="stat-label">NDVI Health</div>
                <div className="stat-value">{region1.ndvi.toFixed(3)}</div>
              </div>
              <div className="stat-metric">
                <div className="stat-label">Risk Level</div>
                <div className="stat-value" style={{color: getRiskColor(region1.riskLevel)}}>{region1.riskLevel}</div>
              </div>
            </div>

            {/* Difference Stats - Center */}
            <div className="difference-stats">
              <div className="diff-title">Difference</div>
              <div className="diff-metric">
                <div className="diff-label">Loss Difference</div>
                <div className="diff-value" style={{color: region1HasMoreLoss ? '#dc2626' : '#22c55e'}}>
                  {region1HasMoreLoss ? '+' : '-'}{lossDiff.toFixed(2)}%
                </div>
                <div className="diff-desc">{region1HasMoreLoss ? region1.name : region2.name} has more loss</div>
              </div>
              <div className="diff-metric">
                <div className="diff-label">NDVI Difference</div>
                <div className="diff-value" style={{color: region1.ndvi > region2.ndvi ? '#22c55e' : '#dc2626'}}>
                  {region1.ndvi > region2.ndvi ? '+' : '-'}{ndviDiff.toFixed(3)}
                </div>
                <div className="diff-desc">{region1.ndvi > region2.ndvi ? region1.name : region2.name} is healthier</div>
              </div>
            </div>

            {/* Region 2 Stats */}
            <div className="region-stat-card region-2">
              <div className="stat-region-name">{region2.name}</div>
              <div className="stat-metric">
                <div className="stat-label">Vegetation Loss</div>
                <div className="stat-value" style={{color: '#3b82f6'}}>{region2.loss.toFixed(2)}%</div>
              </div>
              <div className="stat-metric">
                <div className="stat-label">NDVI Health</div>
                <div className="stat-value">{region2.ndvi.toFixed(3)}</div>
              </div>
              <div className="stat-metric">
                <div className="stat-label">Risk Level</div>
                <div className="stat-value" style={{color: getRiskColor(region2.riskLevel)}}>{region2.riskLevel}</div>
              </div>
            </div>
          </div>

          {/* Narrative Comparison */}
          <div className="comparison-narrative">
            <strong>Summary:</strong> {region1.name} has {region1HasMoreLoss ? 'more' : 'less'} vegetation loss ({lossDiff.toFixed(2)}% difference). 
            {region1.ndvi > region2.ndvi ? 
              `${region1.name} shows better overall vegetation health with an NDVI of ${region1.ndvi.toFixed(3)} compared to ${region2.name}'s ${region2.ndvi.toFixed(3)}.` :
              `${region2.name} shows better overall vegetation health with an NDVI of ${region2.ndvi.toFixed(3)} compared to ${region1.name}'s ${region1.ndvi.toFixed(3)}.`
            }
          </div>
        </div>
      )}

      {/* Regional Summary Cards - Show for all comparisons */}
      {!isTwoRegionComparison && (
        <>
      <div className="unified-card-grid unified-card-grid-4col">
        <div className="unified-card unified-card-primary">
          <div className="unified-card-header">
            <span className="unified-card-icon">📊</span>
            <span className="unified-card-title">Average Vegetation Loss</span>
          </div>
          <div className="unified-card-body">
            <div className="unified-card-value">{data.avgLoss.toFixed(2)}%</div>
            <div className="unified-card-description">
              The average vegetation loss across all regions. This gives an overall view of the combined impact on the monitored area.
            </div>
          </div>
        </div>

        <div className="unified-card unified-card-danger">
          <div className="unified-card-header">
            <span className="unified-card-icon">🔴</span>
            <span className="unified-card-title">Highest Loss Region</span>
          </div>
          <div className="unified-card-body">
            <div className="unified-card-value" style={{color: '#dc2626'}}>{data.maxLoss.toFixed(2)}%</div>
            <div className="unified-card-description">
              The region with the most severe vegetation loss. This requires immediate attention and investigation.
            </div>
          </div>
        </div>

        <div className="unified-card unified-card-success">
          <div className="unified-card-header">
            <span className="unified-card-icon">🟢</span>
            <span className="unified-card-title">Best Condition Region</span>
          </div>
          <div className="unified-card-body">
            <div className="unified-card-value" style={{color: '#22c55e'}}>{data.minLoss.toFixed(2)}%</div>
            <div className="unified-card-description">
              The healthiest region with minimal vegetation loss. This can serve as a reference for conservation standards.
            </div>
          </div>
        </div>

        <div className="unified-card unified-card-primary">
          <div className="unified-card-header">
            <span className="unified-card-icon">📈</span>
            <span className="unified-card-title">Loss Variation Range</span>
          </div>
          <div className="unified-card-body">
            <div className="unified-card-value">{data.range.toFixed(2)}%</div>
            <div className="unified-card-description">
              Difference between highest and lowest loss. Higher values indicate uneven forest health across regions.
            </div>
          </div>
        </div>
      </div>
        </>
      )}

      {/* Regional Breakdown with Visual Bars - Hide for 2-region comparison */}
      {!isTwoRegionComparison && (
        <>
          {/* Comparative Ranking */}
          <div className="ranking-section">
            <div className="regional-breakdown">
              <h5>📍 Region-by-Region Breakdown</h5>
              <div className="regional-visual-list">
                {data.regions.map((region, idx) => (
                  <div key={idx} className="regional-item">
                    <div className="regional-info">
                      <div className="region-name-badge">{region.name}</div>
                      <div className="region-loss-badge" style={{ color: getRiskColor(region.riskLevel) }}>
                        {region.loss.toFixed(1)}% • {region.riskLevel}
                      </div>
                    </div>
                    <div className="regional-visual">
                      <div className="loss-bar-container">
                        <div
                          className="loss-bar"
                          style={{
                            width: `${Math.min(region.loss * 1.5, 200)}px`,
                            background: getLossGradient(region.loss),
                          }}
                        />
                      </div>
                      <div className="ndvi-indicator">
                        <span>NDVI: {region.ndvi.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Comparative Ranking */}
            <div className="ranking-section">
              <h5>🏆 Region Rankings</h5>
              <div className="ranking-table">
                {data.regions
                  .sort((a, b) => b.loss - a.loss)
                  .map((region, rank) => (
                    <div key={region.name} className="ranking-row">
                      <div className="rank-badge">#{rank + 1}</div>
                      <div className="rank-name">{region.name}</div>
                      <div className="rank-loss">{region.loss.toFixed(1)}%</div>
                      <div className="rank-risk" style={{ color: getRiskColor(region.riskLevel) }}>
                        {region.riskLevel}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Narrative */}
            <div className="comparison-narrative">
              <p>
                Comparing <strong>{data.regions.length}</strong> regions shows vegetation loss ranging from{' '}
                <strong>{data.minLoss.toFixed(2)}%</strong> to <strong>{data.maxLoss.toFixed(2)}%</strong> with an
                average of <strong>{data.avgLoss.toFixed(2)}%</strong>. The region with the highest loss is{' '}
                <strong>
                  {data.regions.reduce((max, r) => (r.loss > max.loss ? r : max)).name}
                </strong>{' '}
                and the most stable is{' '}
                <strong>
                  {data.regions.reduce((min, r) => (r.loss < min.loss ? r : min)).name}
                </strong>
                . A range of {data.range.toFixed(2)}% indicates significant variation in vegetation loss across regions.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Helper functions
function getLossGradient(loss) {
  if (loss < 5) return 'linear-gradient(180deg, #22c55e, #16a34a)';
  if (loss < 15) return 'linear-gradient(180deg, #eab308, #ca8a04)';
  if (loss < 30) return 'linear-gradient(180deg, #f97316, #ea580c)';
  return 'linear-gradient(180deg, #dc2626, #b91c1c)';
}

function getLossInterpretation(loss) {
  if (loss < 5) return 'Healthy';
  if (loss < 15) return 'Moderate Loss';
  if (loss < 30) return 'Significant Loss';
  return 'Critical Loss';
}

function getNDVIInterpretation(ndvi) {
  if (ndvi > 0.6) return 'Excellent Health';
  if (ndvi > 0.4) return 'Moderate Health';
  if (ndvi > 0.2) return 'Poor Health';
  return 'Dead/No Vegetation';
}

function getLossColor(loss) {
  if (loss < 5) return { hex: '#22c55e', name: 'LOW' };
  if (loss < 15) return { hex: '#eab308', name: 'MEDIUM' };
  if (loss < 30) return { hex: '#f97316', name: 'HIGH' };
  return { hex: '#dc2626', name: 'CRITICAL' };
}

function getSeverityColor(percentChange) {
  if (percentChange > 30) return 'linear-gradient(90deg, #dc3545, #c82333)';
  if (percentChange > 15) return 'linear-gradient(90deg, #ffc107, #ff9800)';
  if (percentChange > 5) return 'linear-gradient(90deg, #ffc107, #ffeb3b)';
  if (percentChange < -5) return 'linear-gradient(90deg, #28a745, #20c997)';
  return 'linear-gradient(90deg, #6c757d, #5a6268)';
}

function getRiskColor(riskLevel) {
  switch (riskLevel?.toUpperCase()) {
    case 'LOW':
      return '#22c55e';
    case 'MEDIUM':
      return '#eab308';
    case 'HIGH':
      return '#f97316';
    case 'CRITICAL':
      return '#dc2626';
    default:
      return '#6b7280';
  }
}

export default ComparisonMode;
