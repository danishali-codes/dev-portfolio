import { allProjects, findProject, findReadme, getNode } from '../fs'
import { specFor } from '../apps/spec'
import type { OpenSpec } from '../store/windows'

const SPECIAL: Record<string, OpenSpec> = {
  '/ask': { kind: 'ask', title: 'Ask Danish' },
  '/terminal': { kind: 'terminal', title: 'Terminal' },
  '/stats': { kind: 'stats', title: 'Stats' },
  '/guestbook': { kind: 'guestbook', title: 'Guestbook' },
  '/updates': { kind: 'updates', title: 'System Updates' },
  '/wallpaper': { kind: 'wallpaper', title: 'Wallpaper' },
}
const DOCUMENTS: Record<string, string> = { '/uses': '/uses.md', '/resume': '/resume.md', '/about': '/about.md', '/now': '/now.md', '/cv': '/cv.md', '/contact': '/cv.md' }

function shareableProjects() {
  const archive = getNode('/trash')
  return [...allProjects(), ...(archive?.type === 'dir' ? allProjects(archive) : [])]
}

export function routeFor(spec?: OpenSpec): string {
  if (!spec) return '/'
  if (spec.kind === 'cv') return '/contact'
  for (const [route, path] of Object.entries(DOCUMENTS)) if (path === spec.path) return route
  if (!spec.path) return Object.entries(SPECIAL).find(([, s]) => s.kind === spec.kind)?.[0] ?? '/'
  if (spec.path === '/projects' || spec.path === '/trash') return spec.path
  const project = shareableProjects().find((p) => spec.path === p.path || spec.path === findReadme(p)?.path)
  if (project) return project.path + (spec.kind === 'folder' ? '?view=files' : '')
  return '/files' + spec.path.split('/').map(encodeURIComponent).join('/')
}

export function specFromUrl(input = location.href): OpenSpec | undefined {
  const url = new URL(input, location.origin)
  let path: string
  try { path = decodeURIComponent(url.pathname).replace(/\/+$/, '') || '/' } catch { return undefined }
  if (SPECIAL[path]) return SPECIAL[path]
  const doc = DOCUMENTS[path] && getNode(DOCUMENTS[path])
  if (doc) return specFor(doc)
  if (path.startsWith('/files/')) {
    const node = getNode(path.slice(6))
    return node ? specFor(node) : undefined
  }
  if (path === '/projects' || path === '/trash') {
    const node = getNode(path)
    return node ? specFor(node) : undefined
  }
  if (path.startsWith('/projects/') || path.startsWith('/trash/')) {
    const exact = getNode(path)
    const project = exact?.type === 'dir' ? exact : findProject(path.slice('/projects/'.length))
    if (project) return specFor(url.searchParams.get('view') === 'files' ? project : findReadme(project) ?? project)
  }
  return undefined
}

export function initialiseHistory() {
  if (typeof history.state?.paperosIndex !== 'number') history.replaceState({ ...history.state, paperosIndex: 0 }, '')
}

export function syncNavigation(spec?: OpenSpec) {
  const route = routeFor(spec)
  if (route !== location.pathname + location.search) {
    history.pushState({ paperosIndex: (history.state?.paperosIndex ?? 0) + 1 }, '', route)
    window.dispatchEvent(new Event('paperos:navigation'))
  }
  updateMetadata(spec)
}

export function updateMetadata(spec?: OpenSpec) {
  const route = routeFor(spec).split('?')[0]
  const project = shareableProjects().find((p) => p.path === route)
  const title = spec ? (project?.meta?.name ?? spec.title.replace(' · README', '')) + ' · Danish Ali' : 'Danish Ali · Dev portfolio'
  const description = project?.meta?.tagline ?? "Danish Ali, a developer in Dubai building apps, games and tools for his homelab."
  const set = (selector: string, content: string) => document.querySelector<HTMLMetaElement>(selector)?.setAttribute('content', content)
  document.title = title
  set('meta[name="description"]', description)
  set('meta[property="og:title"]', title)
  set('meta[property="og:description"]', description)
  set('meta[name="twitter:title"]', title)
  set('meta[name="twitter:description"]', description)
  const publicRoute = route.startsWith('/files') ? '/' : route
  const canonical = 'https://danishali.dev' + publicRoute
  const image = 'https://danishali.dev/og/' + (publicRoute.slice(1).split('/').join('--') || 'home') + '.png'
  set('meta[property="og:url"]', canonical)
  set('meta[property="og:image"]', image)
  set('meta[name="twitter:image"]', image)
  document.querySelector('link[rel="canonical"]')?.setAttribute('href', canonical)
}
