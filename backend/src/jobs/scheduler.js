const cron = require('node-cron');
const { batchAnalyze } = require('../services/analysisService');
const { MonitoredRegion, AnalysisResult, Alert, SchedulerJobLog } = require('../models');
const { v4: uuidv4 } = require('uuid');

const DEFAULT_REGIONS = [
  {
    name: 'Murchison Falls, Uganda',
    latitude: 2.253,
    longitude: 32.003,
    sizeKm: 50,
    description: 'Protected area in Uganda',
  },
  {
    name: 'Odzala-Kokoua, Congo',
    latitude: -1.021,
    longitude: 15.909,
    sizeKm: 60,
    description: 'National park in Republic of Congo',
  },
  {
    name: 'Kasai Biosphere, DRC',
    latitude: -4.338,
    longitude: 20.823,
    sizeKm: 80,
    description: 'Biosphere reserve in Democratic Republic of Congo',
  },
];

async function loadMonitoredRegions() {
  try {
    let regions = await MonitoredRegion.find({ monitoringEnabled: true });

    if (regions.length === 0) {
      const created = await MonitoredRegion.insertMany(DEFAULT_REGIONS);
      regions = created;
      console.log(`Initialized ${created.length} default regions`);
    }

    return regions.map((r) => ({
      name: r.name,
      latitude: r.latitude,
      longitude: r.longitude,
      sizeKm: r.sizeKm,
    }));
  } catch (error) {
    console.error('Error loading monitored regions:', error);
    return DEFAULT_REGIONS;
  }
}

async function runMonitoringJob() {
  const jobId = uuidv4();
  const startTime = Date.now();
  let regionsProcessed = [];
  let alertsGenerated = 0;

  try {
    console.log(`[${new Date().toISOString()}] Starting monitoring job ${jobId}`);

    const regions = await loadMonitoredRegions();
    regionsProcessed = regions.map((r) => r.name);

    const previousAnalyses = {};
    for (const region of regions) {
      const latest = await AnalysisResult.findOne({ regionName: region.name }).sort({ timestamp: -1 });
      if (latest) {
        previousAnalyses[region.name] = latest.ndvi;
      }
    }

    const results = await batchAnalyze(regions, previousAnalyses);

    if (!results.success) {
      throw new Error(`Batch analysis failed: ${results.error}`);
    }

    for (const result of results.results) {
      if (result.success) {
        if (result.riskClassification?.riskLevel === 'high') {
          const alert = new Alert({
            regionName: result.regionName,
            alertType: 'threshold_exceeded',
            severity: 'high',
            description: `High risk detected in ${result.regionName}`,
          });
          await alert.save();
          alertsGenerated++;
        }

        if (result.changeDetection?.statistics.decreaseCount > 0) {
          const percentageChange =
            (result.changeDetection.statistics.decreaseCount /
              (result.changeDetection.statistics.decreaseCount +
                result.changeDetection.statistics.increaseCount +
                result.changeDetection.statistics.stableCount)) *
            100;

          if (percentageChange > 10) {
            const alert = new Alert({
              regionName: result.regionName,
              alertType: 'vegetation_loss',
              severity: percentageChange > 25 ? 'high' : 'medium',
              description: `${percentageChange.toFixed(1)}% vegetation loss detected`,
            });
            await alert.save();
            alertsGenerated++;
          }
        }
      }
    }

    const executionTime = Date.now() - startTime;
    const jobLog = new SchedulerJobLog({
      jobId,
      jobName: 'daily_monitoring',
      status: 'completed',
      regionsProcessed,
      executionTime: `${executionTime}ms`,
      resultSummary: {
        successCount: results.results.filter((r) => r.success).length,
        failureCount: results.results.filter((r) => !r.success).length,
        alertsGenerated,
      },
      completedAt: new Date(),
    });

    await jobLog.save();

    console.log(`[${new Date().toISOString()}] Monitoring job ${jobId} completed`);
  } catch (error) {
    console.error(`Monitoring job ${jobId} failed:`, error);

    const jobLog = new SchedulerJobLog({
      jobId,
      jobName: 'daily_monitoring',
      status: 'failed',
      regionsProcessed,
      error: error.message,
    });

    try {
      await jobLog.save();
    } catch (logError) {
      console.error('Failed to save job log:', logError);
    }
  }
}

function scheduleMonitoring() {
  const task = cron.schedule('0 0 * * *', async () => {
    await runMonitoringJob();
  });

  console.log('Satellite monitoring scheduler started (daily at 00:00 UTC)');
  return task;
}

async function startScheduler() {
  try {
    const mongoose = require('mongoose');

    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/satellite-monitoring', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');
    scheduleMonitoring();

    console.log('Running initial monitoring job...');
    await runMonitoringJob();

    process.on('SIGINT', () => {
      console.log('Shutting down scheduler...');
      mongoose.disconnect();
      process.exit(0);
    });
  } catch (error) {
    console.error('Scheduler startup failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startScheduler();
}

module.exports = {
  scheduleMonitoring,
  runMonitoringJob,
  startScheduler,
};
