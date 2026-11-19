import { projects } from '../fs'
import { fill, raw, rawList, type ListKey, type Lists, type StringKey, type Strings, type Val } from '../text'

export interface Seg {
  t: string
  cls?: 'dim' | 'accent' | 'err' | 'dir' | 'bold'
  /** Any CSS colour, for things like the neofetch colour blocks. */
  color?: string
  /** Clicking opens this file system path. */
  open?: string
  /** Clicking runs this command. */
  run?: string
  href?: string
}
export type Line = Seg[]

export const txt = (t: string, cls?: Seg['cls']): Seg => ({ t, cls })
export const err = (t: string): Line => [txt(t, 'err')]
export const cmd = (name: string, run = name): Seg => ({ t: name, cls: 'accent', run })


/* ---------- wording from content/text ---------- */

/** A placeholder in terminal text can be plain text or a ready-made segment (a link, a folder, a command). */
export type SegVal = Val | Seg
type SegVars<P> = [P] extends [never] ? [vars?: Record<string, SegVal>] : [vars: Record<P & string, SegVal> & Record<string, SegVal>]

// \x escapes · **bold** · *accent* · _dim_ · `command` (clickable) · [label](https://… or /path)
const MARKUP = /\\([\\*_`[\]{}])|\*\*(.+?)\*\*|\*(.+?)\*|(?<![\w\\])_(.+?)_(?!\w)|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)/g
const SLOT = /\{([A-Za-z_]\w*)(?:\|[^{}]*)?\}/g

function substitute(piece: Seg, vars?: Record<string, SegVal>): Seg[] {
  if (!vars) return [piece]
  const strings: Record<string, Val> = {}
  for (const [k, v] of Object.entries(vars)) if (typeof v !== 'object') strings[k] = v
  const out: Seg[] = []
  let at = 0
  for (const m of piece.t.matchAll(SLOT)) {
    const v = vars[m[1]]
    if (typeof v !== 'object') continue
    if (m.index > at) out.push({ ...piece, t: piece.t.slice(at, m.index) })
    out.push(v)
    at = m.index + m[0].length
  }
  if (at < piece.t.length) out.push({ ...piece, t: piece.t.slice(at) })
  return out.map((s) => {
    if (Object.values(vars).includes(s)) return s
    const done: Seg = { ...s, t: fill(s.t, strings) }
    if (s.run) done.run = fill(s.run, strings)
    if (s.href) done.href = fill(s.href, strings)
    if (s.open) done.open = fill(s.open, strings)
    return done
  })
}

/** One line of terminal output from a template with light markup. `base` styles the unmarked text. */
export function rich(template: string, base?: Seg['cls'], vars?: Record<string, SegVal>): Line {
  const pieces: Seg[] = []
  const plain = (t: string) => t && pieces.push({ t, cls: base })
  let at = 0
  for (const m of template.matchAll(MARKUP)) {
    plain(template.slice(at, m.index))
    at = m.index + m[0].length
    const [, esc, bold, accent, dim, command, label, target] = m
    if (esc) plain(esc)
    else if (bold) pieces.push({ t: bold, cls: 'bold' })
    else if (accent) pieces.push({ t: accent, cls: 'accent' })
    else if (dim) pieces.push({ t: dim, cls: 'dim' })
    else if (command) pieces.push({ t: command, cls: 'accent', run: command })
    else if (target.startsWith('/')) pieces.push({ t: label, cls: base, open: target })
    else pieces.push({ t: label, href: target })
  }
  plain(template.slice(at))
  return pieces.flatMap((p) => substitute(p, vars))
}

/** A line of terminal output from content/text. */
export function say<K extends StringKey>(key: K, base?: Seg['cls'], ...[vars]: SegVars<Strings[K]>): Line {
  return rich(raw(key), base, vars)
}

/** Every line of a list from content/text, each one styled like `say`. */
export function sayAll<K extends ListKey>(key: K, base?: Seg['cls'], ...[vars]: SegVars<Lists[K]>): Line[] {
  return rawList(key).map((l) => rich(l, base, vars))
}

export const WELCOME: Line[] = rawList('terminal.welcome').map((l) =>
  rich(l, undefined, { count: projects().length, projects: { t: '~/projects', cls: 'dir', open: '/projects' } }),
)
