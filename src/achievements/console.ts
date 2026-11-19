// A hello for anyone who opens DevTools, and a login hidden in the console (an idea from lupine.dev).
import { ACHIEVEMENTS, getProgress, isFound, unlock, useAchievements } from '.'
import { lines, raw, t } from '../text'

const big = 'font: 800 28px/1.2 "JetBrains Mono", monospace; color: #3cff7a; background: #0a0f0a; padding: 6px 12px; border-radius: 6px'
const body = 'font: 500 13px/1.6 "JetBrains Mono", monospace'
const accent = 'font: 700 13px/1.6 "JetBrains Mono", monospace; color: #f7b267'

const EYES = String.raw`
    .-""-.      .-""-.
   /  _   \    /  _   \
  |  (o)  |    |  (o)  |
   \     /      \     /
    '-..-'      '-..-'
`

const PASSWORD = 'hunter2'
let wrong = 0

const danish = {
  help() {
    console.log(
      `%cdanish.help()%c        ${t('gags.console.help.help')}\n%cdanish.login("password")%c  ${t('gags.console.help.login')}\n%cdanish.whoami()%c      ${t('gags.console.help.whoami')}\n%cdanish.progress()%c    ${t('gags.console.help.progress')}`,
      accent, body, accent, body, accent, body, accent, body,
    )
    return t('gags.console.shrug')
  },
  login(password?: string) {
    if (isFound('console')) {
      useAchievements.setState({ latest: { id: 'console', at: Date.now() }, notepadOpen: true })
      return t('gags.console.already')
    }
    if (password === undefined) return t('gags.console.usage')
    if (String(password).trim().toLowerCase() !== PASSWORD) {
      wrong++
      const replies = lines('gags.console.wrong')
      return replies[Math.min(wrong, replies.length) - 1]
    }
    console.log(`%c${t('gags.console.granted')}`, big)
    console.log(`%c${t('gags.console.welcome')}`, body)
    unlock('console')
    return t('gags.console.granted-return')
  },
  whoami() {
    console.log(`%c${t('gags.console.whoami')} %chttps://github.com/danishali-codes`, body, accent)
  },
  progress() {
    const p = getProgress()
    console.table(ACHIEVEMENTS.map((a) => ({ achievement: a.id in p.found ? a.title : '???', found: a.id in p.found ? new Date(p.found[a.id]).toLocaleTimeString() : '' })))
    return `${Object.keys(p.found).length}/${p.total}`
  },
  toString: () => t('gags.console.try-help'),
}

export function greet() {
  ;(window as unknown as { danish: typeof danish }).danish = danish
  console.log(`%c${EYES}`, 'font: 700 12px/1.1 monospace; color: #3cff7a')
  console.log(`%c${t('gags.console.hello')}`, big)
  // %c switches the style, so the danish.help() in the middle shows up in the accent colour.
  const [before, after = ''] = raw('gags.console.warning').replace(/%/g, '%%').split('{help}')
  console.log(`%c${before}%cdanish.help()%c${after}`, body, accent, body)
  console.log(`%c${t('gags.console.credit').replace(/%/g, '%%')}`, 'font: 500 11px monospace; color: #888')
}
