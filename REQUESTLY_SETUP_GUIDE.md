# 🔧 Requestly Integration Guide

## Overview

We've integrated **Requestly** to mock satellite APIs and ML service responses. This allows you to:
- ✅ Demo without external API dependencies
- ✅ Test multiple scenarios instantly
- ✅ Develop offline
- ✅ Run CI/CD without API credentials
- ✅ Provide consistent responses for judges

---

## 📥 Installation

### Step 1: Install Requestly Browser Extension

Choose your browser:
- **Chrome/Edge**: [Install from Chrome Web Store](https://chrome.google.com/webstore/detail/requestly-http-client)
- **Firefox**: [Install from Firefox Add-ons](https://addons.mozilla.org/firefox/addon/requestly/)

### Step 2: Copy Mock Rules JSON

Use this configuration in Requestly:

```json
{
  "rules": [
    {
      "name": "Mock Backend Analysis API",
      "description": "Intercepts /api/analysis/analyze and returns mock satellite data",
      "pairs": [
        {
          "request": {
            "url": {
              "contains": "/analysis/analyze"
            },
            "method": "POST"
          },
          "response": {
            "statusCode": 200,
            "body": {
              "success": true,
              "data": {
                "ndvi": 0.32,
                "ndviPrevious": 0.78,
                "ndviChange": -0.46,
                "riskLevel": "CRITICAL",
                "confidence": 0.9225,
                "alert": true
              }
            }
          }
        }
      ]
    },
    {
      "name": "Mock ML Service API",
      "description": "Intercepts localhost:5001 ML predictions",
      "pairs": [
        {
          "request": {
            "url": {
              "contains": "localhost:5001"
            },
            "method": "POST"
          },
          "response": {
            "statusCode": 200,
            "body": {
              "predictions": {
                "ndvi_predictor": 0.25,
                "change_detector": true,
                "risk_classifier": "CRITICAL",
                "confidence": 0.92
              }
            }
          }
        }
      ]
    }
  ]
}
```

### Step 3: Import into Requestly

1. Open Requestly extension → **Settings**
2. Click **"Import Rules"** button
3. Paste the JSON above
4. Click **"Import"**

---

## 🎮 Using Mock Scenarios

### Scenario 1: Deforestation (Default - CRITICAL ALERT)
```
Status: ACTIVE
NDVI: 0.32 (59% drop from 0.78)
Risk Level: CRITICAL
Confidence: 92%
Area Affected: 85 hectares
```

**When to use:** Main demo, showing full alert system

---

### Scenario 2: False Alarm (Cloud Cover)
**Modify the mock response:**
```javascript
// In requestlyMocks.js, use mockFalseAlarmScenario
cloudCover: 0.85  // 85% clouds
changeDetected: false
confidence: 0.15
alert: false
```

**When to use:** Show system filters unreliable data

---

### Scenario 3: Mining Operation
**Use mockMiningScenario:**
```javascript
redBand: 0.35  // Much higher from exposed iron
temperature: 31.5  // Very hot
likelyCause: "MINING_OPERATION"
```

**When to use:** Demonstrate multi-threat detection

---

### Scenario 4: Seasonal Change (No Alert)
**Use mockSeasonalChangeScenario:**
```javascript
ndviChange: -0.10  // Small change
riskLevel: "MEDIUM"
confidence: 0.52
alert: false
```

**When to use:** Show system doesn't over-alert

---

## 🧪 Testing Steps

### Step 1: Start Development Server
```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: `http://localhost:3000`

### Step 2: Enable Requestly Rules
1. Open Requestly extension
2. Toggle ON all rules
3. Verify they're active (green checkmark)

### Step 3: Test the Pipeline
1. Go to http://localhost:3000
2. Click **"Analyze Region"** button
3. Enter coordinates (any location works with mocked data)
4. Click **"Analyze"**

### Step 4: Verify Mock Response
Open **Browser DevTools** (F12):
1. Go to **Network** tab
2. Click the API request to `/api/analysis/analyze`
3. Check **Response** tab
4. Should see mock data (NDVI 0.32, Risk CRITICAL)

---

## 🎯 Hackathon Demo Flow

### For Judges:
```
1. Open project in browser
2. Requestly is enabled (shows in extension bar)
3. Click "Analyze Region" button
4. Instant response with deforestation alert
5. Show confidence score (92%)
6. Explain how each ML model contributed
7. Show real scenario walkthrough
```

### Benefits:
✅ **Fast**: No API latency (instant response)
✅ **Reliable**: Same results every time
✅ **Consistent**: Judges see predictable behavior
✅ **Educational**: Show data flow clearly
✅ **Impressive**: Shows you understand API mocking

---

## 📊 Response Structure

### Analysis API Response (Mocked)
```json
{
  "success": true,
  "data": {
    "regionName": "Amazon_Acre_Zone_12",
    "timestamp": "2026-01-28T14:35:00Z",
    "satelliteData": {
      "ndvi": 0.32,
      "ndviPrevious": 0.78,
      "ndviChange": -0.46,
      "redBand": 0.18,
      "nirBand": 0.35,
      "cloudCover": 0.02
    },
    "mlPredictions": {
      "ndviPredictor": {
        "predictedNDVI": 0.25,
        "confidence": 0.92
      },
      "changeDetector": {
        "changeDetected": true,
        "confidence": 0.96
      },
      "riskClassifier": {
        "riskLevel": "CRITICAL",
        "confidence": 0.63
      }
    },
    "overallConfidence": 0.9225,
    "alert": {
      "triggered": true,
      "severity": "CRITICAL",
      "area": 85,
      "areaUnit": "hectares"
    }
  }
}
```

---

## 🔧 Customization

### Create Your Own Scenario

1. Edit `frontend/src/utils/requestlyMocks.js`
2. Copy `mockAnalysisResponse`
3. Modify values:

```javascript
export const mockCustomScenario = {
  name: "Your Scenario Name",
  response: {
    satelliteData: {
      ndvi: 0.45,  // Change this
      ndviPrevious: 0.75,
      ndviChange: -0.30,
      // ... other fields
    },
    // Modify ML predictions accordingly
  }
};
```

4. Add to Requestly mock
5. Test with new scenario

---

## ⚙️ Troubleshooting

### Issue: Mock not working
**Solution:**
1. Verify Requestly is enabled (check extension icon)
2. Verify rules are toggled ON (green checkmark)
3. Clear browser cache: `Ctrl+Shift+Delete`
4. Reload page: `Ctrl+R`

### Issue: Different response than expected
**Solution:**
1. Open DevTools (F12)
2. Check Network tab
3. Click failed request
4. Check Headers → verify it's being intercepted
5. Check Response → should show mocked JSON

### Issue: Backend requests not mocked
**Solution:**
1. Requestly only intercepts browser requests
2. Make sure requests are from frontend code
3. Check Network tab to confirm interception
4. Rule URL pattern must match exactly

---

## 🏆 Bonus: Impress the Judges

**What to Highlight:**

1. **API Mocking**: "We use Requestly for offline development"
2. **Multiple Scenarios**: "Test edge cases without real APIs"
3. **Performance**: "Instant responses for demo"
4. **Error Handling**: "Show how system handles cloud cover"
5. **Documentation**: "Clear setup guide for reproducibility"

**Demo Script:**
```
"Let me show you how this works. 
[Click Analyze Button]
The system uses Requestly to mock satellite data for this demo.
In production, it would call real Sentinel Hub APIs.
[Show response in browser console]
You can see here - NDVI dropped 59%, confidence is 92%, risk is CRITICAL.
All 4 ML models agreed on this classification.
[Switch to different scenario]
If we had clouds in the image, the system would skip it and request fresh data.
That's how we prevent false alarms."
```

---

## 📚 Resources

- [Requestly Documentation](https://www.requestly.io/)
- [API Mocking Best Practices](https://www.requestly.io/blog/)
- [Mock Rules Syntax](https://www.requestly.io/docs/api-mocking/)

---

**Ready to demo with Requestly? You've got this! 🚀**
