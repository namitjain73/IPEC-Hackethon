/**
 * Requestly Mock Configuration
 * 
 * This file provides mock rules for Requestly to intercept and mock API responses
 * for testing, demo purposes, and when external APIs are unavailable.
 * 
 * Usage:
 * 1. Install Requestly browser extension
 * 2. Import these rules in your test environment
 * 3. Configure Requestly to use these mock patterns
 */

/**
 * MOCK RULE 1: Backend Analysis API Response
 * Mocks the /api/analysis/analyze endpoint
 */
export const mockAnalysisResponse = {
  name: "Mock Backend Analysis Response",
  description: "Intercepts analysis API calls and returns mock satellite data",
  source: {
    operator: "Contains",
    value: "/analysis/analyze",
    valueType: "String",
    type: "url"
  },
  pairs: [
    {
      id: "pair1",
      request: {
        method: {
          operator: "Equals",
          value: "POST"
        }
      },
      response: {
        value: JSON.stringify({
          success: true,
          data: {
            regionName: "Amazon_Acre_Zone_12",
            timestamp: new Date().toISOString(),
            coordinates: {
              latitude: -9.5234,
              longitude: -67.8123
            },
            satelliteData: {
              ndvi: 0.32,
              ndviPrevious: 0.78,
              ndviChange: -0.46,
              redBand: 0.18,
              nirBand: 0.35,
              cloudCover: 0.02,
              temperature: 28.2,
              humidity: 0.80
            },
            mlPredictions: {
              ndviPredictor: {
                predictedNDVI: 0.25,
                confidence: 0.92,
                trend: "DECLINING"
              },
              changeDetector: {
                changeDetected: true,
                confidence: 0.96,
                changeType: "DEFORESTATION"
              },
              riskClassifier: {
                riskLevel: "CRITICAL",
                riskScore: 0.88,
                confidence: 0.63
              }
            },
            overallConfidence: 0.9225,
            alert: {
              triggered: true,
              severity: "CRITICAL",
              message: "Deforestation detected - 59% vegetation loss in 7 days",
              area: 85,
              areaUnit: "hectares"
            }
          }
        }),
        status: 200,
        type: "json"
      }
    }
  ],
  ruleType: "Redirect"
};

/**
 * MOCK RULE 2: ML API Prediction Response
 * Mocks the ML service endpoint for predictions
 */
export const mockMLPredictionResponse = {
  name: "Mock ML API Predictions",
  description: "Intercepts ML service calls and returns mock predictions",
  source: {
    operator: "Contains",
    value: "localhost:5001",
    valueType: "String",
    type: "url"
  },
  pairs: [
    {
      id: "pair1",
      request: {
        method: {
          operator: "Equals",
          value: "POST"
        }
      },
      response: {
        value: JSON.stringify({
          status: "success",
          predictions: {
            model1_ndvi_predictor: {
              predicted_ndvi: 0.25,
              confidence: 0.92,
              model_type: "XGBoost Regressor",
              trees_used: 200
            },
            model2_change_detector: {
              change_detected: true,
              confidence: 0.96,
              model_type: "XGBoost Classifier",
              probability: 0.96
            },
            model3_risk_classifier: {
              risk_level: "CRITICAL",
              confidence: 0.63,
              model_type: "Random Forest",
              trees_voting_critical: 63,
              total_trees: 100
            },
            model4_feature_scaler: {
              scaling_method: "StandardScaler",
              features_normalized: 10
            },
            ensemble_confidence: 0.9225,
            processing_time_ms: 842
          }
        }),
        status: 200,
        type: "json"
      }
    }
  ],
  ruleType: "Redirect"
};

/**
 * MOCK RULE 3: Sentinel Hub Satellite Data Response
 * Mocks Sentinel Hub API for satellite imagery
 */
export const mockSentinelHubResponse = {
  name: "Mock Sentinel Hub Response",
  description: "Intercepts Sentinel Hub API calls and returns mock satellite bands",
  source: {
    operator: "Contains",
    value: "sentinelhub.com",
    valueType: "String",
    type: "url"
  },
  pairs: [
    {
      id: "pair1",
      request: {
        method: {
          operator: "Equals",
          value: "POST"
        }
      },
      response: {
        value: JSON.stringify({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {
                acquisitionDate: new Date().toISOString(),
                cloudCoverage: 2,
                dataAvailability: 100
              },
              geometry: {
                type: "Polygon",
                coordinates: [[[-67.8, -9.5], [-67.8, -9.6], [-67.9, -9.6], [-67.9, -9.5], [-67.8, -9.5]]]
              }
            }
          ],
          satelliteBands: {
            redBand: 0.18,
            greenBand: 0.12,
            blueBand: 0.10,
            nirBand: 0.35,
            swir1: 0.28,
            swir2: 0.22,
            scl: "Cloud-Free"
          }
        }),
        status: 200,
        type: "json"
      }
    }
  ],
  ruleType: "Redirect"
};

/**
 * MOCK RULE 4: Historical NDVI Data Response
 * Mocks historical data endpoint for trend analysis
 */
export const mockHistoricalDataResponse = {
  name: "Mock Historical NDVI Data",
  description: "Returns mock historical NDVI data for trend analysis",
  source: {
    operator: "Contains",
    value: "/analysis/history",
    valueType: "String",
    type: "url"
  },
  pairs: [
    {
      id: "pair1",
      request: {
        method: {
          operator: "Equals",
          value: "GET"
        }
      },
      response: {
        value: JSON.stringify({
          regionName: "Amazon_Acre_Zone_12",
          historicalData: [
            { date: "2026-01-07", ndvi: 0.76, status: "HEALTHY" },
            { date: "2026-01-14", ndvi: 0.77, status: "HEALTHY" },
            { date: "2026-01-21", ndvi: 0.78, status: "HEALTHY" },
            { date: "2026-01-28", ndvi: 0.32, status: "CRITICAL", alert: true }
          ],
          trend: "SHARP_DECLINE",
          averageNDVI: 0.6575
        }),
        status: 200,
        type: "json"
      }
    }
  ],
  ruleType: "Redirect"
};

/**
 * SCENARIO VARIATIONS FOR TESTING
 */

/**
 * SCENARIO A: False Alarm (Cloud Cover)
 * Simulates a cloud-covered image that shouldn't trigger alert
 */
export const mockFalseAlarmScenario = {
  name: "Scenario A: False Alarm (Clouds)",
  description: "Cloud interference causing false reading",
  response: {
    satelliteData: {
      ndvi: 0.35,
      ndviPrevious: 0.77,
      ndviChange: -0.42,
      cloudCover: 0.85, // 85% clouds!
      temperature: 25.1,
      humidity: 0.88
    },
    mlPredictions: {
      changeDetector: {
        changeDetected: false,
        confidence: 0.15,
        reason: "High cloud cover - data unreliable"
      },
      riskClassifier: {
        riskLevel: "LOW",
        confidence: 0.92
      }
    },
    overallConfidence: 0.15,
    alert: {
      triggered: false,
      message: "SKIPPED - Cloud cover too high (85%)"
    }
  }
};

/**
 * SCENARIO B: Mining Activity
 * Simulates a mining operation instead of logging
 */
export const mockMiningScenario = {
  name: "Scenario B: Mining Operation",
  description: "Different spectral signature from mining",
  response: {
    satelliteData: {
      ndvi: 0.28,
      ndviPrevious: 0.76,
      ndviChange: -0.48,
      redBand: 0.35, // Much higher red from exposed iron
      nirBand: 0.25,
      cloudCover: 0.03,
      temperature: 31.5 // Even hotter from bare earth
    },
    mlPredictions: {
      riskClassifier: {
        riskLevel: "CRITICAL",
        confidence: 0.87,
        likelyCause: "MINING_OPERATION"
      }
    },
    alert: {
      triggered: true,
      severity: "CRITICAL",
      estimatedArea: 120,
      possibleCause: "Mining Activity"
    }
  }
};

/**
 * SCENARIO C: Natural Seasonal Change
 * Simulates seasonal vegetation change (not deforestation)
 */
export const mockSeasonalChangeScenario = {
  name: "Scenario C: Seasonal Change",
  description: "Natural seasonal NDVI variation",
  response: {
    satelliteData: {
      ndvi: 0.62,
      ndviPrevious: 0.72,
      ndviChange: -0.10, // Small change
      redBand: 0.12,
      nirBand: 0.40,
      cloudCover: 0.05,
      temperature: 26.0
    },
    mlPredictions: {
      changeDetector: {
        changeDetected: true,
        confidence: 0.45,
        reason: "Small change - likely seasonal"
      },
      riskClassifier: {
        riskLevel: "MEDIUM",
        confidence: 0.58
      }
    },
    overallConfidence: 0.52,
    alert: {
      triggered: false,
      message: "Natural seasonal variation - No alert"
    }
  }
};

/**
 * Helper function to get mock response based on scenario
 */
export const getMockResponseByScenario = (scenarioName) => {
  const scenarios = {
    "deforestation": mockAnalysisResponse,
    "false-alarm": mockFalseAlarmScenario,
    "mining": mockMiningScenario,
    "seasonal": mockSeasonalChangeScenario

  };
  return scenarios[scenarioName] || mockAnalysisResponse;
};

/**
 * Installation Instructions for Requestly
 */
export const requesterlyInstructions = `
╔══════════════════════════════════════════════════════════════════════╗
║           REQUESTLY INTEGRATION - INSTALLATION GUIDE                 ║
╚══════════════════════════════════════════════════════════════════════╝

STEP 1: Install Requestly Extension
├─ Chrome: https://chrome.google.com/webstore/detail/requestly-http-client/lfklgnkbafkmncmlmhbjkjbenjapnbij
├─ Firefox: https://addons.mozilla.org/en-US/firefox/addon/requestly/
├─ Edge: https://microsoftedge.microsoft.com/addons/detail/requestly-http-client
└─ Safari: https://apps.apple.com/app/requestly-http-interceptor/id1429987402

STEP 2: Import Mock Rules
1. Open Requestly → Settings
2. Click "Import Rules"
3. Paste the JSON from this file's mockRulesJSON export
4. Click "Import"

STEP 3: Enable Rules
1. Go to Rules tab
2. Toggle ON each rule:
   ├─ Mock Backend Analysis Response
   ├─ Mock ML API Predictions
   ├─ Mock Sentinel Hub Response
   └─ Mock Historical NDVI Data

STEP 4: Test with Scenarios
Option A - Use Deforestation Scenario (Default):
├─ All rules enabled
├─ Demonstrates full pipeline
└─ Shows critical alert

Option B - Test False Alarm:
├─ Modify mock response with mockFalseAlarmScenario
├─ Verify system skips cloud-covered images
└─ Confirms confidence filtering works

Option C - Test Mining Detection:
├─ Use mockMiningScenario
├─ Different spectral signature
└─ Tests alternative threat detection

STEP 5: Verify Integration
1. Start frontend: npm run dev
2. Go to http://localhost:3000
3. Click "Analyze Region"
4. Check browser console (F12)
5. Should see mocked responses being intercepted

╔══════════════════════════════════════════════════════════════════════╗
║                         USE CASES                                    ║
╚══════════════════════════════════════════════════════════════════════╝

✓ Demo without API keys
✓ Test edge cases (clouds, mining, seasonal)
✓ Offline development
✓ Performance testing (no network latency)
✓ CI/CD testing without external APIs
✓ Hackathon judging (consistent, fast responses)

╔══════════════════════════════════════════════════════════════════════╗
║                      BONUS: CUSTOMIZE RESPONSES                      ║
╚══════════════════════════════════════════════════════════════════════╝

To create custom scenarios:
1. Copy mockAnalysisResponse
2. Modify satelliteData values
3. Adjust ML predictions accordingly
4. Save as new scenario
5. Import into Requestly

Example: Simulate 50% deforestation:
  ndvi: 0.38 (instead of 0.32)
  riskLevel: "HIGH" (instead of "CRITICAL")
  confidence: 0.78
`;

export default {
  mockAnalysisResponse,
  mockMLPredictionResponse,
  mockSentinelHubResponse,
  mockHistoricalDataResponse,
  mockFalseAlarmScenario,
  mockMiningScenario,
  mockSeasonalChangeScenario,
  getMockResponseByScenario,
  requesterlyInstructions
};
