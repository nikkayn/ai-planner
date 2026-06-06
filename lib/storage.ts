import { Task } from './types'

const KEY = 'ai-planner-tasks'

export function getTasks(): Task[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

export function setTasks(tasks: Task[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(tasks))
}

export function clearTasks(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(KEY)
}
