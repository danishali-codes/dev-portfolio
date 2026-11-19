import { describe, expect, it } from 'vitest'
import { fill, lines, pick, t } from '.'
import { rich } from '../terminal/lines'
import schema from './schema.json'
import { TEXT } from '../generated/text'

describe('site text', () => {
  it('fills placeholders and picks singular or plural', () => {
    expect(fill('{n} {n|try|tries} for {who}', { n: 1, who: 'you' })).toBe('1 try for you')
    expect(fill('{n} {n|try|tries}', { n: 3 })).toBe('3 tries')
    expect(fill('{missing} stays', {})).toBe('{missing} stays')
  })

  it('reads lines and lists from content/text', () => {
    expect(t('eggs.vim.not-a-command', { command: 'w' })).toBe('E492: Not an editor command: w')
    expect(lines('eggs.fortunes').length).toBeGreaterThan(3)
    expect(lines('eggs.fortunes')).toContain(pick('eggs.fortunes'))
  })

  it('has every key the contract asks for', () => {
    for (const [key, want] of Object.entries(schema)) {
      expect(TEXT[key], key).toBeDefined()
      expect(Array.isArray(TEXT[key]), key).toBe(want.list)
    }
  })

  it('turns terminal markup into styled segments', () => {
    expect(rich('**Hi** *there* _quietly_ `help` [site](https://x.dev) [home](/about.md)', 'err')).toEqual([
      { t: 'Hi', cls: 'bold' },
      { t: ' ', cls: 'err' },
      { t: 'there', cls: 'accent' },
      { t: ' ', cls: 'err' },
      { t: 'quietly', cls: 'dim' },
      { t: ' ', cls: 'err' },
      { t: 'help', cls: 'accent', run: 'help' },
      { t: ' ', cls: 'err' },
      { t: 'site', href: 'https://x.dev' },
      { t: ' ', cls: 'err' },
      { t: 'home', cls: 'err', open: '/about.md' },
    ])
  })

  it('leaves snake_case, escapes and user input alone', () => {
    expect(rich('icmp_seq=1 ttl_x', undefined).map((s) => s.t).join('')).toBe('icmp_seq=1 ttl_x')
    expect(rich('a \\*b\\* c').map((s) => s.t).join('')).toBe('a *b* c')
    // A value typed by a visitor is never read as markup.
    expect(rich('no file {path}', 'err', { path: '*x* `rm`' })).toEqual([{ t: 'no file *x* `rm`', cls: 'err' }])
  })

  it('puts a segment where a placeholder asks for one, and fills commands', () => {
    expect(rich('_opening_ {thing}', undefined, { thing: { t: 'fuloos/', cls: 'dir', open: '/projects/fuloos' } })).toEqual([
      { t: 'opening', cls: 'dim' },
      { t: ' ' },
      { t: 'fuloos/', cls: 'dir', open: '/projects/fuloos' },
    ])
    expect(rich('`skin {name}`', undefined, { name: 'amber' })).toEqual([{ t: 'skin amber', cls: 'accent', run: 'skin amber' }])
  })
})
