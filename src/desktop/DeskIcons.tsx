import { getNode } from '../fs'
import type { FsNode } from '../fs/types'
import Icon from '../apps/Icon'
import { formatUpdated, NOW_PATH, readNow } from '../apps/now'
import { openNode } from '../shell/opener'
import Draggable from './Draggable'

/** A sticky note on the desktop listing what I'm working on (content/now.md). */
export function NowNote() {
  const now = readNow()
  const node = getNode(NOW_PATH)
  if (!now || !node) return null
  const when = formatUpdated(now.updated)
  return (
    <Draggable as="aside" id="now-note" className="now-note" aria-labelledby="now-note-title">
      <h2 id="now-note-title">
        <span className="now-dot" aria-hidden="true" />
        Working on
      </h2>
      <ul>
        {now.items.slice(0, 4).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <button type="button" className="now-more" onClick={() => openNode(node)}>
        {when ? `Updated ${when}` : 'Open note'} · now.md
      </button>
    </Draggable>
  )
}

export function DeskIcon({ node, label, onOpen, color }: { node: FsNode | 'terminal' | 'guestbook' | 'stats' | 'introduction'; label: string; onOpen: () => void; color?: string }) {
  return (
    <Draggable as="li" id={`icon:${label}`} stack>
      <button
        type="button"
        className="desk-icon"
        onDoubleClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onOpen()
          }
        }}
        onClick={(e) => (e.nativeEvent as PointerEvent).pointerType === 'touch' && onOpen()}
      >
        <Icon node={node} size="lg" color={color} />
        <span className="desk-label">{label}</span>
      </button>
    </Draggable>
  )
}
