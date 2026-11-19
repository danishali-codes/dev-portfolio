import { expect, type Page } from '@playwright/test'

/** Load a page with only this site reachable, skip the boot screen, and collect page errors. */
export async function boot(page: Page, path = '/') {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.context().route(/^https?:\/\/(?!localhost)/, (route) => route.abort())
  await page.goto(path)
  const bootScreen = page.locator('.boot-post, .boot-splash')
  await bootScreen.first().waitFor({ timeout: 5_000 }).catch(() => {})
  // Any key skips the boot screen.
  await expect(async () => {
    if (await bootScreen.count()) await page.keyboard.press('Space')
    await expect(bootScreen).toHaveCount(0, { timeout: 500 })
  }).toPass({ timeout: 15_000 })
  return { errors, noErrors: () => expect(errors).toEqual([]) }
}
