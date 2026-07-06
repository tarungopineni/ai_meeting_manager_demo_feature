import { create } from 'zustand'
import type { Task } from '@/types'

interface TaskDrawerState {
  task: Task | null
  open: (task: Task) => void
  close: () => void
}

export const useTaskDrawerStore = create<TaskDrawerState>((set) => ({
  task: null,
  open: (task) => set({ task }),
  close: () => set({ task: null }),
}))
