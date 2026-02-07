@echo off
REM ML Model Training & Deployment Script - Windows Batch
REM Complete setup from environment to API server

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║  Satellite Change Detection - ML Model Setup               ║
echo ║  Complete Training & Deployment Pipeline                  ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python not found. Please install Python 3.8+ first.
    exit /b 1
)

echo ✅ Python found: 
python --version
echo.

REM Navigate to ml_model directory
cd ml_model
if errorlevel 1 (
    echo ❌ Cannot find ml_model directory
    exit /b 1
)

REM Step 1: Create virtual environment
echo 🔄 Step 1: Creating Python Virtual Environment...
python -m venv venv
if errorlevel 1 (
    echo ❌ Failed to create virtual environment
    exit /b 1
)
echo ✅ Virtual environment created
echo.

REM Step 2: Activate virtual environment
echo 🔄 Step 2: Activating Virtual Environment...
call venv\Scripts\activate.bat
echo ✅ Virtual environment activated
echo.

REM Step 3: Install dependencies
echo 🔄 Step 3: Installing Dependencies...
python -m pip install --upgrade pip
pip install -r requirements.txt
if errorlevel 1 (
    echo ❌ Failed to install dependencies
    exit /b 1
)
echo ✅ Dependencies installed
echo.

REM Step 4: Preprocess data
echo 🔄 Step 4: Preprocessing Satellite Data...
cd scripts
python preprocess.py
if errorlevel 1 (
    echo ❌ Data preprocessing failed
    exit /b 1
)
echo.

REM Step 5: Train models
echo 🔄 Step 5: Training ML Models...
echo This may take 2-5 minutes...
python train_model.py
if errorlevel 1 (
    echo ❌ Model training failed
    exit /b 1
)
echo.

REM Step 6: Evaluate models
echo 🔄 Step 6: Evaluating Model Performance...
python evaluate.py
echo.

REM Step 7: Test inference
echo 🔄 Step 7: Testing Predictions...
python inference.py
echo.

echo ╔════════════════════════════════════════════════════════════╗
echo ║  ✅ ML TRAINING COMPLETE!                                 ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo 📊 Models trained and saved to: ../models/
echo 📈 Performance report: ../models/evaluation_report.json
echo.
echo 🚀 Next step: Start ML API Server
echo.
echo    Run: python backend_integration.py
echo.
echo    This starts Flask API on http://localhost:5001
echo.
echo 📖 For more details, see ML_README_PRODUCTION.md
echo.
pause
