import { describe, expect, it } from 'vitest'
import { buildIndex, score, search } from './search'

const index = buildIndex([{ name: 'ls', desc: 'list a folder' }, { name: 'neofetch', desc: 'system info' }])

describe('spotlight search', () => {
  it('finds projects by name, nested ones too', () => {
    expect(search(index, 'fuloos')[0]).toMatchObject({ kind: 'project', label: 'Fuloos' })
    expect(search(index, 'ledger').some((i) => i.kind === 'project')).toBe(true)
  })

  it('finds projects by stack and jam', () => {
    expect(search(index, 'unity').filter((i) => i.kind === 'project').length).toBeGreaterThan(1)
    expect(search(index, 'gmtk')[0]?.label).toBe('Game Dev Loop')
  })

  it('finds apps and commands', () => {
    expect(search(index, 'guestbook')[0]).toMatchObject({ kind: 'app', id: 'guestbook' })
    expect(search(index, 'neofetch')[0]).toMatchObject({ kind: 'command', id: 'neofetch' })
  })

  it('finds files but not every screenshot', () => {
    expect(search(index, 'about.md')[0]).toMatchObject({ kind: 'file' })
    expect(index.some((i) => i.node?.path.includes('/media/'))).toBe(false)
  })

  it('ranks exact and prefix matches first, and ignores empty queries', () => {
    const item = { kind: 'app' as const, label: 'Stats' }
    expect(score(item, 'stats')).toBeGreaterThan(score(item, 'sta'))
    expect(score(item, 'sta')).toBeGreaterThan(score(item, 'tat'))
    expect(search(index, '   ')).toEqual([])
    expect(search(index, 'zzzzqq')).toEqual([])
  })
})
