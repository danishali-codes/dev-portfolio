export type ResumeBlock =
  | { type: 'p'; html: string }
  | { type: 'h'; html: string }
  | { type: 'ul'; items: string[] }

function inline(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2">$1</a>')
}

/** The small subset content/resume.md uses: headings, paragraphs, lists, bold, links. */
export function resumeBlocks(markdown: string): ResumeBlock[] {
  const lines = markdown.replace(/<!--[\s\S]*?-->/g, '').split('\n')
  const blocks: ResumeBlock[] = []
  let para: string[] = []
  let items: string[] = []
  const flushPara = () => {
    if (para.length) blocks.push({ type: 'p', html: inline(para.join(' ')) })
    para = []
  }
  const flushItems = () => {
    if (items.length) blocks.push({ type: 'ul', items: items.map(inline) })
    items = []
  }
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      flushPara()
      flushItems()
      continue
    }
    if (trimmed.startsWith('## ')) {
      flushPara()
      flushItems()
      blocks.push({ type: 'h', html: inline(trimmed.slice(3)) })
      continue
    }
    if (trimmed.startsWith('- ')) {
      flushPara()
      items.push(trimmed.slice(2))
      continue
    }
    flushItems()
    para.push(trimmed)
  }
  flushPara()
  flushItems()
  return blocks
}
