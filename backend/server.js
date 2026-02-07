const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables BEFORE importing anything else
dotenv.config();

const mongoose = require('mongoose');
const analysisRoutes = require('./src/api/routes/analysis');
const analysisExtendedRoutes = require('./src/api/routes/analysis-extended');
const realTimeAnalysisRoutes = require('./src/api/routes/realtime-analysis');
const regionsRoutes = require('./src/api/routes/regions');
const systemRoutes = require('./src/api/routes/system');
const healthRoutes = require('./src/api/routes/health');
const mlRoutes = require('./src/api/routes/ml');
const alertsRoutes = require('./src/api/routes/alerts');
const reportsRoutes = require('./src/api/routes/reports');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();

// CORS Configuration - Allow frontend origin from environment
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, res, next) => {
  if (req.method === 'POST' && req.path === '/api/analysis/analyze') {
    console.log('[REQUEST] POST /api/analysis/analyze');
    console.log('[REQUEST] Body:', req.body);
  }
  next();
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/satellite-monitoring', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(async () => {
    console.log('MongoDB connected');
    // Auto-seed demo data on startup if needed
    await seedDemoData();
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Auto-seed demo data for judges presentation
async function seedDemoData() {
  try {
    const Region = require('./src/models/Region');
    
    // Clear all regions first for fresh demo
    await Region.deleteMany({});
    
    console.log('[DEMO] Seeding demo regions for judges presentation...');
    
    const demoRegions = [
      {
        name: '🟢 Valmiki Nagar Forest, Bihar',
        description: 'Healthy forest with stable vegetation - LOW risk example',
        latitude: 25.65,
        longitude: 84.12,
        sizeKm: 50,
        country: 'India',
        latestMetrics: {
          riskLevel: 'LOW',
          vegetationLoss: 2.3,
          trend: 'decreasing',
          confidence: 0.92,
          lastUpdate: new Date(),
        },
        lastScanDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        active: true,
      },
      {
        name: '🟡 Murchison Falls, Uganda',
        description: 'Moderate vegetation changes - MEDIUM risk example',
        latitude: 2.253,
        longitude: 32.003,
        sizeKm: 60,
        country: 'Uganda',
        latestMetrics: {
          riskLevel: 'MEDIUM',
          vegetationLoss: 15.8,
          trend: 'stable',
          confidence: 0.87,
          lastUpdate: new Date(),
        },
        lastScanDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        active: true,
      },
      {
        name: '🔴 Odzala-Kokoua, Congo',
        description: 'Significant vegetation loss - HIGH risk alert',
        latitude: -1.021,
        longitude: 15.909,
        sizeKm: 150,
        country: 'Congo',
        latestMetrics: {
          riskLevel: 'HIGH',
          vegetationLoss: 42.5,
          trend: 'increasing',
          confidence: 0.95,
          lastUpdate: new Date(),
        },
        lastScanDate: new Date(Date.now() - 6 * 60 * 60 * 1000),
        active: true,
      },
      {
        name: '🟢 Kasai Biosphere, DRC',
        description: 'Stable forest region - LOW risk',
        latitude: -3.5,
        longitude: 22.5,
        sizeKm: 200,
        country: 'DRC',
        latestMetrics: {
          riskLevel: 'LOW',
          vegetationLoss: 1.2,
          trend: 'decreasing',
          confidence: 0.89,
          lastUpdate: new Date(),
        },
        lastScanDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        active: true,
      },
    ];

    await Region.insertMany(demoRegions);
    console.log('[DEMO] ✅ 4 demo regions created: 2 LOW, 1 MEDIUM, 1 HIGH');
    console.log('[DEMO] Ready for judges presentation!');
  } catch (error) {
    console.error('[DEMO] Error seeding data:', error.message);
  }
}

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/analysis', analysisExtendedRoutes);
app.use('/api/analysis', realTimeAnalysisRoutes);
app.use('/api/ml', mlRoutes);
app.use('/api/regions', regionsRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/reports', reportsRoutes);

// Error Handler Middleware (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Health Check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
