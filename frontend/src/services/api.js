// src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api',
  timeout: 30000,
});

// Request interceptor - attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isUnauthorized = error.response?.status === 401;
    const isLoginRequest = error.config?.url?.endsWith('/auth/login');

    if (isUnauthorized && !isLoginRequest) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// ─── Service Helpers ──────────────────────────────────────────────────────────

export const cameraService = {
  getAll: () => api.get('/cameras'),
  get: (id) => api.get(`/cameras/${id}`),
  add: (data) => api.post('/cameras', data),
  update: (id, data) => api.put(`/cameras/${id}`, data),
  delete: (id) => api.delete(`/cameras/${id}`),
  getLiveUrl: (id, options = {}) => {
    const token = localStorage.getItem('token');
    const base = `${api.defaults.baseURL}/cameras/${id}/live`;
    const params = new URLSearchParams();
    if (token) params.set('token', token);
    if (options.quality) params.set('quality', options.quality);
    const query = params.toString();
    return query ? `${base}?${query}` : base;
  },
  startRecording: (id) => api.post(`/cameras/${id}/start-recording`),
  stopRecording: (id) => api.post(`/cameras/${id}/stop-recording`),
  checkStatus: (id) => api.post(`/cameras/${id}/check-status`),
  discover: () => api.get('/cameras/discover'),
  probe: (data) => api.post('/cameras/probe', data),
  getStats: () => api.get('/cameras/stats/overview'),
};

export const recordingService = {
  getAll: (params) => api.get('/recordings', { params }),
  get: (id) => api.get(`/recordings/${id}`),
  delete: (id) => api.delete(`/recordings/${id}`),
  getStats: () => api.get('/recordings/stats/overview'),
  getStreamUrl: (id) => {
    const token = localStorage.getItem('token');
    const base = `${api.defaults.baseURL}/recordings/${id}/stream`;
    return token ? `${base}?token=${encodeURIComponent(token)}` : base;
  },
  getDownloadUrl: (id) => {
    const token = localStorage.getItem('token');
    const base = `${api.defaults.baseURL}/recordings/${id}/download`;
    return token ? `${base}?token=${encodeURIComponent(token)}` : base;
  },
};

export const userService = {
  getAll: () => api.get('/users'),
  get: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  resetPassword: (id, newPassword) => api.put(`/users/${id}/reset-password`, { newPassword }),
};

export const alertService = {
  getAll: (params) => api.get('/alerts', { params }),
  getUnreadCount: () => api.get('/alerts/unread/count'),
  markRead: (id) => api.put(`/alerts/${id}/read`),
  markAllRead: () => api.put('/alerts/mark-all-read'),
  acknowledge: (id) => api.put(`/alerts/${id}/acknowledge`),
  delete: (id) => api.delete(`/alerts/${id}`),
};

export const reportService = {
  getDashboard: () => api.get('/reports/dashboard'),
  getCameraActivity: (params) => api.get('/reports/camera-activity', { params }),
  getAuditLog: (params) => api.get('/reports/audit-log', { params }),
  getStorage: () => api.get('/reports/storage'),
  export: (params) => api.get('/reports/export', { params, responseType: 'blob' }),
};

export const storageService = {
  getStats: () => api.get('/storage/stats'),
  getByCamera: () => api.get('/storage/by-camera'),
  autoClean: () => api.post('/storage/auto-clean'),
};

export const ptzService = {
  sendCommand: (cameraId, command, speed, preset = null) =>
    api.post(`/ptz/${cameraId}/command`, { command, speed, preset }),
  getPresets: (cameraId) => api.get(`/ptz/${cameraId}/presets`),
};
