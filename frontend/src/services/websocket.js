import io from 'socket.io-client';

let socket = null;
let listeners = {};

/**
 * Initialize WebSocket connection
 */
export const initializeWebSocket = (serverUrl = 'http://localhost:5000') => {
  if (socket) {
    return socket;
  }

  socket = io(serverUrl, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5
  });

  // Connection events
  socket.on('connect', () => {
    console.log('[WebSocket] Connected to server');
    emit('ws-connected', { id: socket.id });
  });

  socket.on('disconnect', () => {
    console.log('[WebSocket] Disconnected from server');
    emit('ws-disconnected');
  });

  socket.on('connect_error', (error) => {
    console.error('[WebSocket] Connection error:', error);
    emit('ws-error', { error });
  });

  return socket;
};

/**
 * Subscribe to region updates
 */
export const subscribeToRegion = (regionName) => {
  if (!socket) return;
  socket.emit('subscribe-region', regionName);
  console.log('[WebSocket] Subscribed to region:', regionName);
};

/**
 * Unsubscribe from region
 */
export const unsubscribeFromRegion = (regionName) => {
  if (!socket) return;
  socket.emit('unsubscribe-region', regionName);
  console.log('[WebSocket] Unsubscribed from region:', regionName);
};

/**
 * Request real-time analysis
 */
export const requestRealtimeAnalysis = (analysisData) => {
  if (!socket) return;
  socket.emit('request-analysis', analysisData);
  console.log('[WebSocket] Analysis requested:', analysisData);
};

/**
 * Listen for real-time analysis results
 */
export const onAnalysisResult = (callback) => {
  if (!socket) return;
  socket.on('analysis-result', (data) => {
    console.log('[WebSocket] Analysis result received:', data);
    callback(data);
  });
};

/**
 * Listen for real-time data updates
 */
export const onRealtimeUpdate = (callback) => {
  if (!socket) return;
  socket.on('realtime-data', (data) => {
    console.log('[WebSocket] Real-time data update:', data);
    callback(data);
  });
};

/**
 * Listen for alert notifications
 */
export const onAlertNotification = (callback) => {
  if (!socket) return;
  socket.on('alert-notification', (data) => {
    console.log('[WebSocket] Alert received:', data);
    callback(data);
  });
};

/**
 * Listen for analysis progress
 */
export const onAnalysisProgress = (callback) => {
  if (!socket) return;
  socket.on('analysis-progress', (data) => {
    console.log('[WebSocket] Progress update:', data);
    callback(data);
  });
};

/**
 * Listen for job queuing
 */
export const onJobQueued = (callback) => {
  if (!socket) return;
  socket.on('analysis-queued', (data) => {
    console.log('[WebSocket] Job queued:', data);
    callback(data);
  });
};

/**
 * Generic event listener
 */
export const onWebSocketEvent = (eventName, callback) => {
  if (!socket) return;
  socket.on(eventName, callback);
};

/**
 * Emit custom event
 */
export const emitWebSocketEvent = (eventName, data) => {
  if (!socket) return;
  socket.emit(eventName, data);
};

/**
 * Internal event emitter
 */
const emit = (eventName, data) => {
  if (listeners[eventName]) {
    listeners[eventName].forEach(callback => callback(data));
  }
};

/**
 * Register local listener
 */
export const on = (eventName, callback) => {
  if (!listeners[eventName]) {
    listeners[eventName] = [];
  }
  listeners[eventName].push(callback);

  // Return unsubscribe function
  return () => {
    listeners[eventName] = listeners[eventName].filter(cb => cb !== callback);
  };
};

/**
 * Disconnect WebSocket
 */
export const disconnectWebSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('[WebSocket] Disconnected');
  }
};

/**
 * Check if WebSocket is connected
 */
export const isWebSocketConnected = () => {
  return socket && socket.connected;
};

/**
 * Get socket instance
 */
export const getSocket = () => {
  return socket;
};

export default {
  initializeWebSocket,
  subscribeToRegion,
  unsubscribeFromRegion,
  requestRealtimeAnalysis,
  onAnalysisResult,
  onRealtimeUpdate,
  onAlertNotification,
  onAnalysisProgress,
  onJobQueued,
  onWebSocketEvent,
  emitWebSocketEvent,
  on,
  disconnectWebSocket,
  isWebSocketConnected,
  getSocket
};
