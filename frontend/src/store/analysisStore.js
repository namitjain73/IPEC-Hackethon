import { create } from 'zustand';

export const useAnalysisStore = create((set) => ({
  analyses: [],
  currentAnalysis: null,
  loading: false,
  error: null,
  stats: null,
  selectedRegion: null,

  setAnalyses: (analyses) => set({ analyses }),
  setCurrentAnalysis: (analysis) => set({ currentAnalysis: analysis }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setStats: (stats) => set({ stats }),
  setSelectedRegion: (region) => set({ selectedRegion: region }),
  clearError: () => set({ error: null }),

  addAnalysis: (analysis) =>
    set((state) => {
      // Ensure proper deep copy and state update
      const newAnalyses = [analysis, ...state.analyses].slice(0, 50);
      return {
        analyses: newAnalyses,
        currentAnalysis: { ...analysis }, // Force new object reference
      };
    }),

  reset: () =>
    set({
      analyses: [],
      currentAnalysis: null,
      loading: false,
      error: null,
      stats: null,
      selectedRegion: null,
    }),
}));
