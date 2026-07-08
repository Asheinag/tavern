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

    await expect(playerPage.locator('.scene-screen')).toBeVisible({ timeout: 15000 })
    await expect(playerPage.locator('.empty-label')).toContainText('Экран затемнён')
    await playerPage.close()
  })

  test('мастер активирует сцену — игрок видит название сцены внизу', async ({ page, context }) => {
    // подготовка: создать игру и сцену
    await page.goto('/')
    await page.getByRole('button', { name: '+ Создать игру' }).first().click()
    await page.locator('.modal .field-input').first().fill('WS-игра')
    await page.locator('.modal').getByRole('button', { name: 'Создать' }).click()
    await page.waitForURL(/\/master\/\d+/)

    await page.getByRole('button', { name: '+ Создать сцену' }).click()
    await page.locator('.modal .field-input').fill('Тёмный лес')
    await page.locator('.modal').getByRole('button', { name: 'Создать' }).click()
    await expect(page.locator('.node-title', { hasText: 'Тёмный лес' })).toBeVisible()

    // открыть экран игрока
    const gameId = page.url().match(/\/master\/(\d+)/)?.[1]
    const resp = await page.request.get(`/api/games/${gameId}`)
    const game = await resp.json()

    const playerPage = await context.newPage()
    await playerPage.goto(`/play/${game.share_code}`)
    await expect(playerPage.locator('.scene-screen')).toBeVisible({ timeout: 15000 })

    // мастер активирует сцену
    await page.locator('.node').first().click()
    await page.locator('.btn-activate').click()
    await expect(page.locator('.btn-activate')).toContainText('Активна')

    // игрок видит название сцены внизу (не «Экран затемнён»)
    await expect(playerPage.locator('.bottom-bar .scene-label')).toContainText('Тёмный лес', { timeout: 5000 })
    await playerPage.close()
  })
})
