// The site's wording lives in content/text/*.yaml. This reads it.
//
//   t('terminal.ls.missing', { path })   one line, with {placeholders} filled in
//   lines('eggs.fortunes')               a whole list
//   pick('eggs.fortunes')                one line from a list, at random
//
// A placeholder can also pick a word by count: `{n} {n|try|tries}`.
import { TEXT, type Lists, type Strings } from '../generated/text'

export type { Lists, Strings }
export type Val = string | number
export type StringKey = keyof Strings
export type ListKey = keyof Lists

/** The values a key's placeholders need. Extra values are fine: the text may not use them all. */
type Vars<P> = [P] extends [never] ? [vars?: Record<string, Val>] : [vars: Record<P & string, Val> & Record<string, Val>]

const PLACEHOLDER = /\{([A-Za-z_]\w*)(?:\|([^{}]*))?\}/g

/** Fills `{name}` and `{n|one|many}` from vars. Anything without a value is left as written. */
export function fill(template: string, vars?: Record<string, Val>): string {
  if (!vars) return template
  return template.replace(PLACEHOLDER, (whole, name: string, forms?: string) => {
    if (!(name in vars)) return whole
    const v = vars[name]
    if (forms == null) return String(v)
    const [one, many = one] = forms.split('|')
    return Number(v) === 1 ? one : many
  })
}

/** The raw text for a key, placeholders untouched. */
export function raw(key: StringKey): string {
  const v = TEXT[key]
  return typeof v === 'string' ? v : key
}

/** The raw lines of a list, placeholders untouched. */
export function rawList(key: ListKey): string[] {
  const v = TEXT[key]
  return Array.isArray(v) ? [...v] : [String(v ?? key)]
}

export function t<K extends StringKey>(key: K, ...[vars]: Vars<Strings[K]>): string {
  return fill(raw(key), vars)
}

export function lines<K extends ListKey>(key: K, ...[vars]: Vars<Lists[K]>): string[] {
  return rawList(key).map((l) => fill(l, vars))
}

export function pick<K extends ListKey>(key: K, ...[vars]: Vars<Lists[K]>): string {
  const all = rawList(key)
  return fill(all[Math.floor(Math.random() * all.length)], vars)
}
