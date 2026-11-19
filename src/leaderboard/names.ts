// Name rules for the leaderboards. The browser checks first so people get a
// quick answer, and the server checks again because it can't trust the browser.

import { RegExpMatcher, englishDataset, englishRecommendedTransformers } from 'obscenity'
import { st } from '../generated/server-text.js'

export const NAME_MIN = 2
export const NAME_MAX = 16

const matcher = new RegExpMatcher({ ...englishDataset.build(), ...englishRecommendedTransformers })

/** Names that would pass the filter but read as the site speaking. */
const RESERVED = ['admin', 'administrator', 'moderator', 'mod', 'root', 'system', 'danish', 'danishali', 'owner', 'staff', 'official']

/** Trims and squashes spaces. */
export function tidyName(raw: string) {
  return raw.normalize('NFKC').replace(/\s+/g, ' ').trim()
}

/** Returns why a name can't be used, or null when it's fine. Pass it through `tidyName` first. */
export function nameProblem(name: string): string | null {
  if (name.length < NAME_MIN) return st('server.leaderboard.names.too-short', { min: NAME_MIN })
  if (name.length > NAME_MAX) return st('server.leaderboard.names.too-long', { max: NAME_MAX })
  if (!/^[A-Za-z0-9 _.-]+$/.test(name)) return st('server.leaderboard.names.characters')
  if (!/[A-Za-z0-9]/.test(name)) return st('server.leaderboard.names.needs-letter')
  const squashed = name.replace(/[\s_.-]+/g, '')
  if (RESERVED.includes(squashed.toLowerCase())) return st('server.leaderboard.names.taken')
  if (matcher.hasMatch(name) || matcher.hasMatch(squashed)) return st('server.leaderboard.names.rude')
  return null
}
