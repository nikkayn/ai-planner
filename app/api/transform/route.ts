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
