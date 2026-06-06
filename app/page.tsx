'use client'

import { useState, useEffect } from 'react'
import { Task, ActiveView } from '@/lib/types'
import { getTasks, setTasks } from '@/lib/storage'
import Capture from '@/components/Capture'
import Inbox from '@/components/Inbox'
import Today from '@/components/Today'
import TabBar from '@/components/TabBar'

export default function Home() {
  const [tasks, setTasksState] = useState<Task[]>([])
  const [view, setView] = useState<ActiveView>('capture')

  // Load from localStorage on mount
  useEffect(() => {
    setTasksState(getTasks())
  }, [])

  const handleTasksReady = (newTasks: Task[]) => {
    setTasksState(newTasks)
    setTasks(newTasks)
    setView('inbox')
  }

  const handleUpdateTasks = (updated: Task[]) => {
    setTasksState(updated)
    setTasks(updated)
  }

  const handleBuildPlan = () => {
    setView('today')
  }

  return (
    <main className="flex flex-col h-screen max-w-md mx-auto">
      <div className="flex-1 overflow-hidden">
        {view === 'capture' && (
          <Capture onTasksReady={handleTasksReady} />
        )}
        {view === 'inbox' && (
          <Inbox
            tasks={tasks}
            onUpdateTasks={handleUpdateTasks}
            onBuildPlan={handleBuildPlan}
          />
        )}
        {view === 'today' && (
          <Today tasks={tasks} />
        )}
      </div>
      <TabBar active={view} onChange={setView} taskCount={tasks.length} />
    </main>
  )
}
