import { t } from '../text'

export interface BadgeLines {
  who: string
  date: string
  title: string
  detail: string
}

/** The words on the card. An empty name stays anonymous rather than inventing one. */
export function badgeLines(name: string, when: Date, title: string, detail: string): BadgeLines {
  const who = name.trim().slice(0, 40) || t('achievements.badge.anonymous')
  const date = when.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  return { who, date, title: title.slice(0, 48), detail: detail.slice(0, 80) }
}

export function drawBadge(canvas: HTMLCanvasElement, lines: BadgeLines) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  canvas.width = 800
  canvas.height = 420
  ctx.fillStyle = '#fffdf8'
  ctx.fillRect(0, 0, 800, 420)
  ctx.strokeStyle = '#2a2622'
  ctx.lineWidth = 10
  ctx.strokeRect(18, 18, 764, 384)
  ctx.fillStyle = '#b5562a'
  ctx.font = '700 26px Nunito, sans-serif'
  ctx.fillText('★  danishali.dev', 48, 84)
  ctx.fillStyle = '#2a2622'
  ctx.font = '800 46px Nunito, sans-serif'
  ctx.fillText(lines.title, 48, 170)
  ctx.font = '700 30px Nunito, sans-serif'
  ctx.fillText(lines.who, 48, 240)
  ctx.font = '600 24px Nunito, sans-serif'
  ctx.fillStyle = '#57504a'
  ctx.fillText(lines.date, 48, 286)
  ctx.fillText(lines.detail, 48, 340)
}

export function badgeBlob(lines: BadgeLines) {
  const canvas = document.createElement('canvas')
  drawBadge(canvas, lines)
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('no image'))), 'image/png')
  })
}
