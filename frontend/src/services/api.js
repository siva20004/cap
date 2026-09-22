import axios from 'axios';
import { mockStore } from './mockData';

// Determine if we have an explicitly provided backend URL
const envUrl = import.meta.env.VITE_API_URL;
const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// Default API URL: use envUrl, or localhost:8000 if on localhost, otherwise fallback to local proxy or relative
const API_BASE_URL = envUrl || (isLocalhost ? 'http://localhost:8000/api' : '/api');

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 4000, // Quick timeout so fallback triggers immediately on Vercel
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

// Response interceptor for data unwrapping
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error)
);

// Helper function to safely execute network call with mock fallback
const safeCall = async (networkFn, mockFn) => {
  // If deployed on Vercel and no remote backend is specified, use mock directly for instant response
  if (!isLocalhost && !envUrl) {
    try {
      return await mockFn();
    } catch (err) {
      return Promise.reject(err);
    }
  }

  try {
    return await networkFn();
  } catch (err) {
    // If network error, connection refused, or timeout, fallback to mockStore
    console.warn('Backend unavailable, utilizing client-side standalone engine:', err.message);
    try {
      return await mockFn();
    } catch (mockErr) {
      return Promise.reject(mockErr);
    }
  }
};

export const api = {
  // Authentication
  register: (data) =>
    safeCall(
      () => apiClient.post('/auth/register', data),
      () => mockStore.register(data)
    ),

  login: (data) =>
    safeCall(
      () => apiClient.post('/auth/login', data),
      () => mockStore.login(data.email, data.password)
    ),

  getMe: () =>
    safeCall(
      () => apiClient.get('/auth/me'),
      () => mockStore.getMe()
    ),

  // Health & Dashboard
  getHealth: () =>
    safeCall(
      () => axios.get(`${API_BASE_URL.replace(/\/api$/, '')}/health`, { timeout: 3000 }).then((r) => r.data),
      () => ({
        status: 'ONLINE (Vercel)',
        service: 'Self-Diagnosing AI Orchestrator',
        version: '1.0.0',
        environment: 'cloud-demo'
      })
    ),

  getDashboardSummary: () =>
    safeCall(
      () => apiClient.get('/dashboard/summary'),
      () => mockStore.getDashboardSummary()
    ),

  getAuditLogs: (limit = 100) =>
    safeCall(
      () => apiClient.get(`/logs?limit=${limit}`),
      () => mockStore.getAuditLogs()
    ),

  // Pipelines
  getPipelines: () =>
    safeCall(
      () => apiClient.get('/pipelines'),
      () => mockStore.getPipelines()
    ),

  getPipeline: (id) =>
    safeCall(
      () => apiClient.get(`/pipelines/${id}`),
      () => mockStore.getPipeline(id)
    ),

  createPipeline: (data) =>
    safeCall(
      () => apiClient.post('/pipelines', data),
      () => mockStore.createPipeline(data)
    ),

  triggerPipelineRun: (id, data) =>
    safeCall(
      () => apiClient.post(`/pipelines/${id}/run`, data),
      () => mockStore.triggerPipelineRun(id, data)
    ),

  // Runs
  getRuns: (params = {}) =>
    safeCall(
      () => apiClient.get('/runs', { params }),
      () => mockStore.getRuns()
    ),

  getRun: (id) =>
    safeCall(
      () => apiClient.get(`/runs/${id}`),
      () => mockStore.getRun(id)
    ),

  // Contracts
  getContracts: () =>
    safeCall(
      () => apiClient.get('/contracts'),
      () => mockStore.getContracts()
    ),

  createContract: (data) =>
    safeCall(
      () => apiClient.post('/contracts', data),
      () => mockStore.getContracts()[0]
    ),

  getContractViolations: (params = {}) =>
    safeCall(
      () => apiClient.get('/contracts/violations', { params }),
      () => mockStore.getContractViolations()
    ),

  validateDatasetContract: (data) =>
    safeCall(
      () => apiClient.post('/contracts/validate', data),
      () => mockStore.validateDatasetContract(data)
    ),

  // Failures & AI Diagnosis
  getFailures: (limit = 50) =>
    safeCall(
      () => apiClient.get(`/failures?limit=${limit}`),
      () => mockStore.getFailures()
    ),

  getFailure: (id) =>
    safeCall(
      () => apiClient.get(`/failures/${id}`),
      () => mockStore.getFailure(id)
    ),

  injectFailure: (data) =>
    safeCall(
      () => apiClient.post('/failures/inject', data),
      () => mockStore.triggerPipelineRun('pipe-ecommerce-01', { failure_scenario: data.failure_type })
    ),

  diagnoseFailure: (failureId) =>
    safeCall(
      () => apiClient.post(`/failures/${failureId}/diagnose`),
      () => mockStore.diagnoseFailure(failureId)
    ),

  getFailureDiagnosis: (failureId) =>
    safeCall(
      () => apiClient.get(`/failures/${failureId}/diagnosis`),
      () => mockStore.getFailureDiagnosis(failureId)
    ),

  // Backfill
  createBackfillPlan: (data) =>
    safeCall(
      () => apiClient.post('/backfill/plan', data),
      () => mockStore.createBackfillPlan(data)
    ),

  getBackfillPlan: (planId) =>
    safeCall(
      () => apiClient.get(`/backfill/${planId}`),
      () => mockStore.getBackfillPlan(planId)
    ),

  getPlansByFailure: (failureId) =>
    safeCall(
      () => apiClient.get(`/backfill/by-failure/${failureId}`),
      () => mockStore.getPlansByFailure(failureId)
    ),

  // Scheduler
  generateSchedules: (data) =>
    safeCall(
      () => apiClient.post('/schedules/generate', data),
      () => mockStore.generateSchedules(data)
    ),

  getSchedule: (id) =>
    safeCall(
      () => apiClient.get(`/schedules/${id}`),
      () => mockStore.getSchedule(id)
    ),

  getSchedulesByPlan: (planId) =>
    safeCall(
      () => apiClient.get(`/schedules/by-plan/${planId}`),
      () => mockStore.getSchedulesByPlan(planId)
    ),

  // Recovery
  executeRecovery: (data) =>
    safeCall(
      () => apiClient.post('/recovery/execute', data),
      () => mockStore.executeRecovery(data)
    ),

  getRecovery: (id) =>
    safeCall(
      () => apiClient.get(`/recovery/${id}`),
      () => mockStore.getRecovery(id)
    ),

  getRecoveries: (limit = 50) =>
    safeCall(
      () => apiClient.get(`/recovery?limit=${limit}`),
      () => mockStore.getRecoveries()
    ),

  // Experiments
  getExperiments: () =>
    safeCall(
      () => apiClient.get('/experiments'),
      () => mockStore.getExperiments()
    ),

  getExperiment: (id) =>
    safeCall(
      () => apiClient.get(`/experiments/${id}`),
      () => mockStore.getExperiments()[0]
    ),

  runExperiment: (data) =>
    safeCall(
      () => apiClient.post('/experiments/run', data),
      () => mockStore.runExperiment(data)
    ),

  // Models
  getModels: () =>
    safeCall(
      () => apiClient.get('/models'),
      () => mockStore.getModels()
    ),

  triggerModelTraining: (data) =>
    safeCall(
      () => apiClient.post('/models/train', data),
      () => mockStore.triggerModelTraining(data)
    ),

  // Datasets
  getDatasets: () =>
    safeCall(
      () => apiClient.get('/datasets'),
      () => mockStore.getDatasets()
    ),

  uploadDataset: (formData) =>
    safeCall(
      () =>
        apiClient.post('/datasets/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        }),
      () => mockStore.uploadDataset()
    ),
};

export default api;
