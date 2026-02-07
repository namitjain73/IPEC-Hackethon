import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export function AlertsPanel({ selectedRegion }) {
  const [alerts, setAlerts] = useState([]);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [alertCount, setAlertCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    regionName: selectedRegion?.name || '',
    alertType: 'threshold_exceeded',
    threshold: 15,
    notificationType: 'in-app',
  });

  // Fetch active alerts on mount and when region changes
  useEffect(() => {
    fetchActiveAlerts();
  }, [selectedRegion]);

  const fetchActiveAlerts = async () => {
    try {
      const response = await api.get('/alerts');
      setActiveAlerts(response.data.alerts || []);
      setAlertCount(response.data.count || 0);
    } catch (error) {
      console.error('Error fetching active alerts:', error);
    }
  };

  const handleCreateAlert = async (e) => {
    e.preventDefault();
    
    if (!formData.regionName) {
      alert('Please select a region');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          regionName: formData.regionName,
          alertType: formData.alertType,
          threshold: parseFloat(formData.threshold),
          notificationType: formData.notificationType,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert('✅ Alert created successfully!');
        setShowCreateForm(false);
        setAlertCount(alertCount + 1);
        setFormData({
          regionName: selectedRegion?.name || '',
          alertType: 'threshold_exceeded',
          threshold: 15,
          notificationType: 'in-app',
        });
        fetchActiveAlerts();
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.message || 'Failed to create alert'}`);
      }
    } catch (error) {
      console.error('Error creating alert:', error);
      alert('❌ Error creating alert');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAlert = async (alertId) => {
    if (!window.confirm('Are you sure you want to delete this alert?')) {
      return;
    }

    try {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('✅ Alert deleted successfully!');
        fetchActiveAlerts();
      } else {
        alert('❌ Error deleting alert');
      }
    } catch (error) {
      console.error('Error deleting alert:', error);
      alert('❌ Error deleting alert');
    }
  };

  return (
    <div className="space-y-6">
      {/* Create Alert Form */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-gray-900">🔔 Alert Management</h2>
            <span className="bg-green-600 text-white px-4 py-2 rounded-full font-bold text-lg">{alertCount}</span>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              showCreateForm
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {showCreateForm ? '✕ Cancel' : '+ Create New Alert'}
          </button>
        </div>

        {showCreateForm && (
          <form onSubmit={handleCreateAlert} className="bg-green-50 p-6 rounded-lg border-2 border-green-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Region Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Region Name *
                </label>
                <input
                  type="text"
                  value={formData.regionName}
                  onChange={(e) => setFormData({ ...formData, regionName: e.target.value })}
                  placeholder="Enter region name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              {/* Alert Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Alert Type *
                </label>
                <select
                  value={formData.alertType}
                  onChange={(e) => setFormData({ ...formData, alertType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="threshold_exceeded">Threshold Exceeded</option>
                  <option value="vegetation_loss">Vegetation Loss</option>
                  <option value="unusual_change">Unusual Change</option>
                </select>
              </div>

              {/* Threshold */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Threshold (%) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.threshold}
                  onChange={(e) => setFormData({ ...formData, threshold: e.target.value })}
                  placeholder="15"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
                <p className="text-xs text-gray-600 mt-1">Alert triggers when vegetation loss exceeds this %</p>
              </div>

              {/* Notification Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Notification Type *
                </label>
                <select
                  value={formData.notificationType}
                  onChange={(e) => setFormData({ ...formData, notificationType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="in-app">In-App</option>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="all">All Methods</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 transition-colors"
            >
              {loading ? '⏳ Creating Alert...' : '✅ Create Alert'}
            </button>
          </form>
        )}
      </div>

      {/* Active Alerts List */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-6">📋 Active Alerts ({activeAlerts.length})</h3>

        {activeAlerts.length === 0 ? (
          <div className="bg-green-50 border-l-4 border-green-600 p-4 rounded">
            <p className="text-green-900">
              ℹ️ No active alerts. Create one above to start monitoring regions for changes.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeAlerts.map((region) => (
              <div
                key={region._id}
                className="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-500 p-4 rounded-lg"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-900">
                      🔴 {region.name}
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                      <div>
                        <p className="text-xs text-gray-600">Current Risk</p>
                        <p className="font-bold text-orange-600">{region.riskLevel?.toUpperCase()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Vegetation Loss</p>
                        <p className="font-bold text-red-600">{region.vegetationLoss?.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Confidence</p>
                        <p className="font-bold text-green-600">{(region.confidence * 100)?.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Last Checked</p>
                        <p className="font-bold text-gray-600">
                          {region.lastScanned
                            ? new Date(region.lastScanned).toLocaleDateString()
                            : 'Never'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2 flex-wrap">
                      <span className="inline-block bg-yellow-200 text-yellow-900 px-3 py-1 rounded-full text-sm font-medium">
                        🚨 {region.alertType?.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="inline-block bg-green-200 text-green-900 px-3 py-1 rounded-full text-sm font-medium">
                        🔔 {region.notificationType?.toUpperCase() || 'IN-APP'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteAlert(region._id)}
                    className="ml-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Alert Information */}
      <div className="bg-green-50 border-l-4 border-green-600 p-6 rounded-lg">
        <h3 className="text-lg font-bold text-green-900 mb-3">📌 How Alerts Work</h3>
        <ul className="space-y-2 text-green-900">
          <li className="flex gap-2">
            <span>✓</span>
            <span>
              <strong>Automatic Monitoring</strong>: System checks regions every 6 hours
            </span>
          </li>
          <li className="flex gap-2">
            <span>✓</span>
            <span>
              <strong>Threshold-Based</strong>: Alert triggers when vegetation loss exceeds your set threshold
            </span>
          </li>
          <li className="flex gap-2">
            <span>✓</span>
            <span>
              <strong>Multiple Notifications</strong>: Choose in-app, email, SMS, or all methods
            </span>
          </li>
          <li className="flex gap-2">
            <span>✓</span>
            <span>
              <strong>Real-Time Updates</strong>: Dashboard updates with the latest alert status
            </span>
          </li>
          <li className="flex gap-2">
            <span>✓</span>
            <span>
              <strong>Easy Management</strong>: Delete alerts anytime if no longer needed
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
