import React, { useEffect, useState } from 'react';
import { InteractiveMap } from './components/InteractiveMap';
import { AnalysisControls } from './components/AnalysisControls';
import { AnalysisResultCard } from './components/AnalysisResultCard';
import { AnalysisHistory } from './components/AnalysisHistory';
import { SystemStatusBar } from './components/SystemStatusBar';
import { TimelineSlider } from './components/TimelineSlider';
import { ComparisonMode } from './components/ComparisonMode';
import { ExplainabilityPanel } from './components/ExplainabilityPanel';
import { MultiRegionDashboard } from './components/MultiRegionDashboard';
import { api } from './services/api';
import { AlertsPanel } from './components/AlertsPanel';
import { ReportsPanel } from './components/ReportsPanel';
import { useAnalysis } from './hooks/useAnalysis';
import { initializeWebSocket, subscribeToRegion, onAnalysisResult, onAnalysisProgress, onJobQueued } from './services/websocket';
import './App.css';

const DEFAULT_REGIONS = [
  {
    name: '🟢 Valmiki Nagar Forest, Bihar',
    latitude: 25.65,
    longitude: 84.12,
    sizeKm: 50,
    riskLevel: 'low',
  },
  {
    name: '🟡 Murchison Falls, Uganda',
    latitude: 2.253,
    longitude: 32.003,
    sizeKm: 50,
    riskLevel: 'medium',
  },
  {
    name: '🔴 Odzala-Kokoua, Congo',
    latitude: -1.021,
    longitude: 15.909,
    sizeKm: 60,
    riskLevel: 'high',
  },
  {
    name: '🟢 Kasai Biosphere, DRC',
    latitude: -4.338,
    longitude: 20.823,
    sizeKm: 80,
    riskLevel: 'low',
  },
];

function App() {
  const analysis = useAnalysis();
  const [regions, setRegions] = React.useState(DEFAULT_REGIONS);
  const [historyRegion, setHistoryRegion] = React.useState(null);
  const [analysisHistory, setAnalysisHistory] = React.useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mapCenter, setMapCenter] = useState(null);
  const [mapZoom, setMapZoom] = useState(3);
  const [detectedProblems, setDetectedProblems] = useState([]);
  const [currentAnalyzingRegion, setCurrentAnalyzingRegion] = useState(null);

  useEffect(() => {
    analysis.checkHealth();
    analysis.getLatestAnalyses();
    analysis.getStats();
    
    // Initialize WebSocket connection for real-time updates
    console.log('[App] Initializing WebSocket connection...');
    initializeWebSocket('http://localhost:5000');
    
    // Set up real-time event listeners
    onAnalysisResult((data) => {
      console.log('[App] Received analysis result via WebSocket:', data);
      analysis.addAnalysis({
        ...data,
        success: true,
      });
    });

    onAnalysisProgress((data) => {
      console.log('[App] Analysis progress update:', data);
      setCurrentAnalyzingRegion({
        name: data.region,
        progress: data.progress,
        status: data.status
      });
    });

    onJobQueued((data) => {
      console.log('[App] Analysis job queued:', data);
      setDetectedProblems(prev => [...prev, {
        id: data.jobId,
        severity: 'info',
        message: `Analysis job queued: ${data.jobId}`,
        timestamp: new Date(),
        region: data.region
      }]);
    });
    
    // Fetch regions from backend on app load
    fetchRegionsFromBackend();
  }, []);

  // Fetch history when Timeline tab is active and a region is selected
  useEffect(() => {
    if (activeTab === 'timeline') {
      const selectedRegionName = analysis.selectedRegion?.name;
      if (selectedRegionName) {
        fetchAnalysisHistory(selectedRegionName);
      }
    }
  }, [activeTab, analysis.selectedRegion?.name]);

  const handleLocationChange = (lat, lon) => {
    // Immediately focus map on new coordinates
    setMapCenter([lat, lon]);
    setMapZoom(11); // Zoom level 11 for detailed view
    
    // Show green circle for the currently entered coordinates
    setCurrentAnalyzingRegion({
      latitude: lat,
      longitude: lon,
      name: 'Current Location',
      sizeKm: 5,
      riskLevel: 'low', // Start with green
      isCustom: true,
      isTemporary: true, // Will be permanent after analysis
    });
  };

  // Fetch all regions from backend (including custom ones saved to DB)
  const fetchRegionsFromBackend = async () => {
    try {
      const response = await api.get('/regions');
      if (response.data && Array.isArray(response.data)) {
        // Merge with default regions, custom regions will be added
        const backendRegions = response.data.map(r => ({
          name: r.name,
          latitude: r.latitude,
          longitude: r.longitude,
          sizeKm: r.sizeKm || 50,
          riskLevel: r.latestMetrics?.riskLevel?.toLowerCase() || 'low',
          isCustom: r.isCustom || false,
        }));
        // Combine with defaults, avoiding duplicates
        setRegions(prev => {
          const merged = [...backendRegions];
          DEFAULT_REGIONS.forEach(def => {
            if (!merged.find(r => r.name === def.name)) {
              merged.push(def);
            }
          });
          return merged;
        });
        console.log('✅ Regions loaded from backend:', backendRegions.length);
      }
    } catch (error) {
      console.warn('Could not fetch regions from backend, using defaults:', error.message);
    }
  };

  const handleAnalyze = async (latitude, longitude, name) => {
    try {
      // Clear any previous errors
      analysis.clearError();
      
      // Find and set the selected region for history/timeline
      const regionObj = regions.find(r => r.name === name);
      if (regionObj) {
        analysis.setSelectedRegion(regionObj);
      }
      
      // Subscribe to real-time updates for this region via WebSocket
      console.log('[App] Subscribing to WebSocket for region:', name);
      subscribeToRegion(name);
      
      // Fetch history for this region
      fetchAnalysisHistory(name);
      
      // Set temporary region to show green circle while analyzing
      setCurrentAnalyzingRegion({
        latitude,
        longitude,
        name,
        sizeKm: 5,
        riskLevel: 'low',
        isCustom: true,
      });

      const result = await analysis.analyzeRegion(latitude, longitude, 50, name);
      
      const riskLevel = result?.riskClassification?.riskLevel || 'low';

      // Check if high-risk problem detected
      if (riskLevel === 'high' || result?.vegetationLossPercentage > 15) {
        const newProblem = {
          latitude,
          longitude,
          name,
          radiusKm: 5,
          type: 'Vegetation Loss',
          severity: riskLevel,
          percentage: result?.vegetationLossPercentage || 0,
          area: result?.areaAffected || 0,
        };
        setDetectedProblems(prev => [...prev, newProblem]);
      }

      // Refresh regions from backend to get the newly saved custom region
      await fetchRegionsFromBackend();

      // Add custom region to predefined regions with updated risk level
      const newRegion = {
        latitude,
        longitude,
        name,
        sizeKm: 5,
        riskLevel: riskLevel,
        isCustom: true,
        timestamp: new Date().toLocaleString(),
      };

      setRegions((prev) => {
        // Check if region already exists by name
        const exists = prev.some(r => r.name === name);
        if (exists) {
          // Update existing region
          return prev.map((r) =>
            r.name === name ? { ...r, riskLevel: riskLevel } : r
          );
        } else {
          // Add new custom region
          return [newRegion, ...prev];
        }
      });

      // Update current analyzing region to show new risk level
      setCurrentAnalyzingRegion({
        ...newRegion,
        isTemporary: false, // Now permanent
      });
    } catch (error) {
      console.error('[App] Analysis failed:', error.message);
      // Error is already displayed in AnalysisResultCard - no need for alert
      // Clear the temporary analyzing region after a short delay
      setTimeout(() => {
        setCurrentAnalyzingRegion(null);
      }, 3000);
    }
  };

  const handleRegionSelect = (region) => {
    analysis.setSelectedRegion(region);
    setHistoryRegion(region.name);
    // Automatically focus and zoom to the selected region
    setMapCenter([region.latitude, region.longitude]);
    setMapZoom(11); // Zoom level 11 for focused regional view
    
    // Fetch analysis history for timeline
    fetchAnalysisHistory(region.name);

    // AUTO-SWITCH to Dashboard tab to show the selected region on map
    setActiveTab('dashboard');
  };

  const fetchAnalysisHistory = async (regionName) => {
    try {
      const response = await api.get(`/analysis/history/${encodeURIComponent(regionName)}`);
      setAnalysisHistory(response.data.analyses || []);
    } catch (error) {
      console.error('Error fetching analysis history:', error);
      setAnalysisHistory([]);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'timeline':
        return <TimelineSlider analysisHistory={analysisHistory} />;
      case 'comparison':
        return <ComparisonMode analysisHistory={analysisHistory} regions={regions} />;
      case 'explainability':
        return <ExplainabilityPanel analysis={analysis.currentAnalysis} />;
      case 'multi-region':
        return <MultiRegionDashboard onSelectRegion={handleRegionSelect} />;
      case 'alerts':
        return <AlertsPanel selectedRegion={analysis.selectedRegion} />;
      case 'reports':
        return <ReportsPanel selectedRegion={analysis.selectedRegion} analysisHistory={analysisHistory} />;
      default:
        return renderDashboard();
    }
  };

  const renderDashboard = () => (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4">
              <h2 className="text-xl font-semibold">🌳 Monitored Forest Regions</h2>
            </div>
            <InteractiveMap
              regions={regions}
              onRegionSelect={handleRegionSelect}
              selectedRegion={analysis.selectedRegion}
              mapCenter={mapCenter}
              mapZoom={mapZoom}
              detectedProblems={detectedProblems}
              currentAnalyzingRegion={currentAnalyzingRegion}
            />
          </div>
        </div>

        <div className="space-y-6">
          <AnalysisControls
            onAnalyze={handleAnalyze}
            regions={regions}
            loading={analysis.loading}
            onLocationChange={handleLocationChange}
          />

          {analysis.stats && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg shadow-md p-6 border-l-4 border-green-600">
              <h3 className="text-lg font-bold text-green-900 mb-4">📊 System Status</h3>
              <div className="space-y-3">
                <div className="bg-white rounded p-3">
                  <p className="text-gray-600 text-xs font-semibold uppercase">Analyses Completed</p>
                  <p className="text-3xl font-bold text-green-700">
                    {analysis.stats.totalAnalyses}
                  </p>
                </div>
                <div className="bg-white rounded p-3">
                  <p className="text-gray-600 text-xs font-semibold uppercase">Forest Areas</p>
                  <p className="text-3xl font-bold text-emerald-700">
                    {analysis.stats.totalRegions}
                  </p>
                </div>
                <div className="bg-white rounded p-3">
                  <p className="text-gray-600 text-xs font-semibold uppercase">Accuracy</p>
                  <p className="text-3xl font-bold text-teal-700">
                    {analysis.stats.successRate}%
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {analysis.currentAnalysis ? (
        <div className="mb-8 scroll-to-results">
          <AnalysisResultCard analysis={analysis.currentAnalysis} />
        </div>
      ) : analysis.loading ? (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg shadow-lg p-12 text-center border-2 border-green-200">
          <div className="text-green-600 text-4xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-green-900 mb-2">Scanning Forest Region...</h3>
          <p className="text-green-700">Analyzing vegetation patterns with NDVI satellite data...</p>
          <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full animate-pulse" style={{ width: '70%' }}></div>
          </div>
        </div>
      ) : null}

      {historyRegion && (
        <div className="mb-8">
          <AnalysisHistory analyses={analysis.analyses} loading={analysis.loading} />
        </div>
      )}

      {!analysis.currentAnalysis && analysis.analyses.length === 0 && (
        <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-lg shadow-lg p-12 text-center border-2 border-dashed border-green-300">
          <div className="text-green-400 text-6xl mb-4">🌲</div>
          <h3 className="text-2xl font-bold text-green-900 mb-2">Ready to Monitor Forests</h3>
          <p className="text-green-700 mb-6">
            Select a forest region from the map or enter coordinates to begin deforestation analysis
          </p>
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
      <SystemStatusBar />
      
      <div className="bg-gradient-to-r from-green-700 via-emerald-700 to-teal-700 text-white py-8 shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-bold">
            � ForestGuard
          </h1>
          <p className="text-green-100 mt-2">
            Real-time satellite monitoring for forest protection and vegetation analysis
          </p>
        </div>
      </div>

      <div className="bg-white border-b-2 border-green-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-6 py-3 font-medium whitespace-nowrap transition-all duration-200 ${
                activeTab === 'dashboard'
                  ? 'border-b-4 border-green-600 text-green-600 bg-green-50'
                  : 'text-gray-600 hover:text-green-600 hover:bg-green-50'
              }`}
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`px-6 py-3 font-medium whitespace-nowrap transition-all duration-200 ${
                activeTab === 'timeline'
                  ? 'border-b-4 border-green-600 text-green-600 bg-green-50'
                  : 'text-gray-600 hover:text-green-600 hover:bg-green-50'
              }`}
            >
              ⏱️ Time-Lapse
            </button>
            <button
              onClick={() => setActiveTab('comparison')}
              className={`px-6 py-3 font-medium whitespace-nowrap transition-all duration-200 ${
                activeTab === 'comparison'
                  ? 'border-b-4 border-green-600 text-green-600 bg-green-50'
                  : 'text-gray-600 hover:text-green-600 hover:bg-green-50'
              }`}
            >
              🔄 Comparison
            </button>
            <button
              onClick={() => setActiveTab('explainability')}
              className={`px-6 py-3 font-medium whitespace-nowrap transition-all duration-200 ${
                activeTab === 'explainability'
                  ? 'border-b-4 border-green-600 text-green-600 bg-green-50'
                  : 'text-gray-600 hover:text-green-600 hover:bg-green-50'
              }`}
            >
              💡 Analysis
            </button>
            <button
              onClick={() => setActiveTab('multi-region')}
              className={`px-6 py-3 font-medium whitespace-nowrap transition-all duration-200 ${
                activeTab === 'multi-region'
                  ? 'border-b-4 border-green-600 text-green-600 bg-green-50'
                  : 'text-gray-600 hover:text-green-600 hover:bg-green-50'
              }`}
            >
              🌍 Multi-Region
            </button>
            <button
              onClick={() => setActiveTab('alerts')}
              className={`px-6 py-3 font-medium whitespace-nowrap transition-all duration-200 ${
                activeTab === 'alerts'
                  ? 'border-b-4 border-green-600 text-green-600 bg-green-50'
                  : 'text-gray-600 hover:text-green-600 hover:bg-green-50'
              }`}
            >
              🔔 Alerts
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-6 py-3 font-medium whitespace-nowrap transition-all duration-200 ${
                activeTab === 'reports'
                  ? 'border-b-4 border-green-600 text-green-600 bg-green-50'
                  : 'text-gray-600 hover:text-green-600 hover:bg-green-50'
              }`}
            >
              📄 Reports
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {analysis.error && (
          <div className="mb-8 bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-md">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-red-700 font-bold">⚠️ Alert</p>
                <p className="text-red-600 text-sm mt-1">{analysis.error}</p>
              </div>
              <button
                onClick={() => analysis.clearError()}
                className="text-red-500 hover:text-red-700 font-bold"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {renderContent()}
      </div>
    </div>
  );
}

export default App;
