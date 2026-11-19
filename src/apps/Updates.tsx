import changelog from '../generated/changelog.json'
import { t } from '../text'

interface Entry {
  n: number
  title: string
  date: string
}

const REPO = `https://github.com/${changelog.repo}`
const entries = changelog.entries as Entry[]

function day(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

/** System Updates: the site's own changelog, one line per merged pull request. */
export default function Updates() {
  const latest = entries[0]
  const groups: [string, Entry[]][] = []
  for (const e of entries) {
    const d = day(e.date)
    const last = groups[groups.length - 1]
    if (last?.[0] === d) last[1].push(e)
    else groups.push([d, [e]])
  }
  return (
    <div className="updates">
      <header className="up-head">
        <span className="up-check" aria-hidden="true">
          ✓
        </span>
        <div>
          <h2>{t('windows.updates.up-to-date')}</h2>
          <p>
            {latest ? (
              t('windows.updates.build', { n: latest.n, date: new Date(latest.date).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) })
            ) : (
              t('windows.updates.no-history')
            )}
          </p>
        </div>
      </header>
      <h3 className="up-label">{t('windows.updates.history')}</h3>
      {groups.length === 0 && (
        <p className="up-empty">
          {t('windows.updates.no-changelog')} <a href={`${REPO}/pulls?q=is%3Amerged`} target="_blank" rel="noreferrer">{t('windows.updates.see-on-github')}</a>
        </p>
      )}
      {groups.map(([d, list]) => (
        <section key={d} className="up-day" aria-label={d}>
          <h4>{d}</h4>
          <ul>
            {list.map((e) => (
              <li key={e.n}>
                <span className="up-title">{e.title}</span>
                <a className="up-build" href={`${REPO}/pull/${e.n}`} target="_blank" rel="noreferrer" aria-label={t('windows.updates.build-label', { n: e.n })}>
                  #{e.n}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <a className="pill up-source" href={REPO} target="_blank" rel="noreferrer">
        {t('windows.updates.source')}
      </a>
    </div>
  )
}
