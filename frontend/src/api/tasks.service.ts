import api from './axios'
import type { Task, TaskRequest, PerformanceReport, TaskWarning } from '@/types'

export const tasksService = {
  // Employee
  getVerified: () => api.get<Task[]>('/tasks/get_verified_tasks').then(r => r.data),
  getNotVerified: () => api.get<Task[]>('/tasks/get_not_verified_tasks').then(r => r.data),
  markCompleted: (id: number) => api.put(`/tasks/mark_task_completed/${id}`),
  getMyWarnings: () => api.get<TaskWarning[]>('/tasks/task-warnings').then(r => r.data),
  getPerformanceReport: () => api.get<PerformanceReport>('/tasks/performance_report_user').then(r => r.data),

  // Manager
  getStaffTasks: () => api.get<Task[]>('/tasks/get_staff_tasks').then(r => r.data),
  getYetToVerify: () => api.get<Task[]>('/tasks/get_yet_to_be_verified_tasks').then(r => r.data),
  verifyTask: (id: number) => api.put(`/tasks/verify_task/${id}`),
  rejectTask: (id: number) => api.put(`/tasks/reject_task/${id}`),
  changePriority: (id: number, priority: string) =>
    api.put(`/tasks/change_priority/${id}`, null, { params: { new_priority: priority } }),
  updateTask: (id: number, payload: TaskRequest) => api.put(`/tasks/update_task/${id}`, payload),
  deleteTask: (id: number) => api.delete(`/tasks/delete_task/${id}`),
  assignTask: (employeeId: number, payload: TaskRequest) =>
    api.post(`/tasks/assign_task_to_employee/${employeeId}`, payload),
  getTeamWarnings: () => api.get<TaskWarning[]>('/tasks/manager/task-warnings').then(r => r.data),
  getTeamPerformance: () => api.get<PerformanceReport>('/tasks/get_team_performance').then(r => r.data),
  sendWarningEmails: () => api.post<{ message: string }>('/tasks/send-warning-emails').then(r => r.data),
}
