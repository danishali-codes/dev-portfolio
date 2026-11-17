import { beforeEach, describe, expect, it, vi } from 'vitest'
import { greet } from './console'
import { isFound, useAchievements } from '.'
beforeEach(() => { useAchievements.setState({ found: {}, latest: null }); vi.spyOn(console, 'log').mockImplementation(() => {}) })
describe('browser console login', () => {
  it('provides quoted-password help and unlocks the console achievement', () => {
    greet()
    const api = (window as unknown as { danish: { login: (password?: string) => string } }).danish
    expect(api.login()).toContain('danish.login("password")')
    expect(api.login('incorrect')).toContain('denied')
    expect(isFound('console')).toBe(false)
    expect(api.login('hunter2')).toContain('ACCESS GRANTED')
    expect(isFound('console')).toBe(true)
    expect(api.login('hunter2')).toContain('Already logged in')
  })
})
