import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SceneNode from '../components/canvas/SceneNode.vue'
import type { Scene } from '../api/games'

const scene: Scene = {
  id: 1,
  game_id: 1,
  title: 'Таверна',
  type: 'Социум',
  status: 'draft',
  color: null,
  summary: '',
  x: 100,
  y: 200,
  col: 0,
  row: 0,
}

describe('SceneNode', () => {
  it('рендерит заголовок и тип', () => {
    const wrapper = mount(SceneNode, { props: { scene, selected: false } })
    expect(wrapper.text()).toContain('Таверна')
    expect(wrapper.text()).toContain('Социум')
  })

  it('позиционируется по scene.x и scene.y', () => {
    const wrapper = mount(SceneNode, { props: { scene, selected: false } })
    const style = wrapper.attributes('style')
    expect(style).toContain('left: 100px')
    expect(style).toContain('top: 200px')
  })

  it('добавляет класс selected когда выбран', () => {
    const wrapper = mount(SceneNode, { props: { scene, selected: true } })
    expect(wrapper.classes()).toContain('selected')
  })

  it('не добавляет класс selected когда не выбран', () => {
    const wrapper = mount(SceneNode, { props: { scene, selected: false } })
    expect(wrapper.classes()).not.toContain('selected')
  })

  it('показывает color-bar когда задан цвет', () => {
    const colored = { ...scene, color: '#ff0000' }
    const wrapper = mount(SceneNode, { props: { scene: colored, selected: false } })
    expect(wrapper.find('.color-bar').exists()).toBe(true)
  })

  it('не показывает color-bar без цвета', () => {
    const wrapper = mount(SceneNode, { props: { scene, selected: false } })
    expect(wrapper.find('.color-bar').exists()).toBe(false)
  })

  it('клик эмитит select с id сцены', async () => {
    const wrapper = mount(SceneNode, { props: { scene, selected: false } })
    // симулируем mousedown без движения (чистый клик)
    await wrapper.trigger('mousedown', { button: 0, clientX: 0, clientY: 0 })
    window.dispatchEvent(new MouseEvent('mouseup'))
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('select')).toBeTruthy()
    expect(wrapper.emitted('select')![0]).toEqual([1])
  })

  it('добавляет класс по статусу сцены', () => {
    const available = { ...scene, status: 'available' }
    const wrapper = mount(SceneNode, { props: { scene: available, selected: false } })
    expect(wrapper.classes()).toContain('status-available')
  })

  // TODO: тест drag — эмит move при перемещении мыши после mousedown
  // Требует симуляции mousemove на window, сложно в jsdom без реального layout
})
