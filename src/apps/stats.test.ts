import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules() })

describe('independent GitHub stats', () => {
  it('returns the static snapshot immediately and merges separately fetched GitHub data', async () => {
    let release: (value: Response) => void = () => {}
    const upstream = new Promise<Response>((resolve) => { release = resolve })
    vi.stubGlobal('fetch', vi.fn((url) => url === '/stats.json' ? Promise.resolve(Response.json({ builtAt: '2026-11-01', github: { profile: null }, itch: [], site: { files: 2, commits: 1 } })) : upstream))
    const { loadStats } = await import('./stats')
    const fresh = loadStats(true)
    expect((await loadStats())?.builtAt).toBe('2026-11-01')
    release(Response.json({ github: { profile: { login: 'fresh' }, fetchedAt: { profile: '2026-11-17' } } }))
    const result = await fresh
    expect(result?.github.profile?.login).toBe('fresh')
    expect(result?.site.files).toBe(2)
    expect(result?.github.fetchedAt?.profile).toBe('2026-11-17')
  })
  it('keeps the last snapshot if the refresh endpoint fails', async () => {
    vi.stubGlobal('fetch', vi.fn((url) => Promise.resolve(url === '/stats.json' ? Response.json({ builtAt: '2026-11-01', github: {}, site: { files: 2 }, itch: null }) : new Response(null, { status: 503 }))))
    const { loadStats } = await import('./stats')
    expect((await loadStats(true))?.builtAt).toBe('2026-11-01')
  })
})
