import { describe, expect, it } from 'vitest'
import { badgeLines } from './badge'

describe('badgeLines', () => {
  it('uses the handle they typed and a blank name stays anonymous', () => {
    const when = new Date('2026-11-16T12:00:00Z')
    expect(badgeLines('  Ada  ', when, 'Every secret', '20 found').who).toBe('Ada')
    expect(badgeLines('   ', when, 'Every secret', '20 found').who).toBe('a visitor')
    expect(badgeLines('Ada', when, 'Every secret', '20 found').date).toMatch(/2026/)
  })
})
