import { ref } from 'vue'
import { defineStore } from 'pinia'

export interface Offset {
  dx: number
  dy: number
}

export const usePlayerStore = defineStore('player', () => {
  const playerOffsets = ref<Record<number, Offset>>({})
  const playerExpandedId = ref<number | null>(null)

  function setOffset(artId: number, dx: number, dy: number): void {
    playerOffsets.value[artId] = { dx, dy }
  }

  function clearOffsets(): void {
    playerOffsets.value = {}
  }

  function setExpanded(artId: number | null): void {
    playerExpandedId.value = artId
  }

  function hasOffsets(): boolean {
    return Object.values(playerOffsets.value).some((o) => o.dx !== 0 || o.dy !== 0)
  }

  return { playerOffsets, playerExpandedId, setOffset, clearOffsets, setExpanded, hasOffsets }
})
