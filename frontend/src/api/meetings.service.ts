import api from './axios'
import type { Meeting, MeetingCreateResponse } from '@/types'

export const meetingsService = {
  getAll: () => api.get<Meeting[]>('/meetings/get_meetings').then(r => r.data),
  create: (title: string, audioFile: File, onProgress?: (pct: number) => void) => {
    const formData = new FormData()
    formData.append('title', title)
    formData.append('audio_file', audioFile)
    return api.post<MeetingCreateResponse>('/meetings/create', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      },
    }).then(r => r.data)
  },
}
