"""
ML Model Training Script
Trains XGBoost, Random Forest models for satellite monitoring
"""

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    mean_squared_error, r2_score, confusion_matrix, classification_report
)
import xgboost as xgb
import joblib
import os
import json
from preprocess import SatelliteDataPreprocessor

class ModelTrainer:
    """Train ML models for satellite change detection"""
    
    def __init__(self):
        self.models = {}
        self.metrics = {}
        
    def train_ndvi_prediction_model(self, X_train, X_test, y_train, y_test):
        """
        Train XGBoost regressor for NDVI prediction
        Predicts next 7-day NDVI values
        """
        print("\n" + "="*60)
        print("🌱 TRAINING NDVI PREDICTION MODEL (XGBoost)")
        print("="*60)
        
        # XGBoost model - excellent for time-series prediction
        model = xgb.XGBRegressor(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            objective='reg:squarederror'
        )
        
        model.fit(
            X_train, y_train,
            eval_set=[(X_test, y_test)],
            verbose=False
        )
        
        # Predictions
        y_pred = model.predict(X_test)
        
        # Metrics
        mse = mean_squared_error(y_test, y_pred)
        rmse = np.sqrt(mse)
        mae = np.mean(np.abs(y_test - y_pred))
        r2 = r2_score(y_test, y_pred)
        
        metrics = {
            'mse': float(mse),
            'rmse': float(rmse),
            'mae': float(mae),
            'r2_score': float(r2)
        }
        
        print(f"✅ NDVI Prediction Model Trained")
        print(f"   MSE: {mse:.4f}")
        print(f"   RMSE: {rmse:.4f}")
        print(f"   MAE: {mae:.4f}")
        print(f"   R² Score: {r2:.4f}")
        
        self.models['ndvi_predictor'] = model
        self.metrics['ndvi_predictor'] = metrics
        
        return model, metrics
    
    def train_change_detection_model(self, X_train, X_test, y_train, y_test):
        """
        Train Random Forest classifier for change detection
        Detects significant vegetation loss events
        """
        print("\n" + "="*60)
        print("🔴 TRAINING CHANGE DETECTION MODEL (Random Forest)")
        print("="*60)
        
        # Random Forest - excellent for binary classification
        model = RandomForestClassifier(
            n_estimators=150,
            max_depth=12,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1,
            class_weight='balanced'
        )
        
        model.fit(X_train, y_train)
        
        # Predictions
        y_pred = model.predict(X_test)
        y_proba = model.predict_proba(X_test)[:, 1]
        
        # Metrics
        accuracy = accuracy_score(y_test, y_pred)
        precision = precision_score(y_test, y_pred)
        recall = recall_score(y_test, y_pred)
        f1 = f1_score(y_test, y_pred)
        
        metrics = {
            'accuracy': float(accuracy),
            'precision': float(precision),
            'recall': float(recall),
            'f1_score': float(f1),
            'confusion_matrix': confusion_matrix(y_test, y_pred).tolist()
        }
        
        print(f"✅ Change Detection Model Trained")
        print(f"   Accuracy: {accuracy:.4f}")
        print(f"   Precision: {precision:.4f}")
        print(f"   Recall: {recall:.4f}")
        print(f"   F1 Score: {f1:.4f}")
        
        self.models['change_detector'] = model
        self.metrics['change_detector'] = metrics
        
        return model, metrics
    
    def train_risk_classification_model(self, X_train, X_test, y_train, y_test):
        """
        Train XGBoost classifier for risk assessment
        Classifies risk level: Low (0), Medium (1), High (2)
        """
        print("\n" + "="*60)
        print("⚠️  TRAINING RISK CLASSIFICATION MODEL (XGBoost)")
        print("="*60)
        
        # XGBoost - better for multi-class classification
        model = xgb.XGBClassifier(
            n_estimators=150,
            max_depth=8,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            objective='multi:softmax',
            num_class=3
        )
        
        model.fit(X_train, y_train, verbose=False)
        
        # Predictions
        y_pred = model.predict(X_test)
        
        # Metrics
        accuracy = accuracy_score(y_test, y_pred)
        precision = precision_score(y_test, y_pred, average='weighted', zero_division=0)
        recall = recall_score(y_test, y_pred, average='weighted', zero_division=0)
        f1 = f1_score(y_test, y_pred, average='weighted', zero_division=0)
        
        metrics = {
            'accuracy': float(accuracy),
            'precision': float(precision),
            'recall': float(recall),
            'f1_score': float(f1),
            'confusion_matrix': confusion_matrix(y_test, y_pred).tolist()
        }
        
        print(f"✅ Risk Classification Model Trained")
        print(f"   Accuracy: {accuracy:.4f}")
        print(f"   Precision: {precision:.4f}")
        print(f"   Recall: {recall:.4f}")
        print(f"   F1 Score: {f1:.4f}")
        
        self.models['risk_classifier'] = model
        self.metrics['risk_classifier'] = metrics
        
        return model, metrics
    
    def save_all_models(self):
        """Save trained models to disk"""
        os.makedirs('../models', exist_ok=True)
        
        for name, model in self.models.items():
            path = f'../models/{name}.pkl'
            joblib.dump(model, path)
            print(f"✅ Saved {name} to {path}")
        
        # Save metrics
        metrics_path = '../models/metrics.json'
        with open(metrics_path, 'w') as f:
            json.dump(self.metrics, f, indent=2)
        print(f"✅ Saved metrics to {metrics_path}")


def main():
    """Main training pipeline"""
    
    # Step 1: Data preprocessing
    print("🔄 STEP 1: Data Preprocessing")
    print("-" * 60)
    
    preprocessor = SatelliteDataPreprocessor()
    df = preprocessor.generate_synthetic_training_data(n_samples=1000)
    
    # Prepare datasets for each model
    X_ndvi, y_ndvi, _ = preprocessor.prepare_features_for_ndvi_prediction(df)
    X_change, y_change, _ = preprocessor.prepare_features_for_change_detection(df)
    X_risk, y_risk, _ = preprocessor.prepare_features_for_risk_classification(df)
    
    print(f"✅ Data prepared")
    print(f"   NDVI: {X_ndvi.shape}")
    print(f"   Change Detection: {X_change.shape}")
    print(f"   Risk Classification: {X_risk.shape}")
    
    # Step 2: Train models
    print("\n🔄 STEP 2: Model Training")
    print("-" * 60)
    
    trainer = ModelTrainer()
    
    # NDVI Prediction
    X_train_ndvi, X_test_ndvi, y_train_ndvi, y_test_ndvi = train_test_split(
        X_ndvi, y_ndvi, test_size=0.2, random_state=42
    )
    trainer.train_ndvi_prediction_model(X_train_ndvi, X_test_ndvi, y_train_ndvi, y_test_ndvi)
    
    # Change Detection
    X_train_change, X_test_change, y_train_change, y_test_change = train_test_split(
        X_change, y_change, test_size=0.2, random_state=42, stratify=y_change
    )
    trainer.train_change_detection_model(X_train_change, X_test_change, y_train_change, y_test_change)
    
    # Risk Classification
    X_train_risk, X_test_risk, y_train_risk, y_test_risk = train_test_split(
        X_risk, y_risk, test_size=0.2, random_state=42, stratify=y_risk
    )
    trainer.train_risk_classification_model(X_train_risk, X_test_risk, y_train_risk, y_test_risk)
    
    # Step 3: Save models
    print("\n🔄 STEP 3: Saving Models")
    print("-" * 60)
    trainer.save_all_models()
    
    # Step 4: Summary
    print("\n" + "="*60)
    print("✅ TRAINING COMPLETE")
    print("="*60)
    print("\n📊 Model Summary:")
    print(json.dumps(trainer.metrics, indent=2))
    
    return trainer


if __name__ == "__main__":
    trainer = main()
