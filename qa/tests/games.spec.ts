import { test, expect } from '@playwright/test'

test.describe('Список игр', () => {
  test('страница загружается', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.header-name')).toContainText('Добро пожаловать, Мастер')
  })

  test('создать игру и увидеть в списке', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('button', { name: '＋ Создать игру' }).first().click()

    const titleInput = page.locator('.modal .field-input').first()
    await titleInput.fill('Тестовая кампания')
    await page.getByRole('button', { name: 'Создать' }).click()

    await expect(page.locator('.card-title', { hasText: 'Тестовая кампания' })).toBeVisible()
  })

  test('карточка игры ведёт в мастер-вью', async ({ page }) => {
    await page.goto('/')

    // Создаём игру если список пуст
    const cards = page.locator('.game-card')
    if ((await cards.count()) === 0) {
      await page.getByRole('button', { name: '＋ Создать игру' }).first().click()
      await page.locator('.modal .field-input').first().fill('Навигационная игра')
      await page.getByRole('button', { name: 'Создать' }).click()
      await expect(page.locator('.game-card')).toBeVisible()
    }

    await page.locator('.game-card').first().click()
    await expect(page).toHaveURL(/\/games\/\d+/)
    await expect(page.locator('.topbar')).toBeVisible()
  })
})
