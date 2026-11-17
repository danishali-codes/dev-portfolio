// Generate shareable HTML and PNG cards after Vite has built the desktop.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { marked } from 'marked'
import sharp from 'sharp'
import opentype from 'opentype.js'

const root = fileURLToPath(new URL('..', import.meta.url))
const out = join(root, 'dist')
const tree = JSON.parse(readFileSync(join(root, 'src/generated/fs.json'), 'utf8'))
const template = readFileSync(join(out, 'index.html'), 'utf8')
  .replace(/<!--portfolio-meta:start-->[\s\S]*?<!--portfolio-meta:end-->/g, '')
  .replace(/<div id="root">[\s\S]*?<\/div>(?=\s*<noscript>)/, '<div id="root"></div>')
const origin = 'https://danishali.dev'
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
  { route: '/', title: 'Danish Ali · Dev portfolio', description: 'Developer in Dubai building apps, games and tools for his homelab.', text: '# Hi, I’m Danish.\n\nI build apps, games and tools for my homelab.\n\n[Selected work](/projects) · [About](/about) · [Contact](/contact)' },
  { route: '/projects', title: 'Selected work · Danish Ali', description: 'Apps, games and applied AI projects by Danish Ali.', text: '# Selected work' },
]
function walk(dir) {
  if (dir.type !== 'dir') return
  if (dir.meta && (dir.path.startsWith('/projects/') || dir.path.startsWith('/trash/'))) {
    pages.push({ route: dir.path, title: dir.meta.name + ' · Danish Ali', description: dir.meta.tagline || plain(readme(dir)).slice(0, 160), text: readme(dir), color: dir.meta.color, alias: dir.path.startsWith('/projects/') ? '/projects/' + dir.name : undefined })
  }
  for (const child of dir.children) walk(child)
}
walk(tree)
const trash = tree.children.find((c) => c.path === '/trash')
if (trash) pages.push({ route: '/trash', title: 'Project archive · Danish Ali', description: 'Abandoned experiments and lessons from earlier projects.', text: readme(trash) })
for (const [route, name, title] of [['/about', 'about.md', 'About'], ['/contact', 'cv.md', 'CV & contact'], ['/now', 'now.md', 'Now'], ['/uses', 'uses.md', 'Uses'], ['/resume', 'resume.md', 'Résumé']]) {
  const text = tree.children.find((c) => c.name === name)?.text ?? ''
  pages.push({ route, title: title + ' · Danish Ali', description: plain(text).slice(0, 160), text })
}
for (const [route, title] of [['/ask', 'Ask Danish'], ['/stats', 'Stats'], ['/terminal', 'Terminal'], ['/guestbook', 'Guestbook'], ['/updates', 'System Updates'], ['/wallpaper', 'Wallpaper']]) {
  pages.push({ route, title: title + ' · Danish Ali', description: title + ' on Danish Ali’s interactive portfolio.', text: '# ' + title })
}
pages.find((p) => p.route === '/projects').text += '\n\n' + pages.filter((p) => p.route.startsWith('/projects/')).map((p) => '- [' + p.title.replace(' · Danish Ali', '') + '](' + p.route + ') — ' + p.description).join('\n')

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
  const key = page.route.slice(1).replaceAll('/', '--') || 'home'
  const image = origin + '/og/' + key + '.png'
  const headline = lines(page.title.replace(' · Danish Ali', ''), 28).slice(0, 3)
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
  html = html.replace('</head>', '<!--portfolio-meta:start-->' + tags + '<!--portfolio-meta:end-->\n</head>')
  html = html.replace('<div id="root"></div>', '<div id="root"><main style="max-width:760px;margin:48px auto;padding:24px;font:18px/1.6 sans-serif">' + marked.parse(page.text.replace(/<!--[\s\S]*?-->/g, '')) + '</main></div>')
  const dest = page.route === '/' ? join(out, 'index.html') : join(out, page.route, 'index.html')
  mkdirSync(dirname(dest), { recursive: true })
  writeFileSync(dest, html)
  // Preserve existing short project links, but point crawlers at the full canonical path.
  if (page.alias && page.alias !== page.route && !pages.some((p) => p.route === page.alias)) {
    const alias = join(out, page.alias, 'index.html')
    mkdirSync(dirname(alias), { recursive: true })
    writeFileSync(alias, html)
  }
}
mkdirSync(join(out, 'simple'), { recursive: true })
writeFileSync(join(out, 'simple/index.html'), readFileSync(join(out, 'resume/index.html')))
mkdirSync(join(out, 'cv'), { recursive: true })
writeFileSync(join(out, 'cv/index.html'), readFileSync(join(out, 'contact/index.html')))
writeFileSync(join(out, 'sitemap.xml'), readFileSync(join(root, 'public/sitemap.xml')))
console.log('pages: ' + pages.length + ' HTML pages and social preview cards generated')
