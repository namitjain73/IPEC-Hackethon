import axios from 'axios';

// Local development backend URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const analysisAPI = {
  analyzeRegion: (latitude, longitude, sizeKm, name) =>
    api.post('/analysis/analyze', { latitude, longitude, sizeKm, name }),
  getHistory: (regionName, limit = 10, skip = 0) =>
    api.get(`/analysis/history/${regionName}`, { params: { limit, skip } }),
  getLatestAnalyses: () => api.get('/analysis/latest'),
  getStats: () => api.get('/analysis/stats'),
};

export const healthAPI = {
  check: () => api.get('/health'),
  deepCheck: () => api.get('/health/deep'),
};

export { api };
export default api;
