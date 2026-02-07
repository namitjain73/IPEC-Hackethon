const mongoose = require('mongoose');

const regionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  latitude: {
    type: Number,
    required: true,
  },
  longitude: {
    type: Number,
    required: true,
  },
  sizeKm: {
    type: Number,
    required: true,
    default: 50,
  },
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastScanDate: {
    type: Date,
    default: null,
  },
  
  // References
  analyses: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Analysis',
    },
  ],
  
  // Configuration
  alertThreshold: {
    type: Number,
    default: 15, // Percentage
  },
  active: {
    type: Boolean,
    default: true,
  },
  isCustom: {
    type: Boolean,
    default: false, // Mark if region was created by user analysis
  },
  
  // Optional metadata
  metadata: {
    ecosystem: {
      type: String,
      enum: ['tropical_forest', 'savanna', 'temperate_forest', 'grassland', 'other'],
      default: 'tropical_forest',
    },
    jurisdiction: String,
    priority: {
      type: Number,
      min: 1,
      max: 5,
      default: 3,
    },
  },
  
  // Notification settings
  notificationEmail: String,
  tags: [String],
  
  // Latest cached metrics
  latestMetrics: {
    vegetationLoss: {
      type: Number,
      default: 0,
    },
    riskLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH'],
      default: 'LOW',
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
    },
    trend: {
      type: String,
      enum: ['increasing', 'decreasing', 'stable'],
      default: 'stable',
    },
    ndviValue: {
      type: Number,
      default: 0,
    },
    changePercentage: {
      type: Number,
      default: 0,
    },
  },
  
  // Historical analysis data for trend tracking
  analysisHistory: [
    {
      date: Date,
      ndvi: Number,
      riskLevel: String,
      vegetationLoss: Number,
    }
  ],
});

// Index for faster queries
regionSchema.index({ active: 1, createdAt: -1 });
regionSchema.index({ 'latestMetrics.riskLevel': 1 });

module.exports = mongoose.model('Region', regionSchema);
