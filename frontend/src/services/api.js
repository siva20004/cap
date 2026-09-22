import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor to attach JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for consistent error extraction
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorMsg =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected network error occurred';
    return Promise.reject(new Error(errorMsg));
  }
);


export const api = {
  // Authentication
  register: (data) => apiClient.post('/auth/register', data),
  login: (data) => apiClient.post('/auth/login', data),
  getMe: () => apiClient.get('/auth/me'),

  // Health & Dashboard
  getHealth: () => axios.get('http://localhost:8000/health').then((r) => r.data),

  getDashboardSummary: () => apiClient.get('/dashboard/summary'),
  getAuditLogs: (limit = 100) => apiClient.get(`/logs?limit=${limit}`),

  // Pipelines
  getPipelines: () => apiClient.get('/pipelines'),
  getPipeline: (id) => apiClient.get(`/pipelines/${id}`),
  createPipeline: (data) => apiClient.post('/pipelines', data),
  triggerPipelineRun: (id, data) => apiClient.post(`/pipelines/${id}/run`, data),

  // Runs
  getRuns: (params = {}) => apiClient.get('/runs', { params }),
  getRun: (id) => apiClient.get(`/runs/${id}`),

  // Contracts
  getContracts: () => apiClient.get('/contracts'),
  createContract: (data) => apiClient.post('/contracts', data),
  getContractViolations: (params = {}) => apiClient.get('/contracts/violations', { params }),
  validateDatasetContract: (data) => apiClient.post('/contracts/validate', data),

  // Failures & AI Diagnosis
  getFailures: (limit = 50) => apiClient.get(`/failures?limit=${limit}`),
  getFailure: (id) => apiClient.get(`/failures/${id}`),
  injectFailure: (data) => apiClient.post('/failures/inject', data),
  diagnoseFailure: (failureId) => apiClient.post(`/failures/${failureId}/diagnose`),
  getFailureDiagnosis: (failureId) => apiClient.get(`/failures/${failureId}/diagnosis`),

  // Backfill
  createBackfillPlan: (data) => apiClient.post('/backfill/plan', data),
  getBackfillPlan: (planId) => apiClient.get(`/backfill/${planId}`),
  getPlansByFailure: (failureId) => apiClient.get(`/backfill/by-failure/${failureId}`),

  // Scheduler
  generateSchedules: (data) => apiClient.post('/schedules/generate', data),
  getSchedule: (id) => apiClient.get(`/schedules/${id}`),
  getSchedulesByPlan: (planId) => apiClient.get(`/schedules/by-plan/${planId}`),

  // Recovery
  executeRecovery: (data) => apiClient.post('/recovery/execute', data),
  getRecovery: (id) => apiClient.get(`/recovery/${id}`),
  getRecoveries: (limit = 50) => apiClient.get(`/recovery?limit=${limit}`),

  // Experiments
  getExperiments: () => apiClient.get('/experiments'),
  getExperiment: (id) => apiClient.get(`/experiments/${id}`),
  runExperiment: (data) => apiClient.post('/experiments/run', data),

  // Models
  getModels: () => apiClient.get('/models'),
  triggerModelTraining: (data) => apiClient.post('/models/train', data),

  // Datasets
  getDatasets: () => apiClient.get('/datasets'),
  uploadDataset: (formData) =>
    apiClient.post('/datasets/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export default api;
