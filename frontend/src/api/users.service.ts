import api from './axios'
import type { User, CreateUserPayload, UpdateUserPayload, UpdateCredentialsPayload } from '@/types'

export const usersService = {
  getAll: () => api.get<User[]>('/users/get_users').then(r => r.data),
  getById: (id: number) => api.get<User>(`/users/get_user/${id}`).then(r => r.data),
  create: (payload: CreateUserPayload) => api.post<User>('/users/create', payload).then(r => r.data),
  update: (id: number, payload: UpdateUserPayload) => api.put(`/users/update_user/${id}`, payload),
  updateCredentials: (id: number, payload: UpdateCredentialsPayload) =>
    api.put(`/users/update_credentials/${id}`, payload),
  updateManager: (userId: number, managerId: number) =>
    api.put(`/users/update_user_manager/${userId}`, null, { params: { manager_id: managerId } }),
  delete: (id: number) => api.delete(`/users/delete_user/${id}`),
  getTeam: () => api.get<User[]>('/users/get_team').then(r => r.data),
}
