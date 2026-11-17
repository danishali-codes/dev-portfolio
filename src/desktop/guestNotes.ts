/** Up to `limit` approved notes, rotated by day, skipping ones the visitor closed. */
export function pickNotes<T extends { id: string }>(notes: T[], closed: string[], day: number, limit = 3): T[] {
  const hide = new Set(closed)
  const open = notes.filter((n) => !hide.has(n.id))
  if (!open.length) return []
  const start = ((day % open.length) + open.length) % open.length
  return open.slice(start).concat(open.slice(0, start)).slice(0, limit)
}
