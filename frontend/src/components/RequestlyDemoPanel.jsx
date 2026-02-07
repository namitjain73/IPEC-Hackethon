import React, { useState } from 'react';
import { 
  mockFalseAlarmScenario, 
  mockMiningScenario, 
  mockSeasonalChangeScenario,
  mockAnalysisResponse 
} from '../utils/requestlyMocks';

/**
 * RequestlyDemoPanel Component
 * 
 * Allows quick switching between different mock scenarios
 * Useful for testing and demonstration
 */
const RequestlyDemoPanel = ({ onScenarioChange }) => {
  const [activeScenario, setActiveScenario] = useState('deforestation');
  const [isExpanded, setIsExpanded] = useState(false);

  const scenarios = [
    {
      id: 'deforestation',
      name: '🌳 Deforestation (CRITICAL)',
      description: 'NDVI 0.78 → 0.32 (59% loss)',
      color: 'red',
      data: mockAnalysisResponse
    },
    {
      id: 'false-alarm',
      name: '☁️ False Alarm (Clouds)',
      description: 'Cloud cover 85% - Skipped',
      color: 'blue',
      data: mockFalseAlarmScenario
    },
    {
      id: 'mining',
      name: '⛏️ Mining Operation',
      description: 'Different threat pattern',
      color: 'orange',
      data: mockMiningScenario
    },
    {
      id: 'seasonal',
      name: '🍂 Seasonal Change',
      description: 'NDVI -0.10 - Natural',
      color: 'green',
      data: mockSeasonalChangeScenario
    }
  ];

  const handleScenarioClick = (scenarioId) => {
    setActiveScenario(scenarioId);
    const scenario = scenarios.find(s => s.id === scenarioId);
    if (onScenarioChange) {
      onScenarioChange(scenario.data);
    }
  };

  const currentScenario = scenarios.find(s => s.id === activeScenario);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Floating Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          w-14 h-14 rounded-full shadow-lg flex items-center justify-center
          font-bold text-lg transition-all transform
          ${isExpanded ? 'bg-purple-600' : 'bg-purple-500 hover:bg-purple-600'}
          text-white hover:shadow-xl
        `}
        title="Requestly Demo Scenarios"
      >
        🧪
      </button>

      {/* Expanded Panel */}
      {isExpanded && (
        <div className="absolute bottom-16 right-0 w-80 bg-white rounded-lg shadow-2xl p-4 border-2 border-purple-300">
          <h3 className="font-bold text-lg mb-2 text-purple-700">
            📡 Requestly Mock Scenarios
          </h3>
          <p className="text-xs text-gray-600 mb-4">
            Switch between different satellite data scenarios for testing
          </p>

          {/* Scenario Buttons */}
          <div className="space-y-2 mb-4">
            {scenarios.map(scenario => (
              <button
                key={scenario.id}
                onClick={() => handleScenarioClick(scenario.id)}
                className={`
                  w-full p-3 rounded-lg text-left transition-all border-2
                  ${
                    activeScenario === scenario.id
                      ? `bg-${scenario.color}-100 border-${scenario.color}-500 font-bold text-${scenario.color}-900`
                      : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                  }
                `}
              >
                <div className="font-semibold">{scenario.name}</div>
                <div className="text-xs text-gray-600">{scenario.description}</div>
              </button>
            ))}
          </div>

          {/* Current Scenario Details */}
          {currentScenario && (
            <div className="bg-gray-50 p-3 rounded-lg mb-4 text-xs border border-gray-200">
              <div className="font-bold mb-2">Current: {currentScenario.name}</div>
              <div className="space-y-1 text-gray-700">
                <div>
                  <strong>NDVI:</strong> {
                    currentScenario.data.response?.satelliteData?.ndvi ||
                    currentScenario.data.data?.satelliteData?.ndvi ||
                    'N/A'
                  }
                </div>
                <div>
                  <strong>Risk:</strong> {
                    currentScenario.data.response?.mlPredictions?.riskClassifier?.riskLevel ||
                    currentScenario.data.data?.alert?.severity ||
                    'N/A'
                  }
                </div>
                <div>
                  <strong>Alert:</strong> {
                    currentScenario.data.response?.alert?.triggered === false ? '❌ No' :
                    currentScenario.data.data?.alert?.triggered ? '✅ Yes' : 'N/A'
                  }
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 p-2 rounded text-xs border border-blue-200 mb-3">
            <strong>💡 Tip:</strong> Select a scenario, then click "Analyze Region" to see mock data
          </div>

          {/* Info */}
          <div className="text-xs text-gray-600 text-center p-2 bg-yellow-50 rounded border border-yellow-200">
            ⚙️ Powered by Requestly API Mocking
          </div>

          {/* Close Button */}
          <button
            onClick={() => setIsExpanded(false)}
            className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 font-bold"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export default RequestlyDemoPanel;
