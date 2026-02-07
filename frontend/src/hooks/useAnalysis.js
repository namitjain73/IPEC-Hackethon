import { useCallback, useState } from 'react';
import { analysisAPI, healthAPI } from '../services/api';
import { useAnalysisStore } from '../store/analysisStore';

export function useAnalysis() {
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState(null);
  const store = useAnalysisStore();

  const analyzeRegion = useCallback(
    async (latitude, longitude, sizeKm, name) => {
      try {
        console.log(`[Frontend] Starting analysis for ${name} at (${latitude}, ${longitude})`);
        setLocalLoading(true);
        setLocalError(null);
        const response = await analysisAPI.analyzeRegion(latitude, longitude, sizeKm, name);
        
        console.log('[Frontend] API Response:', response.data);
        
        if (!response.data.success) {
          const errorMsg = response.data.error || 'Analysis failed';
          console.error('[Frontend] Analysis returned success=false:', errorMsg);
          setLocalError(errorMsg);
          const errorAnalysis = {
            success: false,
            error: errorMsg,
            regionName: name,
            timestamp: new Date().toISOString(),
          };
          store.setCurrentAnalysis(errorAnalysis);
          throw new Error(errorMsg);
        }
        
        console.log('[Frontend] Analysis successful');
        // Wrap with success flag so AnalysisResultCard can check it
        const analysis = {
          ...response.data.analysis,
          success: true,
        };
        store.addAnalysis(analysis);
        return analysis;
      } catch (error) {
        // Handle both Axios errors and thrown errors
        let errorMessage = error.message;
        
        if (error.response?.data) {
          // Server returned an error response
          console.error('[Frontend] Server error response:', error.response.data);
          errorMessage = error.response.data.error || error.response.data.message || error.message;
        } else {
          console.error('[Frontend] Request failed:', error.message);
        }
        
        setLocalError(errorMessage);
        const errorAnalysis = {
          success: false,
          error: errorMessage,
          regionName: name,
          timestamp: new Date().toISOString(),
        };
        store.setCurrentAnalysis(errorAnalysis);
        throw error;
      } finally {
        setLocalLoading(false);
      }
    },
    [store]
  );

  const getHistory = useCallback(async (regionName) => {
    try {
      setLocalLoading(true);
      const response = await analysisAPI.getHistory(regionName);
      return response.data.analyses;
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message;
      setLocalError(errorMessage);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, []);

  const getLatestAnalyses = useCallback(async () => {
    try {
      setLocalLoading(true);
      const response = await analysisAPI.getLatestAnalyses();
      store.setAnalyses(response.data.analyses);
      return response.data.analyses;
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message;
      setLocalError(errorMessage);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  }, [store]);

  const getStats = useCallback(async () => {
    try {
      const response = await analysisAPI.getStats();
      store.setStats(response.data.stats);
      return response.data.stats;
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message;
      setLocalError(errorMessage);
      throw error;
    }
  }, [store]);

  const checkHealth = useCallback(async () => {
    try {
      const response = await healthAPI.check();
      return response.data;
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }, []);

  return {
    loading: localLoading || store.loading,
    error: localError || store.error,
    analyses: store.analyses,
    currentAnalysis: store.currentAnalysis,
    stats: store.stats,
    selectedRegion: store.selectedRegion,
    analyzeRegion,
    getHistory,
    getLatestAnalyses,
    getStats,
    checkHealth,
    setSelectedRegion: (region) => store.setSelectedRegion(region),
    clearError: () => setLocalError(null),
  };
}
