// Easter eggs: fun commands, mini games and hidden secrets.
// Commands marked hidden don't show in help or tab completion; finding them is the game.
import { findProject, getNode, projects } from '../fs'
import type { DirNode, FsNode } from '../fs/types'
import { cmd, err, say, sayAll, txt, type Line, type Seg } from './lines'
import { lines, pick, raw, t } from '../text'
import { later, useTerm, type Skin } from './store'
import { ACHIEVEMENTS, isFound, runSeed, unlock, useAchievements } from '../achievements'
import { restart, shutdown, takeover, wipe } from '../achievements/effects'
import type { Command } from './commands'
import { CV_PATH } from '../shell/contact'
import { openNode } from '../shell/opener'
import { gitLog } from './unix'

/* ---------- neofetch ---------- */

const LOGO = [
  ' ____   ',
  '|  _ \\  ',
  '| | | | ',
  '| |_| | ',
  '|____/  ',
]

function browserName() {
  const ua = navigator.userAgent
  if (/Edg\//.test(ua)) return 'Edge'
  if (/Firefox\//.test(ua)) return 'Firefox'
  if (/Chrome\//.test(ua)) return 'Chrome'
  if (/Safari\//.test(ua)) return 'Safari'
  return t('eggs.neofetch.unknown-browser')
}

function uptime() {
  const s = Math.floor(performance.now() / 1000)
  const m = Math.floor(s / 60)
  return m ? t('eggs.neofetch.uptime-minutes', { minutes: m, seconds: s % 60 }) : t('eggs.neofetch.uptime-seconds', { seconds: s })
}

/* ---------- games from itch.io ---------- */

interface Game {
  name: string
  tagline: string
  url: string
  folder?: string
}

// Used until the games have their own folder in content/. Once /projects/games exists, `games` reads from there.
const ITCH = 'https://danish-gamedev.itch.io'
const FALLBACK_GAMES: Game[] = [
  { name: 'Rolling in Dough', tagline: t('eggs.games.fallback.rolling-in-dough'), url: 'https://mckay-makes-games.itch.io/rolling-in-dough' },
  { name: 'The Feed', tagline: t('eggs.games.fallback.the-feed'), url: `${ITCH}/the-feed` },
  { name: 'Game Dev Loop', tagline: t('eggs.games.fallback.game-dev-loop'), url: `${ITCH}/game-dev-loop` },
]

function gamesFromFs(): Game[] {
  const dir = getNode('/projects/games') ?? findProject('games')
  if (!dir || dir.type !== 'dir') return []
  return dir.children
    .filter((c): c is DirNode => c.type === 'dir' && !!c.meta)
    .sort((a, b) => (a.meta?.order ?? 99) - (b.meta?.order ?? 99))
    .map((g) => {
      const link = g.children.find((c): c is Extract<FsNode, { type: 'file' }> => c.type === 'file' && (c.kind === 'app' || c.kind === 'link') && !!c.url && /itch\.io/.test(c.url))
      return { name: g.meta!.name, tagline: g.meta!.tagline ?? '', url: link?.url ?? ITCH, folder: g.path }
    })
}

/* ---------- fortune ---------- */


/* ---------- hidden files ---------- */

export const HIDDEN_FILES: Record<string, string> = {
  '/.secret': lines('eggs.secret-file').join('\n'),
}

/* ---------- neofetch colour blocks, with a star hidden among them ---------- */

function neofetchColours(): Line {
  const blocks = ['#0a0f0a', '#ff7a6b', '#3cff7a', '#f7d774', '#93a6f2', '#f49a8c', '#7dffa8', '#fffdf8'].map((c): Seg => ({ t: '███', color: c }))
  if (isFound('star-term')) return blocks
  // The star sits in a different gap every run.
  const at = 1 + Math.floor(runSeed('term') * (blocks.length - 1))
  return [...blocks.slice(0, at), { t: '✦', cls: 'dim', run: 'twinkle' }, ...blocks.slice(at)]
}

/* ---------- skins ---------- */

const SKINS: Skin[] = ['green', 'amber', 'ice', 'mono']

/* ---------- commands ---------- */

export const EGG_COMMANDS: Record<string, Command> = {
  neofetch: {
    desc: t('terminal.commands.neofetch'),
    run: () => {
      const { skin } = useTerm.getState()
      const info: Line[] = [
        [txt('danish', 'accent'), txt('@'), txt('dev', 'accent')],
        [txt('----------', 'dim')],
        ...lines('eggs.neofetch.rows', {
          uptime: uptime(),
          projects: projects().length,
          width: window.innerWidth,
          height: window.innerHeight,
          theme: document.documentElement.dataset.theme ?? 'light',
          skin,
          browser: browserName(),
        }).map((row): Line => {
          const at = row.indexOf(': ')
          return at < 0 ? [txt(row)] : [txt(row.slice(0, at + 2), 'accent'), txt(row.slice(at + 2))]
        }),
        [],
        neofetchColours(),
      ]
      const rows = Math.max(LOGO.length, info.length)
      const out: Line[] = []
      for (let i = 0; i < rows; i++) out.push([txt((LOGO[i] ?? '').padEnd(12), 'accent'), ...(info[i] ?? [])])
      useTerm.getState().push(...out)
    },
  },
  games: {
    desc: t('terminal.commands.games'),
    run: (_a, { print }) => {
      const fromFs = gamesFromFs()
      const list = fromFs.length ? fromFs : FALLBACK_GAMES
      print(say('eggs.games.title'))
      for (const g of list) {
        print(
          [g.folder ? { t: g.name, cls: 'dir', open: g.folder } : txt(g.name, 'accent'), txt('  '), { t: t('eggs.games.play'), href: g.url }],
          [txt('  ' + g.tagline, 'dim')],
        )
      }
      print(say('eggs.games.more', undefined, { itch: { t: 'danish-gamedev.itch.io', href: ITCH } }))
    },
  },
  itch: { desc: 'same as games', hidden: true, run: (a, c) => EGG_COMMANDS.games.run(a, c) },
  fortune: {
    desc: t('terminal.commands.fortune'),
    run: (_a, { print }) => print([txt(pick('eggs.fortunes'))]),
  },
  snake: {
    desc: t('terminal.commands.snake'),
    run: () => useTerm.getState().launch('snake'),
  },
  guess: {
    desc: t('terminal.commands.guess'),
    run: (_a, { print }) => {
      const target = 1 + Math.floor(Math.random() * 100)
      let tries = 0
      print(say('eggs.guess.start'))
      useTerm.getState().capture({
        prompt: 'guess> ',
        onInput: (line) => {
          const { push, capture } = useTerm.getState()
          if (line === 'q' || line === 'quit') {
            capture(null)
            return push(say('eggs.guess.gave-up', 'dim', { target }))
          }
          const n = Number(line)
          if (!Number.isInteger(n) || n < 1 || n > 100) return push(say('eggs.guess.invalid', 'err'))
          tries++
          if (n < target) return push(say('eggs.guess.higher'))
          if (n > target) return push(say('eggs.guess.lower'))
          capture(null)
          push([...say('eggs.guess.won', undefined, { tries }), ...say(tries <= 7 ? 'eggs.guess.won-fast' : 'eggs.guess.won-slow', 'dim')])
        },
      })
    },
  },
  matrix: {
    desc: t('terminal.commands.matrix'),
    run: () => useTerm.getState().launch('matrix'),
  },
  skin: {
    desc: t('terminal.commands.skin'),
    usage: 'skin <name>',
    run: (args, { print }) => {
      const names = isFound('konami') ? [...SKINS, 'rainbow' as Skin] : SKINS
      const want = args[0]?.toLowerCase() as Skin | undefined
      if (!want || !names.includes(want)) {
        const segs: Seg[] = [txt(t('eggs.skin.list'), 'dim')]
        names.forEach((n, i) => segs.push(...(i ? [txt(' ')] : []), cmd(n, `skin ${n}`)))
        return print(segs, say('eggs.skin.reload', 'dim'))
      }
      useTerm.getState().setSkin(want)
      print(say('eggs.skin.set', 'dim', { skin: want }))
    },
  },
  history: {
    desc: t('terminal.commands.history'),
    run: (_a, { print }) => {
      const { history } = useTerm.getState()
      history.forEach((h, i) => print([txt(String(i + 1).padStart(4) + '  ', 'dim'), { t: h, run: h }]))
    },
  },

  /* ----- hidden ----- */

  eggs: {
    desc: 'achievements',
    hidden: true,
    run: (_a, { print }) => {
      const n = Object.keys(useAchievements.getState().found).length
      if (!n) return print(say('eggs.eggs.none', 'dim'))
      useAchievements.getState().setNotepad(true)
      print(say('eggs.eggs.some', 'dim', { found: n, total: ACHIEVEMENTS.length }))
    },
  },
  achievements: { desc: 'achievements', hidden: true, run: (a, c) => EGG_COMMANDS.eggs.run(a, c) },
  twinkle: {
    desc: 'a star',
    hidden: true,
    run: (_a, { print }) => {
      if (isFound('star-term')) return print(say('eggs.twinkle.again', 'dim'))
      print(say('eggs.twinkle.caught', 'accent'))
      unlock('star-term')
    },
  },
  reboot: {
    desc: 'restart',
    hidden: true,
    run: (_a, { print }) => {
      print(say('eggs.reboot', 'bold'))
      setTimeout(restart, 500)
    },
  },
  restart: { desc: 'restart', hidden: true, run: (a, c) => EGG_COMMANDS.reboot.run(a, c) },
  shutdown: {
    desc: 'power off',
    hidden: true,
    run: (_a, { print }) => {
      print(say('eggs.shutdown', 'bold'))
      setTimeout(shutdown, 500)
    },
  },
  poweroff: { desc: 'power off', hidden: true, run: (a, c) => EGG_COMMANDS.shutdown.run(a, c) },
  halt: { desc: 'power off', hidden: true, run: (a, c) => EGG_COMMANDS.shutdown.run(a, c) },

  sudo: {
    desc: 'superpowers',
    hidden: true,
    run: (args, { print }) => {
      if (!args.length) return print(say('eggs.sudo.usage', 'err'))
      // The one sudo that works.
      if (/^hire\s+(danish|me)$/i.test(args.join(' '))) {
        unlock('sudo')
        const cv = getNode(CV_PATH)
        if (cv) openNode(cv)
        return print(say('eggs.sudo.hired'))
      }
      if (args.join(' ').toLowerCase() === 'make me a sandwich') {
        unlock('sudo')
        return print(say('eggs.sudo.sandwich'))
      }
      useTerm.getState().capture({
        prompt: raw('eggs.sudo.password'),
        secret: true,
        onInput: () => {
          const { push, capture } = useTerm.getState()
          capture(null)
          push(say('eggs.sudo.denied', 'err'), say('eggs.sudo.reported', 'dim'))
          unlock('sudo')
        },
      })
    },
  },
  rm: {
    desc: 'remove files',
    hidden: true,
    run: (args, { print }) => {
      const flags = args.filter((a) => a.startsWith('-')).join('')
      const targets = args.filter((a) => !a.startsWith('-'))
      const everything = /r/.test(flags) && targets.some((t) => ['/', '~', '*', '/*', '~/'].includes(t))
      if (!everything) return print(say('eggs.rm.read-only', 'err'))
      const paths: string[] = []
      const walk = (n: FsNode) => {
        if (n.type === 'dir') n.children.forEach(walk)
        if (n.path !== '/') paths.push(n.path)
      }
      walk(getNode('/')!)
      const shown = paths.slice(0, 24)
      shown.forEach((p, i) => later(60 * i, [txt(t('eggs.rm.removed', { path: p }), 'dim')]))
      later(60 * shown.length + 200, [txt(t('eggs.rm.more', { count: Math.max(0, paths.length - shown.length) }), 'dim')])
      later(60 * shown.length + 700, say('eggs.rm.busy', 'err'), say('eggs.rm.panic', 'err'))
      // The desktop empties out, then the blue screen. Any key afterwards comes back home.
      wipe(60 * shown.length + 2200)
    },
  },
  vim: {
    desc: 'the editor',
    hidden: true,
    run: (args, { print }) => {
      let tries = 0
      print(...sayAll('eggs.vim.screen', undefined, { file: args[0] ?? t('eggs.vim.no-name') }))
      useTerm.getState().capture({
        prompt: '',
        trap: t('eggs.vim.trap'),
        onInput: (line) => {
          const { push, capture } = useTerm.getState()
          if ([':q', ':q!', ':qa', ':qa!', ':wq', ':x', 'ZZ'].includes(line.trim())) {
            capture(null)
            push(say('eggs.vim.escaped'))
            return unlock('vim')
          }
          tries++
          push(line.startsWith(':') ? [txt(t('eggs.vim.not-a-command', { command: line.slice(1) }), 'err')] : say('eggs.vim.insert', 'err'))
          if (tries === 3) push(say('eggs.vim.hint'))
        },
      })
    },
  },
  vi: { desc: 'the editor', hidden: true, run: (a, c) => EGG_COMMANDS.vim.run(a, c) },
  nvim: { desc: 'the editor', hidden: true, run: (a, c) => EGG_COMMANDS.vim.run(a, c) },
  nano: {
    desc: 'the friendly editor',
    hidden: true,
    run: (_a, { print }) => print(say('eggs.nano', 'dim')),
  },
  emacs: {
    desc: 'the other editor',
    hidden: true,
    run: (_a, { print }) => print(say('eggs.emacs', 'err')),
  },
  ':q': {
    desc: 'quit',
    hidden: true,
    run: (_a, { print }) => print(say('eggs.quit-outside-vim', 'dim')),
  },
  hack: {
    desc: 'hack the mainframe',
    hidden: true,
    run: () => {
      const steps = lines('eggs.hack.steps')
      steps.forEach((s, i) => later(450 * i, [txt('> ' + s, 'dim')]))
      later(450 * steps.length + 300, say('eggs.hack.granted', 'bold'))
      // Then the whole screen gets "hacked". Any key afterwards comes back home.
      setTimeout(() => takeover('hack'), 450 * steps.length + 1000)
    },
  },
  coffee: {
    desc: 'brew coffee',
    hidden: true,
    run: (_a, { print }) => {
      print(say('eggs.coffee.brewing', 'dim'))
      later(900, say('eggs.coffee.teapot', 'err'), say('eggs.coffee.try-tea'))
      setTimeout(() => unlock('coffee'), 950)
    },
  },
  brew: { desc: 'brew', hidden: true, run: (a, c) => (a[0] === 'coffee' ? EGG_COMMANDS.coffee.run(a, c) : c.print(say('eggs.brew-missing', 'err', { name: a[0] ?? '?' }))) },
  tea: {
    desc: 'tea',
    hidden: true,
    // The steam (first two lines) is dimmer than the cup.
    run: (_a, { print }) => print(...lines('eggs.tea.art').map((l, i): Line => [txt(l, i < 2 ? 'dim' : undefined)]), say('eggs.tea.ready', 'accent')),
  },
  make: {
    desc: 'make',
    hidden: true,
    run: (args, c) => {
      const what = args.join(' ').toLowerCase()
      if (what === 'coffee') return EGG_COMMANDS.coffee.run([], c)
      if (what === 'me a sandwich') return c.print(say('eggs.make.sandwich', 'err'))
      // Plain text, not markup: the *** is part of the joke.
      c.print(err(t('eggs.make.no-rule', { target: args[0] ?? 'all' })))
    },
  },
  xyzzy: {
    desc: 'magic',
    hidden: true,
    run: (_a, { print }) => {
      print(say('eggs.xyzzy'))
      unlock('xyzzy')
    },
  },
  plugh: { desc: 'magic', hidden: true, run: (_a, { print }) => print(say('eggs.plugh')) },
  '42': {
    desc: 'the answer',
    hidden: true,
    run: (_a, { print }) => {
      print(say('eggs.answer'))
      unlock('answer')
    },
  },
  hello: { desc: 'say hi', hidden: true, run: (_a, { print }) => print(say('eggs.hello')) },
  hi: { desc: 'say hi', hidden: true, run: (a, c) => EGG_COMMANDS.hello.run(a, c) },
  ping: {
    desc: 'ping a host',
    hidden: true,
    run: (args) => {
      const host = args[0] ?? 'danishali.dev'
      later(0, [txt(t('eggs.ping.start', { host }))])
      for (let i = 0; i < 4; i++) later(400 * (i + 1), [txt(t('eggs.ping.reply', { host, seq: i, ms: (Math.random() * 3 + 0.4).toFixed(1) }))])
      later(1800, say('eggs.ping.done', 'dim'))
    },
  },
  uname: {
    desc: 'system name',
    hidden: true,
    run: (args, { print }) => print([txt(args.includes('-a') ? t('eggs.uname.all', { browser: browserName() }) : t('eggs.uname.short'))]),
  },
  man: {
    desc: 'manual pages',
    hidden: true,
    run: (args, { print }) => {
      if (!args[0]) return print(say('eggs.man.which'))
      print(say('eggs.man.try', undefined, { page: args[0] }))
    },
  },
  git: {
    desc: t('terminal.commands.git'),
    usage: 'git log',
    run: (args, { print }) => {
      const sub = args[0]
      if (sub === 'status') return print(...sayAll('terminal.git.status'))
      if (sub === 'log') return gitLog(args.slice(1), print)
      if (sub === 'blame') return print(say('terminal.git.blame'))
      if (sub === 'push') return print(say('terminal.git.push', 'err'))
      print(say('terminal.git.repo', undefined, { link: { t: 'github.com/danishali-codes', href: 'https://github.com/danishali-codes' } }))
    },
  },
}
