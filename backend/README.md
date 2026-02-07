# Backend - Satellite Monitoring System

This folder contains the **Node.js + Express.js + MongoDB** backend for the Satellite Monitoring System.

## 📁 Directory Structure

```
backend/
├── src/
│   ├── api/
│   │   └── routes/
│   │       ├── analysis.js      # Analysis endpoints
│   │       └── health.js        # Health check endpoints
│   ├── services/
│   │   ├── satelliteService.js  # Sentinel-2 API integration
│   │   ├── ndviService.js       # NDVI calculations
│   │   └── analysisService.js   # Workflow orchestration
│   ├── models/
│   │   └── index.js             # MongoDB schemas
│   ├── middleware/
│   │   └── errorHandler.js      # Error handling middleware
│   └── jobs/
│       └── scheduler.js         # node-cron scheduler
├── server.js                    # Express app entry point
├── package.json                 # Dependencies
├── .env.example                 # Environment template
└── README.md                    # This file
```

## 🚀 Quick Start

### Installation

```bash
npm install
```

### Configuration

```bash
cp .env.example .env
```

**Edit `.env` with:**

```
MONGODB_URI=mongodb://localhost:27017/satellite_analysis
PORT=5000
NODE_ENV=development
SCHEDULER_ENABLED=true
```

### Start Server

```bash
npm start
```

Server runs on `http://localhost:5000`

## 📊 API Routes

### Analysis Endpoints

#### Analyze a Region
```
POST /api/analysis/analyze
Content-Type: application/json

{
  "latitude": 2.253,
  "longitude": 32.003,
  "sizeKm": 50,
  "name": "Region Name"
}

Response:
{
  "success": true,
  "analysis": {
    "_id": "...",
    "ndviValue": 0.45,
    "previousNdvi": 0.52,
    "ndviChange": -0.07,
    "changePercentage": -13.46,
    "riskClassification": {
      "riskLevel": "high",
      "description": "Significant vegetation loss detected"
    },
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

#### Get Region History
```
GET /api/analysis/history/:regionId

Response:
{
  "success": true,
  "regionId": "...",
  "analyses": [...]
}
```

#### Get Latest Analyses
```
GET /api/analysis/latest

Response:
{
  "success": true,
  "latestAnalyses": [...]
}
```

#### Get System Statistics
```
GET /api/analysis/stats

Response:
{
  "success": true,
  "stats": {
    "totalAnalyses": 45,
    "totalRegions": 12,
    "successRate": 98.5,
    "averageNdvi": 0.48
  }
}
```

### Health Endpoints

```
GET /api/health
Response: { "status": "healthy" }

GET /api/health/deep
Response: { "status": "healthy", "mongodb": "connected", "scheduler": "active" }
```

## 🗄️ Database Schema

### AnalysisResult
```javascript
{
  regionId: ObjectId,
  latitude: Number,
  longitude: Number,
  ndviValue: Number,
  previousNdvi: Number,
  ndviChange: Number,
  changePercentage: Number,
  riskClassification: {
    riskLevel: String, // 'low', 'medium', 'high'
    description: String
  },
  timestamp: Date,
  metadata: Object
}
```

### MonitoredRegion
```javascript
{
  name: String,
  latitude: Number,
  longitude: Number,
  sizeKm: Number,
  riskLevel: String,
  lastAnalysis: Date,
  alertCount: Number
}
```

### Alert
```javascript
{
  regionId: ObjectId,
  riskLevel: String,
  message: String,
  timestamp: Date,
  read: Boolean
}
```

### SchedulerJobLog
```javascript
{
  jobName: String,
  status: String,
  timestamp: Date,
  regionsProcessed: Number,
  errorsCount: Number,
  logs: [String]
}
```

## 🔧 Core Services

### Satellite Service
- `fetchSatelliteData()` - Retrieves Sentinel-2 imagery
- `generateMockData()` - Creates sample data for testing
- `processTileData()` - Processes satellite tiles

### NDVI Service
- `calculateNDVI()` - Computes vegetation index
- `detectChange()` - Identifies changes between analyses
- `classifyRisk()` - Assigns risk levels
- `generateAlert()` - Creates alerts for high-risk regions

### Analysis Service
- `runAnalysis()` - Orchestrates complete analysis workflow
- `batchAnalyzeRegions()` - Processes multiple regions
- `generateReport()` - Creates analysis reports

## 🕐 Automated Scheduler

The system includes daily monitoring with `node-cron`:

**Runs Daily at 1 AM UTC:**
- Monitors all registered regions
- Runs NDVI analysis on each
- Generates alerts for high-risk areas
- Logs all operations to database

Configure in `.env`:
```
SCHEDULER_ENABLED=true   # Enable/disable scheduler
```

## 🧪 Testing

```bash
# Health check
curl http://localhost:5000/api/health

# Analyze a region
curl -X POST http://localhost:5000/api/analysis/analyze \
  -H "Content-Type: application/json" \
  -d '{"latitude":2.253,"longitude":32.003,"sizeKm":50,"name":"Test"}'

# Get latest analyses
curl http://localhost:5000/api/analysis/latest
```

## 📦 Dependencies

- **express** - Web framework
- **mongoose** - MongoDB ODM
- **node-cron** - Task scheduling
- **axios** - HTTP client
- **math.js** - Mathematical operations
- **uuid** - Unique ID generation

## 🔐 Environment Variables

```
MONGODB_URI          # MongoDB connection string
PORT                 # Server port (default: 5000)
NODE_ENV             # Environment (development/production)
SCHEDULER_ENABLED    # Enable daily scheduler (true/false)
```

## 🚀 Production Deployment

```bash
# Build for production
npm run build

# Start in production
NODE_ENV=production npm start
```

## 🐛 Debugging

Enable debug mode:
```bash
DEBUG=* npm start
```

Check logs:
```bash
# View recent logs
tail -f logs/error.log

# Search for specific errors
grep "ERROR" logs/error.log
```

## 📞 API Response Codes

- `200` - Successful request
- `400` - Bad request (invalid parameters)
- `404` - Resource not found
- `500` - Server error
- `503` - Service unavailable (MongoDB down)

## 🔄 CORS Configuration

Frontend requests are accepted from:
```
http://localhost:3000
```

Modify in `server.js` for different origins.

---

**For frontend documentation, see [../frontend/README.md](../frontend/README.md)**
