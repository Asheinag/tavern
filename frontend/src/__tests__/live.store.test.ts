import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLiveStore } from '../stores/live'

const mockSend = vi.hoisted(() => vi.fn())
const mockDisconnect = vi.hoisted(() => vi.fn())
let capturedHandler: ((data: unknown) => void) = () => {}

vi.mock('../api/ws', () => ({
  createWsClient: vi.fn((_gameId: number, _role: string, onMessage: (d: unknown) => void) => {
    capturedHandler = onMessage
    return { connect: vi.fn(), send: mockSend, disconnect: mockDisconnect }
  }),
}))

function msg(data: unknown) {
  capturedHandler(data)
}

describe('useLiveStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    capturedHandler = () => {}
    mockSend.mockReset()
    mockDisconnect.mockReset()
  })

  it('initial state is empty', () => {
    const store = useLiveStore()
    expect(store.liveState).toEqual({ bg: null, npcs: [], text: null })
    expect(store.connected).toBe(false)
  })

  it('connect calls createWsClient with master role', async () => {
    const { createWsClient } = await import('../api/ws')
    const store = useLiveStore()
    store.connect(1)
    expect(createWsClient).toHaveBeenCalledWith(1, 'master', expect.any(Function))
  })

  it('snapshot sets liveState and connected', () => {
    const store = useLiveStore()
    store.connect(1)
    msg({ type: 'snapshot', state: { bg: { artId: 7 }, npcs: [], text: null } })
    expect(store.liveState.bg).toEqual({ artId: 7 })
    expect(store.connected).toBe(true)
  })

  it('show_bg event updates bg', () => {
    const store = useLiveStore()
    store.connect(1)
    msg({ type: 'event', event: 'show_bg', payload: { artId: 5 } })
    expect(store.liveState.bg).toEqual({ artId: 5 })
  })

  it('clear_bg event clears bg', () => {
    const store = useLiveStore()
    store.connect(1)
    msg({ type: 'event', event: 'show_bg', payload: { artId: 5 } })
    msg({ type: 'event', event: 'clear_bg', payload: {} })
    expect(store.liveState.bg).toBeNull()
  })

  it('add_npc event adds npc slot', () => {
    const store = useLiveStore()
    store.connect(1)
    msg({ type: 'event', event: 'add_npc', payload: { artId: 8, side: 'left' } })
    expect(store.liveState.npcs).toEqual([{ artId: 8, side: 'left' }])
  })

  it('add_npc replaces npc on same side', () => {
    const store = useLiveStore()
    store.connect(1)
    msg({ type: 'event', event: 'add_npc', payload: { artId: 8, side: 'left' } })
    msg({ type: 'event', event: 'add_npc', payload: { artId: 9, side: 'left' } })
    expect(store.liveState.npcs).toHaveLength(1)
    expect(store.liveState.npcs[0].artId).toBe(9)
  })

  it('remove_npc event removes npc', () => {
    const store = useLiveStore()
    store.connect(1)
    msg({ type: 'event', event: 'add_npc', payload: { artId: 8, side: 'left' } })
    msg({ type: 'event', event: 'remove_npc', payload: { artId: 8 } })
    expect(store.liveState.npcs).toHaveLength(0)
  })

  it('show_text / hide_text events', () => {
    const store = useLiveStore()
    store.connect(1)
    msg({ type: 'event', event: 'show_text', payload: { artId: 13 } })
    expect(store.liveState.text).toEqual({ artId: 13 })
    msg({ type: 'event', event: 'hide_text', payload: {} })
    expect(store.liveState.text).toBeNull()
  })

  it('clear_all resets everything', () => {
    const store = useLiveStore()
    store.connect(1)
    msg({ type: 'event', event: 'show_bg', payload: { artId: 7 } })
    msg({ type: 'event', event: 'add_npc', payload: { artId: 8, side: 'left' } })
    msg({ type: 'event', event: 'clear_all', payload: {} })
    expect(store.liveState).toEqual({ bg: null, npcs: [], text: null })
  })

  it('send calls WsClient.send', () => {
    const store = useLiveStore()
    store.connect(1)
    store.send('show_bg', { artId: 7 })
    expect(mockSend).toHaveBeenCalledWith('show_bg', { artId: 7 })
  })

  it('disconnect resets state and calls client.disconnect', () => {
    const store = useLiveStore()
    store.connect(1)
    msg({ type: 'snapshot', state: { bg: { artId: 7 }, npcs: [], text: null } })
    store.disconnect()
    expect(store.connected).toBe(false)
    expect(store.liveState.bg).toBeNull()
    expect(mockDisconnect).toHaveBeenCalled()
  })
})
