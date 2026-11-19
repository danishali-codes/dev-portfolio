// Ask Danish. Answers only from the notes built out of content/ at deploy time.
//
// POST /api/ask  { question: string }  -> { answer: string }
//
// GEMINI_API_KEY is read from the environment. Without it the route says so
// instead of inventing an answer. Questions are capped, and each IP gets a
// handful per ten minutes on this server instance.

import { ASK_CONTEXT } from './_generated/context.js'
import { st } from '../src/generated/server-text.js'
import { makeLimiter } from './_lib/askLimit.js'

declare const process: { env: Record<string, string | undefined> }

const MODEL = 'gemini-2.5-flash'
const MAX_IN = 500
const MAX_TOKENS = 180
const allow = makeLimiter(8, 10 * 60 * 1000)

// The instructions live in content/text/server.yaml so the tone can be edited there.
const SYSTEM = st('server.ask.instructions', { notes: ASK_CONTEXT })

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

async function caller(request: Request) {
  const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown'
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip))
  return [...new Uint8Array(digest)].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function POST(request: Request) {
  const key = process.env.GEMINI_API_KEY
  if (!key) return json({ error: st('server.ask.not-set-up') }, 503)
  if (!allow(await caller(request))) return json({ error: st('server.ask.too-many') }, 429)

  let body: { question?: unknown }
  try {
    body = (await request.json()) as { question?: unknown }
  } catch {
    return json({ error: st('server.ask.no-question') }, 400)
  }
  const question = typeof body.question === 'string' ? body.question.trim().slice(0, MAX_IN) : ''
  if (!question) return json({ error: st('server.ask.no-question') }, 400)

  let res: Response
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: 'user', parts: [{ text: question }] }],
        generationConfig: { maxOutputTokens: MAX_TOKENS, temperature: 0.2 },
      }),
    })
  } catch {
    return json({ error: st('server.ask.failed') }, 502)
  }
  if (res.status === 429) return json({ error: st('server.ask.out-of-quota') }, 429)
  if (!res.ok) return json({ error: st('server.ask.failed') }, 502)
  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
  const answer = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim()
  return json({ answer: answer || st('server.ask.dont-know') })
}
