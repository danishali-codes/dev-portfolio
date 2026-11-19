import { describe, expect, it } from 'vitest'
import { closestProject } from './closest'
import { notFoundSpec, routeFor, specFromUrl } from './navigation'

describe('not found addresses', () => {
  it('suggests the nearest project for a typo and nothing for noise', () => {
    expect(closestProject('/projects/fuloo')?.name).toBe('fuloos')
    expect(closestProject('/lockot')?.name).toBe('lockout')
    expect(closestProject('/jeopardi')?.name).toBe('lockout')
    expect(closestProject('/qqqqqqqqqq')).toBeUndefined()
    expect(closestProject('/')).toBeUndefined()
  })
  it('opens a not found window for unknown paths only, and keeps their address', () => {
    expect(notFoundSpec('/')).toBeUndefined()
    expect(notFoundSpec('/projects/fuloos')).toBeUndefined()
    expect(notFoundSpec('/about')).toBeUndefined()
    const spec = notFoundSpec('/nope/here')!
    expect(spec.kind).toBe('notfound')
    expect(specFromUrl('/nope/here')).toBeUndefined()
    expect(routeFor(spec)).toBe('/nope/here')
  })
})
