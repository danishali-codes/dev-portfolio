import { expect, test } from '@playwright/test'
import { boot } from './helpers'

test.describe('desktop extras', () => {
  test('Ctrl+K finds and opens projects, apps and commands', async ({ page }) => {
    const { noErrors } = await boot(page)
    await page.keyboard.press('Control+k')
    const box = page.getByRole('combobox', { name: /Search projects, files/ })
    await expect(box).toBeFocused()
    await box.fill('ledger')
    await expect(page.getByRole('option').first()).toContainText('Ledger')
    await box.press('Enter')
    await expect(page.getByRole('dialog', { name: 'Search everything' })).toHaveCount(0)
    await expect(page.locator('.win.active')).toContainText('Ledger')

    await page.keyboard.press('Control+k')
    await box.fill('neofetch')
    await box.press('Enter')
    await expect(page.locator('.win-terminal')).toContainText('danish@dev')
    await expect(page.locator('.win-terminal .term-scroll')).toContainText('neofetch')
    noErrors()
  })

  test('media folders open as a gallery with a slideshow', async ({ page }) => {
    const { noErrors } = await boot(page, '/files/projects/fuloos/media')
    const win = page.locator('.win.active')
    await expect(win.locator('.gallery img').first()).toBeVisible()
    await win.getByRole('button', { name: 'Show as icons' }).click()
    await expect(win.locator('.folder-grid')).toBeVisible()
    await win.getByRole('button', { name: 'Show pictures' }).click()
    await win.getByRole('button', { name: /Slideshow/ }).click()
    const viewer = page.locator('.win.active .imgview')
    await expect(viewer.getByRole('button', { name: 'Pause slideshow' })).toBeVisible()
    const first = await viewer.locator('img').getAttribute('src')
    await expect.poll(() => viewer.locator('img').getAttribute('src'), { timeout: 6_000 }).not.toBe(first)
    noErrors()
  })

  test('the clock opens a calendar with the timeline', async ({ page }) => {
    const { noErrors } = await boot(page)
    await page.locator('.tb-clock').click()
    const cal = page.getByRole('dialog', { name: 'Calendar' })
    await expect(cal).toBeVisible()
    await expect(cal.locator('.cal-timeline')).toContainText('Fuloos')
    await cal.locator('.cal-timeline').getByRole('button', { name: /Game Dev Loop/ }).click()
    await expect(cal).toHaveCount(0)
    await expect(page.locator('.win.active')).toContainText('Game Dev Loop')
    noErrors()
  })

  test('windows snap to the screen edges and Alt+` switches between them', async ({ page }) => {
    const { noErrors } = await boot(page, '/about')
    const about = page.locator('.win.active')
    const bar = about.locator('.win-bar')
    const box = (await bar.boundingBox())!
    await page.mouse.move(box.x + 60, box.y + 15)
    await page.mouse.down()
    await page.mouse.move(400, 300, { steps: 4 })
    await page.mouse.move(1, 300, { steps: 6 })
    await expect(page.locator('.snap-preview.snap-left')).toBeVisible()
    await page.mouse.up()
    const snapped = (await about.boundingBox())!
    expect(Math.round(snapped.x)).toBe(0)
    expect(Math.round(snapped.width)).toBe(640)

    await page.keyboard.press('Control+k')
    await page.getByRole('combobox').fill('stats')
    await page.keyboard.press('Enter')
    await expect(page.locator('.win.active')).toHaveClass(/win-stats/)
    await page.keyboard.down('Alt')
    await page.keyboard.press('Backquote')
    await expect(page.getByRole('listbox', { name: 'Switch window' })).toBeVisible()
    await page.keyboard.up('Alt')
    await expect(page.getByRole('listbox', { name: 'Switch window' })).toHaveCount(0)
    await expect(page.locator('.win.active')).not.toHaveClass(/win-stats/)
    noErrors()
  })
})
