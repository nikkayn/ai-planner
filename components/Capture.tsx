// @ts-nocheck
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
  const accumulatedTasksRef = useRef<Task[]>([])  // avoid stale closure in setTimeout
  const recognitionRef = useRef<any>
  const bufferRef = useRef('')

  const startListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      alert('Р’Р°С€ Р±СЂР°СѓР·РµСЂ РЅРµ РїС–РґС‚СЂРёРјСѓС” РіРѕР»РѕСЃРѕРІРёР№ РІРІС–Рґ. Р’РёРєРѕСЂРёСЃС‚РѕРІСѓР№С‚Рµ С‚РµРєСЃС‚РѕРІРµ РїРѕР»Рµ.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'uk-UA'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event: any) => {
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

      // Small delay so user sees the last task, then hand off
      setTimeout(() => {
        onTasksReady(accumulatedTasksRef.current)
      }, 800)
    } finally {
      setIsLoading(false)
    }
  }

  const priorityColor = { high: 'bg-red-500', medium: 'bg-yellow-500', low: 'bg-green-500' }
  const typeIcon = { meeting: 'рџ“…', task: 'вњ…', errand: 'рџ›’' }

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <div className="text-center pt-4">
        <h1 className="text-2xl font-bold">Р©Рѕ РІ РіРѕР»РѕРІС–?</h1>
        <p className="text-gray-400 text-sm mt-1">Р’РёРІР°Р»С–С‚СЊ РІСЃРµ вЂ” AI СЂРѕР·Р±РµСЂРµС‚СЊСЃСЏ</p>
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
          {isListening ? 'вЏ№' : 'рџЋ¤'}
        </button>
      </div>
      {isListening && (
        <p className="text-center text-red-400 text-sm animate-pulse">РЎР»СѓС…Р°СЋ...</p>
      )}

      {/* Textarea */}
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Р°Р±Рѕ РїРёС€С–С‚СЊ С‚СѓС‚... Р·СѓСЃС‚СЂС–С‡ Р· РњР°РєСЃРѕРј Рѕ 3, РєСѓРїРёС‚Рё РїСЂРѕРґСѓРєС‚Рё, Р·РґР°С‚Рё Р·РІС–С‚ РґРѕ Рї'СЏС‚РЅРёС†С–..."
        className="flex-1 bg-gray-900 rounded-2xl p-4 text-white placeholder-gray-600 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[140px]"
      />

      {/* Transform button */}
      <button
        onClick={handleTransform}
        disabled={isLoading || !text.trim()}
        className="w-full py-4 rounded-2xl bg-white text-black font-bold text-lg disabled:opacity-40 transition-all hover:bg-gray-100 active:scale-95"
      >
        {isLoading ? 'вњЁ РђРЅР°Р»С–Р·СѓСЋ...' : 'вњЁ РџРµСЂРµС‚РІРѕСЂРёС‚Рё РІ РїР»Р°РЅ'}
      </button>

      {/* Streaming tasks preview */}
      {streamedTasks.length > 0 && (
        <div className="flex flex-col gap-2 mt-2">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Р—РЅР°Р№РґРµРЅС– Р·Р°РґР°С‡С–</p>
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



