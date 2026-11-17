import { describe, expect, it } from 'vitest'
import { makeLimiter } from './askLimit'

describe('ask rate limit', () => {
  it('allows a few questions and then waits', () => {
    const allow = makeLimiter(2, 1000)
    expect(allow('a', 0)).toBe(true)
    expect(allow('a', 10)).toBe(true)
    expect(allow('a', 20)).toBe(false)
    expect(allow('b', 20)).toBe(true)
    expect(allow('a', 1001)).toBe(true)
  })
})
