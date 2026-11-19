import { getNode } from '../fs'
import type { FsNode } from '../fs/types'
import { t } from '../text'

const DEFAULT_TITLE = t('site.home-title')
const DEFAULT_DESCRIPTION = t('site.description')
const pageTitle = (page: string) => t('site.page-title', { page })
const DEFAULT_URL = 'https://danishali.dev/'

/** Deep links that open a file, the way /cv opens the CV. */
const PAGES: Record<string, { file: string; title: string; description: string }> = {
  cv: { file: '/cv.md', title: pageTitle(t('site.pages.contact')), description: DEFAULT_DESCRIPTION },
  contact: { file: '/cv.md', title: pageTitle(t('site.pages.contact')), description: DEFAULT_DESCRIPTION },
  now: { file: '/now.md', title: pageTitle(t('site.pages.now.title')), description: t('site.pages.now.description') },
  uses: { file: '/uses.md', title: pageTitle(t('site.pages.uses.title')), description: t('site.pages.uses.description') },
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
  title: pageTitle(t('site.pages.resume.title')),
  description: t('site.pages.resume.description'),
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
