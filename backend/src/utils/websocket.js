const socketIO = require('socket.io');
const redis = require('redis');
const Queue = require('bull');

// Create Redis client for real-time data
const redisClient = redis.createClient({
  host: 'localhost',
  port: 6379,
  legacyMode: true
});

// Create Bull queues for background jobs
const analysisQueue = new Queue('satellite-analysis', {
  redis: { host: 'localhost', port: 6379 }
});

const alertQueue = new Queue('alerts', {
  redis: { host: 'localhost', port: 6379 }
});

let io = null;
let connectedUsers = new Set();

/**
 * Initialize Socket.io server for real-time streaming
 */
function initializeWebSocket(httpServer) {
  io = socketIO(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    console.log(`[WebSocket] New client connected: ${socket.id}`);
    connectedUsers.add(socket.id);

    // Subscribe to real-time region updates
    socket.on('subscribe-region', (regionName) => {
      socket.join(`region:${regionName}`);
      console.log(`[WebSocket] Client subscribed to region: ${regionName}`);
      socket.emit('subscribed', { region: regionName });
    });

    // Unsubscribe from region
    socket.on('unsubscribe-region', (regionName) => {
      socket.leave(`region:${regionName}`);
      console.log(`[WebSocket] Client unsubscribed from region: ${regionName}`);
    });

    // Request real-time analysis
    socket.on('request-analysis', async (data) => {
      console.log(`[WebSocket] Analysis requested for: ${data.regionName}`);
      
      // Add job to queue
      const job = await analysisQueue.add(data, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 }
      });

      socket.emit('analysis-queued', { jobId: job.id });
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      console.log(`[WebSocket] Client disconnected: ${socket.id}`);
      connectedUsers.delete(socket.id);
    });

    // Error handler
    socket.on('error', (error) => {
      console.error(`[WebSocket] Socket error: ${error}`);
    });
  });

  return io;
}

/**
 * Broadcast real-time analysis result to all connected clients
 */
function broadcastAnalysisResult(regionName, result) {
  if (io) {
    io.to(`region:${regionName}`).emit('analysis-result', {
      region: regionName,
      data: result,
      timestamp: new Date(),
      confidence: result.overallConfidence
    });

    console.log(`[WebSocket] Broadcasted result for region: ${regionName}`);
  }
}

/**
 * Broadcast alert to all connected clients
 */
function broadcastAlert(alert) {
  if (io) {
    io.emit('alert-notification', {
      alert: alert,
      timestamp: new Date(),
      severity: alert.severity
    });

    console.log(`[WebSocket] Alert broadcasted: ${alert.severity}`);
  }
}

/**
 * Emit real-time data update to specific region
 */
function emitRealtimeUpdate(regionName, data) {
  if (io) {
    io.to(`region:${regionName}`).emit('realtime-data', {
      region: regionName,
      data: data,
      timestamp: new Date()
    });
  }
}

/**
 * Process analysis queue
 */
analysisQueue.process(async (job) => {
  console.log(`[Queue] Processing analysis job: ${job.id}`);
  
  const { latitude, longitude, sizeKm, regionName } = job.data;
  
  try {
    // Simulate analysis (actual analysis happens in backend API)
    job.progress(50);
    
    // Update progress
    if (io) {
      io.to(`region:${regionName}`).emit('analysis-progress', {
        jobId: job.id,
        progress: 50,
        status: 'Processing ML models...'
      });
    }

    job.progress(100);
    
    return { success: true, message: 'Analysis queued' };
  } catch (error) {
    console.error(`[Queue] Error processing job: ${error}`);
    throw error;
  }
});

/**
 * Alert queue processor
 */
alertQueue.process(async (job) => {
  console.log(`[Queue] Processing alert job: ${job.id}`);
  
  try {
    broadcastAlert(job.data);
    return { success: true };
  } catch (error) {
    console.error(`[Queue] Error processing alert: ${error}`);
    throw error;
  }
});

/**
 * Auto-polling for continuous satellite data (every 10 minutes)
 */
function startAutoPolling(regions = []) {
  setInterval(async () => {
    console.log(`[AutoPolling] Checking ${regions.length} regions...`);
    
    regions.forEach(region => {
      if (connectedUsers.size > 0) {
        // Queue analysis for active regions
        analysisQueue.add({
          latitude: region.latitude,
          longitude: region.longitude,
          sizeKm: region.sizeKm,
          regionName: region.name,
          isAutoPolled: true
        }, {
          attempts: 1
        });
      }
    });
  }, 600000); // 10 minutes
}

/**
 * Get real-time metrics
 */
function getRealtimeMetrics() {
  return {
    connectedUsers: connectedUsers.size,
    activeAnalysis: analysisQueue.count(),
    pendingAlerts: alertQueue.count(),
    timestamp: new Date()
  };
}

module.exports = {
  initializeWebSocket,
  broadcastAnalysisResult,
  broadcastAlert,
  emitRealtimeUpdate,
  startAutoPolling,
  getRealtimeMetrics,
  analysisQueue,
  alertQueue,
  redisClient
};
