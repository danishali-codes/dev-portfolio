import { beforeEach, describe, expect, it } from 'vitest'
import { findProject, findReadme, getNode } from '../fs'
import { specFor } from '../apps/spec'
import { historyIndex, initialiseHistory, routeFor, specFromUrl, syncNavigation } from './navigation'

beforeEach(() => { history.replaceState(null, '', '/'); initialiseHistory() })

describe('shareable navigation', () => {
  it('round trips nested project write-ups, folders and individual games', () => {
    for (const name of ['ledger', 'autoencoders', 'game-dev-loop', 'rolling-in-dough', 'the-feed']) {
      const project = findProject(name)!
      expect(project).toBeTruthy()
      for (const node of [project, findReadme(project)!]) {
        const spec = specFor(node)
        const route = routeFor(spec)
        expect(route).toContain(project.path)
        expect(specFromUrl(route)).toEqual(spec)
      }
    }
  })
  it('keeps old short project links and malformed URLs safe', () => {
    expect(specFromUrl('/projects/ledger')?.path).toBe(findReadme(findProject('ledger')!)?.path)
    expect(specFromUrl('/projects/%E0%A4%A')).toBeUndefined()
    expect(specFromUrl('/projects/does-not-exist')).toBeUndefined()
  })
  it('does not add history entries for geometry changes or the same active page', () => {
    const spec = specFor(getNode('/about.md')!)
    const before = history.length
    syncNavigation(spec)
    syncNavigation(spec)
    expect(history.length).toBe(before + 1)
    expect(location.pathname).toBe('/about')
    expect(document.title).toContain('Danish Ali')
  })
  it('copies a pre-rename history index onto the new key', () => {
    history.replaceState({ paperosIndex: 4 }, '', '/about')
    initialiseHistory()
    expect(history.state.folioosIndex).toBe(4)
    expect(history.state.paperosIndex).toBeUndefined()
    expect(historyIndex()).toBe(4)
  })
  it('round trips contact, utility apps and media paths', () => {
    for (const route of ['/contact', '/stats', '/ask', '/uses', '/resume', '/terminal', '/guestbook', '/files/now.md']) {
      const spec = specFromUrl(route)!
      expect(spec).toBeTruthy()
      expect(specFromUrl(routeFor(spec))).toEqual(spec)
    }
  })
})
