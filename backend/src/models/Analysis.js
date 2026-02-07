const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema({
  regionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Region',
    required: true,
  },
  regionName: {
    type: String,
    required: true,
  },
  
  // Core analysis data
  timestamp: {
    type: Date,
    default: Date.now,
  },
  ndvi: {
    type: [Number],
    default: [],
  },
  changeDetection: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  riskClassification: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  satelliteData: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  
  // NEW: Extended fields for hackathon features
  confidenceScore: {
    type: Number,
    min: 0,
    max: 1,
    default: 0,
  },
  
  explainability: {
    reasons: [
      {
        title: String,
        explanation: String,
        metric: String,
        severity: {
          type: String,
          enum: ['low', 'medium', 'high'],
        },
      },
    ],
    primaryFactor: String,
    secondaryFactors: [String],
  },
  
  // Comparison reference
  comparisonWith: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Analysis',
    default: null,
  },
  
  // Quality metrics
  cloudCoverage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  pixelConsistency: {
    type: Number,
    min: 0,
    max: 1,
    default: 0,
  },
  multiDateConfirmed: {
    type: Boolean,
    default: false,
  },
  
  // Detection method and performance
  detectionMethod: {
    type: String,
    enum: ['ml', 'fallback'],
    default: 'fallback',
  },
  
  // Report generation
  pdfReportPath: String,
  reportGeneratedAt: Date,
  
  // Processing status
  processed: {
    type: Boolean,
    default: true,
  },
  processingTime: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'completed',
  },
  
  // Error tracking
  error: {
    type: String,
    default: null,
  },
  
  // Vegetation loss percentage
  vegetationLossPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
});

// Index for efficient queries
analysisSchema.index({ regionId: 1, timestamp: -1 });
analysisSchema.index({ timestamp: -1 });
analysisSchema.index({ 'riskClassification.level': 1 });

module.exports = mongoose.model('Analysis', analysisSchema);
