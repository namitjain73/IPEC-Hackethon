import React, { useState, useEffect } from 'react';
import './SystemStatusBar.css';
import { api } from '../services/api';

/**
 * SystemStatusBar Component
 * Displays real-time system health and status indicators
 */
export function SystemStatusBar() {
  const [status, setStatus] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkStatus();
    // Check every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    try {
      const response = await api.get('/system/status');
      setStatus(response.data.status);
    } catch (error) {
      console.error('Error checking status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !status) {
    return <div className="system-status-bar loading">Checking system...</div>;
  }

  const mlConnected = status.mlApi?.connected;
  const dbConnected = status.database?.connected;
  const imageryAvailable = status.imagery?.available;

  const getStatusColor = connected => (connected ? '#28a745' : '#dc3545');
  const getStatusIcon = connected => (connected ? '✅' : '❌');

  const formatTime = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="system-status-bar">
      <div className="status-indicators">
        <div className="indicator" onClick={() => setShowDetails(!showDetails)}>
          <span className="indicator-icon">{getStatusIcon(mlConnected)}</span>
          <span className="indicator-label">ML API</span>
          <span className="indicator-value" style={{ color: getStatusColor(mlConnected) }}>
            {mlConnected ? 'Connected' : 'Offline'}
          </span>
        </div>

        <div className="divider"></div>

        <div className="indicator">
          <span className="indicator-icon">{getStatusIcon(dbConnected)}</span>
          <span className="indicator-label">Database</span>
          <span className="indicator-value" style={{ color: getStatusColor(dbConnected) }}>
            {dbConnected ? 'Connected' : 'Offline'}
          </span>
        </div>

        <div className="divider"></div>

        <div className="indicator">
          <span className="indicator-icon">{imageryAvailable ? '📡' : '📡'}</span>
          <span className="indicator-label">Imagery</span>
          <span className="indicator-value" style={{ color: imageryAvailable ? '#28a745' : '#999' }}>
            {imageryAvailable ? 'Available' : 'Unavailable'}
          </span>
        </div>

        <div className="divider"></div>

        <div className="indicator">
          <span className="indicator-icon">⏱️</span>
          <span className="indicator-label">Last Scan</span>
          <span className="indicator-value">{formatTime(status.lastDetectionRun)}</span>
        </div>
      </div>

      {/* System healthy indicator */}
      <div className="overall-status" style={{ background: status.systemHealthy ? '#d4edda' : '#f8d7da' }}>
        <span className="status-icon">{status.systemHealthy ? '🟢' : '🟡'}</span>
        <span className="status-text">
          {status.systemHealthy ? 'System Operational' : 'System Issues Detected'}
        </span>
      </div>

      {/* Detailed modal */}
      {showDetails && (
        <div className="status-details-modal">
          <div className="modal-header">
            <h4>System Status Details</h4>
            <button className="btn-close" onClick={() => setShowDetails(false)}>✕</button>
          </div>

          {/* ML API Details */}
          <div className="detail-section">
            <h5>🤖 ML API Service</h5>
            <div className="detail-row">
              <span className="detail-label">Status:</span>
              <span style={{ color: getStatusColor(mlConnected) }}>
                {mlConnected ? '✅ Connected' : '❌ Offline'}
              </span>
            </div>
            {status.mlApi?.latency !== undefined && (
              <div className="detail-row">
                <span className="detail-label">Latency:</span>
                <span>{status.mlApi.latency}ms</span>
              </div>
            )}
            {status.mlApi?.modelsLoaded !== undefined && (
              <div className="detail-row">
                <span className="detail-label">Models Loaded:</span>
                <span>{status.mlApi.modelsLoaded}</span>
              </div>
            )}
            <div className="detail-row">
              <span className="detail-label">Last Checked:</span>
              <span>{formatTime(status.mlApi?.lastChecked)}</span>
            </div>
          </div>

          {/* Database Details */}
          <div className="detail-section">
            <h5>🗄️ Database Service</h5>
            <div className="detail-row">
              <span className="detail-label">Status:</span>
              <span style={{ color: getStatusColor(dbConnected) }}>
                {dbConnected ? '✅ Connected' : '❌ Offline'}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Regions Monitored:</span>
              <span>{status.database?.regionsMonitored || 0}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Total Analyses:</span>
              <span>{status.database?.analysesCount || 0}</span>
            </div>
          </div>

          {/* Imagery Details */}
          <div className="detail-section">
            <h5>📡 Imagery Availability</h5>
            <div className="detail-row">
              <span className="detail-label">Status:</span>
              <span>{imageryAvailable ? '✅ Available' : '⚠️ Unavailable'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Latest Date:</span>
              <span>{status.imagery?.lastImageryDate || 'N/A'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Sources:</span>
              <span>{status.imagery?.availableSources?.join(', ') || 'N/A'}</span>
            </div>
          </div>

          {/* Timeline */}
          <div className="detail-section">
            <h5>⏱️ Timeline</h5>
            <div className="detail-row">
              <span className="detail-label">Last Detection:</span>
              <span>{formatTime(status.lastDetectionRun)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Server Uptime:</span>
              <span>{formatUptime(status.serverUptime)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatUptime(seconds) {
  if (!seconds) return 'N/A';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export default SystemStatusBar;
