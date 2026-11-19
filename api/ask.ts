// Ask Danish. Answers only from the notes built out of content/ at deploy time.
//
// POST /api/ask  { question: string }  -> { answer: string, model: string }
//
// GEMINI_API_KEY is read from the environment. Without it the route says so
// instead of inventing an answer. Questions are capped, and each IP gets a
// handful per ten minutes on this server instance.
//
// The free tier is often busy ("503 high demand") or slow, so the models in MODELS
// are raced with a head start: the first one starts at once, the next joins after a
// short wait or as soon as one fails, and the first good answer wins. The rest are
// cancelled. Every refusal is logged for the Vercel logs.

import { ASK_CONTEXT } from './_generated/context.js'
import { st } from '../src/generated/server-text.js'
import { makeLimiter } from './_lib/askLimit.js'

declare const process: { env: Record<string, string | undefined> }

// Fastest first. GEMINI_MODEL (comma-separated) replaces the list.
const MODELS = (process.env.GEMINI_MODEL || 'gemini-flash-lite-latest,gemini-flash-latest,gemini-3.6-flash')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean)
const MAX_IN = 500
// Newer Flash models may think before answering, which counts against this limit,
// so leave room; the instructions ask for short answers.
const MAX_TOKENS = 1024
const HEAD_START = 2500 // ms before the next model joins the race
const DEADLINE = 20000 // ms for the whole answer
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

type Result = { ok: true; answer: string; model: string } | { ok: false; quota: boolean }

interface GeminiReply {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[]
  modelVersion?: string
}

async function askModel(model: string, key: string, question: string, signal: AbortSignal): Promise<Result> {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: 'user', parts: [{ text: question }] }],
        generationConfig: {
          maxOutputTokens: MAX_TOKENS,
          temperature: 0.2,
          // 'minimal' would be faster, but gemini-flash-latest rejects it with a 400.
          thinkingConfig: { thinkingLevel: 'low' },
        },
      }),
    })
    if (!res.ok) {
      console.error(`ask: ${model} answered ${res.status}`, (await res.text()).slice(0, 500))
      return { ok: false, quota: res.status === 429 }
    }
    const data = (await res.json()) as GeminiReply
    const answer = data.candidates?.[0]?.content?.parts
      ?.filter((p) => !p.thought)
      .map((p) => p.text ?? '')
      .join('')
      .trim()
    if (!answer) {
      console.error(`ask: ${model} answered with no text`)
      return { ok: false, quota: false }
    }
    return { ok: true, answer, model: data.modelVersion || model }
  } catch (err) {
    if (!signal.aborted || (signal.reason as Error | undefined)?.name === 'TimeoutError') {
      console.error(`ask: ${model} request failed`, err)
    }
    return { ok: false, quota: false }
  }
}

/** Race the models with a head start each; resolve with the first good answer. */
function race(key: string, question: string): Promise<Result> {
  const stop = new AbortController()
  const signal = AbortSignal.any([stop.signal, AbortSignal.timeout(DEADLINE)])
  return new Promise((resolve) => {
    let started = 0
    let finished = 0
    let quota = false
    let done = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const finish = (r: Result) => {
      if (done) return
      done = true
      clearTimeout(timer)
      stop.abort()
      resolve(r)
    }
    const next = () => {
      clearTimeout(timer)
      if (done || started >= MODELS.length) return
      const model = MODELS[started++]
      void askModel(model, key, question, signal).then((r) => {
        finished++
        if (r.ok) return finish(r)
        quota ||= r.quota
        if (started < MODELS.length) next()
        else if (finished === started) finish({ ok: false, quota })
      })
      if (started < MODELS.length) timer = setTimeout(next, HEAD_START)
    }
    next()
  })
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

  const r = await race(key, question)
  if (r.ok) return json({ answer: r.answer, model: r.model })
  return r.quota ? json({ error: st('server.ask.out-of-quota') }, 429) : json({ error: st('server.ask.failed') }, 502)
}
