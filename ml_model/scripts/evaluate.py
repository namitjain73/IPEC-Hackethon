"""
Model Evaluation and Performance Analysis
"""

import numpy as np
import pandas as pd
import json
import os
from sklearn.model_selection import cross_val_score, StratifiedKFold
from sklearn.metrics import (
    roc_auc_score, roc_curve, auc, precision_recall_curve,
    confusion_matrix, classification_report
)
import joblib
import matplotlib.pyplot as plt
import seaborn as sns
from preprocess import SatelliteDataPreprocessor


class ModelEvaluator:
    """Comprehensive model evaluation and analysis"""
    
    def __init__(self, models_dir='../models'):
        self.models_dir = models_dir
        self.models = {}
        self.results = {}
        self.load_models()
    
    def load_models(self):
        """Load trained models"""
        try:
            self.models['ndvi_predictor'] = joblib.load(
                os.path.join(self.models_dir, 'ndvi_predictor.pkl')
            )
        except:
            pass
        
        try:
            self.models['change_detector'] = joblib.load(
                os.path.join(self.models_dir, 'change_detector.pkl')
            )
        except:
            pass
        
        try:
            self.models['risk_classifier'] = joblib.load(
                os.path.join(self.models_dir, 'risk_classifier.pkl')
            )
        except:
            pass
    
    def evaluate_model_importance(self):
        """Analyze feature importance"""
        print("\n" + "="*60)
        print("📊 FEATURE IMPORTANCE ANALYSIS")
        print("="*60)
        
        results = {}
        
        if 'change_detector' in self.models:
            model = self.models['change_detector']
            feature_cols = [
                'ndvi', 'ndvi_prev', 'ndvi_change', 'red_band', 'nir_band',
                'cloud_cover', 'temperature'
            ]
            
            importance = model.feature_importances_
            importance_df = pd.DataFrame({
                'feature': feature_cols,
                'importance': importance
            }).sort_values('importance', ascending=False)
            
            print("\n🔴 Change Detection - Feature Importance:")
            for idx, row in importance_df.iterrows():
                print(f"   {row['feature']}: {row['importance']:.4f}")
            
            results['change_detector'] = importance_df.to_dict('records')
        
        if 'risk_classifier' in self.models:
            model = self.models['risk_classifier']
            feature_cols = [
                'ndvi', 'ndvi_change', 'red_band', 'nir_band',
                'cloud_cover', 'temperature', 'humidity'
            ]
            
            importance = model.feature_importances_
            importance_df = pd.DataFrame({
                'feature': feature_cols,
                'importance': importance
            }).sort_values('importance', ascending=False)
            
            print("\n⚠️  Risk Classification - Feature Importance:")
            for idx, row in importance_df.iterrows():
                print(f"   {row['feature']}: {row['importance']:.4f}")
            
            results['risk_classifier'] = importance_df.to_dict('records')
        
        return results
    
    def cross_validation_analysis(self, X, y, model_name, cv_folds=5):
        """Perform cross-validation analysis"""
        if model_name not in self.models:
            return None
        
        model = self.models[model_name]
        skf = StratifiedKFold(n_splits=cv_folds, shuffle=True, random_state=42)
        
        scores = cross_val_score(model, X, y, cv=skf, scoring='accuracy')
        
        return {
            'mean_score': float(scores.mean()),
            'std_score': float(scores.std()),
            'fold_scores': scores.tolist()
        }
    
    def generate_report(self):
        """Generate comprehensive evaluation report"""
        print("\n" + "="*60)
        print("📈 MODEL EVALUATION REPORT")
        print("="*60)
        
        # Load metrics
        metrics_path = os.path.join(self.models_dir, 'metrics.json')
        if os.path.exists(metrics_path):
            with open(metrics_path, 'r') as f:
                metrics = json.load(f)
            
            print("\n🌱 NDVI Prediction Performance:")
            if 'ndvi_predictor' in metrics:
                m = metrics['ndvi_predictor']
                print(f"   R² Score: {m['r2_score']:.4f} (Higher is better)")
                print(f"   RMSE: {m['rmse']:.4f} (Lower is better)")
                print(f"   MAE: {m['mae']:.4f}")
            
            print("\n🔴 Change Detection Performance:")
            if 'change_detector' in metrics:
                m = metrics['change_detector']
                print(f"   Accuracy: {m['accuracy']:.4f}")
                print(f"   Precision: {m['precision']:.4f}")
                print(f"   Recall: {m['recall']:.4f}")
                print(f"   F1 Score: {m['f1_score']:.4f}")
            
            print("\n⚠️  Risk Classification Performance:")
            if 'risk_classifier' in metrics:
                m = metrics['risk_classifier']
                print(f"   Accuracy: {m['accuracy']:.4f}")
                print(f"   Precision: {m['precision']:.4f}")
                print(f"   Recall: {m['recall']:.4f}")
                print(f"   F1 Score: {m['f1_score']:.4f}")
        
        # Feature importance
        importance_results = self.evaluate_model_importance()
        
        print("\n" + "="*60)
        print("✅ EVALUATION COMPLETE")
        print("="*60)
        
        return {
            'metrics': metrics if os.path.exists(metrics_path) else {},
            'feature_importance': importance_results
        }


def main():
    """Run evaluation"""
    evaluator = ModelEvaluator()
    report = evaluator.generate_report()
    
    # Save report
    os.makedirs('../models', exist_ok=True)
    report_path = '../models/evaluation_report.json'
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"\n📄 Report saved to {report_path}")


if __name__ == "__main__":
    main()
