import { allProjects } from '../fs'

function distance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const next = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = next
    }
  }
  return row[b.length]
}

/** The project whose name is closest to the last part of a mistyped address, if any is close. */
export function closestProject(path: string) {
  const word = decodeURIComponent(path.split('/').filter(Boolean).pop() ?? '').toLowerCase()
  if (!word) return undefined
  const scored = allProjects()
    .flatMap((p) => [p.name, p.meta?.name ?? '', ...(p.meta?.aliases ?? [])].map((n) => ({ p, d: distance(word, n.toLowerCase()) })))
    .sort((a, b) => a.d - b.d)[0]
  return scored && scored.d <= Math.max(2, Math.floor(word.length / 3)) ? scored.p : undefined
}
