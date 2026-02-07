"""
Backend Integration Module
Connect ML models to Express.js backend via HTTP API
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from inference import ModelInference, ModelAPI
import os
from dotenv import load_dotenv
import logging

# Change to scripts directory to ensure relative paths work correctly
script_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(script_dir)

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Initialize ML models
logger.info("Loading ML models...")
model_api = ModelAPI()
logger.info("ML models loaded successfully!")


# ==================== Health Check ====================

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'ML Model Server',
        'models': list(model_api.inference.models.keys())
    }), 200


# ==================== Prediction Endpoints ====================

@app.route('/predict/ndvi', methods=['POST'])
def predict_ndvi():
    """
    NDVI Prediction Endpoint
    
    Input JSON:
    {
        "ndvi_prev": 0.7,
        "ndvi_change": -0.05,
        "red_band": 0.25,
        "nir_band": 0.50,
        "cloud_cover": 0.1,
        "temperature": 25.5,
        "humidity": 65.0
    }
    
    Output: {"ndvi_forecast": 0.68, "success": true}
    """
    try:
        data = request.get_json()
        prediction = model_api.inference.predict_ndvi(data)
        
        return jsonify({
            'success': True,
            'ndvi_forecast': prediction,
            'unit': 'normalized (0-1)',
            'interpretation': 'Higher values indicate healthier vegetation'
        }), 200
    
    except Exception as e:
        logger.error(f"NDVI prediction error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 400


@app.route('/predict/change', methods=['POST'])
def predict_change():
    """
    Change Detection Endpoint
    
    Input JSON:
    {
        "ndvi": 0.65,
        "ndvi_prev": 0.7,
        "ndvi_change": -0.05,
        "red_band": 0.25,
        "nir_band": 0.50,
        "cloud_cover": 0.1,
        "temperature": 25.5
    }
    
    Output: {"is_change": true, "confidence": 0.85, "success": true}
    """
    try:
        data = request.get_json()
        prediction = model_api.inference.predict_change_detection(data)
        
        return jsonify({
            'success': True,
            'change_detected': prediction['is_change'],
            'confidence': prediction['confidence'],
            'severity': 'high' if prediction['is_change'] and prediction['confidence'] > 0.8 else 'low'
        }), 200
    
    except Exception as e:
        logger.error(f"Change detection error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 400


@app.route('/predict/risk', methods=['POST'])
def predict_risk():
    """
    Risk Assessment Endpoint
    
    Input JSON:
    {
        "ndvi": 0.65,
        "ndvi_change": -0.05,
        "red_band": 0.25,
        "nir_band": 0.50,
        "cloud_cover": 0.1,
        "temperature": 25.5,
        "humidity": 65.0
    }
    
    Output: {"risk_level": 1, "risk_label": "Medium", "confidence": 0.92, "success": true}
    """
    try:
        data = request.get_json()
        prediction = model_api.inference.predict_risk_level(data)
        
        return jsonify({
            'success': True,
            'risk_level': prediction['risk_level'],
            'risk_label': prediction['risk_label'],
            'confidence': prediction['confidence'],
            'action_required': 'high' if prediction['risk_level'] == 2 else 'moderate' if prediction['risk_level'] == 1 else 'none'
        }), 200
    
    except Exception as e:
        logger.error(f"Risk assessment error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 400


@app.route('/predict/all', methods=['POST'])
def predict_all():
    """
    Combined Prediction Endpoint
    Runs all predictions at once
    
    Input JSON:
    {
        "ndvi": 0.65,
        "ndvi_prev": 0.7,
        "ndvi_change": -0.05,
        "red_band": 0.25,
        "nir_band": 0.50,
        "blue_band": 0.15,
        "green_band": 0.30,
        "cloud_cover": 0.1,
        "temperature": 25.5,
        "humidity": 65.0
    }
    """
    try:
        data = request.get_json()
        result = model_api.process_request(data)
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
    
    except Exception as e:
        logger.error(f"Combined prediction error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 400


# ==================== Utility Endpoints ====================

@app.route('/models/info', methods=['GET'])
def models_info():
    """Get information about loaded models"""
    return jsonify({
        'models': {
            'ndvi_predictor': 'XGBoost Regressor - Predicts NDVI values',
            'change_detector': 'Random Forest Classifier - Detects vegetation loss',
            'risk_classifier': 'XGBoost Classifier - Classifies risk levels'
        },
        'accuracy': {
            'ndvi_predictor': 'R² Score ~0.85+',
            'change_detector': 'F1 Score ~0.90+',
            'risk_classifier': 'Accuracy ~0.92+'
        }
    }), 200


# ==================== Error Handlers ====================

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404


@app.errorhandler(500)
def server_error(error):
    logger.error(f"Server error: {str(error)}")
    return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    port = int(os.getenv('ML_PORT', 5001))
    debug = os.getenv('DEBUG', 'False') == 'True'
    
    print(f"""
    ╔════════════════════════════════════════╗
    ║   ML Model Server Starting...          ║
    ║   Port: {port}                            ║
    ║   Debug: {debug}                      ║
    ╚════════════════════════════════════════╝
    """)
    
    app.run(host='0.0.0.0', port=port, debug=debug)
