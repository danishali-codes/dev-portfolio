// Collects the numbers for the Stats window and the `stats` command and writes
// them to public/stats.json, which the site loads only when someone asks.
//
// Everything is fetched once per deploy, so visitors never hit GitHub or itch.io
// and no rate limit can be reached from the browser. If a source can't be
// reached during a build, the numbers from the live site's current stats.json
// are kept instead, so a flaky build never blanks the window.
//
// Optional environment variables (set them in Vercel):
//   GITHUB_TOKEN   any token with no scopes; gives exact contribution counts
//                  and a much higher rate limit than anonymous requests
//   ITCH_API_KEY   an itch.io API key (itch.io > Settings > API keys) for views
//                  and downloads of the games on danish-gamedev.itch.io
import { mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { collectGithub, siteCommits } from './lib/github-stats.mjs'
export { parseContributionsHtml, summarise } from './lib/github-stats.mjs'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const OUT = join(ROOT, 'public/stats.json')
const LIVE = 'https://danishali.dev/stats.json'

/* ---------- itch.io ---------- */

async function itch() {
  const key = process.env.ITCH_API_KEY
  if (!key) throw new Error('ITCH_API_KEY is not set')
  const res = await fetch(`https://itch.io/api/1/${key}/my-games`, { signal: AbortSignal.timeout(10_000) })
  if (!res.ok) throw new Error(`itch.io ${res.status}`)
  const { games, errors } = await res.json()
  if (errors?.length) throw new Error(`itch.io: ${errors.join(', ')}`)
  return games
    .filter((g) => g.published)
    .map((g) => ({ title: g.title, url: g.url, views: g.views_count ?? 0, downloads: g.downloads_count ?? 0 }))
    .sort((a, b) => b.views - a.views)
}

/* ---------- this site ---------- */

function countFiles(dir) {
  let n = 0
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue
    const full = join(dir, name)
    n += statSync(full).isDirectory() ? countFiles(full) : 1
  }
  return n
}

/* ---------- put it together ---------- */

async function previous() {
  try {
    const res = await fetch(LIVE, { signal: AbortSignal.timeout(8_000) })
    return res.ok ? await res.json() : {}
  } catch {
    return {}
  }
}

/** Runs one source; on failure keeps what the live site had, or null. */
async function section(name, fn, old) {
  try {
    return await fn()
  } catch (err) {
    console.warn(`stats: ${name} unavailable (${err.message})${old?.[name] ? ', keeping the last deployed numbers' : ''}`)
    return old?.[name] ?? null
  }
}

export async function main() {
  const old = await previous()
  const github = await collectGithub(old.github ?? {})
  const stats = {
    builtAt: new Date().toISOString(),
    github,
    itch: await section('itch', itch, old),
    site: {
      commits: await section('commits', siteCommits, old.site),
      files: countFiles(join(ROOT, 'content')),
    },
  }
  mkdirSync(join(OUT, '..'), { recursive: true })
  writeFileSync(OUT, JSON.stringify(stats))
  const got = [
    github.contributions && `${github.contributions.total} contributions`,
    github.languages && `${github.languages.length} languages`,
    github.commits && `${github.commits.length} recent commits`,
    stats.itch && `${stats.itch.length} itch.io games`,
  ].filter(Boolean)
  console.log(`stats: ${got.length ? got.join(', ') : 'no live numbers this build'} -> public/stats.json`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main()
