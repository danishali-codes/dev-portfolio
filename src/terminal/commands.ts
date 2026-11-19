import { displayPath, findApp, findProject, getNode, projects, resolvePath, root } from '../fs'
import type { DirNode, FsNode } from '../fs/types'
import { ago, duration, level, loadStats, loadVisits, weeks } from '../apps/stats'
import { formatUpdated, NOW_PATH, readNow } from '../apps/now'
import { openAsk, openGuestbook, openNode, openStats, openUpdates, openWallpaperPicker, SOURCE_URL } from '../shell/opener'
import { setTheme } from '../shell/theme'
import { contact, CV_PATH, localTime } from '../shell/contact'
import { startScreensaver } from '../shell/screensaver'
import { findWallpaper, getWallpaper, setWallpaper, WALLPAPERS } from '../shell/wallpaper'
import { EGG_COMMANDS, HIDDEN_FILES } from './eggs'
import { unlock } from '../achievements'
import { LEADERBOARD_COMMANDS } from '../leaderboard/commands'
import { UNIX_COMMANDS } from './unix'
import { say, sayAll, txt, type Line, type Seg } from './lines'
import { lines, t } from '../text'

export type { Line, Seg } from './lines'

export interface Ctx {
  cwd: string
  setCwd: (p: string) => void
  print: (...lines: Line[]) => void
  clear: () => void
  exit: () => void
}

export interface Command {
  desc: string
  usage?: string
  /** Left out of help and tab completion. Finding it is the fun. */
  hidden?: boolean
  run: (args: string[], ctx: Ctx) => void
}


function nodeSeg(node: FsNode): Seg {
  if (node.type === 'dir') return { t: node.name + '/', cls: 'dir', open: node.path }
  return { t: node.name, open: node.path }
}

const SHADES = ['·', '░', '▒', '▓', '█']

/** GitHub and site numbers, drawn in text. The same data as the Stats window. */
async function printStats(print: Ctx['print']) {
  const [stats, visits] = await Promise.all([loadStats(true), loadVisits()])
  const gh = stats?.github
  const c = gh?.contributions
  if (c) {
    print([txt(t('terminal.stats.contributions'), 'bold'), txt(c.exact ? t('terminal.stats.contributions-exact', { total: c.total.toLocaleString() }) : t('terminal.stats.contributions-rough'), 'dim')])
    const cols = weeks(c.days, 26)
    const max = Math.max(...c.days.map((d) => d.count))
    for (let row = 0; row < 7; row++) {
      print([txt('  ' + cols.map((w) => (w[row] ? SHADES[c.exact ? level(w[row]!.count, max) : Math.min(4, w[row]!.count)] : ' ')).join(''))])
    }
    print(say('terminal.stats.streaks', 'dim', { current: c.currentStreak, longest: c.longestStreak, active: c.activeDays }))
  }
  if (gh?.languages?.length) {
    print([], [txt(t('terminal.stats.languages'), 'bold')])
    for (const l of gh.languages) {
      const n = Math.round(l.share * 24)
      print([txt('  ' + l.name.padEnd(12)), txt('█'.repeat(n), 'accent'), txt('░'.repeat(24 - n), 'dim'), txt(` ${Math.max(1, Math.round(l.share * 100))}%`)])
    }
  }
  if (gh?.commits?.length) {
    print([], [txt(t('terminal.stats.commits'), 'bold')])
    for (const cm of gh.commits.slice(0, 5)) {
      print([txt('  '), { t: cm.sha, cls: 'accent', href: cm.url }, txt(` ${cm.repo.padEnd(14)} `, 'dim'), txt(cm.message.slice(0, 48)), txt(`  ${ago(cm.date)}`, 'dim')])
    }
  }
  if (stats?.itch?.length) {
    print([], [txt(t('terminal.stats.itch'), 'bold')])
    for (const g of stats.itch) print([txt('  ' + g.title.padEnd(20)), txt(t('terminal.stats.itch-views', { views: g.views.toLocaleString() }), 'dim')])
  }
  print([], [txt(t('terminal.stats.site'), 'bold')])
  if (visits && visits.visits > 0) print(say('terminal.stats.visits', undefined, { visits: visits.visits.toLocaleString(), average: duration(visits.avgSeconds) }))
  print([txt(t('terminal.stats.projects', { count: projects().length }) + (stats?.site.commits ? t('terminal.stats.site-commits', { commits: stats.site.commits }) : ''))])
  if (!stats) print(say('terminal.stats.no-github', 'dim'))
  print([], say('terminal.stats.window'))
}

function textLines(text: string): Line[] {
  return text.replace(/<!--[\s\S]*?-->\n?/g, '').trimEnd().split('\n').map((l) => [txt(l)])
}

export const COMMANDS: Record<string, Command> = {
  help: {
    desc: t('terminal.commands.help'),
    run: (_a, { print }) => {
      print([txt(t('terminal.help.title'), 'bold')])
      for (const [name, c] of Object.entries(COMMANDS)) {
        if (c.hidden) continue
        print([{ t: (c.usage ?? name).padEnd(22), cls: 'accent', run: name }, txt(c.desc, 'dim')])
      }
      print(...sayAll('terminal.help.tips', 'dim'))
    },
  },
  ls: {
    desc: t('terminal.commands.ls'),
    usage: 'ls [folder]',
    run: (argv, { cwd, print }) => {
      const all = argv.some((a) => /^-\w*a/.test(a))
      const args = argv.filter((a) => !a.startsWith('-'))
      const path = resolvePath(args[0] ?? '.', cwd)
      const node = getNode(path)
      if (!node) return print(say('terminal.ls.missing', 'err', { path: args[0] }))
      if (node.type === 'file') return print([nodeSeg(node)])
      const segs: Seg[] = []
      if (all) {
        segs.push(txt('./', 'dir'), txt('  '), txt('../', 'dir'))
        for (const p of Object.keys(HIDDEN_FILES).filter((h) => resolvePath('..', h) === node.path)) {
          segs.push(txt('  '), { t: p.split('/').pop()!, cls: 'dim', run: `cat ${p}` })
        }
        if (node.children.length) segs.push(txt('  '))
      }
      node.children.forEach((c, i) => {
        if (i) segs.push(txt('  '))
        segs.push(nodeSeg(c))
      })
      print(segs.length ? segs : say('terminal.ls.empty', 'dim'))
    },
  },
  cd: {
    desc: t('terminal.commands.cd'),
    usage: 'cd <folder>',
    run: (args, { cwd, setCwd, print }) => {
      if (cwd === '/' && /^\/?\.\.(\/|$)/.test(args[0] ?? '')) {
        unlock('escape')
        return print(say('terminal.cd.above-home', 'dim'))
      }
      const path = resolvePath(args[0] ?? '~', cwd)
      const node = getNode(path)
      if (!node) return print(say('terminal.cd.missing', 'err', { path: args[0] }))
      if (node.type !== 'dir') return print(say('terminal.cd.not-folder', 'err', { path: args[0] }))
      setCwd(node.path)
    },
  },
  pwd: {
    desc: t('terminal.commands.pwd'),
    run: (_a, { cwd, print }) => print([txt(displayPath(cwd))]),
  },
  cat: {
    desc: t('terminal.commands.cat'),
    usage: 'cat <file>',
    run: (args, { cwd, print }) => {
      if (!args[0]) return print(say('terminal.cat.which', 'err'))
      const path = resolvePath(args[0], cwd)
      if (HIDDEN_FILES[path]) {
        unlock('dotfile')
        return print(...textLines(HIDDEN_FILES[path]))
      }
      // `cat about.txt` and friends find the .md version.
      const node = getNode(path) ?? getNode(path.replace(/\.txt$/i, '.md'))
      if (!node) return print(say('terminal.cat.missing', 'err', { path: args[0] }))
      if (node.type === 'dir') return print(say('terminal.cat.is-folder', 'err', { path: args[0] }))
      if (node.text != null) return print(...textLines(node.text))
      if (node.url) return print([txt('→ '), { t: node.url, href: node.url }])
      print(say('terminal.cat.binary', undefined, { name: node.name, kind: node.kind, open: { t: `open ${node.name}`, open: node.path } }))
    },
  },
  open: {
    desc: t('terminal.commands.open'),
    usage: 'open <name>',
    run: (args, { cwd, print }) => {
      if (!args[0]) return print(say('terminal.open.what', 'err'))
      const node = getNode(resolvePath(args[0], cwd)) ?? findProject(args[0])
      if (!node) return print(say('terminal.open.missing', 'err', { path: args[0] }))
      openNode(node)
      print(say('terminal.open.opening', undefined, { thing: nodeSeg(node) }))
    },
  },
  run: {
    desc: t('terminal.commands.run'),
    usage: 'run <project>',
    run: (args, { print }) => {
      const dir = args[0] ? findProject(args[0]) : undefined
      const app = dir && findApp(dir)
      if (!dir) return print(say('terminal.run.missing', 'err', { name: args[0] ?? '?' }))
      // Games live on itch.io, which can't be embedded, so `run` opens their page there instead.
      const itch = !app ? dir.children.find((c) => c.type === 'file' && c.kind === 'link' && /^itch\.link$/i.test(c.name)) : undefined
      if (itch) {
        openNode(itch)
        return print(say('terminal.run.on-itch', undefined, { name: dir.meta?.name ?? dir.name }))
      }
      if (!app) return print(say('terminal.run.no-app', 'err', { name: dir.meta?.name ?? dir.name }))
      openNode(app)
      print(say('terminal.run.launching', undefined, { name: app.name }))
    },
  },
  play: {
    desc: t('terminal.commands.play'),
    usage: 'play lockout',
    run: (args, ctx) => COMMANDS.run.run([args[0] ?? 'lockout'], ctx),
  },
  projects: {
    desc: t('terminal.commands.projects'),
    run: (_a, { print }) => {
      const list = projects()
      const [name, year, status, about] = lines('terminal.projects.header')
      print([txt((name ?? '').padEnd(16) + (year ?? '').padEnd(7) + (status ?? '').padEnd(10) + (about ?? ''), 'dim')])
      for (const p of list) {
        const m = p.meta
        print([
          { t: (m?.name ?? p.name).padEnd(16), cls: 'dir', open: p.path },
          txt(String(m?.year ?? '').padEnd(7)),
          txt((m?.status ?? '').padEnd(10), 'dim'),
          txt(m?.tagline ?? ''),
        ])
      }
    },
  },
  stats: {
    desc: t('terminal.commands.stats'),
    usage: 'stats [-w]',
    run: (args, { print }) => {
      if (args.some((a) => /^(-w|--window|window)$/.test(a))) {
        openStats()
        return print(say('terminal.stats.opening', 'dim'))
      }
      print(say('terminal.stats.reading', 'dim'))
      void printStats(print)
    },
  },
  now: {
    desc: t('terminal.commands.now'),
    run: (_a, { print }) => {
      const now = readNow()
      if (!now) return print(say('terminal.now.empty', 'err'))
      const when = formatUpdated(now.updated)
      print([...say('terminal.now.title'), ...(when ? say('terminal.now.updated', 'dim', { when }) : [])])
      for (const item of now.items) print([txt('  • ', 'accent'), txt(item)])
      print(say('terminal.now.full-note', undefined, { file: { t: 'now.md', open: NOW_PATH } }))
    },
  },
  whoami: {
    desc: t('terminal.commands.whoami'),
    run: (_a, { print }) => {
      const about = getNode('/about.md')
      if (about?.type === 'file' && about.text) print(...textLines(about.text))
    },
  },
  cv: {
    desc: t('terminal.commands.cv'),
    run: (_a, { print }) => {
      const cv = getNode(CV_PATH)
      if (!cv) return print(say('terminal.cv.missing', 'err'))
      openNode(cv)
      print(say('terminal.cv.opening', undefined, { file: { t: 'cv.md', open: CV_PATH } }))
    },
  },
  contact: {
    desc: t('terminal.commands.contact'),
    run: (_a, { print }) => {
      const c = contact()
      const row = (label: string, seg: Seg) => print([txt(label.padEnd(10), 'dim'), seg])
      if (c.email) row(t('terminal.contact.labels.email'), { t: c.email, href: `mailto:${c.email}` })
      for (const l of c.links) row(l.label.toLowerCase(), { t: l.url.replace(/^https?:\/\/(www\.)?/, ''), href: l.url })
      if (c.timezone && c.location) {
        const { time, gap } = localTime(c.timezone)
        row(t('terminal.contact.labels.local'), txt(t('terminal.contact.local-time', { time, city: c.location.split(',')[0], gap })))
      }
      print(say('terminal.contact.card', undefined, { card: { t: t('terminal.contact.card-link'), cls: 'accent', open: CV_PATH } }))
    },
  },
  updates: {
    desc: t('terminal.commands.updates'),
    run: (_a, { print }) => {
      openUpdates()
      print(say('terminal.updates', 'dim'))
    },
  },
  source: {
    desc: t('terminal.commands.source'),
    run: (_a, { print }) => print(say('terminal.source', undefined, { link: { t: SOURCE_URL.replace('https://', ''), href: SOURCE_URL } })),
  },
  ask: {
    desc: t('terminal.commands.ask'),
    usage: 'ask [question]',
    run: (args, { print }) => {
      openAsk(args.join(' ').trim() || undefined)
      print(say('terminal.ask', 'dim'))
    },
  },
  guestbook: {
    desc: t('terminal.commands.guestbook'),
    run: (_a, { print }) => {
      openGuestbook()
      print(say('terminal.guestbook', 'dim'))
    },
  },
  theme: {
    desc: t('terminal.commands.theme'),
    usage: 'theme light|dark',
    run: (args, { print }) => {
      if (args[0] !== 'light' && args[0] !== 'dark') return print(say('terminal.theme.usage', 'err'))
      setTheme(args[0])
      print(say('terminal.theme.set', 'dim', { theme: args[0] }))
    },
  },
  wallpaper: {
    desc: t('terminal.commands.wallpaper'),
    usage: 'wallpaper [name]',
    run: (args, { print }) => {
      const name = args.join(' ')
      if (!name) {
        openWallpaperPicker()
        const segs: Seg[] = [txt(t('terminal.wallpaper.list'), 'dim')]
        WALLPAPERS.forEach((w, i) => {
          if (i) segs.push(txt('  '))
          segs.push(w.id === getWallpaper().id ? txt(`[${w.id}]`, 'bold') : { t: w.id, cls: 'accent', run: `wallpaper ${w.id}` })
        })
        return print(segs)
      }
      const wp = findWallpaper(name)
      if (!wp) return print(say('terminal.wallpaper.missing', 'err', { name }))
      setWallpaper(wp.id)
      print(say('terminal.wallpaper.set', 'dim', { name: wp.name }))
    },
  },
  screensaver: {
    desc: t('terminal.commands.screensaver'),
    run: (_a, { print }) => {
      if (!startScreensaver()) print(say('terminal.screensaver.phone', 'err'))
    },
  },
  ...UNIX_COMMANDS,
  echo: {
    desc: t('terminal.commands.echo'),
    usage: 'echo <text>',
    run: (args, { print }) => print([txt(args.join(' '))]),
  },
  date: {
    desc: t('terminal.commands.date'),
    run: (_a, { print }) => print([txt(new Date().toString())]),
  },
  clear: {
    desc: t('terminal.commands.clear'),
    run: (_a, { clear }) => clear(),
  },
  exit: {
    desc: t('terminal.commands.exit'),
    run: (_a, { exit }) => exit(),
  },
  ...EGG_COMMANDS,
  ...LEADERBOARD_COMMANDS,
}

const visible = () => Object.keys(COMMANDS).filter((c) => !COMMANDS[c].hidden)

function distance(a: string, b: string) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return dp[a.length][b.length]
}

export function execute(input: string, ctx: Ctx) {
  const [name, ...args] = input.trim().split(/\s+/)
  if (!name) return
  const cmd = COMMANDS[name.toLowerCase()]
  if (cmd) return cmd.run(args, ctx)
  // Typing a project name on its own opens it.
  const project = findProject(name)
  if (project) return COMMANDS.open.run([project.name], ctx)
  const best = visible().sort((a, b) => distance(name, a) - distance(name, b))[0]
  ctx.print([
    ...say('terminal.not-found', 'err', { name }),
    ...(distance(name, best) <= 2 ? say('terminal.did-you-mean', undefined, { suggestion: { t: best, cls: 'accent', run: best } }) : []),
    ...say('terminal.type-help'),
  ])
}

/** Tab completion for the last word: commands first, then paths. */
export function complete(input: string, cwd: string): string {
  const parts = input.split(' ')
  const last = parts[parts.length - 1]
  if (parts.length === 1) {
    const hits = visible().filter((c) => c.startsWith(last.toLowerCase()))
    return hits.length === 1 ? hits[0] + ' ' : input
  }
  const slash = last.lastIndexOf('/')
  const base = slash >= 0 ? last.slice(0, slash + 1) : ''
  const stem = last.slice(slash + 1).toLowerCase()
  const dir = getNode(resolvePath(base || '.', cwd))
  if (!dir || dir.type !== 'dir') return input
  const hits = (dir as DirNode).children.filter((c) => c.name.toLowerCase().startsWith(stem))
  if (hits.length !== 1) return input
  const hit = hits[0]
  parts[parts.length - 1] = base + hit.name + (hit.type === 'dir' ? '/' : ' ')
  return parts.join(' ')
}

export { WELCOME } from './lines'

export { root }

