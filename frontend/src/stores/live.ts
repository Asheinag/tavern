import { ref } from 'vue'
import { defineStore } from 'pinia'
import { createWsClient, type WsClientLike } from '../api/ws'

export interface NpcSlot {
  artId: number
  side: string
}

export interface LiveState {
  bg: { artId: number } | null
  npcs: NpcSlot[]
  text: { artId: number } | null
}

export const useLiveStore = defineStore('live', () => {
  const liveState = ref<LiveState>({ bg: null, npcs: [], text: null })
  const connected = ref(false)
  let client: WsClientLike | null = null

  function connect(gameId: number, role: 'master' | 'player' = 'master'): void {
    client = createWsClient(gameId, role, handleMessage)
    client.connect()
  }

  function disconnect(): void {
    client?.disconnect()
    client = null
    connected.value = false
    liveState.value = { bg: null, npcs: [], text: null }
  }

  function send(type: string, payload: Record<string, unknown> = {}): void {
    client?.send(type, payload)
  }

  function handleMessage(raw: unknown): void {
    const data = raw as { type: string; state?: LiveState; event?: string; payload?: Record<string, unknown> }
    if (data.type === 'snapshot' && data.state) {
      liveState.value = data.state
      connected.value = true
    } else if (data.type === 'event' && data.event) {
      applyEvent(data.event, data.payload ?? {})
    }
  }

  function applyEvent(event: string, payload: Record<string, unknown>): void {
    if (event === 'show_bg') {
      liveState.value.bg = { artId: payload.artId as number }
    } else if (event === 'clear_bg') {
      liveState.value.bg = null
    } else if (event === 'add_npc') {
      const artId = payload.artId as number
      const side = payload.side as string
      const npcs = liveState.value.npcs.filter((n) => n.artId !== artId && n.side !== side)
      npcs.push({ artId, side })
      liveState.value.npcs = npcs.slice(0, 2)
    } else if (event === 'remove_npc') {
      liveState.value.npcs = liveState.value.npcs.filter((n) => n.artId !== (payload.artId as number))
    } else if (event === 'show_text') {
      liveState.value.text = { artId: payload.artId as number }
    } else if (event === 'hide_text') {
      liveState.value.text = null
    } else if (event === 'clear_all') {
      liveState.value = { bg: null, npcs: [], text: null }
    }
  }

  return { liveState, connected, connect, disconnect, send }
})
