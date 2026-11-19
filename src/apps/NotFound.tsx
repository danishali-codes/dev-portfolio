import { findReadme, getNode } from '../fs'
import { t } from '../text'
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
        <span className="notfound-prompt">{t('windows.not-found.prompt')}</span> cd {shown}
        {'\n'}{t('windows.not-found.error', { path: shown })}
        {'\n'}<span className="notfound-prompt">{t('windows.not-found.prompt')}</span> <span className="notfound-cursor">▌</span>
      </pre>
      <h1 id="notfound-title">{t('windows.not-found.title')}</h1>
      <p>{t('windows.not-found.body')}</p>
      <div className="notfound-actions">
        {guess && (
          <button type="button" className="pill pill-dark" onClick={() => openNode(findReadme(guess) ?? guess)}>
            {t('windows.not-found.did-you-mean', { name: guess.meta?.name ?? guess.name })}
          </button>
        )}
        <button type="button" className={guess ? 'pill' : 'pill pill-dark'} onClick={() => open('/projects')}>{t('windows.not-found.work')}</button>
        <button type="button" className="pill" onClick={() => openTerminal()}>{t('windows.not-found.terminal')}</button>
      </div>
    </section>
  )
}
