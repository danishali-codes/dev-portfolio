import { create } from 'zustand'
import { lines } from '../text'

/** Projects pulled out of the trash for this visit. Nothing is saved: a reload puts them back in the bin. */
export const useRestored = create<{ paths: string[]; restore: (path: string) => void; reset: () => void }>()((set) => ({
  paths: [],
  restore: (path) => set((s) => (s.paths.includes(path) ? s : { paths: [...s.paths, path] })),
  reset: () => set({ paths: [] }),
}))


let emptied = 0

/** What the trash says when someone tries to empty it. A different excuse each time. */
export function emptyTrashLine() {
  const excuses = lines('windows.trash.excuses')
  return excuses[emptied++ % excuses.length]
}
