function calculateNDVI(nirBand, redBand) {
  try {
    if (!nirBand || !redBand || nirBand.length !== redBand.length) {
      throw new Error('NIR and RED bands must have same length');
    }

    const ndviValues = nirBand.map((nir, idx) => {
      const red = redBand[idx];
      const denominator = nir + red;
      if (denominator === 0) return -1;
      return (nir - red) / denominator;
    });

    const validValues = ndviValues.filter((val) => val >= -1 && val <= 1);
    const mean = validValues.length > 0 ? validValues.reduce((a, b) => a + b) / validValues.length : 0;
    const min = validValues.length > 0 ? Math.min(...validValues) : -1;
    const max = validValues.length > 0 ? Math.max(...validValues) : 1;
    const std = calculateStdDev(validValues, mean);

    return {
      success: true,
      ndvi: ndviValues,
      statistics: {
        mean,
        min,
        max,
        stdDev: std,
        validPixels: validValues.length,
        totalPixels: ndviValues.length,
      },
      timestamp: new Date(),
    };
  } catch (error) {
    console.error('NDVI calculation error:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date(),
    };
  }
}

function detectChanges(ndviCurrent, ndviPrevious) {
  try {
    if (ndviCurrent.length !== ndviPrevious.length) {
      throw new Error('NDVI arrays must have same length');
    }

    const changes = ndviCurrent.map((current, idx) => current - ndviPrevious[idx]);
    const threshold = 0.05;
    const changeMap = changes.map((change) => {
      if (change < -threshold) return 'decrease';
      if (change > threshold) return 'increase';
      return 'stable';
    });

    const decreaseCount = changeMap.filter((c) => c === 'decrease').length;
    const increaseCount = changeMap.filter((c) => c === 'increase').length;
    const stableCount = changeMap.filter((c) => c === 'stable').length;

    const meanChange = changes.reduce((a, b) => a + b) / changes.length;
    const minChange = Math.min(...changes);
    const maxChange = Math.max(...changes);

    return {
      success: true,
      changes,
      changeMap,
      statistics: {
        meanChange,
        minChange,
        maxChange,
        decreaseCount,
        increaseCount,
        stableCount,
      },
      timestamp: new Date(),
    };
  } catch (error) {
    console.error('Change detection error:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date(),
    };
  }
}

function classifyRisk(meanChange, percentageChange) {
  let riskLevel = 'low';
  let riskScore = 0;

  const changeMagnitude = Math.abs(meanChange);
  if (changeMagnitude > 0.15) {
    riskLevel = 'high';
    riskScore = 0.8;
  } else if (changeMagnitude > 0.08) {
    riskLevel = 'medium';
    riskScore = 0.5;
  } else {
    riskLevel = 'low';
    riskScore = 0.2;
  }

  if (percentageChange > 30) {
    riskScore = Math.min(1, riskScore + 0.2);
  } else if (percentageChange > 50) {
    riskScore = 1;
    riskLevel = 'high';
  }

  return {
    riskLevel,
    riskScore,
    changeMagnitude,
    affectedAreaPercentage: percentageChange,
  };
}

function calculateStdDev(values, mean) {
  if (values.length === 0) return 0;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

module.exports = {
  calculateNDVI,
  detectChanges,
  classifyRisk,
};
