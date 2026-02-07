import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Map updater component to handle dynamic center changes with smooth animation
function MapUpdater({ center, zoom, detectedProblems }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      // Use flyTo for smooth animation instead of setView
      map.flyTo(center, zoom || 10, { duration: 1 });
    }
  }, [center, zoom, map]);

  // Auto-focus on detected problems
  useEffect(() => {
    if (detectedProblems && detectedProblems.length > 0) {
      const lastProblem = detectedProblems[detectedProblems.length - 1];
      if (lastProblem.latitude && lastProblem.longitude) {
        map.flyTo([lastProblem.latitude, lastProblem.longitude], 11, { duration: 1 });
      }
    }
  }, [detectedProblems, map]);

  return null;
}

export function InteractiveMap({ regions = [], onRegionSelect, selectedRegion, mapCenter, mapZoom, detectedProblems = [], currentAnalyzingRegion = null }) {
  const [center] = useState(mapCenter || [0, 20]);
  const [zoom] = useState(mapZoom || 3);

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'high': return '#dc2626';
      case 'medium': return '#f59e0b';
      case 'low':
      default: return '#10b981';
    }
  };

  const getProblemIcon = () => {
    return L.divIcon({
      html: `
        <div style="
          width: 30px;
          height: 30px;
          background: #dc2626;
          border: 3px solid #991b1b;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          box-shadow: 0 0 10px rgba(220, 38, 38, 0.8);
          animation: pulse 2s infinite;
        ">
          ⚠️
        </div>
        <style>
          @keyframes pulse {
            0%, 100% { box-shadow: 0 0 10px rgba(220, 38, 38, 0.8); }
            50% { box-shadow: 0 0 20px rgba(220, 38, 38, 1); }
          }
        </style>
      `,
      className: '',
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });
  };

  return (
    <div className="h-96 w-full rounded-lg overflow-hidden shadow-lg">
      <MapContainer center={mapCenter || center} zoom={mapZoom || zoom} style={{ height: '100%', width: '100%' }} className="z-0">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Update map view when coordinates change with smooth animation */}
        <MapUpdater center={mapCenter} zoom={mapZoom || 10} detectedProblems={detectedProblems} />

        {regions.map((region) => (
          <React.Fragment key={region.name}>
            <Circle
              center={[region.latitude, region.longitude]}
              radius={region.sizeKm * 1000}
              pathOptions={{
                color: getRiskColor(region.riskLevel || 'low'),
                fillColor: getRiskColor(region.riskLevel || 'low'),
                fillOpacity: 0.2,
                weight: 2,
              }}
              eventHandlers={{
                click: () => onRegionSelect && onRegionSelect(region),
              }}
            />

            <Marker position={[region.latitude, region.longitude]} eventHandlers={{ click: () => onRegionSelect && onRegionSelect(region) }}>
              <Popup>
                <div className="font-semibold">{region.name}</div>
                <div className="text-sm">
                  Risk Level: <span className="font-semibold" style={{ color: getRiskColor(region.riskLevel || 'low') }}>
                    {(region.riskLevel || 'low').toUpperCase()}
                  </span>
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        ))}

        {/* Display current analyzing region (custom region with green circle) */}
        {currentAnalyzingRegion && (
          <React.Fragment key="current-analyzing">
            <Circle
              center={[currentAnalyzingRegion.latitude, currentAnalyzingRegion.longitude]}
              radius={currentAnalyzingRegion.sizeKm * 1000}
              pathOptions={{
                color: getRiskColor(currentAnalyzingRegion.riskLevel || 'low'),
                fillColor: getRiskColor(currentAnalyzingRegion.riskLevel || 'low'),
                fillOpacity: 0.3, // Slightly more opaque than regular regions
                weight: 3, // Thicker border to show it's special
                dashArray: currentAnalyzingRegion.isTemporary ? '2, 4' : undefined, // Dashed while temporary
              }}
              eventHandlers={{
                click: () => onRegionSelect && onRegionSelect(currentAnalyzingRegion),
              }}
            />

            <Marker 
              position={[currentAnalyzingRegion.latitude, currentAnalyzingRegion.longitude]}
              eventHandlers={{
                click: () => onRegionSelect && onRegionSelect(currentAnalyzingRegion),
              }}
            >
              <Popup>
                <div className="font-semibold">{currentAnalyzingRegion.name}</div>
                <div className="text-sm">
                  Risk Level: <span 
                    className="font-semibold" 
                    style={{ color: getRiskColor(currentAnalyzingRegion.riskLevel || 'low') }}
                  >
                    {(currentAnalyzingRegion.riskLevel || 'low').toUpperCase()}
                  </span>
                </div>
                {currentAnalyzingRegion.timestamp && (
                  <div className="text-xs text-gray-600 mt-1">
                    Analyzed: {currentAnalyzingRegion.timestamp}
                  </div>
                )}
              </Popup>
            </Marker>
          </React.Fragment>
        )}

        {/* Display detected problems as red circles with warning icons */}
        {detectedProblems.map((problem, idx) => (
          <React.Fragment key={`problem-${idx}`}>
            {/* Red circle for problem area */}
            <Circle
              center={[problem.latitude, problem.longitude]}
              radius={problem.radiusKm * 1000}
              pathOptions={{
                color: '#dc2626',
                fillColor: '#dc2626',
                fillOpacity: 0.15,
                weight: 3,
                dashArray: '5, 5',
              }}
            />

            {/* Warning marker at center */}
            <Marker position={[problem.latitude, problem.longitude]} icon={getProblemIcon()}>
              <Popup>
                <div className="font-semibold text-red-700">⚠️ Problem Detected</div>
                <div className="text-sm mt-2">
                  <div><strong>Location:</strong> {problem.name || 'Unknown'}</div>
                  <div><strong>Type:</strong> {problem.type || 'Vegetation Loss'}</div>
                  <div><strong>Severity:</strong> {problem.severity || 'High'}</div>
                  {problem.percentage && <div><strong>Loss:</strong> {problem.percentage.toFixed(2)}%</div>}
                  {problem.area && <div><strong>Area:</strong> {problem.area.toFixed(2)} km²</div>}
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        ))}
      </MapContainer>
    </div>
  );
}
