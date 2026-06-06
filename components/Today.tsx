'use client'

import { useState } from 'react'
import { Task } from '@/lib/types'
import { buildCalendarUrl } from '@/lib/calendar'

interface Props {
  tasks: Task[]
}

const TIMELINE_START = 8   // 08:00
const TIMELINE_END   = 22  // 22:00
const TOTAL_HOURS    = TIMELINE_END - TIMELINE_START
const PX_PER_MINUTE  = 1.5

const typeColor: Record<string, string> = {
  meeting: 'bg-purple-700 border-purple-500',
  task:    'bg-blue-700 border-blue-500',
  errand:  'bg-green-700 border-green-500',
}
const typeIcon: Record<string, string> = { meeting: '📅', task: '✅', errand: '🛒' }

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export default function Today({ tasks }: Props) {
  const [selected, setSelected] = useState<Task | null>(null)

  const timelineHeightPx = TOTAL_HOURS * 60 * PX_PER_MINUTE

  const hours = Array.from(
    { length: TOTAL_HOURS + 1 },
    (_, i) => TIMELINE_START + i
  )

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500">
        <span className="text-5xl">🗓</span>
        <p>Немає задач. Спочатку зробіть Capture.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 pt-6">
        <h2 className="text-xl font-bold">Сьогодні</h2>
        <p className="text-gray-400 text-sm">
          {new Date().toLocaleDateString('uk-UA', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="relative" style={{ height: timelineHeightPx }}>
          {/* Hour lines */}
          {hours.map(h => {
            const topPx = (h - TIMELINE_START) * 60 * PX_PER_MINUTE
            return (
              <div key={h} className="absolute left-0 right-0 flex items-center gap-2"
                style={{ top: topPx }}>
                <span className="text-xs text-gray-600 w-10 shrink-0">{h}:00</span>
                <div className="flex-1 border-t border-gray-800" />
              </div>
            )
          })}

          {/* Task blocks */}
          {tasks.map(task => {
            const startMin = timeToMinutes(task.suggestedTime)
            const offsetMin = startMin - TIMELINE_START * 60
            if (offsetMin < 0) return null

            const topPx = offsetMin * PX_PER_MINUTE
            const heightPx = Math.max(task.estimatedMinutes * PX_PER_MINUTE, 36)

            return (
              <button
                key={task.id}
                onClick={() => setSelected(task)}
                className={`absolute left-14 right-0 rounded-xl border px-3 py-1 text-left transition-all hover:brightness-110 active:scale-95 ${typeColor[task.type]}`}
                style={{ top: topPx, height: heightPx }}
              >
                <div className="flex items-center gap-1 overflow-hidden">
                  <span className="text-sm">{typeIcon[task.type]}</span>
                  <span className="text-xs font-medium truncate">{task.title}</span>
                </div>
                {heightPx > 40 && (
                  <p className="text-xs text-white/60 mt-0.5">
                    {task.suggestedTime} · {task.estimatedMinutes} хв
                  </p>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Bottom sheet */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/60 z-10 flex items-end"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full bg-gray-900 rounded-t-3xl p-6 flex flex-col gap-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{typeIcon[selected.type]}</span>
                  <h3 className="text-lg font-bold">{selected.title}</h3>
                </div>
                {selected.notes && (
                  <p className="text-gray-400 text-sm mt-1">{selected.notes}</p>
                )}
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-500 text-2xl leading-none">×</button>
            </div>
            <div className="flex gap-4 text-sm text-gray-400">
              <span>🕐 {selected.suggestedTime}</span>
              <span>⏱ {selected.estimatedMinutes} хв</span>
            </div>
            <a
              href={buildCalendarUrl(selected)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 rounded-2xl bg-blue-600 text-white font-bold text-center hover:bg-blue-500 transition-colors"
            >
              📅 Додати в Google Calendar
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
