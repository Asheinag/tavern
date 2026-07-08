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

  it('линия начинается на границе from-ноды и заканчивается на границе to-ноды', () => {
    // NODE_W=184, NODE_H=80, MARGIN=6
    // центр сцены 1 (x=0,y=0): (92, 40), центр сцены 2 (x=400,y=0): (492, 40)
    // горизонтальная линия → пересекаем вертикальную стенку: hw=92+6=98
    const scenes = [makeScene(1, 0, 0), makeScene(2, 400, 0)]
    const edges = [makeEdge(1, 1, 2)]
    const wrapper = mount(CanvasEdges, { props: { scenes, edges } })
    const line = wrapper.find('line')
    expect(Number(line.attributes('x1'))).toBeCloseTo(92 + 98)   // 190
    expect(Number(line.attributes('y1'))).toBeCloseTo(40)
    expect(Number(line.attributes('x2'))).toBeCloseTo(492 - 98)  // 394
    expect(Number(line.attributes('y2'))).toBeCloseTo(40)
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

  it('каждая линия имеет marker-end для стрелки', () => {
    const scenes = [makeScene(1, 0, 0), makeScene(2, 200, 0)]
    const edges = [makeEdge(1, 1, 2)]
    const wrapper = mount(CanvasEdges, { props: { scenes, edges } })
    const line = wrapper.find('line')
    expect(line.attributes('marker-end')).toBe('url(#arrow)')
  })

  it('SVG содержит определение маркера-стрелки', () => {
    const wrapper = mount(CanvasEdges, { props: { scenes: [], edges: [] } })
    expect(wrapper.find('defs').exists()).toBe(true)
    expect(wrapper.find('marker#arrow').exists()).toBe(true)
  })

  it('рендерит preview-линию при dragFrom + dragPos', () => {
    const scenes = [makeScene(1, 0, 0), makeScene(2, 400, 0)]
    const wrapper = mount(CanvasEdges, {
      props: { scenes, edges: [], dragFrom: 1, dragPos: { x: 300, y: 150 } },
    })
    const lines = wrapper.findAll('line')
    expect(lines.length).toBe(1)
    expect(lines[0].classes()).toContain('edge-preview')
    expect(lines[0].attributes('marker-end')).toBe('url(#arrow-preview)')
  })

  it('не рендерит preview-линию без dragPos', () => {
    const scenes = [makeScene(1, 0, 0)]
    const wrapper = mount(CanvasEdges, {
      props: { scenes, edges: [], dragFrom: 1, dragPos: null },
    })
    expect(wrapper.find('.edge-preview').exists()).toBe(false)
  })
})
