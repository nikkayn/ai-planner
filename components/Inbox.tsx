'use client'

import { Task } from '@/lib/types'

interface Props {
  tasks: Task[]
  onUpdateTasks: (tasks: Task[]) => void
  onBuildPlan: () => void
}

const typeIcon: Record<string, string> = { meeting: '📅', task: '✅', errand: '🛒' }
const priorityLabel: Record<string, string> = { high: 'Важливо', medium: 'Середнє', low: 'Низьке' }
const priorityColor: Record<string, string> = {
  high: 'text-red-400 bg-red-950',
  medium: 'text-yellow-400 bg-yellow-950',
  low: 'text-green-400 bg-green-950',
}

export default function Inbox({ tasks, onUpdateTasks, onBuildPlan }: Props) {
  const deleteTask = (id: string) => {
    onUpdateTasks(tasks.filter(t => t.id !== id))
  }

  const updateTime = (id: string, time: string) => {
    onUpdateTasks(tasks.map(t => t.id === id ? { ...t, suggestedTime: time } : t))
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500">
        <span className="text-5xl">📭</span>
        <p>Немає задач. Поверніться на Capture.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 pt-6">
        <h2 className="text-xl font-bold">Inbox</h2>
        <p className="text-gray-400 text-sm">{tasks.length} задач знайдено</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 flex flex-col gap-3 pb-4">
        {tasks.map(task => (
          <div key={task.id} className="bg-gray-900 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-xl mt-0.5">{typeIcon[task.type]}</span>
              <div className="flex-1">
                <p className="font-medium text-sm">{task.title}</p>
                {task.notes && (
                  <p className="text-gray-500 text-xs mt-0.5">{task.notes}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColor[task.priority]}`}>
                    {priorityLabel[task.priority]}
                  </span>
                  <span className="text-xs text-gray-500">{task.estimatedMinutes} хв</span>
                </div>
              </div>
              <button
                onClick={() => deleteTask(task.id)}
                className="text-gray-600 hover:text-red-400 transition-colors text-lg leading-none"
              >
                ×
              </button>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-gray-500">Час:</span>
              <input
                type="time"
                value={task.suggestedTime}
                onChange={e => updateTime(task.id, e.target.value)}
                className="bg-gray-800 text-white text-xs rounded-lg px-2 py-1 border border-gray-700 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="p-4">
        <button
          onClick={onBuildPlan}
          className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-bold text-lg hover:bg-indigo-500 active:scale-95 transition-all"
        >
          Побудувати план →
        </button>
      </div>
    </div>
  )
}
