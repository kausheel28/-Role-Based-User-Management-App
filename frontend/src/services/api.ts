// AI-assisted: see ai-assist.md
import axios, { AxiosResponse } from 'axios';
import { 
  User, 
  UserWithPermissions,
  LoginRequest, 
  AuthTokens, 
  Candidate, 
  Interview, 
  Call, 
  AuditLog 
} from '../types';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Create axios instance
const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management
export const setAccessToken = (token: string) => {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  localStorage.setItem('access_token', token);
};

export const clearAccessToken = () => {
  delete api.defaults.headers.common['Authorization'];
  localStorage.removeItem('access_token');
  sessionStorage.removeItem('access_token');
};

// CSRF token management
let csrfToken: string | null = null;

export const fetchCSRFToken = async (): Promise<string> => {
  try {
    const response = await api.get('/auth/csrf-token');
    csrfToken = response.data.csrf_token;
    return csrfToken || '';
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
    throw error;
  }
};

export const getCSRFToken = (): string | null => {
  return csrfToken;
};

export const setCSRFToken = (token: string) => {
  csrfToken = token;
  api.defaults.headers.common['X-CSRFToken'] = token;
};

// Request interceptor to add CSRF token
api.interceptors.request.use(
  async (config) => {
    // Add CSRF token for state-changing requests
    if (config.method && !['get', 'head', 'options'].includes(config.method.toLowerCase())) {
      if (!csrfToken) {
        try {
          await fetchCSRFToken();
        } catch (error) {
          console.warn('Failed to fetch CSRF token, proceeding without it');
        }
      }
      if (csrfToken) {
        config.headers['X-CSRFToken'] = csrfToken;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      try {
        const response = await api.post('/auth/refresh');
        const tokens: AuthTokens = response.data;
        setAccessToken(tokens.access_token);
        
        // Retry the original request
        original.headers['Authorization'] = `Bearer ${tokens.access_token}`;
        return api(original);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        clearAccessToken();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (credentials: LoginRequest): Promise<AxiosResponse<AuthTokens>> =>
    api.post('/auth/login', credentials),

  logout: (): Promise<AxiosResponse<{ message: string }>> =>
    api.post('/auth/logout'),

  getMe: (): Promise<AxiosResponse<User>> =>
    api.get('/auth/me'),

  refreshToken: (): Promise<AxiosResponse<AuthTokens>> =>
    api.post('/auth/refresh'),
};

// Users API
export const usersApi = {
  getUsers: (skip = 0, limit = 100, search?: string): Promise<AxiosResponse<UserWithPermissions[]>> => {
    const params = new URLSearchParams({ skip: skip.toString(), limit: limit.toString() });
    if (search) {
      params.append('search', search);
    }
    return api.get(`/users/?${params.toString()}`);
  },

  createUser: (userData: Partial<User> & { password: string }): Promise<AxiosResponse<User>> =>
    api.post('/users/', userData),

  updateUser: (userId: number, userData: Partial<User>): Promise<AxiosResponse<User>> =>
    api.put(`/users/${userId}`, userData),

  deleteUser: (userId: number): Promise<AxiosResponse<{ message: string }>> =>
    api.delete(`/users/${userId}`),

  getUserById: (userId: number): Promise<AxiosResponse<User>> =>
    api.get(`/users/${userId}`),

  updateUserPageAccess: (
    userId: number, 
    pageName: string, 
    hasAccess: boolean
  ): Promise<AxiosResponse<{ message: string }>> =>
    api.put(`/users/${userId}/page-access/${pageName}?has_access=${hasAccess}`),

  getMyPermissions: (): Promise<AxiosResponse<{ permissions: Record<string, boolean> }>> =>
    api.get('/users/me/permissions'),
};

// Candidates API
export const candidatesApi = {
  getCandidates: (skip = 0, limit = 100, search?: string): Promise<AxiosResponse<Candidate[]>> => {
    const params = new URLSearchParams({ skip: skip.toString(), limit: limit.toString() });
    if (search) params.append('search', search);
    return api.get(`/candidates/?${params}`);
  },

  createCandidate: (candidateData: Omit<Candidate, 'id' | 'created_at' | 'updated_at'>): Promise<AxiosResponse<Candidate>> =>
    api.post('/candidates/', candidateData),

  updateCandidate: (candidateId: number, candidateData: Partial<Candidate>): Promise<AxiosResponse<Candidate>> =>
    api.put(`/candidates/${candidateId}`, candidateData),

  deleteCandidate: (candidateId: number): Promise<AxiosResponse<{ message: string }>> =>
    api.delete(`/candidates/${candidateId}`),

  getCandidateById: (candidateId: number): Promise<AxiosResponse<Candidate>> =>
    api.get(`/candidates/${candidateId}`),

  getCandidateStats: (): Promise<AxiosResponse<{ total_candidates: number; by_status: Record<string, number> }>> =>
    api.get('/candidates/stats/overview'),
};

// Interviews API
export const interviewsApi = {
  getInterviews: (skip = 0, limit = 100, search?: string): Promise<AxiosResponse<Interview[]>> => {
    const params = new URLSearchParams({ skip: skip.toString(), limit: limit.toString() });
    if (search) params.append('search', search);
    return api.get(`/interviews/?${params}`);
  },

  createInterview: (interviewData: Omit<Interview, 'id' | 'created_at' | 'updated_at' | 'candidate_name'>): Promise<AxiosResponse<Interview>> =>
    api.post('/interviews/', interviewData),

  updateInterview: (interviewId: number, interviewData: Partial<Interview>): Promise<AxiosResponse<Interview>> =>
    api.put(`/interviews/${interviewId}`, interviewData),

  deleteInterview: (interviewId: number): Promise<AxiosResponse<{ message: string }>> =>
    api.delete(`/interviews/${interviewId}`),

  getInterviewById: (interviewId: number): Promise<AxiosResponse<Interview>> =>
    api.get(`/interviews/${interviewId}`),

  getUpcomingInterviews: (daysAhead = 7, limit = 10): Promise<AxiosResponse<Interview[]>> =>
    api.get(`/interviews/upcoming?days_ahead=${daysAhead}&limit=${limit}`),

  getInterviewStats: (): Promise<AxiosResponse<{ total_interviews: number; by_status: Record<string, number> }>> =>
    api.get('/interviews/stats/overview'),
};

// Calls API
export const callsApi = {
  getCalls: (
    skip = 0, 
    limit = 100, 
    search?: string,
    callType?: string,
    status?: string,
    isImportant?: boolean
  ): Promise<AxiosResponse<Call[]>> => {
    const params = new URLSearchParams({ skip: skip.toString(), limit: limit.toString() });
    if (search) params.append('search', search);
    if (callType) params.append('call_type', callType);
    if (status) params.append('status', status);
    if (isImportant !== undefined) params.append('is_important', isImportant.toString());
    return api.get(`/calls/?${params}`);
  },

  createCall: (callData: Omit<Call, 'id' | 'created_at'>): Promise<AxiosResponse<Call>> =>
    api.post('/calls/', callData),

  updateCall: (callId: number, callData: Partial<Call>): Promise<AxiosResponse<Call>> =>
    api.put(`/calls/${callId}`, callData),

  deleteCall: (callId: number): Promise<AxiosResponse<{ message: string }>> =>
    api.delete(`/calls/${callId}`),

  getCallById: (callId: number): Promise<AxiosResponse<Call>> =>
    api.get(`/calls/${callId}`),

  getCallStats: (): Promise<AxiosResponse<{
    total_calls: number;
    answered_calls: number;
    missed_calls: number;
    important_calls: number;
    total_duration_seconds: number;
    answer_rate: number;
  }>> =>
    api.get('/calls/stats/overview'),
};

// Audit Logs API
export const auditLogsApi = {
  getRecentLogs: (limit = 50): Promise<AxiosResponse<AuditLog[]>> =>
    api.get(`/audit-logs/recent?limit=${limit}`),

  getUserLogs: (userId: number, skip = 0, limit = 50): Promise<AxiosResponse<AuditLog[]>> =>
    api.get(`/audit-logs/user/${userId}?skip=${skip}&limit=${limit}`),

  getAllLogs: (skip = 0, limit = 50): Promise<AxiosResponse<AuditLog[]>> =>
    api.get(`/audit-logs/?skip=${skip}&limit=${limit}`),
};

export default api;
