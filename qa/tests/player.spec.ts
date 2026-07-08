import { test, expect } from '@playwright/test'

test.describe('Экран игрока', () => {
  test('игрок открывает экран по share_code', async ({ page, context }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '+ Создать игру' }).first().click()
    await page.locator('.modal .field-input').first().fill('Игра для игрока')
    await page.locator('.modal').getByRole('button', { name: 'Создать' }).click()
    await page.waitForURL(/\/master\/\d+/)

    const gameId = page.url().match(/\/master\/(\d+)/)?.[1]
    const resp = await page.request.get(`/api/games/${gameId}`)
    const game = await resp.json()

    const playerPage = await context.newPage()
    await playerPage.goto(`/play/${game.share_code}`)

    // ждём пока страница перейдёт из «Подключение…» в готовое состояние
    await expect(playerPage.locator('.scene-screen')).toBeVisible({ timeout: 15000 })
    await playerPage.close()
  })

  test('экран игрока показывает «Экран затемнён» без активных слоёв', async ({ page, context }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '+ Создать игру' }).first().click()
    await page.locator('.modal .field-input').first().fill('Пустая игра')
    await page.locator('.modal').getByRole('button', { name: 'Создать' }).click()
    await page.waitForURL(/\/master\/\d+/)

    const gameId = page.url().match(/\/master\/(\d+)/)?.[1]
    const resp = await page.request.get(`/api/games/${gameId}`)
    const game = await resp.json()

    const playerPage = await context.newPage()
    await playerPage.goto(`/play/${game.share_code}`)

    // ждём загрузки экрана, затем проверяем плейсхолдер
    await expect(playerPage.locator('.scene-screen')).toBeVisible({ timeout: 15000 })
    await expect(playerPage.locator('.empty-label')).toContainText('Экран затемнён')
    await playerPage.close()
  })
})
