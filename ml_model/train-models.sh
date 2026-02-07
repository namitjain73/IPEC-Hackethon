#!/bin/bash
# ML Model Training & Deployment Script
# Complete setup from environment to API server

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Satellite Change Detection - ML Model Setup               ║"
echo "║  Complete Training & Deployment Pipeline                  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if Python is installed
if ! command -v python &> /dev/null; then
    echo "❌ Python not found. Please install Python 3.8+ first."
    exit 1
fi

echo "✅ Python found: $(python --version)"
echo ""

# Navigate to ml_model directory
cd ml_model || exit 1

# Step 1: Create virtual environment
echo "🔄 Step 1: Creating Python Virtual Environment..."
python -m venv venv
echo "✅ Virtual environment created"
echo ""

# Step 2: Activate virtual environment
echo "🔄 Step 2: Activating Virtual Environment..."
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    source venv/Scripts/activate
else
    source venv/bin/activate
fi
echo "✅ Virtual environment activated"
echo ""

# Step 3: Install dependencies
echo "🔄 Step 3: Installing Dependencies..."
pip install --upgrade pip
pip install -r requirements.txt
echo "✅ Dependencies installed"
echo ""

# Step 4: Preprocess data
echo "🔄 Step 4: Preprocessing Satellite Data..."
cd scripts
python preprocess.py
echo ""

# Step 5: Train models
echo "🔄 Step 5: Training ML Models..."
echo "This may take 2-5 minutes..."
python train_model.py
echo ""

# Step 6: Evaluate models
echo "🔄 Step 6: Evaluating Model Performance..."
python evaluate.py
echo ""

# Step 7: Test inference
echo "🔄 Step 7: Testing Predictions..."
python inference.py
echo ""

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  ✅ ML TRAINING COMPLETE!                                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Models trained and saved to: ../models/"
echo "📈 Performance report: ../models/evaluation_report.json"
echo ""
echo "🚀 Next step: Start ML API Server"
echo ""
echo "   Run: python backend_integration.py"
echo ""
echo "   This starts Flask API on http://localhost:5001"
echo ""
echo "📖 For more details, see ML_README_PRODUCTION.md"
