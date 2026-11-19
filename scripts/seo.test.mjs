import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { sitemapUrls, sitemapXml } from './sitemap.mjs'

const tree = {
  children: [
    { type: 'dir', name: 'trash', children: [{ type: 'dir', name: 'old', path: '/trash/old', meta: { name: 'Old' } }] },
    {
      type: 'dir',
      name: 'projects',
      children: [
        { type: 'dir', name: 'fuloos', path: '/projects/fuloos', meta: { name: 'Fuloos' } },
        {
          type: 'dir',
          name: 'university',
          path: '/projects/university',
          meta: { name: 'University' },
          children: [
            {
              type: 'dir',
              name: 'ledger',
              path: '/projects/university/ledger',
              meta: { name: 'Ledger', aliases: ['ledger', 'bank & sms'] },
            },
          ],
        },
      ],
    },
  ],
}

describe('sitemap', () => {
  const urls = sitemapUrls(tree, (path) => (path.endsWith('ledger') ? '2026-05-01T00:00:00Z' : undefined))
  const xml = sitemapXml(urls)
  const locs = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((match) => match[1])

  it('lists the routes that open windows and skips trash', () => {
    expect(locs).toEqual([
      'https://danishali.dev/',
      'https://danishali.dev/projects',
      'https://danishali.dev/about',
      'https://danishali.dev/contact',
      'https://danishali.dev/now',
      'https://danishali.dev/uses',
      'https://danishali.dev/resume',
      'https://danishali.dev/projects/fuloos',
      'https://danishali.dev/projects/university',
      'https://danishali.dev/projects/university/ledger',
    ])
    expect(xml).not.toContain('/trash')
    expect(xml).not.toContain('/api/')
    expect(xml).toContain('<lastmod>2026-05-01T00:00:00Z</lastmod>')
    expect(xml.match(/<lastmod>/g)).toHaveLength(1)
  })
})

describe('static seo files', () => {
  const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'))
  // Vercel path patterns: "/found/:path*" matches /found and anything under it.
  const patterns = vercel.rewrites.map((r) => new RegExp('^' + r.source.replace(/\./g, '\\.').replace(/\/:path\*$/, '(?:/.*)?') + '$'))
  const rewritten = (path) => patterns.some((re) => re.test(path))

  it('serves robots.txt as plain text and only rewrites addresses the app handles itself', () => {
    const robots = readFileSync('public/robots.txt', 'utf8')
    expect(robots).toBe('User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: https://danishali.dev/sitemap.xml\n')
    expect(robots).not.toMatch(/<html/i)
    for (const rule of vercel.rewrites) expect(rule.destination).toBe('/')
    for (const path of ['/robots.txt', '/sitemap.xml', '/api/guestbook', '/fs/a', '/assets/a', '/favicon.svg', '/stats.json', '/cv', '/contact', '/now', '/uses', '/resume', '/simple', '/projects/ledger', '/about', '/og/home.png', '/typo', '/projects/missing']) {
      expect(rewritten(path)).toBe(false)
    }
    for (const path of ['/files/about.md', '/found/headers', '/found/dug', '/wp-admin', '/wp-admin/setup.php', '/wp-login.php', '/xmlrpc.php']) {
      expect(rewritten(path)).toBe(true)
    }
  })
})
