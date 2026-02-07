/**
 * Mock History Generator
 * Generates fake historical analysis data to populate time-lapse with demo data
 * Shows vegetation loss progression over 6 months
 */

function generateMockHistoryForRegion(regionName, riskLevel, baseVegetationLoss) {
  // Generate 6 months of data (Jan-Jun 2026)
  const months = [
    { month: 'January', date: new Date('2026-01-15') },
    { month: 'February', date: new Date('2026-02-15') },
    { month: 'March', date: new Date('2026-03-15') },
    { month: 'April', date: new Date('2026-04-15') },
    { month: 'May', date: new Date('2026-05-15') },
    { month: 'June', date: new Date('2026-06-15') },
  ];

  // Calculate progression based on risk level
  let progression = [];
  
  if (riskLevel === 'HIGH') {
    // HIGH risk: rapid increase from low to high
    progression = [5, 12, 18, 28, 35, 42.5];
  } else if (riskLevel === 'MEDIUM') {
    // MEDIUM risk: moderate increase
    progression = [8, 10, 12, 14, 15, 15.8];
  } else {
    // LOW risk: stable or slight decrease
    progression = [3.2, 2.8, 2.5, 2.4, 2.3, 2.3];
  }

  return months.map((monthData, index) => ({
    regionName,
    timestamp: monthData.date,
    monthLabel: monthData.month,
    riskClassification: {
      riskLevel: riskLevel.toLowerCase(),
      riskScore: riskLevel === 'HIGH' ? 0.8 : riskLevel === 'MEDIUM' ? 0.5 : 0.2,
      vegetationLossPercentage: progression[index],
      areaAffected: (progression[index] / 100) * (riskLevel === 'HIGH' ? 150 : riskLevel === 'MEDIUM' ? 60 : 50),
      confidenceScore: 0.85 + (Math.random() * 0.1),
    },
    ndvi: {
      mean: 0.45 + Math.random() * 0.2,
      min: 0.2 + Math.random() * 0.1,
      max: 0.7 + Math.random() * 0.15,
      stdDev: 0.15,
      validPixels: 65000,
      totalPixels: 65536,
    },
    changeDetection: {
      decreaseCount: Math.floor((progression[index] / 100) * 65536),
      stableCount: Math.floor(((100 - progression[index]) / 100) * 65536),
      increaseCount: 0,
    },
    satelliteData: {
      bbox: [-1, 15, 1, 17],
      dataSource: 'Mock Historical Data',
      mlApiStatus: 'demo',
    },
    vegetationLossPercentage: progression[index],
    executionTime: `${Math.floor(Math.random() * 20) + 10}ms`,
    success: true,
  }));
}

/**
 * Generate history for all demo regions
 */
function generateAllDemoHistory() {
  const demoRegions = [
    {
      name: '🟢 Valmiki Nagar Forest, Bihar',
      riskLevel: 'LOW',
      vegetationLoss: 2.3,
    },
    {
      name: '🟡 Murchison Falls, Uganda',
      riskLevel: 'MEDIUM',
      vegetationLoss: 15.8,
    },
    {
      name: '🔴 Odzala-Kokoua, Congo',
      riskLevel: 'HIGH',
      vegetationLoss: 42.5,
    },
    {
      name: '🟢 Kasai Biosphere, DRC',
      riskLevel: 'LOW',
      vegetationLoss: 1.2,
    },
  ];

  const allHistory = {};
  demoRegions.forEach((region) => {
    allHistory[region.name] = generateMockHistoryForRegion(
      region.name,
      region.riskLevel,
      region.vegetationLoss
    );
  });

  return allHistory;
}

module.exports = {
  generateMockHistoryForRegion,
  generateAllDemoHistory,
};
