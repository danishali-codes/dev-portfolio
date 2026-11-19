import { expect, test } from '@playwright/test'
import { boot } from './helpers'

test('boots to the desktop with the Welcome window and opens a project', async ({ page }) => {
  const { noErrors } = await boot(page)
  await expect(page.locator('.win-introduction')).toBeVisible()
  await page.locator('.win-introduction').getByRole('button', { name: /Fuloos/ }).click()
  await expect(page.locator('.win', { hasText: 'Fuloos · README' })).toBeVisible()
  await expect(page).toHaveURL(/\/projects\/fuloos$/)
  await expect(page).toHaveTitle(/Fuloos/)
  await page.goBack()
  await expect(page).toHaveURL(/\/$/)
  noErrors()
})

test('taskbar search finds nested projects', async ({ page }) => {
  const { noErrors } = await boot(page)
  await page.getByPlaceholder('Search projects').fill('ledger')
  await expect(page.locator('#tb-results button', { hasText: 'Ledger' })).toBeVisible()
  noErrors()
})

test('deep links and unknown addresses', async ({ page }) => {
  const { noErrors } = await boot(page, '/projects/jeopardy')
  await expect(page.locator('.win', { hasText: 'Lockout · README' })).toBeVisible()
  await page.goto('/projects/fuloo')
  await expect(page.locator('.win-notfound')).toBeVisible()
  await page.getByRole('button', { name: 'Did you mean Fuloos?' }).click()
  await expect(page).toHaveURL(/\/projects\/fuloos$/)
  noErrors()
})

test('the terminal runs commands', async ({ page }) => {
  const { noErrors } = await boot(page, '/terminal')
  const prompt = page.locator('.win-terminal input').first()
  await prompt.fill('ls projects')
  await prompt.press('Enter')
  await expect(page.locator('.win-terminal')).toContainText('fuloos')
  noErrors()
})
