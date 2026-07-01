import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePlayerStore } from '../stores/player'

describe('usePlayerStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('начальное состояние пустое', () => {
    const store = usePlayerStore()
    expect(store.playerOffsets).toEqual({})
    expect(store.playerExpandedId).toBeNull()
  })

  it('setOffset сохраняет смещение для artId', () => {
    const store = usePlayerStore()
    store.setOffset(5, 30, -10)
    expect(store.playerOffsets[5]).toEqual({ dx: 30, dy: -10 })
  })

  it('setOffset перезаписывает существующее смещение', () => {
    const store = usePlayerStore()
    store.setOffset(5, 30, 0)
    store.setOffset(5, 0, 50)
    expect(store.playerOffsets[5]).toEqual({ dx: 0, dy: 50 })
  })

  it('clearOffsets сбрасывает все смещения', () => {
    const store = usePlayerStore()
    store.setOffset(5, 10, 20)
    store.setOffset(8, 5, 5)
    store.clearOffsets()
    expect(store.playerOffsets).toEqual({})
  })

  it('setExpanded устанавливает раскрытый элемент', () => {
    const store = usePlayerStore()
    store.setExpanded(7)
    expect(store.playerExpandedId).toBe(7)
  })

  it('setExpanded(null) закрывает панель', () => {
    const store = usePlayerStore()
    store.setExpanded(7)
    store.setExpanded(null)
    expect(store.playerExpandedId).toBeNull()
  })

  it('hasOffsets возвращает false когда смещений нет', () => {
    const store = usePlayerStore()
    expect(store.hasOffsets()).toBe(false)
  })

  it('hasOffsets возвращает false когда все смещения нулевые', () => {
    const store = usePlayerStore()
    store.setOffset(5, 0, 0)
    expect(store.hasOffsets()).toBe(false)
  })

  it('hasOffsets возвращает true когда есть ненулевое смещение', () => {
    const store = usePlayerStore()
    store.setOffset(5, 10, 0)
    expect(store.hasOffsets()).toBe(true)
  })
})
