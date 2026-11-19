import { findReadme, getNode } from '../fs'
import { closestProject } from '../shell/closest'
import { openNode, openTerminal } from '../shell/opener'

export default function NotFound({ path }: { path: string }) {
  let shown = path
  try { shown = decodeURIComponent(path) } catch { /* keep it encoded */ }
  const guess = closestProject(path)
  const open = (p: string) => {
    const node = getNode(p)
    if (node) openNode(node)
  }
  return (
    <section className="notfound" aria-labelledby="notfound-title">
      <pre className="notfound-term" aria-hidden="true">
        <span className="notfound-prompt">danish@paperos:~$</span> cd {shown}
        {'\n'}cd: no such file or directory: {shown}
        {'\n'}<span className="notfound-prompt">danish@paperos:~$</span> <span className="notfound-cursor">▌</span>
      </pre>
      <h1 id="notfound-title">404: nothing lives here</h1>
      <p>The link may be old, or a letter slipped. Everything that does exist is one click away.</p>
      <div className="notfound-actions">
        {guess && (
          <button type="button" className="pill pill-dark" onClick={() => openNode(findReadme(guess) ?? guess)}>
            Did you mean {guess.meta?.name ?? guess.name}?
          </button>
        )}
        <button type="button" className={guess ? 'pill' : 'pill pill-dark'} onClick={() => open('/projects')}>Selected work</button>
        <button type="button" className="pill" onClick={() => openTerminal()}>Open the terminal</button>
      </div>
    </section>
  )
}
