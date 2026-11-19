// @vitest-environment node
// The checks that keep the boards honest: signed tokens, names, the snake replay and run times.
// With no LEADERBOARD_KEY these run against the in-memory store and a local signing secret.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST, GET } from '../leaderboard'
import { sign, verify } from './token'
import { nameProblem, tidyName } from '../../src/leaderboard/names'
import { ACHIEVEMENT_IDS } from '../../src/achievements/list'
import { canTurn, DIR_CODES, dirCode, newGame, replay, tick, tickMs, type Move } from '../../src/leaderboard/snakeEngine'

let ip = 0
const call = async (action: string, body: unknown) => {
  const res = await POST(new Request(`http://local/api/leaderboard?action=${action}`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'x-real-ip': `10.0.0.${ip}` },
  }))
  return { status: res.status, body: (await res.json()) as Record<string, unknown> }
}

/** Plays a short real game: steers greedily to the food until it has eaten `target`, then runs into a wall. */
function playGame(cols: number, rows: number, seed: number, target = 2) {
  const g = newGame(cols, rows, seed)
  const moves: Move[] = []
  let ticks = 0
  while (!g.over && ticks < 5000) {
    if (g.score < target) {
      const head = g.snake[0]
      const want = g.food.x !== head.x ? { x: Math.sign(g.food.x - head.x), y: 0 } : { x: 0, y: Math.sign(g.food.y - head.y) }
      const same = want.x === g.dir.x && want.y === g.dir.y
      // Can't reverse: step sideways first.
      const d = same || canTurn(g.dir, want) ? want : { x: g.dir.y, y: g.dir.x }
      if (!same && canTurn(g.dir, d)) {
        moves.push([ticks, dirCode(d)])
        g.dir = d
      }
    }
    tick(g)
    ticks++
  }
  return { moves, ticks, score: g.score, over: g.over }
}

beforeEach(() => { ip++ })
afterEach(() => vi.useRealTimers())

describe('signed tokens', () => {
  it('round trips and rejects tampering', () => {
    const token = sign({ k: 'snake', seed: 7 })
    expect(verify<{ seed: number }>(token)?.seed).toBe(7)
    const [body, sig] = token.split('.')
    const forged = Buffer.from(JSON.stringify({ k: 'snake', seed: 8 })).toString('base64url') + '.' + sig
    expect(verify(forged)).toBeNull()
    expect(verify(body)).toBeNull()
    expect(verify(42)).toBeNull()
    expect(verify('x'.repeat(3000))).toBeNull()
  })
})

describe('leaderboard names', () => {
  it('tidies spacing and rejects reserved, rude and malformed names', () => {
    expect(tidyName('  Ada   L  ')).toBe('Ada L')
    expect(nameProblem('Ada L')).toBeNull()
    expect(nameProblem('a')).toMatch(/at least/)
    expect(nameProblem('x'.repeat(17))).toMatch(/at most/)
    expect(nameProblem('<script>')).toMatch(/only/)
    expect(nameProblem('___')).toMatch(/letter or number/)
    expect(nameProblem('Dan ish')).toMatch(/taken/)
    expect(nameProblem('f.u.c.k')).toMatch(/friendly/)
  })
})

describe('snake replay', () => {
  it('accepts a real game and rejects cut, padded or altered logs', () => {
    const game = playGame(20, 12, 1234)
    expect(game.over).toBe(true)
    expect(game.score).toBeGreaterThanOrEqual(1)
    const ok = replay(20, 12, 1234, game.moves, game.ticks)
    expect(ok).toMatchObject({ ok: true, score: game.score })
    expect(ok.minMs).toBeGreaterThanOrEqual(game.ticks * tickMs(game.score))
    expect(replay(20, 12, 1234, game.moves, game.ticks - 1).reason).toBe('game not over')
    expect(replay(20, 12, 1234, game.moves, game.ticks + 1).reason).toBe('game ended early')
    // The same moves on another seed miss the food, so the score can't carry over.
    const other = replay(20, 12, 999, game.moves, game.ticks)
    expect(!other.ok || other.score < game.score).toBe(true)
    const reversed: Move[] = [[0, DIR_CODES.findIndex((d) => d.x === -1)]]
    expect(replay(20, 12, 1234, reversed, game.ticks).reason).toBe('bad move')
  })

  it('puts a replayed score on the board once, and only at a believable speed', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-19T10:00:00Z'))
    const start = await call('snake-start', {})
    const { token, seed } = start.body as { token: string; seed: number }
    const game = playGame(20, 12, seed)
    const entry = { token, name: 'Tester', cols: 20, rows: 12, ticks: game.ticks, moves: game.moves, score: game.score }

    expect((await call('snake', entry)).body.error).toMatch(/faster than the snake/)
    vi.setSystemTime(Date.now() + game.ticks * 200)
    expect((await call('snake', { ...entry, score: game.score + 5 })).body.error).toMatch(/add up/)
    const saved = await call('snake', entry)
    expect(saved.status).toBe(200)
    expect(saved.body).toMatchObject({ score: game.score, rank: expect.any(Number) })
    expect((await call('snake', entry)).body.error).toMatch(/already submitted/)

    const board = await GET(new Request('http://local/api/leaderboard?board=snake'))
    const entries = ((await board.json()) as { entries: { name: string; value: number }[] }).entries
    expect(entries.some((e) => e.name === 'Tester' && e.value === game.score)).toBe(true)
  })
})

describe('achievement runs', () => {
  it('needs every achievement, a server-side start and more than a minute', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-19T10:00:00Z'))
    const { token } = (await call('ach-start', { runId: 'run-test-1' })).body as { token: string }
    const t0 = Date.now()
    const found = Object.fromEntries(ACHIEVEMENT_IDS.map((id, i) => [id, t0 + i * 1000]))
    const { [ACHIEVEMENT_IDS[0]]: _missing, ...partial } = found
    void _missing

    expect((await call('ach-finish', { token, found: partial })).body.error).toMatch(/not everything/)
    vi.setSystemTime(t0 + 30_000)
    expect((await call('ach-finish', { token, found })).body.error).toMatch(/too fast/)
    vi.setSystemTime(t0 + 5 * 60_000)
    const done = await call('ach-finish', { token, found, activeMs: 10 })
    // Never ranked on less than the span between the first and last find, or a minute.
    expect(done.body.ms).toBe(60_000)
    expect((await call('ach-finish', { token, found })).body.error).toMatch(/already finished/)

    const saved = await call('ach', { finish: done.body.finish, name: 'Speedy' })
    expect(saved.body).toMatchObject({ ms: 60_000, rank: expect.any(Number) })
    expect((await call('ach', { finish: done.body.finish, name: 'Speedy' })).body.error).toMatch(/already on the board/)
    expect((await call('ach', { finish: 'nope', name: 'Speedy' })).body.error).toBe('bad token')
  })
})
