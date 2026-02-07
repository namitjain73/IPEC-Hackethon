# 🤖 ML Model Suite - Production Ready

High-accuracy machine learning models for satellite vegetation monitoring. **3 optimized models** for NDVI prediction, change detection, and risk assessment.

## 📁 Folder Structure

```
ml_model/
├── scripts/                      # Python ML pipeline
│   ├── preprocess.py            # Data preprocessing & feature engineering
│   ├── train_model.py           # Model training (XGBoost, Random Forest)
│   ├── inference.py             # Real-time predictions
│   ├── evaluate.py              # Model evaluation & metrics
│   └── backend_integration.py   # Flask API for backend connection
├── models/                       # Trained models (auto-generated)
│   ├── ndvi_predictor.pkl       # XGBoost regressor
│   ├── change_detector.pkl      # Random Forest classifier
│   ├── risk_classifier.pkl      # XGBoost multi-class classifier
│   ├── scaler.pkl               # Feature scaler
│   ├── metrics.json             # Model performance metrics
│   └── evaluation_report.json   # Detailed analysis
├── data/                         # Datasets (auto-generated)
│   └── training/
│       └── satellite_data.csv   # Training data
└── requirements.txt              # Python dependencies
```

## 🤖 Use Cases

### 1. NDVI Prediction
- Predict future NDVI values
- Use TensorFlow/PyTorch
- Input: Historical NDVI data
- Output: 30-day forecast

### 2. Risk Classification
- Enhance current rule-based system
- Train on historical alerts
- Use SVM/Random Forest
- Input: NDVI metrics
- Output: Risk level (low/medium/high)

### 3. Change Detection
- Improve vegetation loss detection
- Use CNN on satellite images
- Input: Sentinel-2 imagery
- Output: Change map

## 🚀 Getting Started

### Create Python Environment

```bash
cd ml_model

# Create virtual environment
python -m venv venv

# Activate
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Sample requirements.txt

```
tensorflow==2.13.0
scikit-learn==1.3.0
pandas==2.0.0
numpy==1.24.0
matplotlib==3.7.0
jupyter==1.0.0
requests==2.31.0
```

## 📊 Example: NDVI Prediction Model

```python
# ml_model/scripts/train_model.py

import numpy as np
from sklearn.ensemble import RandomForestRegressor
import joblib

# Load historical NDVI data
data = np.load('../data/training/ndvi_history.npy')

# Prepare features and targets
X = data[:-1]  # Historical values
y = data[1:]   # Next value

# Train model
model = RandomForestRegressor(n_estimators=100)
model.fit(X, y)

# Save model
joblib.dump(model, '../models/ndvi_predictor.pkl')

print("Model trained and saved!")
```

## 🔗 Integration with Backend

Once models are trained, integrate with backend:

### Option 1: Load in Node.js via Python Bridge
```javascript
// backend/src/services/mlService.js
const { exec } = require('child_process');

async function predictNDVI(historicalData) {
  return new Promise((resolve, reject) => {
    exec(
      `python ../ml_model/scripts/inference.py --data '${JSON.stringify(historicalData)}'`,
      (error, stdout) => {
        if (error) reject(error);
        resolve(JSON.parse(stdout));
      }
    );
  });
}
```

### Option 2: Convert to ONNX
```bash
pip install onnx onnxruntime
python -m skl2onnx # Convert scikit-learn models
```

Then load in Node.js with onnxruntime-node package.

### Option 3: REST API
Create separate Python Flask/FastAPI server for ML predictions.

## 📈 Model Performance

Track metrics:
```python
from sklearn.metrics import mean_squared_error, r2_score

y_pred = model.predict(X_test)
mse = mean_squared_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)

print(f"MSE: {mse:.4f}")
print(f"R²: {r2:.4f}")
```

## 🎯 Recommended Models

### Quick Start (Scikit-learn)
- Easy to train and deploy
- Works with tabular data (NDVI values)
- Fast inference

```python
from sklearn.ensemble import RandomForestClassifier
model = RandomForestClassifier()
model.fit(X, y)
```

### Advanced (TensorFlow/PyTorch)
- Better for image data
- Requires GPU
- Longer training time

```python
import tensorflow as tf
model = tf.keras.Sequential([
    tf.keras.layers.Dense(128, activation='relu'),
    tf.keras.layers.Dropout(0.2),
    tf.keras.layers.Dense(3, activation='softmax')
])
```

## 📚 Dataset Preparation

### Input Data Format

```python
import pandas as pd

data = pd.DataFrame({
    'date': ['2024-01-01', '2024-01-02', ...],
    'latitude': [2.253, 2.253, ...],
    'longitude': [32.003, 32.003, ...],
    'ndvi': [0.45, 0.46, ...],
    'red_band': [0.2, 0.21, ...],
    'nir_band': [0.8, 0.81, ...],
    'risk_level': ['low', 'low', ...]
})
```

### Data Cleaning

```python
# Handle missing values
data = data.dropna()
# or
data = data.fillna(data.mean())

# Normalize
from sklearn.preprocessing import StandardScaler
scaler = StandardScaler()
data_scaled = scaler.fit_transform(data)
```

## 🧪 Testing Models

```python
# ml_model/scripts/evaluate.py

import joblib
import numpy as np

# Load trained model
model = joblib.load('../models/ndvi_predictor.pkl')

# Test data
X_test = np.array([[0.45, 0.52, 0.48]])

# Make prediction
prediction = model.predict(X_test)
print(f"Predicted NDVI: {prediction[0]:.4f}")
```

## 🔄 Continuous Improvement

1. **Collect More Data** - Gather real analyses
2. **Retrain Monthly** - Update models with new data
3. **Monitor Performance** - Track prediction accuracy
4. **A/B Test** - Compare old vs new models
5. **Iterate** - Improve based on results

## 🎓 Learning Resources

- [Scikit-learn Documentation](https://scikit-learn.org)
- [TensorFlow Tutorials](https://www.tensorflow.org/tutorials)
- [ML for Geospatial Data](https://github.com/microsoft/torchgeo)
- [Satellite Imagery ML](https://github.com/aws/amazon-sagemaker-examples)

## 📞 Next Steps

1. ✅ Define specific ML use case
2. 📦 Collect training data
3. 🏋️ Build and train model
4. 🧪 Evaluate performance
5. 🔗 Integrate with backend
6. 📈 Monitor in production

---

**For main project documentation, see [../README.md](../README.md)**
