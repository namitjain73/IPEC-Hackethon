import React from 'react';

export function AnalysisControls({ onAnalyze, regions = [], loading = false, onLocationChange }) {
  const [selectedRegion, setSelectedRegion] = React.useState('');
  const [customLat, setCustomLat] = React.useState('');
  const [customLon, setCustomLon] = React.useState('');
  const [customName, setCustomName] = React.useState('');
  const [useCustom, setUseCustom] = React.useState(false);

  const handleLatChange = (e) => {
    const value = e.target.value;
    setCustomLat(value);
    if (value && customLon && onLocationChange) {
      onLocationChange(parseFloat(value), parseFloat(customLon));
    }
  };

  const handleLonChange = (e) => {
    const value = e.target.value;
    setCustomLon(value);
    if (value && customLat && onLocationChange) {
      onLocationChange(parseFloat(customLat), parseFloat(value));
    }
  };

  const handleRegionSelect = (e) => {
    const regionName = e.target.value;
    setSelectedRegion(regionName);
    
    // Find the region and zoom to it
    const region = regions.find((r) => r.name === regionName);
    if (region && onLocationChange) {
      onLocationChange(region.latitude, region.longitude);
    }
  };

  const handleAnalyze = () => {
    if (useCustom) {
      if (!customLat || !customLon || !customName) {
        alert('Please fill in all fields');
        return;
      }
      onAnalyze(parseFloat(customLat), parseFloat(customLon), customName);
      setCustomLat('');
      setCustomLon('');
      setCustomName('');
    } else {
      if (!selectedRegion) {
        alert('Please select a region');
        return;
      }
      const region = regions.find((r) => r.name === selectedRegion);
      if (region) {
        onAnalyze(region.latitude, region.longitude, region.name);
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Analysis Controls</h3>

      <div className="flex gap-2">
        <button
          onClick={() => setUseCustom(false)}
          className={`px-4 py-2 rounded transition-colors ${
            !useCustom ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Pre-defined Regions
        </button>
        <button
          onClick={() => setUseCustom(true)}
          className={`px-4 py-2 rounded transition-colors ${
            useCustom ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Custom Region
        </button>
      </div>

      {!useCustom && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Region</label>
          <select
            value={selectedRegion}
            onChange={handleRegionSelect}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">-- Select a region --</option>
            {regions.map((region) => (
              <option key={region.name} value={region.name}>
                {region.name}
              </option>
            ))}
          </select>
          {selectedRegion && (
            <p className="text-xs text-green-600 mt-2">
              📍 {selectedRegion} selected - Map zoomed to region
            </p>
          )}
        </div>
      )}

      {useCustom && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Region Name</label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="e.g., My Custom Region"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">📍 Latitude</label>
              <input
                type="number"
                value={customLat}
                onChange={handleLatChange}
                placeholder="e.g., 25.65"
                step="0.001"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className="text-xs text-gray-500 mt-1">Range: -90 to 90</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">📍 Longitude</label>
              <input
                type="number"
                value={customLon}
                onChange={handleLonChange}
                placeholder="e.g., 84.12"
                step="0.001"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className="text-xs text-gray-500 mt-1\">Range: -180 to 180</p>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={handleAnalyze}
        disabled={loading}
        className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
          loading ? 'bg-gray-400 text-gray-700 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'
        }`}
      >
        {loading ? 'Analyzing...' : 'Run Analysis'}
      </button>
    </div>
  );
}
