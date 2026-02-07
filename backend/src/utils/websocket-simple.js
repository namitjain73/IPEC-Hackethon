const socketIO = require('socket.io');

// In-memory job queue (NO REDIS NEEDED!)
let jobQueue = [];
let jobId = 0;
let connectedUsers = new Set();

/**
 * Initialize Socket.io server for real-time streaming (NO REDIS/MONGODB!)
 * Perfect for demo to judges!
 */
function initializeWebSocket(httpServer) {
  const io = socketIO(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    connectedUsers.add(socket.id);
    console.log(`\n[WebSocket] ✅ Client connected: ${socket.id}`);
    console.log(`[WebSocket] Total users: ${connectedUsers.size}\n`);

    // Subscribe to region
    socket.on('subscribe-region', (regionName) => {
      socket.join(`region:${regionName}`);
      console.log(`[WebSocket] 📍 Subscribed to: ${regionName}`);
      socket.emit('subscribed', { region: regionName });
    });

    // Unsubscribe from region
    socket.on('unsubscribe-region', (regionName) => {
      socket.leave(`region:${regionName}`);
      console.log(`[WebSocket] 📍 Unsubscribed from: ${regionName}`);
    });

    // Request analysis
    socket.on('request-analysis', async (data) => {
      const region = data.region || 'Unknown';
      const jobNumber = ++jobId;
      
      console.log(`\n[Analysis] 🚀 Job #${jobNumber} started for region: ${region}`);
      
      // Emit job queued
      io.to(`region:${region}`).emit('analysis-queued', {
        jobId: jobNumber,
        region,
        status: 'queued'
      });

      // Simulate analysis with progress updates
      const progressSteps = [25, 50, 75, 100];
      for (const progress of progressSteps) {
        await sleep(2000); // 2 seconds per step
        
        io.to(`region:${region}`).emit('analysis-progress', {
          jobId: jobNumber,
          progress,
          status: progress === 100 ? '✅ Complete!' : `🔄 Processing... ${progress}%`
        });
      }

      // Generate result
      const result = generateMockResult(data);
      
      console.log(`[Analysis] ✅ Job #${jobNumber} completed!\n`);

      // Broadcast result
      io.to(`region:${region}`).emit('analysis-result', result);
    });

    // Disconnect
    socket.on('disconnect', () => {
      connectedUsers.delete(socket.id);
      console.log(`[WebSocket] ❌ Client disconnected: ${socket.id}`);
      console.log(`[WebSocket] Total users: ${connectedUsers.size}\n`);
    });
  });

  return io;
}

/**
 * Generate mock analysis result
 */
function generateMockResult(data) {
  const vLoss = Math.random() * 30;
  const risk = vLoss > 20 ? 'high' : vLoss > 10 ? 'medium' : 'low';

  return {
    success: true,
    regionName: data.region || 'Demo Region',
    timestamp: new Date(),
    executionTime: `${Math.floor(Math.random() * 5000 + 3000)}ms`,
    ndvi: {
      mean: (0.45 + Math.random() * 0.3).toFixed(3),
      min: (0.2 + Math.random() * 0.1).toFixed(3),
      max: (0.7 + Math.random() * 0.2).toFixed(3),
      stdDev: 0.15,
      validPixels: 65000,
      totalPixels: 65536,
    },
    vegetationLossPercentage: parseFloat(vLoss.toFixed(1)),
    areaAffected: parseFloat(((vLoss / 100) * 50).toFixed(1)),
    confidenceScore: parseFloat((0.75 + Math.random() * 0.25).toFixed(2)),
    riskClassification: {
      riskLevel: risk,
      riskScore: risk === 'high' ? 0.8 : risk === 'medium' ? 0.5 : 0.2,
    },
    changeDetection: {
      decreaseCount: Math.floor((vLoss / 100) * 65536),
      stableCount: Math.floor(((100 - vLoss) / 100) * 65536),
      increaseCount: 0,
    },
  };
}

/**
 * Helper to sleep
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  initializeWebSocket,
};
