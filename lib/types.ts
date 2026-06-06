export type TaskType = 'meeting' | 'task' | 'errand'
export type Priority = 'high' | 'medium' | 'low'

export interface Task {
  id: string
  title: string
  priority: Priority
  estimatedMinutes: number
  suggestedTime: string   // "HH:MM" 24h
  type: TaskType
  notes?: string
}

export type ActiveView = 'capture' | 'inbox' | 'today'
