import React from 'react';

export function AnalysisHistory({ analyses = [], loading = false }) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      </div>
    );
  }

  if (!analyses || analyses.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500">
        No historical analyses available
      </div>
    );
  }

  const getRiskBadgeColor = (level) => {
    switch (level) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white">
        <h3 className="text-lg font-semibold">📊 Analysis History</h3>
        <p className="text-green-100 text-sm">{analyses.length} records</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">NDVI Mean</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Risk Level</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Change</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {analyses.map((analysis, idx) => (
              <tr key={idx} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-sm text-gray-900">{new Date(analysis.timestamp).toLocaleString()}</td>
                <td className="px-6 py-4 text-sm">
                  <span className="font-semibold text-green-600">{analysis.ndvi?.mean?.toFixed(3) || 'N/A'}</span>
                </td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRiskBadgeColor(analysis.riskClassification?.riskLevel)}`}>
                    {analysis.riskClassification?.riskLevel?.toUpperCase() || 'N/A'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">
                  {analysis.changeDetection?.meanChange ? (
                    <span className={analysis.changeDetection.meanChange > 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                      {analysis.changeDetection.meanChange > 0 ? '+' : ''}{analysis.changeDetection.meanChange.toFixed(3)}
                    </span>
                  ) : (
                    'N/A'
                  )}
                </td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    analysis.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {analysis.status?.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
