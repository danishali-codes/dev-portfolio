// Routes the desktop and the phone actually open. Secret paths (/found/*, wp-admin)
// and the trash can are not pages, so they stay out.
export const SITE = 'https://danishali.dev'

export function xmlEscape(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[ch])
}

function walkProjects(dir, out) {
  for (const child of dir?.children ?? []) {
    if (child.type !== 'dir') continue
    if (child.meta) out.push(child)
    walkProjects(child, out)
  }
  return out
}

/** Absolute URLs for /, /cv, /contact, /now, /uses, /resume and every canonical project path. */
export function sitemapUrls(tree, lastmod = () => undefined) {
  const projects = tree.children?.find((child) => child.type === 'dir' && child.name === 'projects')
  const urls = [
    { loc: `${SITE}/`, lastmod: lastmod('content') },
    { loc: `${SITE}/projects`, lastmod: lastmod('content/projects') },
    { loc: `${SITE}/about`, lastmod: lastmod('content/about.md') },
    { loc: `${SITE}/contact`, lastmod: lastmod('content/contact.json') },
    { loc: `${SITE}/now`, lastmod: lastmod('content/now.md') },
    { loc: `${SITE}/uses`, lastmod: lastmod('content/uses.md') },
    { loc: `${SITE}/resume`, lastmod: lastmod('content/resume.md') },
  ]
  for (const project of walkProjects(projects, [])) {
    const when = lastmod(`content${project.path}`)
    const loc = SITE + project.path.split('/').map(encodeURIComponent).join('/')
    if (!urls.some((url) => url.loc === loc)) urls.push({ loc, lastmod: when })
  }
  return urls
}

export function sitemapXml(urls) {
  const body = urls
    .map((url) => {
      const last = url.lastmod ? `\n    <lastmod>${xmlEscape(url.lastmod)}</lastmod>` : ''
      return `  <url>\n    <loc>${xmlEscape(url.loc)}</loc>${last}\n  </url>`
    })
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`
}
