"""Test ML Model Endpoints"""
import requests
import json
from datetime import datetime

ML_SERVER = "http://localhost:5001"
SAMPLE_DATA = {
    "ndvi_prev": 0.75,
    "ndvi_change": -0.08,
    "red_band": 0.25,
    "nir_band": 0.50,
    "cloud_cover": 0.12,
    "temperature": 28.5,
    "humidity": 72.0
}

def test_health_check():
    """Test health check endpoint"""
    print("\n" + "="*60)
    print("TEST 1: Health Check")
    print("="*60)
    try:
        response = requests.get(f"{ML_SERVER}/health")
        print(f"[OK] Status Code: {response.status_code}")
        data = response.json()
        print(f"[OK] Response: {json.dumps(data, indent=2)}")
        return True
    except Exception as e:
        print(f"[ERROR] {str(e)}")
        return False


def test_ndvi_prediction():
    """Test NDVI prediction endpoint"""
    print("\n" + "="*60)
    print("TEST 2: NDVI Prediction")
    print("="*60)
    try:
        response = requests.post(
            f"{ML_SERVER}/predict/ndvi",
            json=SAMPLE_DATA
        )
        print(f"✅ Status Code: {response.status_code}")
        data = response.json()
        print(f"✅ Response: {json.dumps(data, indent=2)}")
        return True
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False


def test_change_detection():
    """Test change detection endpoint"""
    print("\n" + "="*60)
    print("TEST 3: Change Detection")
    print("="*60)
    try:
        change_data = {
            "ndvi": 0.67,
            "ndvi_prev": 0.75,
            "ndvi_change": -0.08,
            "red_band": 0.25,
            "nir_band": 0.50,
            "cloud_cover": 0.12,
            "temperature": 28.5
        }
        response = requests.post(
            f"{ML_SERVER}/predict/change",
            json=change_data
        )
        print(f"✅ Status Code: {response.status_code}")
        data = response.json()
        print(f"✅ Response: {json.dumps(data, indent=2)}")
        return True
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False


def test_risk_assessment():
    """Test risk assessment endpoint"""
    print("\n" + "="*60)
    print("TEST 4: Risk Assessment")
    print("="*60)
    try:
        risk_data = {
            "ndvi": 0.67,
            "ndvi_change": -0.08,
            "red_band": 0.25,
            "nir_band": 0.50,
            "cloud_cover": 0.12,
            "temperature": 28.5,
            "humidity": 72.0
        }
        response = requests.post(
            f"{ML_SERVER}/predict/risk",
            json=risk_data
        )
        print(f"✅ Status Code: {response.status_code}")
        data = response.json()
        print(f"✅ Response: {json.dumps(data, indent=2)}")
        return True
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False


def test_all_predictions():
    """Test all predictions endpoint"""
    print("\n" + "="*60)
    print("TEST 5: All Predictions (Combined)")
    print("="*60)
    try:
        all_data = {
            "ndvi": 0.67,
            "ndvi_prev": 0.75,
            "ndvi_change": -0.08,
            "red_band": 0.25,
            "nir_band": 0.50,
            "cloud_cover": 0.12,
            "temperature": 28.5,
            "humidity": 72.0
        }
        response = requests.post(
            f"{ML_SERVER}/predict/all",
            json=all_data
        )
        print(f"✅ Status Code: {response.status_code}")
        data = response.json()
        print(f"✅ Response: {json.dumps(data, indent=2)}")
        return True
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False


def main():
    """Run all tests"""
    print("\n")
    print("="*60)
    print("  ML Model Server Endpoint Tests")
    print(f"  Server: {ML_SERVER}")
    print(f"  Time: {datetime.now().strftime('%H:%M:%S')}")
    print("="*60)
    
    results = []
    results.append(("Health Check", test_health_check()))
    results.append(("NDVI Prediction", test_ndvi_prediction()))
    results.append(("Change Detection", test_change_detection()))
    results.append(("Risk Assessment", test_risk_assessment()))
    results.append(("All Predictions", test_all_predictions()))
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    for test_name, result in results:
        status = "[PASS]" if result else "[FAIL]"
        print(f"{test_name:<30} {status}")
    
    total_passed = sum(1 for _, result in results if result)
    print(f"\nTotal: {total_passed}/{len(results)} tests passed")
    
    if total_passed == len(results):
        print("\n[OK] All tests passed! ML server is working correctly.")
    else:
        print(f"\n[WARNING] {len(results) - total_passed} test(s) failed.")


if __name__ == "__main__":
    main()
