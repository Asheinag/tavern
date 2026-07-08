import { test, expect } from '@playwright/test'

test.describe('Мастер-вью', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '+ Создать игру' }).first().click()
    await page.locator('.modal .field-input').first().fill('E2E Кампания')
    await page.locator('.modal').getByRole('button', { name: 'Создать' }).click()
    await page.waitForURL(/\/master\/\d+/)
  })

  test('мастер-вью загружается с вкладками', async ({ page }) => {
    await expect(page.locator('.tab-btn', { hasText: 'Схема' })).toBeVisible()
    await expect(page.locator('.tab-btn', { hasText: 'Сцена' })).toBeVisible()
    await expect(page.locator('.tab-btn', { hasText: 'Журнал' })).toBeVisible()
  })

  test('создать сцену и увидеть на холсте', async ({ page }) => {
    await page.getByRole('button', { name: '+ Создать сцену' }).click()
    await page.locator('.modal .field-input').fill('Таверна «Пьяный дракон»')
    await page.locator('.modal').getByRole('button', { name: 'Создать' }).click()

    await expect(page.locator('.node-title', { hasText: 'Таверна «Пьяный дракон»' })).toBeVisible()
  })

  test('счётчик сцен обновляется при создании двух сцен', async ({ page }) => {
    await page.getByRole('button', { name: '+ Создать сцену' }).click()
    await page.locator('.modal .field-input').fill('Сцена А')
    await page.locator('.modal').getByRole('button', { name: 'Создать' }).click()
    await expect(page.locator('.node-title', { hasText: 'Сцена А' })).toBeVisible()

    await page.getByRole('button', { name: '+ Создать сцену' }).click()
    await page.locator('.modal .field-input').fill('Сцена Б')
    await page.locator('.modal').getByRole('button', { name: 'Создать' }).click()
    await expect(page.locator('.node-title', { hasText: 'Сцена Б' })).toBeVisible()

    await expect(page.locator('.back-sub')).toContainText('2 сцен')
  })

  test('drag-to-connect создаёт ребро между двумя сценами', async ({ page }) => {
    // создать две сцены
    await page.getByRole('button', { name: '+ Создать сцену' }).click()
    await page.locator('.modal .field-input').fill('Исток')
    await page.locator('.modal').getByRole('button', { name: 'Создать' }).click()
    await expect(page.locator('.node-title', { hasText: 'Исток' })).toBeVisible()

    await page.getByRole('button', { name: '+ Создать сцену' }).click()
    await page.locator('.modal .field-input').fill('Цель')
    await page.locator('.modal').getByRole('button', { name: 'Создать' }).click()
    await expect(page.locator('.node-title', { hasText: 'Цель' })).toBeVisible()

    const nodes = page.locator('.node')
    const handle = nodes.first().locator('.drag-handle')
    const targetNode = nodes.nth(1)

    const handleBox = await handle.boundingBox()
    const targetBox = await targetNode.boundingBox()
    if (!handleBox || !targetBox) throw new Error('не удалось получить координаты нод')

    // drag от handle первой ноды к центру второй
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 10 })
    await page.mouse.up()
    await page.waitForTimeout(500)

    // проверяем ребро: кликаем первую ноду и смотрим transition-row в инспекторе
    await nodes.first().click()
    await expect(page.locator('.transition-row')).toBeVisible()
  })

  test('клик на ноду открывает инспектор с названием сцены', async ({ page }) => {
    await page.getByRole('button', { name: '+ Создать сцену' }).click()
    await page.locator('.modal .field-input').fill('Лесная поляна')
    await page.locator('.modal').getByRole('button', { name: 'Создать' }).click()
    await expect(page.locator('.node-title', { hasText: 'Лесная поляна' })).toBeVisible()

    await page.locator('.node').first().click()

    await expect(page.locator('.inspector')).toBeVisible()
    await expect(page.locator('.insp-title')).toContainText('Лесная поляна')
  })

  test('закрытие инспектора кнопкой ✕', async ({ page }) => {
    await page.getByRole('button', { name: '+ Создать сцену' }).click()
    await page.locator('.modal .field-input').fill('Замок')
    await page.locator('.modal').getByRole('button', { name: 'Создать' }).click()
    await page.locator('.node').first().click()
    await expect(page.locator('.inspector')).toBeVisible()

    await page.locator('.btn-close').click()
    await expect(page.locator('.inspector')).not.toBeVisible()
  })

  test('редактировать описание сцены', async ({ page }) => {
    await page.getByRole('button', { name: '+ Создать сцену' }).click()
    await page.locator('.modal .field-input').fill('Порт')
    await page.locator('.modal').getByRole('button', { name: 'Создать' }).click()
    await page.locator('.node').first().click()

    const textarea = page.locator('.insp-summary-input')
    await textarea.fill('Шумный портовый город')
    await textarea.blur()

    await page.reload()
    await page.locator('.node').first().click()
    await expect(page.locator('.insp-summary-input')).toHaveValue('Шумный портовый город')
  })

  test('активировать сцену и сбросить', async ({ page }) => {
    await page.getByRole('button', { name: '+ Создать сцену' }).click()
    await page.locator('.modal .field-input').fill('Активная сцена')
    await page.locator('.modal').getByRole('button', { name: 'Создать' }).click()
    await page.locator('.node').first().click()

    await page.locator('.btn-activate').click()
    await expect(page.locator('.btn-activate')).toContainText('Активна')

    await page.locator('.btn-activate').click()
    await expect(page.locator('.btn-activate')).toContainText('Активировать сцену')
  })

  test('активировать сцену — в журнале появляется запись', async ({ page }) => {
    await page.getByRole('button', { name: '+ Создать сцену' }).click()
    await page.locator('.modal .field-input').fill('Таверна')
    await page.locator('.modal').getByRole('button', { name: 'Создать' }).click()
    await page.locator('.node').first().click()
    await page.locator('.btn-activate').click()

    await page.locator('.tab-btn', { hasText: 'Журнал' }).click()
    await expect(page.locator('.entry-text', { hasText: 'Активная сцена: Таверна' })).toBeVisible()
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
