import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { projects } from '../fs'
import { ago, duration, LANG_COLORS, level, loadStats, loadVisits, weeks, type Contributions, type Stats, type Visits } from './stats'

const WEEKDAYS = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays']

/** A label ........ value row, like a system monitor readout. */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="st-row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function Section({ title, note, children }: { title: string; note?: ReactNode; children: ReactNode }) {
  return (
    <section className="st-section">
      <h2>
        {title}
        {note && <span className="st-note">{note}</span>}
      </h2>
      {children}
    </section>
  )
}

function Heatmap({ c }: { c: Contributions }) {
  const cols = weeks(c.days)
  const max = Math.max(...c.days.map((d) => d.count))
  const fmt = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
  const lastWeek = cols.length - 1
  const lastDay = Math.max(0, (cols[lastWeek] ?? []).reduce((last, x, i) => (x ? i : last), 0))
  // Hover, a tap or the arrow keys pick a day; its count shows in the caption, so the map works without a mouse.
  const [sel, setSel] = useState<[number, number] | null>(null)
  const [w, d] = sel ?? [lastWeek, lastDay]
  const day = cols[w]?.[d]
  const describe = (x: NonNullable<typeof day>) => c.exact ? `${x.count} contribution${x.count === 1 ? '' : 's'} on ${fmt(x.date)}` : fmt(x.date)
  const move = (dw: number, dd: number) => {
    let nw = w + dw
    let nd = d + dd
    if (nd < 0) { nd = 6; nw -= 1 }
    if (nd > 6) { nd = 0; nw += 1 }
    nw = Math.max(0, Math.min(lastWeek, nw))
    if (cols[nw]?.[nd]) setSel([nw, nd])
  }
  return (
    <>
      <div className="st-heat-scroll">
        <div
          className="st-heat"
          role="group"
          tabIndex={0}
          aria-label={`${c.total} contributions in the last year. Use the arrow keys to read each day.`}
          aria-describedby="st-heat-day"
          onKeyDown={(e) => {
            const step = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]
            if (step) {
              e.preventDefault()
              move(step[0], step[1])
            } else if (e.key === 'Home' || e.key === 'End') {
              e.preventDefault()
              setSel(e.key === 'End' ? [lastWeek, lastDay] : [0, cols[0].findIndex(Boolean)])
            }
          }}
        >
          {cols.map((week, i) => (
            <div className="st-week" key={i}>
              {week.map((x, j) =>
                x ? (
                  <span
                    key={j}
                    className={`st-cell l${c.exact ? level(x.count, max) : Math.min(4, x.count)}${sel && i === w && j === d ? ' st-sel' : ''}`}
                    title={describe(x)}
                    onPointerEnter={(e) => e.pointerType === 'mouse' && setSel([i, j])}
                    onPointerDown={() => setSel([i, j])}
                  />
                ) : (
                  <span key={j} className="st-cell st-empty" />
                ),
              )}
            </div>
          ))}
        </div>
      </div>
      <p className="st-heat-day" id="st-heat-day" aria-live="polite">{day ? describe(day) : ''}</p>
    </>
  )
}

function Languages({ langs }: { langs: { name: string; share: number }[] }) {
  return (
    <>
      <div className="st-bar" role="img" aria-label={langs.map((l) => `${l.name} ${Math.round(l.share * 100)}%`).join(', ')}>
        {langs.map((l, i) => (
          <span key={l.name} style={{ flexGrow: l.share, background: LANG_COLORS[i % LANG_COLORS.length] }} />
        ))}
      </div>
      <ul className="st-legend">
        {langs.map((l, i) => (
          <li key={l.name}>
            <span className="st-dot" style={{ background: LANG_COLORS[i % LANG_COLORS.length] }} />
            {l.name}
            <span className="st-pct">{l.share < 0.01 ? '<1' : Math.round(l.share * 100)}%</span>
          </li>
        ))}
      </ul>
    </>
  )
}

export default function StatsView() {
  const [stats, setStats] = useState<Stats | null | undefined>()
  const [refreshing, setRefreshing] = useState(false)
  const [visits, setVisits] = useState<Visits | null | undefined>()
  useEffect(() => {
    let active = true
    loadStats().then((value) => { if (active) setStats(value) })
    const refreshGithub = () => { void loadStats(true).then((value) => { if (active) setStats(value) }) }
    refreshGithub()
    const timer = setInterval(() => { if (!document.hidden) refreshGithub() }, 3600_000)
    loadVisits().then((value) => { if (active) setVisits(value) })
    return () => { active = false; clearInterval(timer) }
  }, [])

  if (stats === undefined) return <div className="stats st-loading">reading counters…</div>

  const refresh = async () => {
    setRefreshing(true)
    try { setStats(await loadStats(true)) } finally { setRefreshing(false) }
  }
  const fetched = (section: 'profile' | 'contributions' | 'languages' | 'commits') => {
    const date = stats?.github.fetchedAt?.[section]
    return date ? <time dateTime={date} title={new Date(date).toLocaleString()}>fetched {ago(date)}</time> : 'fetch date unavailable'
  }
  const gh = stats?.github
  const c = gh?.contributions
  const fav = c && c.total ? c.weekday.indexOf(Math.max(...c.weekday)) : -1
  const games = stats?.itch
  const maxViews = games ? Math.max(...games.map((g) => g.views), 1) : 1

  return (
    <div className="stats">
      <p className="st-prompt">
        <span>danish@dev</span> ~ $ stats{' '}
        {stats?.builtAt && <span className="st-note">site snapshot {ago(stats.builtAt)}</span>}
        <button type="button" className="pill" onClick={refresh} disabled={refreshing}>{refreshing ? 'Refreshing…' : 'Refresh stats'}</button>
      </p>

      {c ? (
        <Section title="Contributions" note={<>{c.exact ? `${c.total.toLocaleString()} in the last year` : 'the last year'} · {fetched('contributions')}</>}>
          <Heatmap c={c} />
          <dl className="st-rows">
            <Row label="current streak">{c.currentStreak ? `${c.currentStreak} day${c.currentStreak === 1 ? '' : 's'}` : 'resting'}</Row>
            <Row label="longest streak">{c.longestStreak} days</Row>
            <Row label="days with commits">{c.activeDays} of {Math.min(365, c.days.length)}</Row>
            {c.exact && c.busiestDay && (
              <Row label="busiest day">
                {c.busiestDay.count} on {new Date(`${c.busiestDay.date}T00:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'long', timeZone: 'UTC' })}
              </Row>
            )}
            {fav >= 0 && <Row label="most active on">{WEEKDAYS[fav]}</Row>}
          </dl>
        </Section>
      ) : null}

      {gh?.languages?.length ? (
        <Section title="Languages" note={<>by bytes, notebooks left out · {fetched('languages')}</>}>
          <Languages langs={gh.languages} />
        </Section>
      ) : null}

      {gh?.commits?.length ? (
        <Section title="Recent commits" note={fetched('commits')}>
          <ol className="st-log">
            {gh.commits.map((cm) => (
              <li key={cm.sha + cm.repo}>
                <a href={cm.url} target="_blank" rel="noreferrer">
                  <span className="st-sha">{cm.sha}</span>
                  <span className="st-repo">{cm.repo}</span>
                  <span className="st-msg">{cm.message}</span>
                  <time dateTime={cm.date}>{ago(cm.date)}</time>
                </a>
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      {games?.length ? (
        <Section title="Games on itch.io" note="views">
          <ul className="st-games">
            {games.map((g) => (
              <li key={g.url}>
                <a href={g.url} target="_blank" rel="noreferrer">
                  {g.title}
                </a>
                <span className="st-meter" style={{ ['--w' as string]: `${(g.views / maxViews) * 100}%` } as CSSProperties} />
                <span className="st-num">{g.views.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section title="This site">
        <dl className="st-rows">
          {visits && visits.visits > 0 && (
            <>
              <Row label="visits">
                {visits.visits.toLocaleString()}
                {visits.since && <span className="st-note"> since {new Date(visits.since).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
              </Row>
              <Row label="average time here">{duration(visits.avgSeconds)}</Row>
            </>
          )}
          <Row label="projects">{projects().length}</Row>
          {stats?.site.files ? <Row label="files on this disk">{stats.site.files}</Row> : null}
          {stats?.site.commits ? <Row label="commits to build it">{stats.site.commits}</Row> : null}
          {gh?.profile && (
            <>
              <Row label="public repos">{gh.profile.publicRepos} <span className="st-note">{fetched('profile')}</span></Row>
              <Row label="on GitHub since">{new Date(gh.profile.since).getFullYear()}</Row>
            </>
          )}
        </dl>
        {visits && visits.visits > 0 && <p className="st-fine">Visits are counted without cookies or tracking: each page load only sends how long the tab was open.</p>}
      </Section>

      {!c && !gh?.commits?.length && <p className="st-fine">GitHub is temporarily unavailable. Try refreshing the stats in a few minutes.</p>}
    </div>
  )
}
