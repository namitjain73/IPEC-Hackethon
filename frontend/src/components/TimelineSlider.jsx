import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import { format } from 'date-fns';
import './TimelineSlider.css';

/**
 * TimelineSlider Component - Map-Based Visualization
 * Shows vegetation loss progression on interactive satellite map
 * Features:
 * - Interactive map with region location
 * - Dynamic circles showing vegetation loss magnitude
 * - Month navigation cards
 * - Professional stats display
 * - Play/pause animation controls
 */
export function TimelineSlider({ analysisHistory = [], onFrameChange, onPlayStateChange, regionName = '' }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(800); // ms per frame
  const [loop, setLoop] = useState(true);
  const [mlPredictions, setMlPredictions] = useState(null);
  const [loadingML, setLoadingML] = useState(false);
  const playIntervalRef = useRef(null);
  const mapRef = useRef(null);
  const circleRef = useRef(null);

  const totalFrames = analysisHistory?.length || 0;
  const currentAnalysis = analysisHistory?.[currentIndex];
  const isAtEnd = currentIndex >= totalFrames - 1;

  // Fetch ML predictions when current analysis changes
  useEffect(() => {
    if (currentAnalysis && !loadingML) {
      fetchMLPredictions(currentAnalysis);
    }
  }, [currentIndex, currentAnalysis]);

  const fetchMLPredictions = async (analysis) => {
    if (!analysis) return;
    
    setLoadingML(true);
    try {
      const payload = {
        ndvi_prev: analysis.ndvi?.mean || 0.5,
        ndvi_change: (analysis.ndvi?.mean || 0.5) - 0.7,
        red_band: 0.25,
        nir_band: analysis.ndvi?.mean || 0.5,
        cloud_cover: 0.1,
        temperature: 28.5,
        humidity: 72.0
      };

      // Fetch all predictions in parallel with timeout and error handling
      try {
        // Suppress unhandled rejection warnings - we handle errors explicitly
        const fetchWithFallback = async (url, body) => {
          try {
            const response = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
              signal: AbortSignal.timeout(5000)
            });
            
            if (!response.ok) {
              return null; // Return null for failed requests
            }
            return await response.json();
          } catch (e) {
            return null; // Return null on any fetch error
          }
        };

        const [ndviData, changeData, riskData] = await Promise.all([
          fetchWithFallback('/api/ml/predict/ndvi', payload),
          fetchWithFallback('/api/ml/predict/change', { ...payload, ndvi: analysis.ndvi?.mean || 0.5 }),
          fetchWithFallback('/api/ml/predict/risk', payload)
        ]);

        const fallbackData = { prediction: 0.65, confidence: 0.85 };
        const usedFallback = !ndviData || !changeData || !riskData;

        if (usedFallback) {
          console.warn('[Timeline] ML server unavailable - using synthetic predictions for visualization');
        }

        setMlPredictions({
          ndvi: ndviData || fallbackData,
          change: changeData || { prediction: 0.35, confidence: 0.82 },
          risk: riskData || { prediction: 'low', confidence: 0.88 }
        });
      } catch (fetchError) {
        // Fallback for unexpected errors
        console.warn('[Timeline] ML predictions unavailable - using synthetic data');
        setMlPredictions({
          ndvi: { prediction: 0.65, confidence: 0.85 },
          change: { prediction: 0.35, confidence: 0.82 },
          risk: { prediction: 'low', confidence: 0.88 }
        });
      }
    } catch (error) {
      console.warn('[Timeline] Error in ML predictions, using fallback', error);
      setMlPredictions({
        ndvi: { prediction: 0.65, confidence: 0.85 },
        change: { prediction: 0.35, confidence: 0.82 },
        risk: { prediction: 'low', confidence: 0.88 }
      });
    } finally {
      setLoadingML(false);
    }
  };

  // Play animation loop
  useEffect(() => {
    if (isPlaying && totalFrames > 0) {
      playIntervalRef.current = setInterval(() => {
        setCurrentIndex(prevIndex => {
          if (prevIndex >= totalFrames - 1) {
            if (loop) {
              return 0;
            } else {
              setIsPlaying(false);
              return prevIndex;
            }
          }
          return prevIndex + 1;
        });
      }, speed);
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [isPlaying, totalFrames, speed, loop]);

  // Notify parent of frame change
  useEffect(() => {
    if (onFrameChange && currentAnalysis) {
      onFrameChange(currentAnalysis, currentIndex);
    }
  }, [currentIndex, currentAnalysis, onFrameChange]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    onPlayStateChange?.(!isPlaying);
  };

  const handlePrevious = () => {
    setIsPlaying(false);
    setCurrentIndex(Math.max(0, currentIndex - 1));
  };

  const handleNext = () => {
    setIsPlaying(false);
    setCurrentIndex(Math.min(totalFrames - 1, currentIndex + 1));
  };

  const handleSpeedChange = e => {
    setSpeed(parseInt(e.target.value));
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentIndex(0);
  };

  // Calculate all derived values
  const getHealthColor = (loss) => {
    if (loss < 5) return { hex: '#22c55e', name: 'LOW' };
    if (loss < 15) return { hex: '#eab308', name: 'MEDIUM' };
    if (loss < 25) return { hex: '#f97316', name: 'HIGH' };
    return { hex: '#dc2626', name: 'CRITICAL' };
  };

  const vegetationLoss = currentAnalysis?.vegetationLossPercentage || currentAnalysis?.riskClassification?.vegetationLossPercentage || 0;
  const ndviMean = currentAnalysis?.ndvi?.mean || 0.45;
  const confidenceScore = currentAnalysis?.riskClassification?.confidenceScore || 0.85;
  const dateStr = currentAnalysis?.monthLabel || (currentAnalysis?.timestamp ? format(new Date(currentAnalysis.timestamp), 'MMM yyyy') : 'N/A');
  const healthColor = getHealthColor(vegetationLoss);
  const riskLevel = vegetationLoss < 5 ? 'LOW' : vegetationLoss < 15 ? 'MEDIUM' : vegetationLoss < 25 ? 'HIGH' : 'CRITICAL';

  // Get coordinates from first analysis
  let latitude = -1.0;
  let longitude = 20.0;
  if (analysisHistory.length > 0 && analysisHistory[0]?.riskClassification) {
    latitude = analysisHistory[0].riskClassification.latitude || latitude;
    longitude = analysisHistory[0].riskClassification.longitude || longitude;
  }

  // Update map circle when data changes
  useEffect(() => {
    if (mapRef.current && currentAnalysis) {
      const loss = vegetationLoss;
      // Scale radius: 1% = 2km, 50% = 50km
      const maxRadius = 50000; // 50 km in meters
      const minRadius = 2000;  // 2 km in meters
      const scaledLoss = Math.min(loss / 50, 1);
      const radius = minRadius + (scaledLoss * (maxRadius - minRadius));
      
      if (circleRef.current) {
        mapRef.current.removeLayer(circleRef.current);
      }

      // Create circle representing affected area
      const circle = L.circle([latitude, longitude], {
        color: healthColor.hex,
        fillColor: healthColor.hex,
        fillOpacity: 0.5,
        weight: 3,
        radius: radius,
        className: 'vegetation-loss-circle'
      }).addTo(mapRef.current);

      circle.bindPopup(`
        <div style="text-align: center; font-weight: 500; color: #374151;">
          <strong style="font-size: 14px;">${dateStr}</strong><br/>
          <span style="color: ${healthColor.hex}; font-size: 18px; font-weight: 700;">${loss.toFixed(1)}%</span><br/>
          Vegetation Loss<br/>
          <hr style="margin: 8px 0; border: none; border-top: 1px solid #ddd;">
          NDVI: ${(ndviMean * 100).toFixed(0)}<br/>
          Risk: <strong>${riskLevel}</strong>
        </div>
      `);

      circleRef.current = circle;

      // Fit map to show circle
      setTimeout(() => {
        if (mapRef.current && circleRef.current) {
          mapRef.current.fitBounds(circleRef.current.getBounds(), { padding: [100, 100], duration: 800 });
        }
      }, 100);
    }
  }, [currentIndex, currentAnalysis, vegetationLoss, ndviMean, healthColor, dateStr, riskLevel, latitude, longitude]);

  if (totalFrames === 0) {
    return (
      <div className="timeline-empty">
        <div className="empty-state">
          <p>📊 No historical data available for this region</p>
          <p className="text-sm text-gray-500">Select a region and run an analysis to see time-lapse data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="timeline-enhanced">
      {/* Header */}
      <div className="timeline-header-enhanced">
        <h2>🛰️ Satellite Vegetation Monitoring</h2>
        <p className="text-gray-600">Real-time forest loss detection and tracking</p>
      </div>

      {/* Map Container */}
      <div className="map-container-wrapper">
        <MapContainer 
          center={[latitude, longitude]} 
          zoom={6}
          className="satellite-map"
          ref={mapRef}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
        </MapContainer>
        
        {/* Stats Overlay on Map */}
        <div className="map-stats-overlay">
          <div className="map-stat-badge">
            <div className="map-badge-label">STATUS</div>
            <div className="map-badge-value" style={{ color: healthColor.hex }}>
              {riskLevel}
            </div>
          </div>
          
          <div className="map-stat-badge">
            <div className="map-badge-label">LOSS</div>
            <div className="map-badge-value" style={{ color: healthColor.hex }}>
              {vegetationLoss.toFixed(1)}%
            </div>
          </div>

          <div className="map-stat-badge">
            <div className="map-badge-label">NDVI</div>
            <div className="map-badge-value" style={{ color: '#10b981' }}>
              {(ndviMean * 100).toFixed(0)}
            </div>
          </div>

          <div className="map-stat-badge">
            <div className="map-badge-label">CONF</div>
            <div className="map-badge-value" style={{ color: '#10b981' }}>
              {(confidenceScore * 100).toFixed(0)}%
            </div>
          </div>
        </div>

        {/* Time Display on Map */}
        <div className="map-time-display">
          <div className="map-time-label">SCAN</div>
          <div className="map-time-value">{dateStr}</div>
        </div>
      </div>

      {/* ML Predictions Section */}
      {mlPredictions && (
        <div className="ml-predictions-section">
          <div className="card-section-title">🤖 AI Predictions for This Month</div>
          <div className="unified-card-grid unified-card-grid-3col">
            {mlPredictions.ndvi?.success && (
              <div className={`unified-card unified-card-success`}>
                <div className="unified-card-header">
                  <span className="unified-card-icon">📊</span>
                  <span className="unified-card-title">NDVI Forecast</span>
                </div>
                <div className="unified-card-body">
                  <div className="unified-card-value" style={{
                    color: mlPredictions.ndvi.ndvi_forecast > 0.6 ? '#22c55e' : mlPredictions.ndvi.ndvi_forecast > 0.4 ? '#eab308' : '#dc2626'
                  }}>
                    {(mlPredictions.ndvi.ndvi_forecast * 100).toFixed(1)}/100
                  </div>
                  <div className="unified-card-status">
                    {mlPredictions.ndvi.ndvi_forecast > 0.6 ? 'Excellent Health' : mlPredictions.ndvi.ndvi_forecast > 0.4 ? 'Moderate Health' : 'Poor Health'}
                  </div>
                  <div className="unified-card-description">
                    {mlPredictions.ndvi.ndvi_forecast > 0.6
                      ? "✅ Strong vegetation health. Plants are actively photosynthesizing and growing well."
                      : mlPredictions.ndvi.ndvi_forecast > 0.4
                      ? "⚠️ Moderate health. Vegetation is present but experiencing some stress."
                      : "🔴 Poor health. Vegetation is severely stressed or dead. This area needs attention."}
                  </div>
                </div>
              </div>
            )}
            {mlPredictions.change?.success && (
              <div className={`unified-card ${mlPredictions.change.change_detected ? 'unified-card-danger' : 'unified-card-success'}`}>
                <div className="unified-card-header">
                  <span className="unified-card-icon">{mlPredictions.change.change_detected ? '⚠️' : '✅'}</span>
                  <span className="unified-card-title">Change Detection</span>
                </div>
                <div className="unified-card-body">
                  <div className="unified-card-value" style={{ color: mlPredictions.change.change_detected ? '#dc2626' : '#10b981' }}>
                    {mlPredictions.change.change_detected ? 'DETECTED' : 'STABLE'}
                  </div>
                  <div className="unified-card-status">
                    {(mlPredictions.change.confidence * 100).toFixed(0)}% Confidence
                  </div>
                  <div className="unified-card-description">
                    {mlPredictions.change.change_detected
                      ? "Significant vegetation changes detected. This could indicate deforestation, new growth, or seasonal variations."
                      : "No major changes detected. Vegetation condition remains stable from the previous period."}
                  </div>
                </div>
              </div>
            )}
            {mlPredictions.risk?.success && (
              <div className={`unified-card ${mlPredictions.risk.risk_label === 'HIGH' ? 'unified-card-danger' : mlPredictions.risk.risk_label === 'MEDIUM' ? 'unified-card-warning' : 'unified-card-success'}`}>
                <div className="unified-card-header">
                  <span className="unified-card-icon">🎯</span>
                  <span className="unified-card-title">Risk Assessment</span>
                </div>
                <div className="unified-card-body">
                  <div className="unified-card-value" style={{
                    color: mlPredictions.risk.risk_label === 'HIGH' ? '#dc2626' : mlPredictions.risk.risk_label === 'MEDIUM' ? '#f97316' : '#22c55e'
                  }}>
                    {mlPredictions.risk.risk_label}
                  </div>
                  <div className="unified-card-status">
                    {(mlPredictions.risk.confidence * 100).toFixed(0)}% Confidence
                  </div>
                  <div className="unified-card-description">
                    {mlPredictions.risk.risk_label === 'HIGH'
                      ? "🚨 High risk detected. Immediate monitoring and intervention may be required."
                      : mlPredictions.risk.risk_label === 'MEDIUM'
                      ? "⚠️ Moderate risk. Continue monitoring this area regularly for changes."
                      : "✅ Low risk. Area is stable and healthy with minimal threats detected."}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Month Timeline Cards */}
      <div className="timeline-progress-section">
        <div className="progress-label">📅 Timeline - Click Month to View</div>
        <div className="month-cards-container">
          {analysisHistory.map((analysis, idx) => {
            const loss = analysis?.vegetationLossPercentage || analysis?.riskClassification?.vegetationLossPercentage || 0;
            const color = getHealthColor(loss).hex;
            const isActive = idx === currentIndex;
            
            return (
              <div
                key={idx}
                className={`month-card ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentIndex(idx);
                }}
                style={{
                  borderBottomColor: color,
                  backgroundColor: isActive ? 'rgba(59, 130, 246, 0.1)' : 'white',
                }}
              >
                <div className="month-card-label">{analysis?.monthLabel?.substring(0, 3)}</div>
                <div className="month-card-loss" style={{ color }}>
                  {loss.toFixed(1)}%
                </div>
                <div className="month-card-dot" style={{ backgroundColor: color }}></div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Animated Controls */}
      <div className="timeline-controls-enhanced">
        <button
          onClick={handleReset}
          className="btn-control"
          title="Reset to first month"
        >
          ⏮️
        </button>

        <button
          onClick={handlePrevious}
          className="btn-control"
          disabled={currentIndex === 0}
          title="Previous month"
        >
          ⏪
        </button>

        <button
          onClick={handlePlayPause}
          className={`btn-play ${isPlaying ? 'playing' : 'paused'}`}
          title={isPlaying ? 'Pause animation' : 'Play animation'}
        >
          {isPlaying ? '⏸️' : '▶️'}
        </button>

        <button
          onClick={handleNext}
          className="btn-control"
          disabled={currentIndex >= totalFrames - 1}
          title="Next month"
        >
          ⏩
        </button>

        <div className="speed-control">
          <label>Speed: </label>
          <select value={speed} onChange={handleSpeedChange} className="speed-select">
            <option value={1200}>Slow</option>
            <option value={800}>Normal</option>
            <option value={400}>Fast</option>
            <option value={150}>Very Fast</option>
          </select>
        </div>

        <label className="loop-control">
          <input
            type="checkbox"
            checked={loop}
            onChange={e => setLoop(e.target.checked)}
            title="Loop animation at end"
          />
          <span>🔄 Loop</span>
        </label>
      </div>

      {/* Frame Info */}
      <div className="frame-info">
        <span>SCAN {currentIndex + 1}/{totalFrames}</span>
        <span className="separator">•</span>
        <span>{dateStr}</span>
        <span className="separator">•</span>
        <span>Signal: {(confidenceScore * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}

export default TimelineSlider;
