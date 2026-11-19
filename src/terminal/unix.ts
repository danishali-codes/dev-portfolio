// The everyday Unix commands, working on the site's own files: tree, grep, top, git log, who.
import changelog from '../generated/changelog.json'
import { displayPath, getNode, resolvePath } from '../fs'
import type { DirNode, FileNode, FsNode } from '../fs/types'
import { useWindows } from '../store/windows'
import { loadOnline } from '../shell/visit'
import type { Command } from './commands'
import { say, txt, type Line, type Seg } from './lines'
import { lines as textLines, t } from '../text'

const nodeSeg = (n: FsNode): Seg => (n.type === 'dir' ? { t: n.name + '/', cls: 'dir', open: n.path } : { t: n.name, open: n.path })

/** The lines of `tree`, folding folders of screenshots into a count so the output stays readable. */
export function treeLines(dir: DirNode, maxDepth = 4): { lines: Line[]; dirs: number; files: number } {
  const lines: Line[] = []
  let dirs = 0
  let files = 0
  const walk = (d: DirNode, prefix: string, depth: number) => {
    const kids = d.children.filter((c) => c.name !== 'project.json')
    kids.forEach((c, i) => {
      const last = i === kids.length - 1
      const branch = prefix + (last ? '└── ' : '├── ')
      if (c.type === 'dir') {
        dirs++
        const media = c.children.length > 0 && c.children.every((k) => k.type === 'file' && (k.kind === 'image' || k.kind === 'video'))
        if (media || depth >= maxDepth) {
          const n = countFiles(c)
          files += n
          lines.push([txt(branch, 'dim'), nodeSeg(c), txt(t(media ? 'terminal.tree.folded-media' : 'terminal.tree.folded', { count: n }), 'dim')])
          return
        }
        lines.push([txt(branch, 'dim'), nodeSeg(c)])
        walk(c, prefix + (last ? '    ' : '│   '), depth + 1)
      } else {
        files++
        lines.push([txt(branch, 'dim'), nodeSeg(c)])
      }
    })
  }
  walk(dir, '', 1)
  return { lines, dirs, files }
}

function countFiles(d: DirNode): number {
  return d.children.reduce((n, c) => n + (c.type === 'dir' ? countFiles(c) : 1), 0)
}

function textFiles(n: FsNode): FileNode[] {
  if (n.type === 'file') return n.text != null ? [n] : []
  return n.children.flatMap(textFiles)
}

export interface GrepHit {
  path: string
  line: number
  text: string
}

/** Lines of text files under a folder that contain the pattern (case-insensitive unless it has capitals, like smartcase). */
export function grep(pattern: string, under: FsNode): GrepHit[] {
  const smart = pattern === pattern.toLowerCase()
  const want = smart ? pattern.toLowerCase() : pattern
  const hits: GrepHit[] = []
  for (const f of textFiles(under)) {
    // Comments in the Markdown are notes to myself, not content.
    const lines = f.text!.replace(/<!--[\s\S]*?-->/g, (m) => '\n'.repeat(m.split('\n').length - 1)).split('\n')
    lines.forEach((l, i) => {
      if ((smart ? l.toLowerCase() : l).includes(want)) hits.push({ path: f.path, line: i + 1, text: l.trim() })
    })
  }
  return hits
}

const GREP_LIMIT = 40

type State = 'running' | 'sleeping' | 'waiting'

export const UNIX_COMMANDS: Record<string, Command> = {
  tree: {
    desc: t('terminal.commands.tree'),
    usage: 'tree [folder]',
    run: (args, { cwd, print }) => {
      const path = resolvePath(args.find((a) => !a.startsWith('-')) ?? '.', cwd)
      const node = getNode(path)
      if (!node) return print(say('terminal.tree.missing', 'err', { path: args[0] }))
      if (node.type !== 'dir') return print([nodeSeg(node)])
      const { lines, dirs, files } = treeLines(node)
      print([{ t: displayPath(node.path), cls: 'dir', open: node.path }], ...lines, [], say('terminal.tree.summary', 'dim', { dirs, files }))
    },
  },
  grep: {
    desc: t('terminal.commands.grep'),
    usage: 'grep <text> [folder]',
    run: (args, { cwd, print }) => {
      const words = args.filter((a) => !/^-\w+$/.test(a))
      if (!words.length) return print(say('terminal.grep.what', 'err'))
      // `grep some words` searches for the phrase; a last word naming a folder narrows it.
      const last = words.length > 1 ? getNode(resolvePath(words[words.length - 1], cwd)) : undefined
      const under = last?.type === 'dir' ? last : getNode(cwd)!
      const pattern = (last?.type === 'dir' ? words.slice(0, -1) : words).join(' ').replace(/^["']|["']$/g, '')
      const hits = grep(pattern, under)
      if (!hits.length) return print(say('terminal.grep.none', 'dim', { pattern, folder: displayPath(under.path) }))
      for (const h of hits.slice(0, GREP_LIMIT)) {
        const at = h.text.toLowerCase().indexOf(pattern.toLowerCase())
        const start = Math.max(0, at - 30)
        const snippet = (start ? '…' : '') + h.text.slice(start, start + 90)
        const i = snippet.toLowerCase().indexOf(pattern.toLowerCase())
        print([
          { t: displayPath(h.path).replace(/^~\//, ''), cls: 'dir', open: h.path },
          txt(`:${h.line}: `, 'dim'),
          txt(snippet.slice(0, i)),
          txt(snippet.slice(i, i + pattern.length), 'bold'),
          txt(snippet.slice(i + pattern.length)),
        ])
      }
      const files = new Set(hits.map((h) => h.path)).size
      print([txt(t('terminal.grep.summary', { hits: hits.length, files }) + (hits.length > GREP_LIMIT ? t('terminal.grep.capped', { limit: GREP_LIMIT }) : ''), 'dim')])
    },
  },
  top: {
    desc: t('terminal.commands.top'),
    run: (_a, { print }) => {
      const wins = useWindows.getState().windows
      const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory
      const up = Math.floor(performance.now() / 1000)
      print(
        [txt(t('terminal.top.summary', { minutes: Math.floor(up / 60), seconds: up % 60, windows: wins.length, cores: navigator.hardwareConcurrency || '?' }) + (mem ? t('terminal.top.memory', { mb: Math.round(mem.usedJSHeapSize / 1048576) }) : ''), 'dim')],
        [txt(t('terminal.top.header'), 'bold')],
      )
      const [init = 'init', wm = 'paperos-wm', wallpaper = 'wallpaper', coffee = 'coffee'] = textLines('terminal.top.processes')
      const procs: [string, State, string][] = [
        [init, 'running', '0.1'],
        [wm, 'running', (0.4 + wins.length * 0.3).toFixed(1)],
        [wallpaper, 'running', '0.2'],
        ...wins
          .slice()
          .sort((a, b) => b.z - a.z)
          .map((w): [string, State, string] => [w.title, w.minimized ? 'sleeping' : 'running', w.minimized ? '0.0' : w.kind === 'app' ? '12.5' : (1 + (w.title.length % 7) * 0.4).toFixed(1)]),
        [coffee, 'waiting', '0.0'],
      ]
      procs.forEach(([name, state, cpu], i) => {
        print([txt(String(i + 1).padEnd(6), 'dim'), txt(t(`terminal.top.${state}`).padEnd(11), state === 'running' ? 'accent' : 'dim'), txt(cpu.padStart(4) + '  '), txt(name)])
      })
    },
  },
  who: {
    desc: t('terminal.commands.who'),
    run: (_a, { print }) => {
      print([txt(t('terminal.who.you').padEnd(9), 'accent'), txt('tty1     ', 'dim'), txt(new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }))])
      void loadOnline().then((n) => {
        if (n == null) return print(say('terminal.who.offline', 'dim'))
        const others = Math.max(0, n - 1)
        print(others ? say('terminal.who.others', 'dim', { count: others }) : say('terminal.who.alone', 'dim'))
      })
    },
  },
}

/** `git log`, read from the site's own changelog. */
export function gitLog(args: string[], print: (...l: Line[]) => void) {
  const entries = changelog.entries as { n: number; title: string; date: string }[]
  const oneline = args.includes('--oneline')
  const n = Number(args.find((a) => /^-\d+$/.test(a))?.slice(1)) || Number(args[args.indexOf('-n') + 1]) || 10
  if (!entries.length) return print(say('terminal.git.log.empty', 'err'))
  for (const e of entries.slice(0, n)) {
    const url = `https://github.com/${changelog.repo}/pull/${e.n}`
    if (oneline) {
      print([{ t: `#${e.n}`.padEnd(5), cls: 'accent', href: url }, txt(' ' + e.title)])
      continue
    }
    print(
      [txt(t('terminal.git.log.commit') + ' ', 'accent'), { t: `#${e.n}`, cls: 'accent', href: url }],
      say('terminal.git.log.author', 'dim'),
      say('terminal.git.log.date', 'dim', { date: new Date(e.date).toDateString() }),
      [],
      [txt('    ' + e.title)],
      [],
    )
  }
  if (entries.length > n) print([txt(t('terminal.git.log.older', { count: entries.length - n }), 'dim'), { t: 'git log -50', cls: 'accent', run: 'git log -50' }])
}
