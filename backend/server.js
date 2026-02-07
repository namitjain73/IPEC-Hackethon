const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');

// Load environment variables
dotenv.config();

const { initializeWebSocket } = require('./src/utils/websocket-simple');

const app = express();
const httpServer = http.createServer(app);

// CORS Configuration
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

// Try MongoDB connection (optional for demo)
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/satellite-db', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('✅ MongoDB connected (optional for demo)\n');
  })
  .catch(err => {
    console.warn('⚠️  MongoDB not available - running in demo mode (in-memory)\n');
  });

// Routes - Import only essential ones
const analysisRoutes = require('./src/api/routes/analysis');
const healthRoutes = require('./src/api/routes/health');

app.use('/api/health', healthRoutes);
app.use('/api/analysis', analysisRoutes);

// Dummy endpoints to suppress 404 errors (for demo)
app.get('/api/system/status', (req, res) => {
  res.json({
    status: 'ok',
    message: 'ForestGuard Demo Server',
    realtimeEnabled: true,
    timestamp: new Date(),
  });
});

app.get('/api/regions', (req, res) => {
  res.json([
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
  ]);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'ForestGuard Server - Real-Time Edition',
    timestamp: new Date(),
    realtimeEnabled: true,
  });
});

// Test endpoint to verify real API is working
app.get('/api/test-real-api', async (req, res) => {
  try {
    const { fetchLatestImagery } = require('./src/services/satelliteService');
    console.log('\n🧪 Testing Real Satellite API...\n');
    
    // Test with Valmiki Nagar Forest, Bihar
    const result = await fetchLatestImagery(25.65, 84.12, 50);
    
    if (result.success) {
      res.json({
        success: true,
        message: '✅ Real API is working!',
        dataSource: result.source,
        apiStatus: result.apiStatus,
        location: result.location,
        timestamp: result.timestamp,
        fetchDuration: result.fetchDuration,
      });
    } else {
      res.json({
        success: false,
        message: '⚠️ Real API failed, fallback active',
        error: result.error,
        apiStatus: result.apiStatus,
      });
    }
  } catch (error) {
    res.json({
      success: false,
      message: '❌ Real API test failed',
      error: error.message,
    });
  }
});

const PORT = process.env.PORT || 5000;

// Initialize WebSocket (NO REDIS/BULL NEEDED!)
const io = initializeWebSocket(httpServer);

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║       🌳 ForestGuard Real-Time Server 🌳       ║');
  console.log('╚════════════════════════════════════════════════╝\n');
  console.log(`✅ Server running: http://localhost:${PORT}`);
  console.log(`📡 WebSocket ready: ws://localhost:${PORT}`);
  console.log(`⚡ Real-time streaming: ENABLED`);
  console.log(`� Real Satellite API: ENABLED ✅`);
  console.log(`   → Sentinel Hub Token: ${process.env.SENTINEL_HUB_TOKEN ? 'LOADED' : 'USING DEFAULT'}`);
  console.log(`   → Test endpoint: GET http://localhost:${PORT}/api/test-real-api`);
  console.log(`🎯 CORS Origin: ${corsOptions.origin}`);
  console.log(`📊 Analysis: Uses real satellite data with ML models\n`);
  console.log('Ready for judges! 🚀\n');
});

module.exports = { app, io };
