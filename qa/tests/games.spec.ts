import { test, expect } from '@playwright/test'

test.describe('Список игр', () => {
  test('страница загружается', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.header-name')).toContainText('Добро пожаловать, Мастер')
  })

  test('создать игру и увидеть в списке', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('button', { name: '＋ Создать игру' }).first().click()
    await page.locator('.modal .field-input').first().fill('Тестовая кампания')
    await page.locator('.modal').getByRole('button', { name: 'Создать' }).click()

    await page.waitForURL(/\/master\/\d+/)
    await page.goto('/')
    await expect(page.locator('.card-title', { hasText: 'Тестовая кампания' }).first()).toBeVisible()
  })

  test('карточка игры ведёт в мастер-вью', async ({ page }) => {
    await page.goto('/')

    if ((await page.locator('.game-card').count()) === 0) {
      await page.getByRole('button', { name: '＋ Создать игру' }).first().click()
      await page.locator('.modal .field-input').first().fill('Навигационная игра')
      await page.locator('.modal').getByRole('button', { name: 'Создать' }).click()
      await page.waitForURL(/\/master\/\d+/)
      await page.goto('/')
    }

    await page.locator('.game-card').first().click()
    await expect(page).toHaveURL(/\/master\/\d+/)
    await expect(page.locator('.topbar')).toBeVisible()
  })
})
