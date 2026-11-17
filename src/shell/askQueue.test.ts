import { describe, expect, it } from 'vitest'
import { pushAsk, takeAsk } from './askQueue'

describe('ask queue', () => {
  it('keeps a question asked before the window mounts, then delivers the next one live', () => {
    const got: string[] = []
    pushAsk('  What is Fuloos? ')
    pushAsk('   ')
    const stop = takeAsk((q) => got.push(q))
    pushAsk('And Lockout?')
    stop()
    pushAsk('held again')
    const later: string[] = []
    takeAsk((q) => later.push(q))()
    expect(got).toEqual(['What is Fuloos?', 'And Lockout?'])
    expect(later).toEqual(['held again'])
  })
})
