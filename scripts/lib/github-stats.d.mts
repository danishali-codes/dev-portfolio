import type { Stats } from '../../src/apps/stats'
export function collectGithub(old?: Partial<Stats['github']>): Promise<Stats['github']>
export function siteCommits(): Promise<number>
export function parseContributionsHtml(html: string): { date: string; count: number }[]
export function summarise(days: { date: string; count: number }[], today?: string): Omit<import('../../src/apps/stats').Contributions, 'days' | 'exact'>
