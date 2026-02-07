import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export function ReportsPanel({ selectedRegion, analysisHistory = [] }) {
  const [reports, setReports] = useState([]);
  const [reportCount, setReportCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [formData, setFormData] = useState({
    regionName: selectedRegion?.name || '',
    format: 'pdf',
    dateRange: '7days',
    includeHistory: true,
    reportType: 'detailed',
  });

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await api.get('/reports/list');
      setReports(response.data.reports || []);
      setReportCount(response.data.count || 0);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async (e) => {
    e.preventDefault();

    if (!formData.regionName) {
      alert('Please select a region');
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          regionName: formData.regionName,
          format: formData.format,
          dateRange: formData.dateRange,
          includeHistory: formData.includeHistory,
          reportType: formData.reportType,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert('✅ Report generated successfully!');
        setReportCount(reportCount + 1);
        
        // Download PDF if generated
        if (data.filename && formData.format === 'pdf') {
          const downloadLink = `/api/reports/download/${data.filename}`;
          const link = document.createElement('a');
          link.href = downloadLink;
          link.download = data.filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        
        fetchReports();
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.message || 'Failed to generate report'}`);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('❌ Error generating report');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadReport = (filename) => {
    const downloadLink = `/api/reports/download/${filename}`;
    window.open(downloadLink, '_blank');
  };

  const handleDeleteReport = async (filename) => {
    if (!window.confirm('Are you sure you want to delete this report?')) {
      return;
    }

    try {
      const response = await fetch(`/api/reports/${filename}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('✅ Report deleted successfully!');
        fetchReports();
      } else {
        alert('❌ Error deleting report');
      }
    } catch (error) {
      console.error('Error deleting report:', error);
      alert('❌ Error deleting report');
    }
  };

  const getFormatIcon = (format) => {
    switch (format) {
      case 'pdf':
        return '📄';
      case 'csv':
        return '📊';
      case 'json':
        return '🔗';
      default:
        return '📋';
    }
  };

  const getReportTypeDescription = (type) => {
    switch (type) {
      case 'executive':
        return 'High-level overview for decision makers';
      case 'detailed':
        return 'Complete technical analysis with all metrics';
      case 'comparison':
        return 'Before/after comparison analysis';
      default:
        return 'Standard report';
    }
  };

  return (
    <div className="space-y-6">
      {/* Generate Report Form */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-4 mb-6">
          <h2 className="text-2xl font-bold text-gray-900">📄 Report Generator</h2>
          <span className="bg-green-600 text-white px-4 py-2 rounded-full font-bold text-lg">{reportCount}</span>
        </div>

        <form onSubmit={handleGenerateReport} className="bg-green-50 p-6 rounded-lg border-2 border-green-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
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

            {/* Report Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Report Type *
              </label>
              <select
                value={formData.reportType}
                onChange={(e) => setFormData({ ...formData, reportType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="detailed">Detailed Analysis</option>
                <option value="executive">Executive Summary</option>
                <option value="comparison">Comparison Report</option>
              </select>
              <p className="text-xs text-gray-600 mt-1">
                {getReportTypeDescription(formData.reportType)}
              </p>
            </div>

            {/* Format */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Export Format *
              </label>
              <select
                value={formData.format}
                onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="pdf">📄 PDF (Print-friendly)</option>
                <option value="csv">📊 CSV (Excel compatible)</option>
                <option value="json">🔗 JSON (API compatible)</option>
              </select>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Date Range *
              </label>
              <select
                value={formData.dateRange}
                onChange={(e) => setFormData({ ...formData, dateRange: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="90days">Last 90 Days</option>
                <option value="all">All Time</option>
              </select>
            </div>

            {/* Include History */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Options
              </label>
              <label className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-green-50">
                <input
                  type="checkbox"
                  checked={formData.includeHistory}
                  onChange={(e) => setFormData({ ...formData, includeHistory: e.target.checked })}
                  className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                />
                <span className="text-gray-700">Include Historical Data</span>
              </label>
            </div>

            {/* Summary */}
            <div className="bg-white p-3 rounded-lg border border-gray-300">
              <p className="text-sm font-semibold text-gray-700 mb-2">📋 Report Summary</p>
              <div className="text-xs text-gray-600 space-y-1">
                <p>📍 Region: {formData.regionName || 'Select above'}</p>
                <p>📊 Format: {formData.format.toUpperCase()}</p>
                <p>📅 Range: {formData.dateRange}</p>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={generating}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <span className="animate-spin">⏳</span>
                Generating Report...
              </>
            ) : (
              <>
                <span>✅ Generate Report</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Recent Reports */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-6">📂 Recent Reports ({reports.length})</h3>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">⏳ Loading reports...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-green-50 border-l-4 border-green-600 p-4 rounded">
            <p className="text-green-900">
              ℹ️ No reports generated yet. Generate one above to see it listed here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reports.map((report, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-green-50 to-emerald-50 border-l-4 border-green-500 p-4 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getFormatIcon(report.format)}</span>
                    <div>
                      <h4 className="font-semibold text-gray-900 line-clamp-2">
                        {report.name || `Report ${index + 1}`}
                      </h4>
                      <p className="text-xs text-gray-600">
                        {report.format?.toUpperCase()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-4 text-sm text-gray-700">
                  <div className="flex justify-between">
                    <span className="text-gray-600">📅 Generated:</span>
                    <span className="font-medium">
                      {report.createdAt
                        ? new Date(report.createdAt).toLocaleDateString()
                        : 'Unknown'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">💾 Size:</span>
                    <span className="font-medium">
                      {report.size ? `${(report.size / 1024).toFixed(2)} KB` : 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownloadReport(report.filename || report.name)}
                    className="flex-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium transition-colors text-sm flex items-center justify-center gap-1"
                  >
                    <span>⬇️</span>
                    Download
                  </button>
                  <button
                    onClick={() => handleDeleteReport(report.filename || report.name)}
                    className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-medium transition-colors text-sm"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Report Information */}
      <div className="bg-purple-50 border-l-4 border-purple-600 p-6 rounded-lg">
        <h3 className="text-lg font-bold text-purple-900 mb-3">📌 Report Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-purple-900">
          <ul className="space-y-2">
            <li className="flex gap-2">
              <span>✓</span>
              <span>
                <strong>Multiple Formats</strong>: PDF, CSV, JSON
              </span>
            </li>
            <li className="flex gap-2">
              <span>✓</span>
              <span>
                <strong>Custom Date Ranges</strong>: 7/30/90 days or all time
              </span>
            </li>
            <li className="flex gap-2">
              <span>✓</span>
              <span>
                <strong>Historical Trends</strong>: Track changes over time
              </span>
            </li>
          </ul>
          <ul className="space-y-2">
            <li className="flex gap-2">
              <span>✓</span>
              <span>
                <strong>Professional Design</strong>: Government-ready reports
              </span>
            </li>
            <li className="flex gap-2">
              <span>✓</span>
              <span>
                <strong>Complete Data</strong>: All metrics and explanations
              </span>
            </li>
            <li className="flex gap-2">
              <span>✓</span>
              <span>
                <strong>Instant Download</strong>: Ready immediately after generation
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
