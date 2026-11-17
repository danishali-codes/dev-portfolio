import { getNode } from '../fs'
import type { FsNode } from '../fs/types'

const DEFAULT_TITLE = 'Danish Ali · Dev portfolio'
const DEFAULT_DESCRIPTION = "Danish Ali's projects: Fuloos, Lockout and more, presented as a tiny operating system."
const DEFAULT_URL = 'https://danishali.dev/'

/** Deep links that open a file, the way /cv opens the CV. */
const PAGES: Record<string, { file: string; title: string; description: string }> = {
  cv: { file: '/cv.md', title: 'CV & contact · Danish Ali', description: DEFAULT_DESCRIPTION },
  contact: { file: '/cv.md', title: 'CV & contact · Danish Ali', description: DEFAULT_DESCRIPTION },
  now: {
    file: '/now.md',
    title: 'Now · Danish Ali',
    description: 'What Danish is working on: this site, Lockout, and a Master of Applied AI at UOW Dubai.',
  },
  uses: {
    file: '/uses.md',
    title: 'Uses · Danish Ali',
    description: 'Vite, React, TypeScript, Tailwind, PocketBase and Vercel, plus an NVIDIA RTX 4070 Ti for local training.',
  },
}

export function pageRoute(pathname: string) {
  const key = pathname.replace(/\/+$/, '').replace(/^\//, '').toLowerCase()
  return PAGES[key]
}

/** The file a deep link opens, if it is one. */
export function pageNode(pathname = location.pathname): FsNode | undefined {
  const route = pageRoute(pathname)
  return route ? getNode(route.file) : undefined
}

const PLAIN = {
  title: 'Résumé · Danish Ali',
  description: 'Danish Ali, a developer in Dubai. Fuloos, Lockout and Ledger, plus how to get in touch.',
}

/** Point the existing title and description tags at /now, /uses or /resume. Other paths keep the defaults. */
export function applyRouteMeta(pathname = location.pathname) {
  const plain = pathname.replace(/\/+$/, '').replace(/^\//, '').toLowerCase()
  const plainPage = plain === 'resume' || plain === 'simple'
  const route = pageRoute(pathname)
  const own = route?.file === '/now.md' || route?.file === '/uses.md'
  const title = plainPage ? PLAIN.title : own && route ? route.title : DEFAULT_TITLE
  const description = plainPage ? PLAIN.description : own && route ? route.description : DEFAULT_DESCRIPTION
  document.title = title
  const set = (selector: string, value: string) => document.querySelector(selector)?.setAttribute('content', value)
  set('meta[name="description"]', description)
  set('meta[property="og:title"]', title)
  set('meta[property="og:description"]', description)
  set('meta[name="twitter:title"]', title)
  set('meta[name="twitter:description"]', description)
  const url = plainPage || (own && route) ? `https://danishali.dev${pathname.replace(/\/+$/, '') || '/'}` : DEFAULT_URL
  set('meta[property="og:url"]', url)
}
