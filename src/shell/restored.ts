import { create } from 'zustand'

/** Projects pulled out of the trash for this visit. Nothing is saved: a reload puts them back in the bin. */
export const useRestored = create<{ paths: string[]; restore: (path: string) => void; reset: () => void }>()((set) => ({
  paths: [],
  restore: (path) => set((s) => (s.paths.includes(path) ? s : { paths: [...s.paths, path] })),
  reset: () => set({ paths: [] }),
}))

const EMPTY_LINES = [
  'The trash can’t be emptied: these projects still have feelings.',
  'Emptying… 3%… Danish has stopped the operation. He might finish one of them one day.',
  'Permission denied. The owner of this computer is a digital hoarder.',
  'Are you sure? These took whole weekends. (The answer is no.)',
]

let emptied = 0

/** What the trash says when someone tries to empty it. A different excuse each time. */
export function emptyTrashLine() {
  return EMPTY_LINES[emptied++ % EMPTY_LINES.length]
}
