// AI-assisted: see ai-assist.md

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  active: boolean;
  created_at: string;
  updated_at?: string;
  page_permissions?: Record<string, boolean>;
}

export interface UserWithPermissions extends User {
  page_permissions: Record<string, boolean>;
}

export interface PagePermission {
  name: string;
  label: string;
  description: string;
}

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  AGENT = 'agent',
  VIEWER = 'viewer'
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface Candidate {
  id: number;
  full_name: string;
  email: string;
  phone?: string;
  position: string;
  status: CandidateStatus;
  resume_url?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export enum CandidateStatus {
  NEW = 'new',
  SCREENING = 'screening',
  INTERVIEWING = 'interviewing',
  OFFER = 'offer',
  HIRED = 'hired',
  REJECTED = 'rejected'
}

export interface Interview {
  id: number;
  candidate_id: number;
  candidate_name?: string;
  interviewer_name: string;
  scheduled_at: string;
  duration_minutes: number;
  status: InterviewStatus;
  interview_type: string;
  notes?: string;
  score?: number;
  created_at: string;
  updated_at?: string;
}

export enum InterviewStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show'
}

export interface Call {
  id: number;
  caller_name: string;
  caller_number: string;
  call_type: CallType;
  status: CallStatus;
  duration_seconds: number;
  is_important: boolean;
  notes?: string;
  created_at: string;
}

export enum CallType {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound'
}

export enum CallStatus {
  ANSWERED = 'answered',
  MISSED = 'missed',
  BUSY = 'busy',
  NO_ANSWER = 'no_answer'
}

export interface AuditLog {
  id: number;
  actor_id: number;
  actor_name?: string;
  action: string;
  target?: string;
  target_user_id?: number;
  target_user_name?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface ApiError {
  detail: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}
