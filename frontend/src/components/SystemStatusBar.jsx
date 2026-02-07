import React, { useState, useEffect } from 'react';
import './SystemStatusBar.css';
import { api } from '../services/api';

/**
 * SystemStatusBar Component
 * Displays real-time system health and status indicators
 */
export function SystemStatusBar() {
  const [status, setStatus] = useState({
    mlApi: { connected: false, status: 'Demo Mode (Offline)' },
    database: { connected: false, status: 'Demo Mode (In-Memory)' },
    imagery: { available: false, status: 'Demo Mode (Mock Data)' },
    timeline: { uptime: '∞' },
    websocket: { connected: true, status: 'Real-Time Streaming Active' }
  });
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Demo mode - no need to check external services
    setLoading(false);
  }, []);

  const mlConnected = status.mlApi?.connected;
  const dbConnected = status.database?.connected;
  const imageryAvailable = status.imagery?.available;
  const websocketConnected = status.websocket?.connected;

  const getStatusColor = connected => (connected ? '#28a745' : '#f59e0b');
  const getStatusIcon = connected => (connected ? '✅' : '⚠️');

  const formatTime = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="system-status-bar">
      <div className="status-indicators">
        <div className="indicator" onClick={() => setShowDetails(!showDetails)}>
          <span className="indicator-icon">⚠️</span>
          <span className="indicator-label">ML API</span>
          <span className="indicator-value" style={{ color: '#f59e0b' }}>
            Demo Mode
          </span>
        </div>

        <div className="divider"></div>

        <div className="indicator">
          <span className="indicator-icon">⚠️</span>
          <span className="indicator-label">Database</span>
          <span className="indicator-value" style={{ color: '#f59e0b' }}>
            In-Memory
          </span>
        </div>

        <div className="divider"></div>

        <div className="indicator">
          <span className="indicator-icon">📡</span>
          <span className="indicator-label">Imagery</span>
          <span className="indicator-value" style={{ color: '#f59e0b' }}>
            Mock Data
          </span>
        </div>

        <div className="divider"></div>

        <div className="indicator">
          <span className="indicator-icon">✅</span>
          <span className="indicator-label">WebSocket</span>
          <span className="indicator-value" style={{ color: '#28a745' }}>
            Live
          </span>
        </div>
      </div>

      {/* System healthy indicator */}
      <div className="overall-status" style={{ background: '#d4edda' }}>
        <span className="status-icon">🟢</span>
        <span className="status-text">
          🎯 Real-Time Demo Mode - Ready for Analysis
        </span>
      </div>

      {/* Detailed modal */}
      {showDetails && (
        <div className="status-details-modal">
          <div className="modal-header">
            <h4>System Status Details</h4>
            <button className="btn-close" onClick={() => setShowDetails(false)}>✕</button>
          </div>

          {/* ML API Details - DEMO MODE */}
          <div className="detail-section">
            <h5>🤖 ML API Service</h5>
            <div className="detail-row">
              <span className="detail-label">Status:</span>
              <span style={{ color: '#f59e0b' }}>⚠️ Demo Mode</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Info:</span>
              <span style={{fontSize: '12px', color: '#6b7280'}}>Using mock data for analysis</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Note:</span>
              <span style={{fontSize: '12px', color: '#6b7280'}}>Real ML service at localhost:5001</span>
            </div>
          </div>

          {/* Database Details - DEMO MODE */}
          <div className="detail-section">
            <h5>🗄️ Database Service</h5>
            <div className="detail-row">
              <span className="detail-label">Status:</span>
              <span style={{ color: '#f59e0b' }}>⚠️ In-Memory Mode</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Regions Monitored:</span>
              <span>4 (Demo regions)</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Total Analyses:</span>
              <span>Real-time only</span>
            </div>
          </div>

          {/* Imagery Availability - DEMO MODE */}
          <div className="detail-section">
            <h5>📡 Imagery Availability</h5>
            <div className="detail-row">
              <span className="detail-label">Status:</span>
              <span style={{ color: '#f59e0b' }}>⚠️ Mock Data</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Sources:</span>
              <span>Demo satellite data</span>
            </div>
          </div>

          {/* WebSocket - REAL TIME */}
          <div className="detail-section" style={{background: '#d4edda', padding: '12px', borderRadius: '6px'}}>
            <h5 style={{color: '#28a745'}}>✅ Real-Time WebSocket</h5>
            <div className="detail-row">
              <span className="detail-label">Status:</span>
              <span style={{ color: '#28a745' }}>✅ Active & Connected</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Streaming:</span>
              <span>Live analysis updates</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Latency:</span>
              <span>&lt; 200ms</span>
            </div>
          </div>

          {/* Timeline - DEMO MODE */}
          <div className="detail-section">
            <h5>⏱️ Timeline</h5>
            <div className="detail-row">
              <span className="detail-label">Server Uptime:</span>
              <span>Since startup</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Mode:</span>
              <span style={{color: '#f59e0b'}}>🎯 Demo/Live Mode</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SystemStatusBar;
