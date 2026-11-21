// Generate shareable HTML and PNG cards after Vite has built the desktop.
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { marked } from 'marked'
import sharp from 'sharp'
import opentype from 'opentype.js'

const root = fileURLToPath(new URL('..', import.meta.url))
const out = join(root, 'dist')
const tree = JSON.parse(readFileSync(join(root, 'src/generated/fs.json'), 'utf8'))
// Wording from content/text (see scripts/build-text.mjs).
const TEXT = JSON.parse(readFileSync(join(root, 'src/generated/text.json'), 'utf8'))
const t = (key, vars = {}) => String(TEXT[key] ?? key).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m))
const pageTitle = (page) => t('site.page-title', { page })
// Nunito 700 is the above-the-fold UI weight. Preload the latin woff2 Vite emitted,
// at the absolute URL the built CSS requests, on every prerendered page.
const nunitoFile = readdirSync(join(out, 'assets')).filter((file) => /^nunito-latin-700-normal-.+\.woff2$/.test(file))
if (nunitoFile.length !== 1) throw new Error('expected one Nunito 700 latin woff2 in dist/assets, found ' + (nunitoFile.join(', ') || 'none'))
const nunitoHref = '/assets/' + nunitoFile[0]
const nunitoReferenced = readdirSync(join(out, 'assets')).filter((file) => file.endsWith('.css')).some((file) => readFileSync(join(out, 'assets', file), 'utf8').includes(nunitoFile[0]))
if (!nunitoReferenced) throw new Error('Nunito preload ' + nunitoHref + ' is not referenced by the built CSS')
const nunitoPreload = '<link rel="preload" as="font" type="font/woff2" crossorigin href="' + nunitoHref + '" />'
function withNunitoPreload(html) {
  const stripped = html.replace(/[ \t]*<link\b[^>]*\bas="font"[^>]*>\n?/g, '')
  return stripped.replace('<meta charset="UTF-8" />', '<meta charset="UTF-8" />\n    ' + nunitoPreload)
}
const template = withNunitoPreload(readFileSync(join(out, 'index.html'), 'utf8')
  .replace(/<!--portfolio-meta:start-->[\s\S]*?<!--portfolio-meta:end-->/g, '')
  .replace(/<div id="root">[\s\S]*?<\/div>(?=\s*<noscript>)/, '<div id="root"></div>'))
const origin = 'https://danishali.dev'
const contact = JSON.parse(readFileSync(join(root, 'content/contact.json'), 'utf8'))
// Structured data so a search for Danish's name can show who he is and where his profiles are.
const person = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: contact.name,
  url: origin + '/',
  jobTitle: contact.role,
  email: contact.email ? 'mailto:' + contact.email : undefined,
  address: { '@type': 'PostalAddress', addressLocality: 'Dubai', addressCountry: 'AE' },
  sameAs: (contact.links ?? []).map((l) => l.url).filter((u) => /^https:\/\//.test(u)),
}
const personTag = '<script type="application/ld+json">' + JSON.stringify(person).replace(/</g, '\\u003c') + '</script>'
// Same LinkedIn URL as contact.links, which Person.sameAs already publishes.
const linkedin = (contact.links ?? []).find((l) => l.label === 'LinkedIn' && l.url === 'https://www.linkedin.com/in/danishali121/')
function withLinkedIn(text) {
  if (!linkedin || text.includes(linkedin.url)) return text
  const handle = linkedin.url.match(/\/in\/([^/]+)\/?$/)?.[1] ?? linkedin.label
  const line = '- ' + linkedin.label + ': [' + handle + '](' + linkedin.url + ')'
  const nl = text.startsWith('# ') ? text.indexOf('\n') : -1
  if (nl !== -1) return text.slice(0, nl) + '\n\n' + line + text.slice(nl)
  return line + '\n\n' + text
}
function openLinkedIn(html) {
  if (!linkedin) return html
  const href = escape(linkedin.url)
  return html.replaceAll('<a href="' + href + '">', '<a href="' + href + '" target="_blank" rel="noopener noreferrer">')
}
// Same new-tab treatment for the live sites named in the project write-ups.
const LIVE_SITES = ['https://fuloos.danishali.dev', 'https://jeopardy.danishali.dev', 'https://ledger.danishali.dev']
function openLiveSites(html) {
  return LIVE_SITES.reduce((out, href) => out.replaceAll('<a href="' + href + '">', '<a href="' + href + '" target="_blank" rel="noopener noreferrer">'), html)
}
const font = opentype.parse(readFileSync(join(root, 'node_modules/@fontsource/nunito/files/nunito-latin-800-normal.woff')))
function label(text, x, y, size, align = 'left') {
  const glyphs = [...text].map((char) => font.charToGlyph(char))
  const width = glyphs.reduce((n, glyph) => n + (glyph.advanceWidth ?? 0) * size / font.unitsPerEm, 0)
  let pen = align === 'right' ? x - width : x
  return glyphs.map((glyph) => {
    const path = glyph.getPath(pen, y, size).toPathData()
    pen += (glyph.advanceWidth ?? 0) * size / font.unitsPerEm
    return '<path d="' + path + '" />'
  }).join('')
}
const escape = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const plain = (text = '') => text.replace(/<!--[\s\S]*?-->/g, '').replace(/[#*_`]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\s+/g, ' ').trim()
const readme = (dir) => dir.children.find((c) => c.name.toLowerCase() === 'readme.md')?.text ?? ''
const pages = [
  { route: '/', title: t('site.home-title'), name: t('site.home-title'), description: t('site.pages.home.description'), text: t('site.pages.home.text') },
  { route: '/projects', title: pageTitle(t('site.pages.projects.title')), name: t('site.pages.projects.title'), description: t('site.pages.projects.description'), text: '# ' + t('site.pages.projects.title') },
]
function walk(dir) {
  if (dir.type !== 'dir') return
  if (dir.meta && (dir.path.startsWith('/projects/') || dir.path.startsWith('/trash/'))) {
    pages.push({ route: dir.path, title: pageTitle(dir.meta.name), name: dir.meta.name, description: dir.meta.tagline || plain(readme(dir)).slice(0, 160), text: readme(dir), color: dir.meta.color, aliases: dir.path.startsWith('/projects/') ? ['/projects/' + dir.name, ...(dir.meta.aliases ?? []).map((a) => '/projects/' + a)] : [] })
  }
  for (const child of dir.children) walk(child)
}
walk(tree)
const trash = tree.children.find((c) => c.path === '/trash')
if (trash) pages.push({ route: '/trash', title: pageTitle(t('site.pages.trash.title')), name: t('site.pages.trash.title'), description: t('site.pages.trash.description'), text: readme(trash) })
for (const [route, file, key] of [['/about', 'about.md', 'site.pages.about'], ['/contact', 'cv.md', 'site.pages.contact'], ['/now', 'now.md', 'site.pages.now.title'], ['/uses', 'uses.md', 'site.pages.uses.title'], ['/resume', 'resume.md', 'site.pages.resume.title']]) {
  const text = tree.children.find((c) => c.name === file)?.text ?? ''
  pages.push({ route, title: pageTitle(t(key)), name: t(key), description: plain(text).slice(0, 160), text })
}
for (const [route, key] of [['/welcome', 'welcome'], ['/ask', 'ask'], ['/stats', 'stats'], ['/terminal', 'terminal'], ['/guestbook', 'guestbook'], ['/updates', 'updates'], ['/wallpaper', 'wallpaper']]) {
  const name = t('desktop.titles.' + key)
  pages.push({ route, title: pageTitle(name), name, description: t('site.pages.app-description', { page: name }), text: '# ' + name })
}
const projectList = pages.filter((p) => p.route.startsWith('/projects/')).map((p) => '- [' + p.name + '](' + p.route + ') — ' + p.description).join('\n')
pages.find((p) => p.route === '/').text += '\n\n## ' + t('site.pages.home.projects-heading') + '\n\n' + projectList
pages.find((p) => p.route === '/projects').text += '\n\n' + projectList

// Each card is rendered from text and shapes; no external image service is needed.
function lines(text, limit = 36) {
  const rows = ['']
  for (const word of text.split(/\s+/)) {
    const i = rows.length - 1
    if ((rows[i] + ' ' + word).trim().length > limit && rows[i]) rows.push(word)
    else rows[i] = (rows[i] + ' ' + word).trim()
  }
  return rows
}
for (const page of pages) {
  if (page.route === '/about' || page.route === '/contact' || page.route === '/resume') page.text = withLinkedIn(page.text)
  const key = page.route.slice(1).replaceAll('/', '--') || 'home'
  const image = origin + '/og/' + key + '.png'
  const headline = lines(page.name, 28).slice(0, 3)
  const subtitle = lines(page.description, 64).slice(0, 2)
  const color = /^#[0-9a-f]{3,8}$/i.test(page.color ?? '') ? page.color : '#7cc9a0'
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">' +
    '<rect width="1200" height="630" fill="#f6f1e7"/><rect x="36" y="36" width="1128" height="558" rx="28" fill="#fffdf8" stroke="#262621" stroke-width="3"/>' +
    '<rect x="36" y="36" width="1128" height="68" rx="28" fill="' + color + '"/><path d="M36 104h1128" stroke="#262621" stroke-width="3"/>' +
    '<g fill="#262621">' + label('da / portfolio', 76, 81, 24) +
    headline.map((line, i) => label(line, 76, 210 + i * 70, 58)).join('') +
    subtitle.map((line, i) => label(line, 76, 440 + i * 34, 27)).join('') +
    label('danishali.dev', 76, 554, 24) + label('Apps · Games · Applied AI', 1120, 554, 22, 'right') + '</g></svg>'
  mkdirSync(join(out, 'og'), { recursive: true })
  await sharp(Buffer.from(svg)).png().toFile(join(out, 'og', key + '.png'))

  let html = template.replace(/<title>[\s\S]*?<\/title>/, '<title>' + escape(page.title) + '</title>')
  for (const [attr, name, value] of [
    ['name', 'description', page.description], ['property', 'og:title', page.title], ['property', 'og:description', page.description],
    ['property', 'og:url', origin + page.route], ['name', 'twitter:title', page.title], ['name', 'twitter:description', page.description],
    ['name', 'twitter:card', 'summary_large_image'],
  ]) {
    html = html.replace(new RegExp('<meta ' + attr + '="' + name + '"[^>]*>'), '<meta ' + attr + '="' + name + '" content="' + escape(value) + '" />')
  }
  const tags = '<link rel="canonical" href="' + origin + page.route + '" />\n' +
    '<meta property="og:image" content="' + image + '" /><meta property="og:image:width" content="1200" /><meta property="og:image:height" content="630" />' +
    '<meta property="og:image:alt" content="' + escape(page.title) + '" /><meta name="twitter:image" content="' + image + '" />'
  html = html.replace('</head>', '<!--portfolio-meta:start-->' + tags + (page.route === '/' ? personTag : '') + '<!--portfolio-meta:end-->\n</head>')
  const parsed = marked.parse(page.text.replace(/<!--[\s\S]*?-->/g, ''))
  const article = openLinkedIn(page.route.startsWith('/projects/') ? openLiveSites(parsed) : parsed)
  html = html.replace('<div id="root"></div>', '<div id="root"><main style="max-width:760px;margin:48px auto;padding:24px;font:18px/1.6 sans-serif">' + article + '</main></div>')
  const dest = page.route === '/' ? join(out, 'index.html') : join(out, page.route, 'index.html')
  mkdirSync(dirname(dest), { recursive: true })
  writeFileSync(dest, html)
  // Preserve existing short project links, but point crawlers at the full canonical path.
  // Old names (Lockout's /projects/jeopardy) keep working the same way.
  for (const route of page.aliases ?? []) {
    if (route === page.route || pages.some((p) => p.route === route) || !/^\/projects\/[a-z0-9-]+$/.test(route)) continue
    const alias = join(out, route, 'index.html')
    mkdirSync(dirname(alias), { recursive: true })
    writeFileSync(alias, html)
  }
}

// Anything else gets the desktop with a "not found" window, served by Vercel with a real 404 status.
const notFound = template
  .replace(/<title>[\s\S]*?<\/title>/, '<title>' + escape(pageTitle(t('site.not-found'))) + '</title>')
  .replace('</head>', '<meta name="robots" content="noindex" />\n</head>')
  .replace('<div id="root"></div>', '<div id="root"><main style="max-width:760px;margin:48px auto;padding:24px;font:18px/1.6 sans-serif"><h1>' + escape(t('site.not-found')) + '</h1><p>' + marked.parseInline(t('site.pages.not-found-body')) + '</p></main></div>')
writeFileSync(join(out, '404.html'), notFound)
mkdirSync(join(out, 'simple'), { recursive: true })
writeFileSync(join(out, 'simple/index.html'), readFileSync(join(out, 'resume/index.html')))
mkdirSync(join(out, 'cv'), { recursive: true })
writeFileSync(join(out, 'cv/index.html'), readFileSync(join(out, 'contact/index.html')))
writeFileSync(join(out, 'sitemap.xml'), readFileSync(join(root, 'public/sitemap.xml')))
if (!existsSync(join(out, nunitoHref.slice(1)))) throw new Error('preloaded font is not in dist: ' + nunitoHref)
for (const page of ['index.html', 'about/index.html', '404.html']) {
  const html = readFileSync(join(out, page), 'utf8')
  if (!html.includes(nunitoPreload)) throw new Error('font preload missing from ' + page)
}
console.log('pages: ' + pages.length + ' HTML pages and social preview cards generated')
console.log('font preload: ' + nunitoHref)
