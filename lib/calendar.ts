import { Task } from './types'

function toGCalDate(dateStr: string, timeStr: string): string {
  // dateStr: "YYYY-MM-DD", timeStr: "HH:MM"
  return `${dateStr.replace(/-/g, '')}T${timeStr.replace(':', '')}00`
}

export function buildCalendarUrl(task: Task): string {
  const today = new Date().toISOString().split('T')[0] // "YYYY-MM-DD"
  const [h, m] = task.suggestedTime.split(':').map(Number)
  const endMinutes = h * 60 + m + task.estimatedMinutes
  const endH = String(Math.floor(endMinutes / 60)).padStart(2, '0')
  const endM = String(endMinutes % 60).padStart(2, '0')
  const endTime = `${endH}:${endM}`

  const start = toGCalDate(today, task.suggestedTime)
  const end = toGCalDate(today, endTime)

  const params = new URLSearchParams({
    text: task.title,
    dates: `${start}/${end}`,
    ...(task.notes ? { details: task.notes } : {}),
  })

  return `https://calendar.google.com/calendar/r/eventedit?${params.toString()}`
}
