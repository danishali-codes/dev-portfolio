import { afterEach, describe, expect, it } from 'vitest'
import { resumeOn, setResume } from './plain'
afterEach(() => { localStorage.clear(); history.replaceState(null, '', '/') })
describe('resume navigation', () => {
  it('updates the URL and allows a return to the desktop', () => {
    history.replaceState({ paperosIndex: 0 }, '', '/')
    setResume(true)
    expect(location.pathname).toBe('/resume')
    expect(history.state.paperosIndex).toBe(1)
    setResume(false)
    expect(location.pathname).toBe('/')
    expect(resumeOn()).toBe(false)
  })
  it('does not override explicit project or document links with a saved preference', () => {
    localStorage.setItem('devportfolio.resume', '1')
    expect(resumeOn('/')).toBe(true)
    expect(resumeOn('/resume')).toBe(true)
    expect(resumeOn('/simple')).toBe(true)
    expect(resumeOn('/projects/ledger')).toBe(false)
    expect(resumeOn('/uses')).toBe(false)
  })
})
