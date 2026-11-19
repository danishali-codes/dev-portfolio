import { allProjects, root, TRASH_DIR } from '../fs'
import { t } from '../text'
import type { FsNode } from '../fs/types'

/** One thing Spotlight can open: a project, a file, an app or a terminal command. */
export interface SearchItem {
  kind: 'project' | 'file' | 'app' | 'command'
  /** What the row shows. */
  label: string
  /** Smaller text beside it: a tagline, a folder, what a command does. */
  detail?: string
  /** Extra words that should find it (stack, aliases, old names). */
  keywords?: string
  color?: string
  /** For projects and files. */
  node?: FsNode
  /** For apps: the app id; for commands: the command line to run. */
  id?: string
}

export interface AppEntry {
  id: string
  label: string
  keywords?: string
}

/** Desktop apps that aren't files. The desktop maps each id to how it opens. */
export const APPS: AppEntry[] = [
  { id: 'welcome', label: t('desktop.titles.welcome'), keywords: t('desktop.search.welcome') },
  { id: 'terminal', label: t('desktop.titles.terminal'), keywords: t('desktop.search.terminal') },
  { id: 'stats', label: t('desktop.titles.stats'), keywords: t('desktop.search.stats') },
  { id: 'guestbook', label: t('desktop.titles.guestbook'), keywords: t('desktop.search.guestbook') },
  { id: 'ask', label: t('desktop.titles.ask'), keywords: t('desktop.search.ask') },
  { id: 'wallpaper', label: t('desktop.titles.wallpaper'), keywords: t('desktop.search.wallpaper') },
  { id: 'updates', label: t('desktop.titles.updates'), keywords: t('desktop.search.updates') },
  { id: 'calendar', label: t('desktop.search.calendar-title'), keywords: t('desktop.search.calendar') },
]

/** Every file worth finding by name. Media folders hold dozens of screenshots, so only their folder is listed. */
function files(): FsNode[] {
  const out: FsNode[] = []
  const walk = (n: FsNode) => {
    if (n.type === 'dir') {
      if (n.path !== '/' && !n.meta) out.push(n)
      if (n.name === 'media') return
      n.children.forEach(walk)
      return
    }
    if (n.name === 'project.json') return
    out.push(n)
  }
  walk(root)
  return out
}

export function buildIndex(commands: { name: string; desc: string }[] = []): SearchItem[] {
  const projects: SearchItem[] = allProjects().map((p) => ({
    kind: 'project',
    label: p.meta?.name ?? p.name,
    detail: p.meta?.tagline,
    keywords: [p.name, ...(p.meta?.stack ?? []), ...(p.meta?.aliases ?? []), p.meta?.jam, p.meta?.year].filter(Boolean).join(' '),
    color: p.meta?.color,
    node: p,
  }))
  const fileItems: SearchItem[] = files().map((n) => {
    const folder = n.path.slice(0, n.path.lastIndexOf('/')) || '/'
    const label = n.path === TRASH_DIR ? 'Trash' : n.type === 'dir' ? n.name + '/' : n.type === 'file' && n.kind === 'app' ? (n.title ?? n.name) : n.name
    return { kind: 'file', label, detail: '~' + (folder === '/' ? '' : folder), keywords: n.path, node: n }
  })
  const apps: SearchItem[] = APPS.map((a) => ({ kind: 'app', label: a.label, keywords: a.keywords, id: a.id }))
  const cmds: SearchItem[] = commands.map((c) => ({ kind: 'command', label: c.name, detail: c.desc, id: c.name }))
  return [...projects, ...apps, ...fileItems, ...cmds]
}

const ORDER: Record<SearchItem['kind'], number> = { project: 0, app: 1, file: 2, command: 3 }

/** How well an item matches: 0 is no match, higher is better. */
export function score(item: SearchItem, query: string): number {
  const q = query.trim().toLowerCase()
  if (!q) return 0
  const label = item.label.toLowerCase()
  if (label === q) return 100
  if (label.startsWith(q)) return 80
  if (label.split(/[\s\-_./]+/).some((w) => w.startsWith(q))) return 60
  if (label.includes(q)) return 40
  const rest = `${item.detail ?? ''} ${item.keywords ?? ''}`.toLowerCase()
  if (rest.split(/[\s\-_./]+/).some((w) => w.startsWith(q))) return 20
  if (rest.includes(q)) return 10
  // Every word of a longer query somewhere in the item.
  const words = q.split(/\s+/)
  if (words.length > 1 && words.every((w) => `${label} ${rest}`.includes(w))) return 15
  return 0
}

/** The best matches, projects and apps before files and commands when they match equally well. */
export function search(index: SearchItem[], query: string, limit = 9): SearchItem[] {
  return index
    .map((item) => ({ item, s: score(item, query) }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s || ORDER[a.item.kind] - ORDER[b.item.kind] || a.item.label.localeCompare(b.item.label))
    .slice(0, limit)
    .map((r) => r.item)
}
