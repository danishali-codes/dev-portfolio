import { describe, expect, it } from 'vitest'
import { resumeOn, resumePath, setResume } from '../shell/plain'
import { resumeBlocks } from './resumeDoc'

describe('resume route', () => {
  it('treats /resume and /simple as the plain page and remembers the choice', () => {
    localStorage.clear()
    expect(resumePath('/resume')).toBe(true)
    expect(resumePath('/simple/')).toBe(true)
    expect(resumePath('/RESUME')).toBe(true)
    expect(resumePath('/cv')).toBe(false)
    expect(resumeOn('/')).toBe(false)
    setResume(true)
    expect(resumeOn('/')).toBe(true)
    setResume(false)
    expect(resumeOn('/now')).toBe(false)
    expect(resumeOn('/resume')).toBe(true)
  })
})

describe('resume markdown', () => {
  it('keeps projects and hides TODO comments', () => {
    const blocks = resumeBlocks(`Hello **there**.\n\n## Projects\n\n- **Fuloos** [site](https://fuloos.danishali.dev)\n\n<!-- TODO: Danish — jobs -->\n`)
    expect(blocks.map((b) => b.type)).toEqual(['p', 'h', 'ul'])
    expect(blocks[0]).toMatchObject({ html: 'Hello <strong>there</strong>.' })
    expect(blocks[2]).toMatchObject({ items: ['<strong>Fuloos</strong> <a href="https://fuloos.danishali.dev">site</a>'] })
    expect(JSON.stringify(blocks)).not.toContain('TODO')
  })
})
