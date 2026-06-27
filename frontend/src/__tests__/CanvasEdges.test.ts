import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CanvasEdges from '../components/canvas/CanvasEdges.vue'
import type { Scene, Edge } from '../api/games'

const makeScene = (id: number, x: number, y: number): Scene => ({
  id,
  game_id: 1,
  title: `Сцена ${id}`,
  type: '',
  status: 'draft',
  color: null,
  summary: '',
  x,
  y,
  col: 0,
  row: 0,
})

const makeEdge = (id: number, from: number, to: number): Edge => ({
  id,
  game_id: 1,
  from_scene_id: from,
  to_scene_id: to,
  cond: null,
})

describe('CanvasEdges', () => {
  it('рендерит SVG', () => {
    const wrapper = mount(CanvasEdges, { props: { scenes: [], edges: [] } })
    expect(wrapper.find('svg').exists()).toBe(true)
  })

  it('не рендерит линии без рёбер', () => {
    const scenes = [makeScene(1, 0, 0), makeScene(2, 200, 0)]
    const wrapper = mount(CanvasEdges, { props: { scenes, edges: [] } })
    expect(wrapper.findAll('line')).toHaveLength(0)
  })

  it('рендерит линию для каждого ребра', () => {
    const scenes = [makeScene(1, 0, 0), makeScene(2, 200, 0), makeScene(3, 400, 0)]
    const edges = [makeEdge(1, 1, 2), makeEdge(2, 2, 3)]
    const wrapper = mount(CanvasEdges, { props: { scenes, edges } })
    expect(wrapper.findAll('line')).toHaveLength(2)
  })

  it('линия идёт от центра from-сцены к центру to-сцены', () => {
    // NODE_W=184, NODE_H=80 → центр сцены на (0,0) = (92, 40)
    const scenes = [makeScene(1, 0, 0), makeScene(2, 200, 100)]
    const edges = [makeEdge(1, 1, 2)]
    const wrapper = mount(CanvasEdges, { props: { scenes, edges } })
    const line = wrapper.find('line')
    expect(line.attributes('x1')).toBe('92')
    expect(line.attributes('y1')).toBe('40')
    expect(line.attributes('x2')).toBe('292') // 200 + 92
    expect(line.attributes('y2')).toBe('140') // 100 + 40
  })

  it('не рендерит линию если одна из сцен не найдена', () => {
    const scenes = [makeScene(1, 0, 0)]
    const edges = [makeEdge(1, 1, 99)] // сцена 99 не существует
    const wrapper = mount(CanvasEdges, { props: { scenes, edges } })
    expect(wrapper.findAll('line')).toHaveLength(0)
  })

  it('SVG достаточно широк чтобы вместить все сцены', () => {
    const scenes = [makeScene(1, 500, 0)]
    const wrapper = mount(CanvasEdges, { props: { scenes, edges: [] } })
    const width = Number(wrapper.find('svg').attributes('width'))
    expect(width).toBeGreaterThan(500)
  })

  // TODO: тест стрелки (marker-end) — требует проверки SVG defs в jsdom,
  // которая ненадёжна из-за неполной поддержки SVG
})
