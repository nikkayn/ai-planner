# AI Day Planner — Design Spec
**Date:** 2026-06-06  
**Context:** Bootcamp MVP, 2-hour build, deploy to Vercel

---

## Goal

A mobile-first AI day planner where the user voice-dumps everything in their head, and Claude transforms the chaos into a structured, time-blocked plan — live, with streaming. Judges see the "magic" in real time.

**Success criteria for bootcamp:** Wow moment is visible in 30 seconds of demo. No moving parts that can break on stage.

---

## User Flow

```
Capture (voice/text) → [Claude streaming] → Inbox (review) → Today (timeline)
```

1. User opens app → sees Capture screen
2. Taps mic OR types in textarea → speaks/writes everything on their mind
3. Taps "Перетворити" → tasks materialize on screen one by one (streaming)
4. Switches to Inbox → reviews/deletes tasks, adjusts times
5. Taps "Побудувати план" → sees Today timeline with time blocks
6. Taps a meeting block → opens Google Calendar with pre-filled event

---

## Architecture

Single-page Next.js app with 3 client-side views (no routing). State in React + localStorage.

```
app/
  page.tsx              ← root, manages activeView state
  api/
    transform/
      route.ts          ← proxies to Claude API, keeps key server-side
components/
  Capture.tsx           ← voice input + textarea + transform button
  Inbox.tsx             ← task list with edit/delete
  Today.tsx             ← vertical timeline, task blocks, calendar link
  TabBar.tsx            ← bottom nav: Capture | Inbox | Today
lib/
  types.ts              ← Task type
  storage.ts            ← localStorage helpers
```

### Data Model

```ts
type Task = {
  id: string
  title: string
  priority: 'high' | 'medium' | 'low'
  estimatedMinutes: number
  suggestedTime: string        // "HH:MM" 24h
  type: 'meeting' | 'task' | 'errand'
  notes?: string
}

type AppState = {
  tasks: Task[]
  rawInput: string
  activeView: 'capture' | 'inbox' | 'today'
}
```

---

## Claude Integration

### API Route: `POST /api/transform`

Request: `{ text: string }`  
Response: streaming NDJSON — one Task JSON per line.

### Streaming Format

Claude streams one task per line, no markdown, no wrapper:

```
{"id":"1","title":"Зустріч з Максом","suggestedTime":"15:00","estimatedMinutes":60,"priority":"high","type":"meeting"}
{"id":"2","title":"Купити продукти","suggestedTime":"18:00","estimatedMinutes":45,"priority":"medium","type":"errand"}
```

Client reads stream, parses each newline-terminated JSON, appends task to list immediately → tasks appear one by one on screen.

### System Prompt

```
You are a day planning assistant. The user will give you a messy brain dump — everything on their mind. 
Extract every actionable item and output it as NDJSON: one JSON object per line, no markdown, no extra text.

Each object must have exactly these fields:
- id: sequential string ("1", "2", ...)
- title: short action title in Ukrainian
- priority: "high" | "medium" | "low"
- estimatedMinutes: integer (realistic estimate)
- suggestedTime: "HH:MM" 24h format, schedule intelligently across the day starting from current time
- type: "meeting" | "task" | "errand"
- notes: optional short context string

Output ONLY the NDJSON lines. Nothing else.
```

### Client-side Streaming

Use Vercel AI SDK `useCompletion` hook — handles streaming, loading state, error state out of the box. Parse each chunk for complete JSON lines.

---

## Screens

### Capture

- Dark background, full-screen
- Large mic button (primary CTA) — uses `window.SpeechRecognition` / `webkitSpeechRecognition`
- Textarea below (fallback / edit what was captured)
- "Перетворити ✨" button → triggers stream
- While streaming: task cards animate in below the textarea
- On complete: auto-switch to Inbox view

### Inbox

- List of Task cards
- Each card shows: title, type icon, suggestedTime, estimatedMinutes, priority badge
- Swipe-to-delete (or delete button)
- Inline time edit (tap time → time picker)
- "Побудувати план →" button at bottom → switches to Today view

### Today

- Vertical timeline: 08:00–22:00
- Each task = colored block, height proportional to estimatedMinutes
- Color by type: purple (meeting), blue (task), green (errand)
- Tap block → bottom sheet with details + "📅 Додати в Google Calendar" button
- Google Calendar URL format:
  ```
  https://calendar.google.com/calendar/r/eventedit
    ?text={title}
    &dates={YYYYMMDD}T{HHMM}00/{YYYYMMDD}T{end_HHMM}00
    &details={notes}
  ```

---

## Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | Next.js 14 App Router | Best Vercel integration, API routes hide Claude key |
| Styling | Tailwind CSS | Fast, mobile-first |
| AI Streaming | Vercel AI SDK | Minimal boilerplate for streaming |
| Voice | Web Speech API | Browser-native, zero setup |
| State | React state + localStorage | No backend needed |
| Deploy | Vercel | One command, free tier |

---

## Out of Scope (MVP)

- Google Calendar OAuth (replaced by URL deep-link)
- User accounts / multi-device sync
- Push notifications
- AI clarification chat (deferred post-MVP)
- Recurring tasks

---

## 2-Hour Build Order

1. `npx create-next-app` + Tailwind + Vercel AI SDK install (~15 min)
2. `Task` type + localStorage helpers (~10 min)
3. `/api/transform` route + Claude prompt + streaming (~20 min)
4. `Capture` component: textarea + voice button + stream parser (~25 min)
5. `Inbox` component: task list + delete (~15 min)
6. `Today` component: timeline + calendar URL (~20 min)
7. `TabBar` + wire everything in `page.tsx` (~10 min)
8. Deploy to Vercel + smoke test (~5 min)

**Total: ~2h**

---

## Post-MVP Ideas (bootcamp feedback round)

- Google Calendar OAuth for real push
- AI clarification chat after capture
- Mood-aware planning ("я втомлений" → AI lightens the schedule)
- Recurring tasks with pattern recognition
- Team planning (share today's plan)
- Weekly retrospective with AI
