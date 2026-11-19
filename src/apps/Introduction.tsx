import { findReadme, getNode } from '../fs'
import { t } from '../text'
import { openNode } from '../shell/opener'

export default function Introduction() {
  const go = (path: string) => {
    const node = getNode(path)
    if (node) openNode(node)
  }
  return (
    <section className="portfolio-intro" aria-labelledby="intro-title">
      <p className="intro-kicker">{t('windows.welcome.kicker')}</p>
      <h1 id="intro-title">{t('windows.welcome.title')}</h1>
      <p>{t('windows.welcome.body')}</p>
      <nav className="intro-actions" aria-label={t('windows.welcome.label')}>
        <button className="pill pill-dark" type="button" onClick={() => go('/projects')}>{t('windows.welcome.work')}</button>
        <button className="pill" type="button" onClick={() => go('/about.md')}>{t('windows.welcome.about')}</button>
        <button className="pill" type="button" onClick={() => go('/cv.md')}>{t('windows.welcome.contact')}</button>
      </nav>
      <div className="intro-selected" aria-label={t('windows.welcome.featured')}>
        {['/projects/fuloos', '/projects/lockout', '/projects/sabr', '/projects/games'].map((path) => {
          const node = getNode(path)
          if (node?.type !== 'dir') return null
          return <button type="button" key={path} onClick={() => openNode(findReadme(node) ?? node)}>
            <strong>{node.meta?.name ?? node.name} <span aria-hidden="true">↗</span></strong>
            <span>{node.meta?.tagline}</span>
          </button>
        })}
      </div>
    </section>
  )
}
