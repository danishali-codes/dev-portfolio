// Wording from content/text with light markup, for windows and screens (not the terminal).
//   **bold** · *italic* · [label](https://…)
// A {placeholder} can be filled with text or with a bit of page (a button, a link).
import { Fragment, type ReactNode } from 'react'
import { fill, raw, type StringKey, type Strings, type Val } from '.'

type NodeVars<P> = [P] extends [never] ? { vars?: Record<string, Val | ReactNode> } : { vars: Record<P & string, Val | ReactNode> & Record<string, Val | ReactNode> }

const MARKUP = /\\([\\*[\]{}])|\*\*(.+?)\*\*|\*(.+?)\*|\[([^\]]+)\]\(([^)\s]+)\)/g
const SLOT = /(\{[A-Za-z_]\w*(?:\|[^{}]*)?\})/

function withVars(text: string, vars: Record<string, Val | ReactNode> | undefined): ReactNode {
  if (!vars) return text
  const strings: Record<string, Val> = {}
  for (const [k, v] of Object.entries(vars)) if (typeof v === 'string' || typeof v === 'number') strings[k] = v
  return text.split(SLOT).map((part, i) => {
    const name = /^\{([A-Za-z_]\w*)\}$/.exec(part)?.[1]
    const v = name ? vars[name] : undefined
    if (name && v != null && typeof v === 'object') return <Fragment key={i}>{v}</Fragment>
    return fill(part, strings)
  })
}

/** Renders a template string with markup and placeholders. */
function richNodes(template: string, vars?: Record<string, Val | ReactNode>): ReactNode {
  const out: ReactNode[] = []
  let at = 0
  let k = 0
  for (const m of template.matchAll(MARKUP)) {
    if (m.index > at) out.push(<Fragment key={k++}>{withVars(template.slice(at, m.index), vars)}</Fragment>)
    at = m.index + m[0].length
    const [, esc, bold, em, label, href] = m
    if (esc) out.push(esc)
    else if (bold) out.push(<b key={k++}>{withVars(bold, vars)}</b>)
    else if (em) out.push(<em key={k++}>{withVars(em, vars)}</em>)
    else
      out.push(
        <a key={k++} href={fill(href, vars as Record<string, Val>)} target="_blank" rel="noreferrer">
          {withVars(label, vars)}
        </a>,
      )
  }
  if (at < template.length) out.push(<Fragment key={k++}>{withVars(template.slice(at), vars)}</Fragment>)
  return out
}

/** `<Rich k="desktop.notepad.score" vars={{ count: <b>3</b> }} />` */
export function Rich<K extends StringKey>({ k, vars }: { k: K } & NodeVars<Strings[K]>) {
  return <>{richNodes(raw(k), vars)}</>
}
