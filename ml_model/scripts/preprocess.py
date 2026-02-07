"""
Data Preprocessing Script
Prepares satellite data for ML model training
"""

import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler, MinMaxScaler
import joblib
import os

class SatelliteDataPreprocessor:
    """Preprocess satellite imagery and vegetation data"""
    
    def __init__(self):
        self.scaler_ndvi = StandardScaler()
        self.scaler_features = MinMaxScaler(feature_range=(0, 1))
        
    def generate_synthetic_training_data(self, n_samples=1000):
        """
        Generate synthetic satellite data for initial training
        Real data would come from Sentinel-2 API
        """
        np.random.seed(42)
        
        # Simulate time-series NDVI data (30 days of observations)
        dates = pd.date_range('2024-01-01', periods=30, freq='D')
        
        # NDVI values (range 0-1, higher = healthier vegetation)
        ndvi_base = np.random.uniform(0.3, 0.9, 30)
        ndvi_noisy = ndvi_base + np.random.normal(0, 0.05, 30)
        ndvi_values = np.clip(ndvi_noisy, 0, 1)
        
        # Features for each observation
        data = {
            'date': dates,
            'ndvi': ndvi_values,
            'ndvi_prev': np.roll(ndvi_values, 1),
            'ndvi_change': np.diff(ndvi_values, prepend=0),
            'red_band': np.random.uniform(0.1, 0.4, 30),
            'nir_band': np.random.uniform(0.3, 0.6, 30),
            'blue_band': np.random.uniform(0.05, 0.3, 30),
            'green_band': np.random.uniform(0.1, 0.4, 30),
            'cloud_cover': np.random.uniform(0, 0.3, 30),
            'temperature': np.random.uniform(15, 35, 30),
            'humidity': np.random.uniform(30, 90, 30)
        }
        
        df = pd.DataFrame(data)
        
        # Create synthetic targets
        # NDVI prediction: next 7-day average
        df['ndvi_7day_ahead'] = df['ndvi'].rolling(window=7, min_periods=1).mean().shift(-7)
        
        # Change detection: significant drop in NDVI
        df['is_change'] = (df['ndvi_change'] < -0.1).astype(int)
        
        # Risk classification: based on NDVI and change rate
        df['risk_level'] = np.where(
            (df['ndvi'] < 0.4),
            2,  # High risk
            np.where(
                (df['ndvi'] < 0.6) | (df['ndvi_change'] < -0.05),
                1,  # Medium risk
                0   # Low risk
            )
        )
        
        return df
    
    def prepare_features_for_ndvi_prediction(self, df):
        """Prepare features for NDVI prediction model"""
        feature_cols = [
            'ndvi_prev', 'ndvi_change', 'red_band', 'nir_band',
            'blue_band', 'green_band', 'cloud_cover', 'temperature', 'humidity'
        ]
        
        X = df[feature_cols].dropna()
        y = df.loc[X.index, 'ndvi_7day_ahead'].dropna()
        
        # Align indices
        common_idx = X.index.intersection(y.index)
        X = X.loc[common_idx]
        y = y.loc[common_idx]
        
        # Scale features
        X_scaled = self.scaler_features.fit_transform(X)
        
        return X_scaled, y.values, feature_cols
    
    def prepare_features_for_change_detection(self, df):
        """Prepare features for change detection model"""
        feature_cols = [
            'ndvi', 'ndvi_prev', 'ndvi_change', 'red_band', 'nir_band',
            'cloud_cover', 'temperature'
        ]
        
        X = df[feature_cols].dropna()
        y = df.loc[X.index, 'is_change'].dropna()
        
        # Align indices
        common_idx = X.index.intersection(y.index)
        X = X.loc[common_idx]
        y = y.loc[common_idx]
        
        # Scale features
        X_scaled = self.scaler_features.fit_transform(X)
        
        return X_scaled, y.values, feature_cols
    
    def prepare_features_for_risk_classification(self, df):
        """Prepare features for risk classification model"""
        feature_cols = [
            'ndvi', 'ndvi_change', 'red_band', 'nir_band',
            'cloud_cover', 'temperature', 'humidity'
        ]
        
        X = df[feature_cols].dropna()
        y = df.loc[X.index, 'risk_level'].dropna()
        
        # Align indices
        common_idx = X.index.intersection(y.index)
        X = X.loc[common_idx]
        y = y.loc[common_idx]
        
        # Scale features
        X_scaled = self.scaler_features.fit_transform(X)
        
        return X_scaled, y.values, feature_cols
    
    def save_scaler(self, path='../models/scaler.pkl'):
        """Save fitted scaler for inference"""
        os.makedirs(os.path.dirname(path), exist_ok=True)
        joblib.dump(self.scaler_features, path)
        print(f"Scaler saved to {path}")


if __name__ == "__main__":
    # Initialize preprocessor
    preprocessor = SatelliteDataPreprocessor()
    
    # Generate synthetic training data
    df = preprocessor.generate_synthetic_training_data()
    
    print("✅ Synthetic data generated")
    print(df.head())
    
    # Save for training
    os.makedirs('../data/training', exist_ok=True)
    df.to_csv('../data/training/satellite_data.csv', index=False)
    print("✅ Training data saved to ../data/training/satellite_data.csv")
    
    # Prepare and display feature statistics
    X_ndvi, y_ndvi, cols = preprocessor.prepare_features_for_ndvi_prediction(df)
    print(f"\n✅ NDVI Prediction: {X_ndvi.shape[0]} samples, {X_ndvi.shape[1]} features")
    
    X_change, y_change, cols = preprocessor.prepare_features_for_change_detection(df)
    print(f"✅ Change Detection: {X_change.shape[0]} samples, {X_change.shape[1]} features")
    
    X_risk, y_risk, cols = preprocessor.prepare_features_for_risk_classification(df)
    print(f"✅ Risk Classification: {X_risk.shape[0]} samples, {X_risk.shape[1]} features")
    
    # Save scaler
    preprocessor.save_scaler()
