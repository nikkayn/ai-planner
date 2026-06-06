'use client'

import { ActiveView } from '@/lib/types'

interface Props {
  active: ActiveView
  onChange: (view: ActiveView) => void
  taskCount: number
}

const tabs: { id: ActiveView; label: string; icon: string }[] = [
  { id: 'capture', label: 'Capture', icon: '🎤' },
  { id: 'inbox',   label: 'Inbox',   icon: '📥' },
  { id: 'today',   label: 'Today',   icon: '📅' },
]

export default function TabBar({ active, onChange, taskCount }: Props) {
  return (
    <nav className="flex border-t border-gray-800 bg-gray-950">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex-1 flex flex-col items-center py-3 gap-1 transition-colors relative ${
            active === tab.id ? 'text-white' : 'text-gray-600'
          }`}
        >
          <span className="text-xl">{tab.icon}</span>
          <span className="text-xs">{tab.label}</span>
          {tab.id === 'inbox' && taskCount > 0 && (
            <span className="absolute top-2 right-[calc(50%-16px)] bg-indigo-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">
              {taskCount > 9 ? '9+' : taskCount}
            </span>
          )}
        </button>
      ))}
    </nav>
  )
}
