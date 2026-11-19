import { expect, test } from '@playwright/test'
import { boot } from './helpers'

test('a project opens its write-up and Back returns home without leaving the site', async ({ page }) => {
  const { noErrors } = await boot(page)
  await expect(page.locator('.ph-home')).toBeVisible()
  await page.getByRole('button', { name: 'Fuloos' }).click()
  await expect(page.locator('.ph-app-title')).toHaveText('Fuloos · README')
  await page.goBack()
  await expect(page.locator('.ph-home')).toBeVisible()
  await expect(page).toHaveURL(/localhost:4173\/$/)
  noErrors()
})

test('an unknown address shows the not found screen', async ({ page }) => {
  const { noErrors } = await boot(page, '/nothing-here')
  await expect(page.locator('.notfound')).toBeVisible()
  noErrors()
})
