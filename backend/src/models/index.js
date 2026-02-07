const mongoose = require('mongoose');

const analysisResultSchema = new mongoose.Schema({
  regionName: { type: String, required: true, index: true },
  latitude: Number,
  longitude: Number,
  timestamp: { type: Date, default: Date.now, index: true },
  ndvi: {
    mean: Number,
    min: Number,
    max: Number,
    stdDev: Number,
    validPixels: Number,
    totalPixels: Number,
  },
  changeDetection: {
    meanChange: Number,
    decreaseCount: Number,
    increaseCount: Number,
    stableCount: Number,
  },
  riskClassification: {
    riskLevel: String,
    riskScore: Number,
    changeMagnitude: Number,
    affectedAreaPercentage: Number,
    vegetationLossPercentage: Number,
    areaAffected: Number,
    confidenceScore: Number,
  },
  satelliteData: {
    dataSource: String,
    bbox: { north: Number, south: Number, east: Number, west: Number },
  },
  executionTime: String,
  status: { type: String, enum: ['success', 'failed'], default: 'success' },
  error: String,
}, { timestamps: true });

const monitoredRegionSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, index: true },
  description: String,
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  sizeKm: { type: Number, default: 50 },
  monitoringEnabled: { type: Boolean, default: true },
  lastAnalysisDate: Date,
  riskLevel: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
  alertThreshold: { type: Number, default: 0.5 },
}, { timestamps: true });

const alertSchema = new mongoose.Schema({
  regionName: { type: String, required: true, index: true },
  alertType: { type: String, enum: ['vegetation_loss', 'unusual_change', 'threshold_exceeded', 'deforestation'], required: true },
  severity: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  description: String,
  threshold: { type: Number },
  notificationType: { type: String, default: 'in-app' },
  isActive: { type: Boolean, default: true },
  acknowledged: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true });

const schedulerJobLogSchema = new mongoose.Schema({
  jobId: { type: String, required: true, index: true },
  jobName: String,
  status: { type: String, enum: ['started', 'completed', 'failed'], required: true },
  regionsProcessed: [String],
  executionTime: String,
  error: String,
  resultSummary: { successCount: Number, failureCount: Number, alertsGenerated: Number },
  startedAt: { type: Date, default: Date.now, index: true },
  completedAt: Date,
}, { timestamps: true });

module.exports = {
  AnalysisResult: mongoose.model('AnalysisResult', analysisResultSchema),
  MonitoredRegion: mongoose.model('MonitoredRegion', monitoredRegionSchema),
  Alert: mongoose.model('Alert', alertSchema),
  SchedulerJobLog: mongoose.model('SchedulerJobLog', schedulerJobLogSchema),
};
