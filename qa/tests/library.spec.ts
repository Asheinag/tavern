import { test, expect } from '@playwright/test'

// минимальный 1×1 PNG (base64)
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

test.describe('Библиотека артефактов', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '+ Создать игру' }).first().click()
    await page.locator('.modal .field-input').first().fill('Игра с библиотекой')
    await page.locator('.modal').getByRole('button', { name: 'Создать' }).click()
    await page.waitForURL(/\/master\/\d+/)
  })

  test('открыть библиотеку', async ({ page }) => {
    await page.locator('.btn-library').click()
    await expect(page.locator('.library-panel')).toBeVisible()
    await expect(page.locator('.mono-label')).toContainText('Библиотека')
  })

  test('загрузить фоновое изображение и увидеть в библиотеке', async ({ page }) => {
    await page.locator('.btn-library').click()

    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.locator('.add-btn', { hasText: '+ фон' }).click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles({ name: 'test-bg.png', mimeType: 'image/png', buffer: TINY_PNG })

    await expect(page.locator('.card-title', { hasText: 'test-bg' })).toBeVisible({ timeout: 10000 })
  })

  test('загрузить NPC и увидеть в библиотеке', async ({ page }) => {
    await page.locator('.btn-library').click()

    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.locator('.add-btn', { hasText: '+ NPC' }).click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles({ name: 'test-npc.png', mimeType: 'image/png', buffer: TINY_PNG })

    await expect(page.locator('.card-title', { hasText: 'test-npc' })).toBeVisible({ timeout: 10000 })
  })

  test('счётчик библиотеки растёт после загрузки', async ({ page }) => {
    await page.locator('.btn-library').click()

    // читаем начальный счётчик
    const label = page.locator('.mono-label')
    const before = await label.textContent()
    const beforeCount = parseInt(before?.match(/·\s*(\d+)/)?.[1] ?? '0')

    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.locator('.add-btn', { hasText: '+ фон' }).click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles({ name: 'bg.png', mimeType: 'image/png', buffer: TINY_PNG })

    await expect(label).toContainText(`· ${beforeCount + 1}`, { timeout: 10000 })
  })
})
