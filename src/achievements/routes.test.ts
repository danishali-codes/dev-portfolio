import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { handleSecretPath } from './routes'
import { isFound, useAchievements } from '.'
import { usePower } from '../shell/power'
vi.mock('./effects', () => ({ takeover: vi.fn() }))
beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
  useAchievements.setState({ found: {}, latest: null, finishedAt: null })
  usePower.setState({ phase: 'post' })
})
afterEach(() => { vi.useRealTimers(); history.replaceState(null, '', '/') })
describe('secret achievement routes', () => {
  for (const [path, id] of [['/found/dug', 'dns'], ['/found/headers', 'header']]) {
    it('reveals ' + id + ' after boot and preserves its timestamp on repeat visits', () => {
      localStorage.setItem('devportfolio.resume', '1')
      history.replaceState(null, '', path)
      expect(handleSecretPath()).toBe(true)
      expect(location.pathname).toBe('/')
      expect(localStorage.getItem('devportfolio.resume')).toBeNull()
      vi.advanceTimersByTime(1000)
      expect(isFound(id)).toBe(false)
      usePower.setState({ phase: 'on' })
      vi.advanceTimersByTime(450)
      expect(isFound(id)).toBe(true)
      const timestamp = useAchievements.getState().found[id]
      history.replaceState(null, '', path)
      handleSecretPath()
      vi.advanceTimersByTime(450)
      expect(useAchievements.getState().found[id]).toBe(timestamp)
      expect(useAchievements.getState().notepadOpen).toBe(true)
    })
  }
})
