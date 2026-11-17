import { findReadme, getNode } from '../fs'
import { openNode } from '../shell/opener'

export default function Introduction() {
  const go = (path: string) => {
    const node = getNode(path)
    if (node) openNode(node)
  }
  return (
    <section className="portfolio-intro" aria-labelledby="intro-title">
      <p className="intro-kicker">Developer · Dubai, UAE</p>
      <h1 id="intro-title">Hi, I’m Danish.</h1>
      <p>I build apps, games and tools for my homelab. Currently studying applied AI and building things I actually use.</p>
      <nav className="intro-actions" aria-label="Introduction">
        <button className="pill pill-dark" type="button" onClick={() => go('/projects')}>Selected work</button>
        <button className="pill" type="button" onClick={() => go('/about.md')}>About</button>
        <button className="pill" type="button" onClick={() => go('/cv.md')}>Contact</button>
      </nav>
      <div className="intro-selected" aria-label="Featured projects">
        {['/projects/fuloos', '/projects/lockout', '/projects/games'].map((path) => {
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
