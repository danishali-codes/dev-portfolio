const USER = 'danishali-codes'
const SITE_REPO = 'danishali-codes/dev-portfolio'

const GITHUB_HEADERS = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'dev-portfolio-build',
  ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
}

async function gh(path) {
  const res = await fetch(`https://api.github.com${path}`, { headers: GITHUB_HEADERS, signal: AbortSignal.timeout(10_000) })
  if (!res.ok) throw new Error(`GitHub ${path} ${res.status}`)
  return res
}

/* ---------- contributions ---------- */

/** Contribution days from the GraphQL API; needs a token. */
async function contributionsGraphql() {
  const query = `query { user(login: "${USER}") { contributionsCollection { contributionCalendar {
    weeks { contributionDays { date contributionCount } } } } } }`
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { ...GITHUB_HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`GitHub GraphQL ${res.status}`)
  const { data, errors } = await res.json()
  if (errors?.length) throw new Error(`GitHub GraphQL: ${errors[0].message}`)
  return data.user.contributionsCollection.contributionCalendar.weeks
    .flatMap((w) => w.contributionDays)
    .map((d) => ({ date: d.date, count: d.contributionCount }))
}

/**
 * Contribution days read from the public calendar on github.com, for builds
 * without a token. Each day is a <td data-date data-level id> cell, and its
 * count is in a <tool-tip for="<id>"> like "3 contributions on May 2nd.".
 */
export function parseContributionsHtml(html) {
  const tips = new Map()
  for (const m of html.matchAll(/<tool-tip\b[^>]*\bfor="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g)) {
    const n = m[2].match(/^\s*(\d[\d,]*|No) contributions?/i)
    if (n) tips.set(m[1], n[1].toLowerCase() === 'no' ? 0 : Number(n[1].replace(/,/g, '')))
  }
  const days = []
  for (const m of html.matchAll(/<td\b[^>]*\bdata-date="(\d{4}-\d{2}-\d{2})"[^>]*>/g)) {
    const tag = m[0]
    const id = tag.match(/\bid="([^"]+)"/)?.[1]
    const level = Number(tag.match(/\bdata-level="(\d)"/)?.[1] ?? 0)
    const count = id && tips.has(id) ? tips.get(id) : level
    days.push({ date: m[1], count })
  }
  return days.sort((a, b) => a.date.localeCompare(b.date))
}

async function contributionsHtml() {
  const res = await fetch(`https://github.com/users/${USER}/contributions`, {
    headers: { 'User-Agent': 'dev-portfolio-build' },
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`github.com contributions ${res.status}`)
  const days = parseContributionsHtml(await res.text())
  if (days.length < 300) throw new Error(`github.com contributions: only ${days.length} days found`)
  return days
}

/** Totals and streaks for a list of { date, count } days, oldest first. */
export function summarise(days, today = new Date().toISOString().slice(0, 10)) {
  const past = days.filter((d) => d.date <= today)
  let longest = 0
  let run = 0
  for (const d of past) {
    run = d.count > 0 ? run + 1 : 0
    longest = Math.max(longest, run)
  }
  // Today not having a commit yet doesn't break the streak.
  let current = 0
  for (let i = past.length - 1; i >= 0; i--) {
    if (past[i].count > 0) current++
    else if (i === past.length - 1 && past[i].date === today) continue
    else break
  }
  const busiest = past.reduce((best, d) => (d.count > (best?.count ?? 0) ? d : best), undefined)
  const weekday = Array(7).fill(0)
  for (const d of past) weekday[new Date(`${d.date}T00:00:00Z`).getUTCDay()] += d.count
  return {
    total: past.reduce((n, d) => n + d.count, 0),
    activeDays: past.filter((d) => d.count > 0).length,
    currentStreak: current,
    longestStreak: longest,
    busiestDay: busiest ? { date: busiest.date, count: busiest.count } : null,
    /** contributions per weekday, Sunday first */
    weekday,
  }
}

async function contributions() {
  let days
  let exact = true
  if (process.env.GITHUB_TOKEN) {
    try {
      days = await contributionsGraphql()
    } catch (err) {
      console.warn(`stats: ${err.message}, trying the public calendar`)
    }
  }
  if (!days) {
    days = await contributionsHtml()
    exact = days.some((d) => d.count > 4)
  }
  return { days: days.slice(-371), exact, ...summarise(days) }
}

/* ---------- repos, languages, recent commits ---------- */

async function repos() {
  const res = await gh(`/users/${USER}/repos?per_page=100&sort=pushed&type=owner`)
  const list = (await res.json()).filter((r) => !r.fork && !r.archived)
  return list
}

async function languages(list) {
  // Anonymous builds get 60 requests an hour, so only look at the busiest repos.
  const sample = list.slice(0, process.env.GITHUB_TOKEN ? 40 : 15)
  const bytes = {}
  await Promise.all(sample.map(async (r) => {
    try {
      const langs = await (await gh(`/repos/${r.full_name}/languages`)).json()
      for (const [lang, n] of Object.entries(langs)) {
        // Notebooks are mostly saved plots and outputs, which would drown out every real language.
        if (lang === 'Jupyter Notebook') continue
        bytes[lang] = (bytes[lang] ?? 0) + n
      }
    } catch (err) {
      console.warn(`stats: languages for ${r.full_name} skipped (${err.message})`)
    }
  }))
  const total = Object.values(bytes).reduce((a, b) => a + b, 0)
  if (!total) throw new Error('no language data')
  const sorted = Object.entries(bytes).sort((a, b) => b[1] - a[1])
  const top = sorted.slice(0, 6).map(([name, n]) => ({ name, share: n / total }))
  const rest = sorted.slice(6).reduce((n, [, b]) => n + b, 0)
  if (rest) top.push({ name: 'Other', share: rest / total })
  return top
}

async function recentCommits(list) {
  const commits = []
  let reached = 0
  await Promise.all(list.slice(0, 6).map(async (r) => {
    try {
      const items = await (await gh(`/repos/${r.full_name}/commits?per_page=5&author=${USER}`)).json()
      reached++
      for (const c of items) {
        const message = c.commit.message.split('\n')[0]
        // Merge commits say nothing a visitor cares about.
        if (/^Merge\b/.test(message)) continue
        commits.push({ repo: r.name, sha: c.sha.slice(0, 7), message: message.slice(0, 90), date: c.commit.author.date, url: c.html_url })
      }
    } catch (err) {
      console.warn(`stats: commits for ${r.full_name} skipped (${err.message})`)
    }
  }))
  // Every request failing should keep the last deployed commits, not show none.
  if (!reached) throw new Error('no repo commits could be read')
  return commits.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8)
}

async function profile(list) {
  const user = await (await gh(`/users/${USER}`)).json()
  return {
    login: user.login,
    publicRepos: user.public_repos,
    followers: user.followers,
    since: user.created_at,
    stars: list.reduce((n, r) => n + r.stargazers_count, 0),
  }
}

/** How many commits this site's own repo has, from the last page number of a 1-per-page listing. */
export async function siteCommits() {
  const res = await gh(`/repos/${SITE_REPO}/commits?per_page=1`)
  const last = res.headers.get('link')?.match(/[?&]page=(\d+)>; rel="last"/)
  if (last) return Number(last[1])
  return (await res.json()).length
}


/** Keep the true fetch date for any section retained after an upstream failure. */
export async function collectGithub(old = {}) {
  const fetchedAt = { ...(old.fetchedAt ?? {}) }
  let list
  try { list = await repos() } catch { list = null }
  const tasks = {
    profile: () => list ? profile(list) : Promise.reject(new Error('Repo list unavailable')),
    contributions,
    languages: () => list ? languages(list) : Promise.reject(new Error('Repo list unavailable')),
    commits: () => list ? recentCommits(list) : Promise.reject(new Error('Repo list unavailable')),
  }
  const entries = await Promise.all(Object.entries(tasks).map(async ([name, fn]) => {
    try {
      const value = await fn()
      fetchedAt[name] = new Date().toISOString()
      return [name, value]
    } catch (err) {
      console.warn('stats: ' + name + ' unavailable (' + err.message + ')')
      return [name, old[name] ?? null]
    }
  }))
  return { ...Object.fromEntries(entries), fetchedAt }
}
