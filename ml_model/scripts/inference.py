"""
ML Model Inference Script
Real-time predictions using trained models
"""

import numpy as np
import pandas as pd
import joblib
import os
import json
from preprocess import SatelliteDataPreprocessor


class ModelInference:
    """Load and use trained models for predictions"""
    
    def __init__(self, models_dir='../models'):
        self.models_dir = models_dir
        self.models = {}
        self.scaler = None
        self.preprocessor = SatelliteDataPreprocessor()
        self.load_models()
        
    def load_models(self):
        """Load all trained models"""
        try:
            self.models['ndvi_predictor'] = joblib.load(
                os.path.join(self.models_dir, 'ndvi_predictor.pkl')
            )
            print("[OK] Loaded NDVI Predictor")
        except FileNotFoundError:
            print("[WARNING] NDVI Predictor not found")
        
        try:
            self.models['change_detector'] = joblib.load(
                os.path.join(self.models_dir, 'change_detector.pkl')
            )
            print("[OK] Loaded Change Detector")
        except FileNotFoundError:
            print("[WARNING] Change Detector not found")
        
        try:
            self.models['risk_classifier'] = joblib.load(
                os.path.join(self.models_dir, 'risk_classifier.pkl')
            )
            print("[OK] Loaded Risk Classifier")
        except FileNotFoundError:
            print("[WARNING] Risk Classifier not found")
        
        try:
            self.scaler = joblib.load(
                os.path.join(self.models_dir, 'scaler.pkl')
            )
            print("[OK] Loaded Feature Scaler")
        except FileNotFoundError:
            print("[WARNING] Scaler not found")
    
    def predict_ndvi(self, features):
        """
        Predict NDVI values for next 7 days
        
        Args:
            features: dict with keys (at least) ['ndvi_prev', 'ndvi_change', 'red_band', 'nir_band',
                                      'cloud_cover', 'temperature']
        
        Returns:
            Predicted NDVI value (0-1)
        """
        if 'ndvi_predictor' not in self.models:
            raise ValueError("NDVI predictor model not loaded")
        
        if self.scaler is None:
            raise ValueError("Scaler not loaded")
        
        # Full feature set that scaler was trained on (7 features)
        feature_cols = [
            'ndvi_prev', 'ndvi_change', 'red_band', 'nir_band',
            'cloud_cover', 'temperature', 'humidity'
        ]
        
        # Prepare features - use defaults for missing ones
        X = np.array([[features.get(col, 0.0) for col in feature_cols]])
        
        try:
            X_scaled = self.scaler.transform(X)
            
            # Predict
            prediction = self.models['ndvi_predictor'].predict(X_scaled)[0]
            
            return float(np.clip(prediction, 0, 1))  # Clip to valid NDVI range
        except Exception as e:
            raise ValueError(f"Prediction failed: {str(e)}. Input shape: {X.shape}, Features: {feature_cols}")
    
    def predict_change_detection(self, features):
        """
        Detect if significant change occurred
        
        Args:
            features: dict with keys ['ndvi', 'ndvi_prev', 'ndvi_change', 'red_band', 'nir_band',
                                      'cloud_cover', 'temperature']
        
        Returns:
            Dict with is_change (bool) and confidence (0-1)
        """
        if 'change_detector' not in self.models:
            raise ValueError("Change detector model not loaded")
        
        if self.scaler is None:
            raise ValueError("Scaler not loaded")
        
        feature_cols = [
            'ndvi', 'ndvi_prev', 'ndvi_change', 'red_band', 'nir_band',
            'cloud_cover', 'temperature'
        ]
        
        # Prepare features
        X = np.array([[features.get(col, 0) for col in feature_cols]])
        
        try:
            X_scaled = self.scaler.transform(X)
            
            # Predict
            prediction = self.models['change_detector'].predict(X_scaled)[0]
            probability = self.models['change_detector'].predict_proba(X_scaled)[0]
            
            return {
                'is_change': bool(prediction),
                'confidence': float(probability[1])  # Confidence for positive class
            }
        except Exception as e:
            raise ValueError(f"Change detection prediction failed: {str(e)}. Input shape: {X.shape}, Features: {feature_cols}")
    
    def predict_risk_level(self, features):
        """
        Classify risk level
        
        Args:
            features: dict with keys ['ndvi', 'ndvi_change', 'red_band', 'nir_band',
                                      'cloud_cover', 'temperature', 'humidity']
        
        Returns:
            Dict with risk_level (0=Low, 1=Medium, 2=High) and confidence
        """
        if 'risk_classifier' not in self.models:
            raise ValueError("Risk classifier model not loaded")
        
        if self.scaler is None:
            raise ValueError("Scaler not loaded")
        
        feature_cols = [
            'ndvi', 'ndvi_change', 'red_band', 'nir_band',
            'cloud_cover', 'temperature', 'humidity'
        ]
        
        # Prepare features
        X = np.array([[features.get(col, 0) for col in feature_cols]])
        
        try:
            X_scaled = self.scaler.transform(X)
            
            # Predict
            prediction = self.models['risk_classifier'].predict(X_scaled)[0]
            probabilities = self.models['risk_classifier'].predict_proba(X_scaled)[0]
            
            risk_levels = {0: 'Low', 1: 'Medium', 2: 'High'}
            
            return {
                'risk_level': int(prediction),
                'risk_label': risk_levels[int(prediction)],
                'confidence': float(max(probabilities))
            }
        except Exception as e:
            raise ValueError(f"Risk level prediction failed: {str(e)}. Input shape: {X.shape}, Features: {feature_cols}")
    
    def predict_all(self, features):
        """
        Run all predictions for given features
        
        Returns:
            Dict with all predictions
        """
        return {
            'ndvi_forecast': self.predict_ndvi(features),
            'change_detection': self.predict_change_detection(features),
            'risk_assessment': self.predict_risk_level(features)
        }


# REST API Integration (Optional - for direct backend connection)
class ModelAPI:
    """Simple API interface for predictions"""
    
    def __init__(self):
        self.inference = ModelInference()
    
    def process_request(self, request_data):
        """
        Process prediction request
        
        Args:
            request_data: dict with satellite imagery features
        
        Returns:
            JSON-serializable dict with predictions
        """
        if not isinstance(request_data, dict):
            return {'error': 'Invalid request format'}
        
        try:
            predictions = self.inference.predict_all(request_data)
            
            return {
                'success': True,
                'timestamp': pd.Timestamp.now().isoformat(),
                'predictions': predictions,
                'input_features': request_data
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }


if __name__ == "__main__":
    # Example usage
    print("🔄 Loading ML Models...")
    inference = ModelInference()
    
    # Sample satellite data
    sample_features = {
        'ndvi_prev': 0.7,
        'ndvi_change': -0.05,
        'red_band': 0.25,
        'nir_band': 0.50,
        'blue_band': 0.15,
        'green_band': 0.30,
        'cloud_cover': 0.1,
        'temperature': 25.5,
        'humidity': 65.0,
        'ndvi': 0.65
    }
    
    print("\n📊 Sample Input:")
    print(json.dumps(sample_features, indent=2))
    
    print("\n🤖 Running Predictions...")
    predictions = inference.predict_all(sample_features)
    
    print("\n✅ Predictions:")
    print(json.dumps(predictions, indent=2))
