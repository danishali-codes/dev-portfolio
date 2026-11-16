import { describe, expect, it } from 'vitest'
import { applyRouteMeta, pageNode, pageRoute } from './pages'

describe('page routes', () => {
  it('opens now, uses, cv and contact', () => {
    expect(pageRoute('/now')?.file).toBe('/now.md')
    expect(pageRoute('/uses/')?.file).toBe('/uses.md')
    expect(pageRoute('/CV')?.file).toBe('/cv.md')
    expect(pageRoute('/contact')?.file).toBe('/cv.md')
    expect(pageRoute('/projects/ledger')).toBeUndefined()
    expect(pageNode('/now')?.path).toBe('/now.md')
    expect(pageNode('/uses')?.path).toBe('/uses.md')
    expect(pageNode('/nope')).toBeUndefined()
  })

  it('sets the title and description for /now and /uses, and restores the defaults otherwise', () => {
    document.head.innerHTML = `
      <meta name="description" content="old" />
      <meta property="og:title" content="old" />
      <meta property="og:description" content="old" />
      <meta property="og:url" content="old" />
      <meta name="twitter:title" content="old" />
      <meta name="twitter:description" content="old" />
    `
    applyRouteMeta('/now')
    expect(document.title).toBe('Now · Danish Ali')
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toContain('Lockout')
    expect(document.querySelector('meta[property="og:url"]')?.getAttribute('content')).toBe('https://danishali.dev/now')
    applyRouteMeta('/')
    expect(document.title).toBe('Danish Ali · Dev portfolio')
    expect(document.querySelector('meta[property="og:url"]')?.getAttribute('content')).toBe('https://danishali.dev/')
  })
})
