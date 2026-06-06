# AI Day Planner — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first Next.js app where the user voice-dumps their thoughts, and Claude transforms them into a time-blocked day plan with live streaming.

**Architecture:** Single-page Next.js 14 App Router app with 3 client-side views (Capture → Inbox → Today). State lives in React + localStorage. Claude API is called via a server-side API route that proxies to keep the key secret. Streaming uses Vercel AI SDK.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Vercel AI SDK (`ai` package), `@anthropic-ai/sdk`, Web Speech API (browser-native), Vercel (deploy)

**Env vars needed:** `ANTHROPIC_API_KEY` — set in `.env.local` and in Vercel dashboard.

---

## File Map

| File | Responsibility |
|------|---------------|
| `app/page.tsx` | Root — owns `activeView` state, renders active component |
| `app/layout.tsx` | Root layout, viewport meta for mobile |
| `app/globals.css` | Tailwind base |
| `app/api/transform/route.ts` | POST handler — streams Claude NDJSON response |
| `components/TabBar.tsx` | Bottom tab navigation |
| `components/Capture.tsx` | Voice + textarea input, stream parser, task materialisation |
| `components/Inbox.tsx` | Task list with delete + time edit |
| `components/Today.tsx` | Vertical timeline, task blocks, calendar URL |
| `lib/types.ts` | Task type definition |
| `lib/storage.ts` | localStorage helpers (getTasks, setTasks) |
| `lib/calendar.ts` | Google Calendar URL builder |

---

## Task 1: Scaffold project (~15 min)

**Files:**
- Create: entire project via CLI

- [ ] **Step 1: Create Next.js app**

```bash
npx create-next-app@latest ai-planner \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*"
cd ai-planner
```

- [ ] **Step 2: Install dependencies**

```bash
npm install ai @anthropic-ai/sdk
```

- [ ] **Step 3: Create `.env.local`**

```bash
echo "ANTHROPIC_API_KEY=your_key_here" > .env.local
```

Replace `your_key_here` with your actual Anthropic API key.

- [ ] **Step 4: Update `app/layout.tsx` for mobile viewport**

Replace the entire file content with:

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AI Day Planner',
  description: 'Transform your chaos into a plan',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="uk">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className={`${inter.className} bg-gray-950 text-white min-h-screen`}>
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 5: Smoke test**

```bash
npm run dev
```

Open http://localhost:3000 — should show default Next.js page. Then stop the server.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with Tailwind + AI SDK"
```

---

## Task 2: Types + localStorage helpers (~10 min)

**Files:**
- Create: `lib/types.ts`
- Create: `lib/storage.ts`

- [ ] **Step 1: Create `lib/types.ts`**

```ts
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
```

- [ ] **Step 2: Create `lib/storage.ts`**

```ts
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
```

- [ ] **Step 3: Commit**

```bash
git add lib/
git commit -m "feat: add Task types and localStorage helpers"
```

---

## Task 3: Claude API route with NDJSON streaming (~20 min)

**Files:**
- Create: `app/api/transform/route.ts`

- [ ] **Step 1: Create `app/api/transform/route.ts`**

```ts
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const SYSTEM_PROMPT = `You are a day planning assistant. The user will give you a messy brain dump — everything on their mind.
Extract every actionable item and output it as NDJSON: one JSON object per line, no markdown, no extra text, no code fences.

Each object must have exactly these fields:
- id: sequential string starting from "1"
- title: short action title in Ukrainian (keep it concise)
- priority: "high" | "medium" | "low"
- estimatedMinutes: integer (realistic estimate: meetings 60, calls 15, errands 45, tasks 30)
- suggestedTime: "HH:MM" 24h format. Schedule intelligently across the day from current time onward. Leave gaps between tasks.
- type: "meeting" | "task" | "errand"
- notes: optional short context string, or empty string

Output ONLY the NDJSON lines. Nothing else. No intro, no summary.`

export async function POST(request: Request) {
  const { text } = await request.json()

  if (!text || typeof text !== 'string') {
    return new Response('Missing text', { status: 400 })
  }

  const stream = await client.messages.stream({
    model: 'claude-opus-4-5',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: text }],
  })

  const encoder = new TextEncoder()

  const readableStream = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta'
        ) {
          controller.enqueue(encoder.encode(chunk.delta.text))
        }
      }
      controller.close()
    },
  })

  return new Response(readableStream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  })
}
```

- [ ] **Step 2: Smoke test the route**

Start the server: `npm run dev`

In a new terminal:
```bash
curl -X POST http://localhost:3000/api/transform \
  -H "Content-Type: application/json" \
  -d '{"text": "зустріч з Максом о 3, купити продукти, зробити презентацію"}' \
  --no-buffer
```

Expected: stream of NDJSON lines appearing one by one, e.g.:
```
{"id":"1","title":"Зустріч з Максом","suggestedTime":"15:00","estimatedMinutes":60,"priority":"high","type":"meeting","notes":""}
{"id":"2","title":"Купити продукти","suggestedTime":"17:00","estimatedMinutes":45,"priority":"medium","type":"errand","notes":""}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/
git commit -m "feat: add Claude streaming API route with NDJSON output"
```

---

## Task 4: Capture component (~25 min)

**Files:**
- Create: `components/Capture.tsx`

- [ ] **Step 1: Create `components/Capture.tsx`**

```tsx
'use client'

import { useState, useRef, useCallback } from 'react'
import { Task } from '@/lib/types'

interface Props {
  onTasksReady: (tasks: Task[]) => void
}

export default function Capture({ onTasksReady }: Props) {
  const [text, setText] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [streamedTasks, setStreamedTasks] = useState<Task[]>([])
  const accumulatedTasksRef = useRef<Task[]>([])  // avoid stale closure
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const bufferRef = useRef('')

  const startListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      alert('Ваш браузер не підтримує голосовий ввід. Використовуйте текстове поле.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'uk-UA'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = ''
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      setText(transcript)
    }

    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }, [])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }, [])

  const parseNDJSON = (raw: string): Task[] => {
    const lines = raw.split('\n').filter(l => l.trim().startsWith('{'))
    const tasks: Task[] = []
    for (const line of lines) {
      try {
        tasks.push(JSON.parse(line))
      } catch {}
    }
    return tasks
  }

  const handleTransform = async () => {
    if (!text.trim()) return
    setIsLoading(true)
    setStreamedTasks([])
    accumulatedTasksRef.current = []
    bufferRef.current = ''

    try {
      const res = await fetch('/api/transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        bufferRef.current += decoder.decode(value, { stream: true })

        // Parse complete lines from buffer
        const lines = bufferRef.current.split('\n')
        bufferRef.current = lines.pop() ?? '' // keep incomplete last line

        for (const line of lines) {
          if (!line.trim().startsWith('{')) continue
          try {
            const task = JSON.parse(line) as Task
            accumulatedTasksRef.current = [...accumulatedTasksRef.current, task]
            setStreamedTasks(prev => [...prev, task])
          } catch {}
        }
      }

      // Parse any remaining content
      const finalTasks = parseNDJSON(
        bufferRef.current.split('\n').filter(l => l.trim()).join('\n')
      )
      if (finalTasks.length) {
        setStreamedTasks(prev => [...prev, ...finalTasks])
      }

      // Small delay so user sees the last task, then hand off
      setTimeout(() => {
        onTasksReady(accumulatedTasksRef.current)
      }, 800)
    } finally {
      setIsLoading(false)
    }
  }

  const priorityColor = { high: 'bg-red-500', medium: 'bg-yellow-500', low: 'bg-green-500' }
  const typeIcon = { meeting: '📅', task: '✅', errand: '🛒' }

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <div className="text-center pt-4">
        <h1 className="text-2xl font-bold">Що в голові?</h1>
        <p className="text-gray-400 text-sm mt-1">Виваліть все — AI розбереться</p>
      </div>

      {/* Mic button */}
      <div className="flex justify-center">
        <button
          onClick={isListening ? stopListening : startListening}
          className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl transition-all ${
            isListening
              ? 'bg-red-500 animate-pulse scale-110'
              : 'bg-indigo-600 hover:bg-indigo-500'
          }`}
        >
          {isListening ? '⏹' : '🎤'}
        </button>
      </div>
      {isListening && (
        <p className="text-center text-red-400 text-sm animate-pulse">Слухаю...</p>
      )}

      {/* Textarea */}
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="або пишіть тут... зустріч з Максом о 3, купити продукти, здати звіт до п'ятниці..."
        className="flex-1 bg-gray-900 rounded-2xl p-4 text-white placeholder-gray-600 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[140px]"
      />

      {/* Transform button */}
      <button
        onClick={handleTransform}
        disabled={isLoading || !text.trim()}
        className="w-full py-4 rounded-2xl bg-white text-black font-bold text-lg disabled:opacity-40 transition-all hover:bg-gray-100 active:scale-95"
      >
        {isLoading ? '✨ Аналізую...' : '✨ Перетворити в план'}
      </button>

      {/* Streaming tasks preview */}
      {streamedTasks.length > 0 && (
        <div className="flex flex-col gap-2 mt-2">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Знайдені задачі</p>
          {streamedTasks.map(task => (
            <div
              key={task.id}
              className="flex items-center gap-3 bg-gray-900 rounded-xl px-3 py-2 animate-fade-in"
            >
              <span className="text-lg">{typeIcon[task.type]}</span>
              <span className="flex-1 text-sm">{task.title}</span>
              <span className="text-xs text-gray-400">{task.suggestedTime}</span>
              <span className={`w-2 h-2 rounded-full ${priorityColor[task.priority]}`} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add fade-in animation to `app/globals.css`**

Add at the end of the file:

```css
@keyframes fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
  animation: fade-in 0.3s ease-out both;
}
```

- [ ] **Step 3: Commit**

```bash
git add components/Capture.tsx app/globals.css
git commit -m "feat: add Capture component with voice input and streaming task preview"
```

---

## Task 5: Inbox component (~15 min)

**Files:**
- Create: `components/Inbox.tsx`

- [ ] **Step 1: Create `components/Inbox.tsx`**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add components/Inbox.tsx
git commit -m "feat: add Inbox component with task review and time editing"
```

---

## Task 6: Google Calendar URL helper + Today timeline (~20 min)

**Files:**
- Create: `lib/calendar.ts`
- Create: `components/Today.tsx`

- [ ] **Step 1: Create `lib/calendar.ts`**

```ts
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
```

- [ ] **Step 2: Create `components/Today.tsx`**

```tsx
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
```

- [ ] **Step 3: Commit**

```bash
git add lib/calendar.ts components/Today.tsx
git commit -m "feat: add Today timeline with task blocks and Google Calendar link"
```

---

## Task 7: TabBar + wire everything in page.tsx (~10 min)

**Files:**
- Create: `components/TabBar.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Create `components/TabBar.tsx`**

```tsx
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
```

- [ ] **Step 2: Replace `app/page.tsx` entirely**

```tsx
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
```

- [ ] **Step 3: Full smoke test**

```bash
npm run dev
```

Open http://localhost:3000. Verify:
- [ ] Mic button visible on Capture screen
- [ ] Type something in textarea, click "Перетворити"
- [ ] Tasks stream in one by one
- [ ] Auto-switches to Inbox
- [ ] Can delete tasks and edit times
- [ ] "Побудувати план" goes to Today
- [ ] Timeline shows colored blocks
- [ ] Tap a block → bottom sheet opens with Google Calendar link

- [ ] **Step 4: Fix any bugs found in smoke test**

- [ ] **Step 5: Commit**

```bash
git add components/TabBar.tsx app/page.tsx
git commit -m "feat: wire up full app — TabBar + 3-view navigation"
```

---

## Task 8: Deploy to Vercel (~5 min)

**Files:** none (config only)

- [ ] **Step 1: Push to GitHub**

```bash
# If no remote yet:
gh repo create ai-planner --public --source=. --push
# Or if remote already configured:
git push origin main
```

- [ ] **Step 2: Deploy to Vercel**

```bash
npx vercel --prod
```

When prompted:
- Link to existing project? → No
- Project name → `ai-planner` (or any)
- Framework → Next.js (auto-detected)

- [ ] **Step 3: Set env var in Vercel**

```bash
npx vercel env add ANTHROPIC_API_KEY production
```

Paste your API key when prompted.

- [ ] **Step 4: Redeploy with env var**

```bash
npx vercel --prod
```

- [ ] **Step 5: Final smoke test on production URL**

Open the Vercel URL on your phone. Test full flow: voice capture → transform → inbox → today → calendar link.

- [ ] **Step 6: Commit deployment info**

```bash
echo "VERCEL_URL=https://your-app.vercel.app" >> .env.example
git add .env.example
git commit -m "chore: add vercel deployment notes"
```

---

## Post-MVP Ideas (for bootcamp Q&A)

- Google Calendar OAuth — real event creation, not just URL
- AI clarification chat after capture (ask follow-ups)
- Mood-aware planning ("я втомлений" → lighter schedule)
- Weekly retrospective with AI analysis
- Team plan sharing (read-only link)
- Recurring tasks with pattern learning
