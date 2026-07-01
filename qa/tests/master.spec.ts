import { test, expect } from '@playwright/test'

test.describe('Мастер-вью', () => {
  let gameUrl: string

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '＋ Создать игру' }).first().click()
    await page.locator('.modal .field-input').first().fill('E2E Кампания')
    await page.getByRole('button', { name: 'Создать' }).click()
    await page.locator('.card-title', { hasText: 'E2E Кампания' }).click()
    await page.waitForURL(/\/games\/\d+/)
    gameUrl = page.url()
  })

  test('мастер-вью загружается с вкладками', async ({ page }) => {
    await expect(page.locator('.tab-btn', { hasText: 'Схема' })).toBeVisible()
    await expect(page.locator('.tab-btn', { hasText: 'Сцена' })).toBeVisible()
    await expect(page.locator('.tab-btn', { hasText: 'Журнал' })).toBeVisible()
  })

  test('создать сцену и увидеть на холсте', async ({ page }) => {
    await page.getByRole('button', { name: '＋ Создать сцену' }).click()
    await page.locator('.modal .field-input').fill('Таверна «Пьяный дракон»')
    await page.getByRole('button', { name: 'Создать' }).click()

    await expect(page.locator('.node-title', { hasText: 'Таверна «Пьяный дракон»' })).toBeVisible()
  })

  test('вкладка Журнал — добавить заметку', async ({ page }) => {
    await page.locator('.tab-btn', { hasText: 'Журнал' }).click()
    await expect(page.locator('.log-title')).toContainText('Журнал сессии')

    await page.locator('.note-input').fill('Игроки прибыли в таверну')
    await page.locator('.btn-add').click()

    await expect(
      page.locator('.entry-text', { hasText: 'Игроки прибыли в таверну' }),
    ).toBeVisible()
  })

  test('вкладка Сцена показывает экран предпросмотра', async ({ page }) => {
    await page.locator('.tab-btn', { hasText: 'Сцена' }).click()
    await expect(page.locator('.scene-screen')).toBeVisible()
  })
})
