// Every achievement, in order. Kept free of browser code so the leaderboard server can import it too.
// The titles and hints live in content/text/achievements.yaml.

export const ACHIEVEMENT_IDS = [
  'sudo',
  'rm',
  'hack',
  'vim',
  'coffee',
  'xyzzy',
  'answer',
  'dotfile',
  'escape',
  'konami',
  'restart',
  'shutdown',
  'reader',
  'wordpress',
  'console',
  'header',
  'dns',
  'star-sky',
  'star-menu',
  'star-term',
] as const

export interface Achievement {
  id: (typeof ACHIEVEMENT_IDS)[number]
  title: string
  /** Shown in the notepad before it's found. */
  hint: string
  /** Shown once found. */
  done: string
}
