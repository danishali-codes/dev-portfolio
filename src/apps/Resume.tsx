import { getNode } from '../fs'
import { t } from '../text'
import { contact, PDF_PATH } from '../shell/contact'
import { applyRouteMeta } from '../shell/pages'
import { setResume } from '../shell/plain'
import { resumeBlocks } from './resumeDoc'
import '../styles/resume.css'

/** The plain page. Facts come from content/resume.md and contact.json. */
export default function Resume() {
  const c = contact()
  const file = getNode('/resume.md')
  const text = file?.type === 'file' ? file.text ?? '' : ''
  const pdf = getNode(PDF_PATH)
  const pdfHref = pdf?.type === 'file' ? pdf.src : undefined
  const back = () => {
    setResume(false)
    if (location.pathname !== '/') history.replaceState(null, '', '/')
    applyRouteMeta('/')
  }
  return (
    <main className="resume">
      <p className="resume-back">
        <button type="button" onClick={back}>
          {t('windows.resume.back')}
        </button>
      </p>
      <header>
        <h1>{c.name}</h1>
        <p className="resume-role">
          {[c.role, c.location].filter(Boolean).join(' · ')}
        </p>
        <p className="resume-links">
          {c.email && <a href={`mailto:${c.email}`}>{c.email}</a>}
          {c.links.map((l) => (
            <a key={l.url} href={l.url} {...(l.label === 'LinkedIn' ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
              {l.label}
            </a>
          ))}
          {pdfHref && (
            <a href={pdfHref} download="Danish-Ali-CV.pdf">
              {t('windows.resume.pdf')}
            </a>
          )}
        </p>
      </header>
      {resumeBlocks(text).map((block, i) => {
        if (block.type === 'h') return <h2 key={i} dangerouslySetInnerHTML={{ __html: block.html }} />
        if (block.type === 'ul')
          return (
            <ul key={i}>
              {block.items.map((item, j) => (
                <li key={j} dangerouslySetInnerHTML={{ __html: item }} />
              ))}
            </ul>
          )
        return <p key={i} dangerouslySetInnerHTML={{ __html: block.html }} />
      })}
    </main>
  )
}
