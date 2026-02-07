import React, { useState, useEffect } from 'react';
import './MultiRegionDashboard.css';

/**
 * MultiRegionDashboard Component
 * Displays all monitored regions in a table with key metrics
 * 
 * Supports both dummy data and API:
 * - Dummy mode: Uses LOCAL_DUMMY_REGIONS (development)
 * - API mode: Fetches from /api/regions (production)
 * 
 * API Response Format Expected:
 * {
 *   data: [
 *     {
 *       _id: "region1",
 *       name: "Northern Forest",
 *       lastScanDate: "2026-01-24T10:30:00Z",
 *       latestMetrics: {
 *         vegetationLoss: 45.2,
 *         riskLevel: "HIGH",
 *         confidence: 0.92,
 *         trend: "increasing"
 *       },
 *       tags: ["forest", "critical"]
 *     }
 *   ]
 * }
 */

// DUMMY DATA - Remove or comment out when API is ready
const LOCAL_DUMMY_REGIONS = [
  {
    _id: '1',
    name: 'Northern Forest Reserve',
    latitude: 25.65,
    longitude: 84.12,
    lastScanDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    latestMetrics: {
      vegetationLoss: 45.2,
      riskLevel: 'HIGH',
      confidence: 0.92,
      trend: 'increasing'
    },
    tags: ['forest', 'critical']
  },
  {
    _id: '2',
    name: 'Eastern Valley Park',
    latitude: 2.253,
    longitude: 32.003,
    lastScanDate: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    latestMetrics: {
      vegetationLoss: 52.8,
      riskLevel: 'HIGH',
      confidence: 0.89,
      trend: 'increasing'
    },
    tags: ['valley', 'urgent']
  },
  {
    _id: '3',
    name: 'Western Ridge Sanctuary',
    latitude: -1.021,
    longitude: 15.909,
    lastScanDate: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    latestMetrics: {
      vegetationLoss: 22.5,
      riskLevel: 'MEDIUM',
      confidence: 0.85,
      trend: 'stable'
    },
    tags: ['ridge', 'monitoring']
  },
  {
    _id: '4',
    name: 'Central Wetlands',
    latitude: -4.338,
    longitude: 20.823,
    lastScanDate: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    latestMetrics: {
      vegetationLoss: 18.3,
      riskLevel: 'MEDIUM',
      confidence: 0.88,
      trend: 'decreasing'
    },
    tags: ['wetland', 'ecosystem']
  },
  {
    _id: '5',
    name: 'Southern Grassland',
    latitude: -5.5,
    longitude: 25.0,
    lastScanDate: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    latestMetrics: {
      vegetationLoss: 8.2,
      riskLevel: 'LOW',
      confidence: 0.91,
      trend: 'stable'
    },
    tags: ['grassland', 'healthy']
  },
  {
    _id: '6',
    name: 'Coastal Forest Belt',
    latitude: 0.5,
    longitude: 30.0,
    lastScanDate: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    latestMetrics: {
      vegetationLoss: 5.1,
      riskLevel: 'LOW',
      confidence: 0.94,
      trend: 'decreasing'
    },
    tags: ['coastal', 'stable']
  }
];

export function MultiRegionDashboard({ onSelectRegion }) {
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('lastScanDate');
  const [filterRisk, setFilterRisk] = useState('ALL');
  const [viewMode, setViewMode] = useState('grouped'); // 'grouped' or 'table'
  const [useAPI, setUseAPI] = useState(false); // Set to true when API is ready

  // Handle region selection with error handling
  const handleSelectRegion = (region) => {
    if (onSelectRegion) {
      onSelectRegion(region);
    } else {
      console.warn('[MultiRegionDashboard] onSelectRegion callback not provided!');
    }
  };

  useEffect(() => {
    fetchRegions();
    // Refresh every 30 seconds
    const interval = setInterval(fetchRegions, 30000);
    return () => clearInterval(interval);
  }, [useAPI]);

  /**
   * Fetches regions from API or uses dummy data
   * Switch useAPI to true when backend is ready
   */
  const fetchRegions = async () => {
    try {
      setLoading(true);
      setError(null);

      let data;

      if (useAPI) {
        // API MODE - Uncomment when backend is ready
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch('/api/regions', {
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

        data = await response.json();
        setRegions(data.data || []);
      } else {
        // DUMMY DATA MODE - For development
        // When API is ready, this will be replaced by API call above
        setRegions(LOCAL_DUMMY_REGIONS);
      }
    } catch (err) {
      console.warn('Region fetch error:', err.message);
      // Fallback to dummy data if API fails
      if (useAPI) {
        setRegions(LOCAL_DUMMY_REGIONS);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = riskLevel => {
    const colors = {
      HIGH: '#dc3545',
      MEDIUM: '#ffc107',
      LOW: '#28a745',
    };
    return colors[riskLevel] || '#6c757d';
  };

  const getTrendIcon = trend => {
    switch (trend) {
      case 'increasing':
        return '📈';
      case 'decreasing':
        return '📉';
      default:
        return '→';
    }
  };

  const formatDate = dateString => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now - date) / (1000 * 60 * 60));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  let filteredRegions = regions;
  if (filterRisk !== 'ALL') {
    filteredRegions = regions.filter(r => r.latestMetrics?.riskLevel === filterRisk);
  }

  // Sort
  filteredRegions.sort((a, b) => {
    if (sortBy === 'lastScanDate') {
      const aDate = new Date(a.lastScanDate || 0);
      const bDate = new Date(b.lastScanDate || 0);
      return bDate - aDate;
    } else if (sortBy === 'vegetationLoss') {
      return (b.latestMetrics?.vegetationLoss || 0) - (a.latestMetrics?.vegetationLoss || 0);
    } else if (sortBy === 'riskLevel') {
      const riskOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      const aRisk = riskOrder[a.latestMetrics?.riskLevel || 'LOW'] || 0;
      const bRisk = riskOrder[b.latestMetrics?.riskLevel || 'LOW'] || 0;
      return bRisk - aRisk;
    }
    return 0;
  });

  if (loading) {
    return (
      <div className="multi-region-dashboard loading">
        <div className="spinner"></div>
        <p>Loading regions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="multi-region-dashboard error">
        <p>❌ {error}</p>
      </div>
    );
  }

  return (
    <div className="multi-region-dashboard">
      <div className="dashboard-header">
        <h2>🗺️ Multi-Region Monitoring Dashboard</h2>
        <div className="header-stats">
          <div className="stat">
            <span className="stat-value">{regions.length}</span>
            <span className="stat-label">Regions</span>
          </div>
          <div className="stat">
            <span className="stat-value" style={{ color: '#dc3545' }}>
              {regions.filter(r => r.latestMetrics?.riskLevel === 'HIGH').length}
            </span>
            <span className="stat-label">High Risk</span>
          </div>
          <div className="stat">
            <span className="stat-value" style={{ color: '#ffc107' }}>
              {regions.filter(r => r.latestMetrics?.riskLevel === 'MEDIUM').length}
            </span>
            <span className="stat-label">Medium Risk</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="dashboard-controls">
        <div className="control-group">
          <label>Sort by:</label>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="lastScanDate">Last Scanned</option>
            <option value="vegetationLoss">Vegetation Loss %</option>
            <option value="riskLevel">Risk Level</option>
          </select>
        </div>

        <div className="control-group">
          <label>Filter by Risk:</label>
          <select value={filterRisk} onChange={e => setFilterRisk(e.target.value)}>
            <option value="ALL">All Levels</option>
            <option value="HIGH">High Risk</option>
            <option value="MEDIUM">Medium Risk</option>
            <option value="LOW">Low Risk</option>
          </select>
        </div>

        <button className="btn-refresh" onClick={fetchRegions}>
          🔄 Refresh
        </button>

        <div className="view-mode-toggle">
          <button 
            className={`btn-view ${viewMode === 'grouped' ? 'active' : ''}`}
            onClick={() => setViewMode('grouped')}
            title="Group by risk level"
          >
            📊 Grouped
          </button>
          <button 
            className={`btn-view ${viewMode === 'table' ? 'active' : ''}`}
            onClick={() => setViewMode('table')}
            title="Table view"
          >
            📋 Table
          </button>
        </div>
      </div>

      {/* GROUPED VIEW - By Risk Level */}
      {viewMode === 'grouped' && (
        <div className="grouped-view">
          {/* HIGH RISK */}
          {regions.filter(r => r.latestMetrics?.riskLevel === 'HIGH').length > 0 && (
            <div className="risk-group risk-group-high">
              <div className="group-header">
                <h3>🔴 HIGH RISK ({regions.filter(r => r.latestMetrics?.riskLevel === 'HIGH').length})</h3>
                <p className="group-subtitle">Immediate attention required</p>
              </div>
              <div className="regions-grid">
                {regions.filter(r => r.latestMetrics?.riskLevel === 'HIGH').map(region => (
                  <div key={region._id} className="region-card risk-card-high">
                    <div className="card-header">
                      <div className="card-title-section">
                        <h4>{region.name}</h4>
                        <span className="risk-badge-card high">🔴 HIGH RISK</span>
                      </div>
                    </div>
                    <div className="card-body">
                      <div className="metric-group">
                        <div className="metric">
                          <span className="label">Vegetation Loss</span>
                          <span className="value" style={{color: '#dc2626'}}>{(region.latestMetrics?.vegetationLoss || 0).toFixed(2)}%</span>
                        </div>
                        <div className="metric-description">
                          Significant vegetation damage detected. Immediate investigation recommended.
                        </div>
                      </div>
                      <div className="metric-divider"></div>
                      <div className="metric">
                        <span className="label">Last Scanned</span>
                        <span className="value">{formatDate(region.lastScanDate)}</span>
                      </div>
                      <div className="metric">
                        <span className="label">Confidence Level</span>
                        <span className="value">{((region.latestMetrics?.confidence || 0) * 100).toFixed(0)}%</span>
                      </div>
                      <div className="metric">
                        <span className="label">Trend</span>
                        <span className="value">{getTrendIcon(region.latestMetrics?.trend)} {region.latestMetrics?.trend || 'stable'}</span>
                      </div>
                    </div>
                    <div className="card-footer">
                      <button
                        className="btn-view-region"
                        onClick={() => handleSelectRegion(region)}
                      >
                        📍 View Full Analysis
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MEDIUM RISK */}
          {regions.filter(r => r.latestMetrics?.riskLevel === 'MEDIUM').length > 0 && (
            <div className="risk-group risk-group-medium">
              <div className="group-header">
                <h3>🟡 MEDIUM RISK ({regions.filter(r => r.latestMetrics?.riskLevel === 'MEDIUM').length})</h3>
                <p className="group-subtitle">Monitor closely for changes</p>
              </div>
              <div className="regions-grid">
                {regions.filter(r => r.latestMetrics?.riskLevel === 'MEDIUM').map(region => (
                  <div key={region._id} className="region-card risk-card-medium">
                    <div className="card-header">
                      <div className="card-title-section">
                        <h4>{region.name}</h4>
                        <span className="risk-badge-card medium">🟡 MEDIUM RISK</span>
                      </div>
                    </div>
                    <div className="card-body">
                      <div className="metric-group">
                        <div className="metric">
                          <span className="label">Vegetation Loss</span>
                          <span className="value" style={{color: '#f97316'}}>{(region.latestMetrics?.vegetationLoss || 0).toFixed(2)}%</span>
                        </div>
                        <div className="metric-description">
                          Moderate vegetation loss detected. Regular monitoring recommended.
                        </div>
                      </div>
                      <div className="metric-divider"></div>
                      <div className="metric">
                        <span className="label">Last Scanned</span>
                        <span className="value">{formatDate(region.lastScanDate)}</span>
                      </div>
                      <div className="metric">
                        <span className="label">Confidence Level</span>
                        <span className="value">{((region.latestMetrics?.confidence || 0) * 100).toFixed(0)}%</span>
                      </div>
                      <div className="metric">
                        <span className="label">Trend</span>
                        <span className="value">{getTrendIcon(region.latestMetrics?.trend)} {region.latestMetrics?.trend || 'stable'}</span>
                      </div>
                    </div>
                    <div className="card-footer">
                      <button
                        className="btn-view-region"
                        onClick={() => handleSelectRegion(region)}
                      >
                        📍 View Full Analysis
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LOW RISK */}
          {regions.filter(r => r.latestMetrics?.riskLevel === 'LOW').length > 0 && (
            <div className="risk-group risk-group-low">
              <div className="group-header">
                <h3>🟢 LOW RISK ({regions.filter(r => r.latestMetrics?.riskLevel === 'LOW').length})</h3>
                <p className="group-subtitle">Healthy regions - routine monitoring</p>
              </div>
              <div className="regions-grid">
                {regions.filter(r => r.latestMetrics?.riskLevel === 'LOW').map(region => (
                  <div key={region._id} className="region-card risk-card-low">
                    <div className="card-header">
                      <div className="card-title-section">
                        <h4>{region.name}</h4>
                        <span className="risk-badge-card low">🟢 LOW RISK</span>
                      </div>
                    </div>
                    <div className="card-body">
                      <div className="metric-group">
                        <div className="metric">
                          <span className="label">Vegetation Loss</span>
                          <span className="value" style={{color: '#22c55e'}}>{(region.latestMetrics?.vegetationLoss || 0).toFixed(2)}%</span>
                        </div>
                        <div className="metric-description">
                          Healthy vegetation cover. Minimal loss detected. Area is stable.
                        </div>
                      </div>
                      <div className="metric-divider"></div>
                      <div className="metric">
                        <span className="label">Last Scanned</span>
                        <span className="value">{formatDate(region.lastScanDate)}</span>
                      </div>
                      <div className="metric">
                        <span className="label">Confidence Level</span>
                        <span className="value">{((region.latestMetrics?.confidence || 0) * 100).toFixed(0)}%</span>
                      </div>
                      <div className="metric">
                        <span className="label">Trend</span>
                        <span className="value">{getTrendIcon(region.latestMetrics?.trend)} {region.latestMetrics?.trend || 'stable'}</span>
                      </div>
                    </div>
                    <div className="card-footer">
                      <button
                        className="btn-view-region"
                        onClick={() => handleSelectRegion(region)}
                      >
                        📍 View Full Analysis
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {regions.length === 0 && (
            <div className="empty-state">
              <p>📍 No regions available</p>
            </div>
          )}
        </div>
      )}

      {/* TABLE VIEW - Original */}
      {viewMode === 'table' && (
        <>
          {filteredRegions.length === 0 ? (
            <div className="empty-state">
              <p>📍 No regions match your filter</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="regions-table">
                <thead>
                  <tr>
                    <th>Region Name</th>
                    <th>Last Scan</th>
                    <th>Vegetation Loss</th>
                <th>Risk Level</th>
                <th>Trend</th>
                <th>Confidence</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRegions.map(region => (
                <tr key={region._id} className={`risk-${region.latestMetrics?.riskLevel?.toLowerCase() || 'low'}`}>
                  <td className="region-name">
                    <div className="name-container">
                      <span className="name">{region.name}</span>
                      <span className="tags">
                        {region.tags?.map((tag, idx) => (
                          <span key={idx} className="tag">
                            {tag}
                          </span>
                        ))}
                      </span>
                    </div>
                  </td>

                  <td className="last-scan">
                    <span title={region.lastScanDate?.toString()}>
                      {formatDate(region.lastScanDate)}
                    </span>
                  </td>

                  <td className="vegetation-loss">
                    <div className="loss-bar">
                      <div className="loss-fill" style={{ width: `${region.latestMetrics?.vegetationLoss || 0}%` }}></div>
                    </div>
                    <span className="loss-percent">{(region.latestMetrics?.vegetationLoss || 0).toFixed(2)}%</span>
                  </td>

                  <td className="risk-level">
                    <span
                      className="risk-badge"
                      style={{
                        borderColor: getRiskColor(region.latestMetrics?.riskLevel),
                        color: getRiskColor(region.latestMetrics?.riskLevel),
                      }}
                    >
                      {region.latestMetrics?.riskLevel || 'MEDIUM'}
                    </span>
                  </td>

                  <td className="trend">
                    <span className="trend-icon">{getTrendIcon(region.latestMetrics?.trend)}</span>
                    {region.latestMetrics?.trend || 'stable'}
                  </td>

                  <td className="confidence">
                    <div className="confidence-mini">
                      <div className="conf-bar">
                        <div
                          className="conf-fill"
                          style={{
                            width: `${(region.latestMetrics?.confidence || 0) * 100}%`,
                          }}
                        ></div>
                      </div>
                      <span className="conf-text">{((region.latestMetrics?.confidence || 0) * 100).toFixed(0)}%</span>
                    </div>
                  </td>

                  <td className="actions">
                    <button
                      className="btn-action"
                      onClick={() => handleSelectRegion(region)}
                      title="View on map"
                    >
                      🗺️ View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
