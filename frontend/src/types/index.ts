// ─── Auth ────────────────────────────────────────────────────────────────────
export type Role = 'coordinator' | 'manager' | 'employee' | 'dev'

export interface AuthUser {
  id: number
  username: string
  role: Role
  is_demo?: boolean
  demo_session_id?: string | null
}

export interface LoginResponse {
  access_token: string
  token_type: string
}

// ─── Users ───────────────────────────────────────────────────────────────────
export interface User {
  id: number
  manager_id: number | null
  name: string
  email: string
  username: string
  role: Role
  first_name?: string
  last_name?: string
}

export interface CreateUserPayload {
  manager_id?: number | null
  name: string
  email: string
  username: string
  first_name: string
  last_name: string
  password: string
  role: Role
}

export interface UpdateUserPayload {
  manager_id?: number | null
  name: string
  email: string
  first_name: string
  last_name: string
  role: Role
}

export interface UpdateCredentialsPayload {
  username: string
  password: string
}

// ─── Tasks ───────────────────────────────────────────────────────────────────
export type Priority = 'HIGH' | 'MEDIUM' | 'LOW'

export interface Task {
  id: number
  title: string
  description: string
  priority: Priority
  completed: boolean
  manager_id: number
  assignee_id: number
  deadline: string | null
  deadline_text: string | null
  created_at: string
  updated_at: string
  verified_by_manager: boolean
  approved_by_manager: boolean
}

export interface TaskRequest {
  title: string
  description: string
  priority: Priority
  completed: boolean
  manager_id: number
  assignee_id: number
  deadline?: string | null
  deadline_text?: string | null
  verified_by_manager: boolean
  approved_by_manager: boolean
}

export interface PerformanceReport {
  total_tasks: number
  completed_tasks: number
  pending_tasks: number
  completion_percentage: string
}

export interface TaskWarning {
  task_id: number
  title: string
  description: string
  priority: Priority
  deadline: string
  remaining_hours: number
  deadline_text: string | null
  is_overdue: boolean
  assignee_id?: number
}

// ─── Meetings ─────────────────────────────────────────────────────────────────
export interface Meeting {
  id: number
  title: string
  audio_file_path: string | null
  transcript: string | null
  summary: string | null
  created_at: string
}

export interface MeetingCreateResponse {
  message: string
}
