import { readFileSync } from 'node:fs'
import { marked } from 'marked'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/** Fills %TEXT:key% (escaped) and %HTML:key% (Markdown links) in index.html from content/text. */
function siteText(): Plugin {
  return {
    name: 'site-text',
    transformIndexHtml(html) {
      const text = JSON.parse(readFileSync(new URL('./src/generated/text.json', import.meta.url), 'utf8')) as Record<string, string>
      return html.replace(/%(TEXT|HTML):([\w.-]+)%/g, (_, kind: string, key: string) => {
        const value = text[key]
        if (typeof value !== 'string') throw new Error(`index.html asks for ${key}, which content/text doesn't have`)
        return kind === 'HTML' ? (marked.parseInline(value) as string) : escape(value)
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), siteText()],
})
