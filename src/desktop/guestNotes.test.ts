import { describe, expect, it } from 'vitest'
import { pickNotes } from './guestNotes'

const notes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]

describe('pickNotes', () => {
  it('caps the count, skips closed notes, and rotates by day', () => {
    expect(pickNotes(notes, [], 0).map((n) => n.id)).toEqual(['a', 'b', 'c'])
    expect(pickNotes(notes, [], 1).map((n) => n.id)).toEqual(['b', 'c', 'd'])
    expect(pickNotes(notes, ['b'], 1).map((n) => n.id)).toEqual(['c', 'd', 'a'])
    expect(pickNotes([], [], 0)).toEqual([])
  })
})
