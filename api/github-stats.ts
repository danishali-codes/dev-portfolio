import { collectGithub } from '../scripts/lib/github-stats.mjs'
import type { Stats } from '../src/apps/stats'

let cached: { github: Stats['github']; expires: number } | undefined
let inflight: Promise<Stats['github']> | undefined

async function refresh() {
  let old = cached?.github
  if (!old) {
    try {
      const response = await fetch('https://danishali.dev/stats.json', { signal: AbortSignal.timeout(5000) })
      if (response.ok) old = ((await response.json()) as Stats).github
    } catch { /* Each source also works without a snapshot. */ }
  }
  return collectGithub(old)
}

/** CDN and warm instances share results; visitors never call GitHub themselves. */
export async function GET() {
  if (!cached || cached.expires <= Date.now()) {
    inflight ??= refresh().finally(() => { inflight = undefined })
    const github = await inflight
    if (!Object.values(github.fetchedAt ?? {}).some(Boolean)) {
      return Response.json({ error: 'GitHub is temporarily unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
    }
    // Retry partial failures sooner; never relabel retained sections as freshly fetched.
    const dates = Object.values(github.fetchedAt ?? {})
    const fresh = dates.length === 4 && dates.every((date) => Date.now() - new Date(date).getTime() < 60_000)
    cached = { github, expires: Date.now() + (fresh ? 3600_000 : 300_000) }
  }
  return Response.json({ github: cached.github }, { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } })
}
