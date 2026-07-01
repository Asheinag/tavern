<template>
  <div class="scene-screen">
    <div ref="frameRef" class="frame">
      <!-- Фон -->
      <div
        v-if="bgArtifact"
        class="bg-layer"
        :class="{ interactive: isPlayer }"
        @dblclick="isPlayer && playerStore.clearOffsets()"
      >
        <img :src="`/uploads/${bgArtifact.file_path}`" :alt="bgArtifact.title" />
      </div>
      <div v-else class="bg-empty"></div>

      <!-- NPC -->
      <div
        v-for="slot in npcSlots"
        :key="slot.artId"
        class="npc-layer"
        :class="[`side-${slot.side}`, { draggable: isPlayer }]"
        :style="{ transform: npcTransform(slot) }"
        @pointerdown="isPlayer ? onPointerDown(slot.artId, $event) : undefined"
      >
        <img
          v-if="slot.artifact"
          :src="`/uploads/${slot.artifact.file_path}`"
          :alt="slot.artifact.title"
        />
        <div class="npc-name">{{ slot.artifact?.title || '—' }}</div>
      </div>

      <!-- Текст/заметка -->
      <div
        v-if="textArtifact"
        class="text-overlay"
        :class="{ draggable: isPlayer }"
        :style="isPlayer ? textTransform() : undefined"
        @pointerdown="isPlayer ? onPointerDown(textArtifact.id, $event) : undefined"
      >
        <div class="text-title">{{ textArtifact.title }}</div>
      </div>

      <!-- Нижний градиент с названием сцены -->
      <div class="bottom-bar">
        <span v-if="bgArtifact" class="scene-label">{{ bgArtifact.title }}</span>
        <span v-else class="scene-label dim">Экран затемнён</span>
      </div>

      <!-- Плейсхолдер когда всё пусто -->
      <div v-if="isEmpty" class="empty-overlay">
        <span class="empty-label">Экран затемнён</span>
      </div>

      <!-- Кнопка сброса смещений (только в режиме игрока) -->
      <button
        v-if="isPlayer && playerStore.hasOffsets()"
        class="btn-reset"
        @click="playerStore.clearOffsets()"
      >
        ↺
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { useLiveStore } from '../../stores/live'
import { useArtifactsStore } from '../../stores/artifacts'
import { usePlayerStore } from '../../stores/player'

const props = withDefaults(defineProps<{ mode?: 'master' | 'player' }>(), { mode: 'master' })

const liveStore = useLiveStore()
const artifactsStore = useArtifactsStore()
const playerStore = usePlayerStore()

const frameRef = ref<HTMLElement | null>(null)
const isPlayer = computed(() => props.mode === 'player')

function findArtifact(artId: number) {
  return artifactsStore.library.find((a) => a.id === artId) ?? null
}

const bgArtifact = computed(() => {
  const bg = liveStore.liveState.bg
  return bg ? findArtifact(bg.artId) : null
})

const npcSlots = computed(() =>
  liveStore.liveState.npcs.map((n) => ({
    artId: n.artId,
    side: n.side,
    artifact: findArtifact(n.artId),
  })),
)

const textArtifact = computed(() => {
  const t = liveStore.liveState.text
  return t ? findArtifact(t.artId) : null
})

const isEmpty = computed(
  () => !liveStore.liveState.bg && !liveStore.liveState.npcs.length && !liveStore.liveState.text,
)

// ── Transforms ────────────────────────────────────────────────────────────────

function npcTransform(slot: { side: string; artId: number }): string | undefined {
  const { dx, dy } = isPlayer.value
    ? (playerStore.playerOffsets[slot.artId] ?? { dx: 0, dy: 0 })
    : { dx: 0, dy: 0 }
  if (slot.side === 'center') return `translateX(calc(-50% + ${dx}px)) translateY(${dy}px)`
  return dx || dy ? `translate(${dx}px, ${dy}px)` : undefined
}

function textTransform(): string | undefined {
  if (!textArtifact.value) return undefined
  const { dx, dy } = playerStore.playerOffsets[textArtifact.value.id] ?? { dx: 0, dy: 0 }
  return dx || dy ? `translateX(calc(-50% + ${dx}px)) translateY(${dy}px)` : undefined
}

// ── Drag / click ──────────────────────────────────────────────────────────────

interface DragState {
  artId: number
  startX: number
  startY: number
  baseDx: number
  baseDy: number
  moved: boolean
}

let drag: DragState | null = null

function onPointerDown(artId: number, e: PointerEvent) {
  e.preventDefault()
  const { dx, dy } = playerStore.playerOffsets[artId] ?? { dx: 0, dy: 0 }
  drag = { artId, startX: e.clientX, startY: e.clientY, baseDx: dx, baseDy: dy, moved: false }
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
}

function onPointerMove(e: PointerEvent) {
  if (!drag) return
  const dx = e.clientX - drag.startX
  const dy = e.clientY - drag.startY
  if (!drag.moved && Math.hypot(dx, dy) > 4) drag.moved = true
  if (drag.moved) {
    const newDx = clampOffset(drag.baseDx + dx, 'x')
    const newDy = clampOffset(drag.baseDy + dy, 'y')
    playerStore.setOffset(drag.artId, newDx, newDy)
  }
}

function onPointerUp() {
  if (!drag) return
  if (!drag.moved) {
    const next = playerStore.playerExpandedId === drag.artId ? null : drag.artId
    playerStore.setExpanded(next)
  }
  drag = null
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
}

function clampOffset(value: number, axis: 'x' | 'y'): number {
  const frame = frameRef.value
  if (!frame || frame.clientWidth === 0) return value
  const limit = axis === 'x' ? frame.clientWidth * 0.6 : frame.clientHeight * 0.6
  return Math.max(-limit, Math.min(limit, value))
}

onUnmounted(() => {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
})

// ── Сброс при смене live state ────────────────────────────────────────────────

watch(
  () => liveStore.liveState,
  (state) => {
    if (!isPlayer.value) return
    const visibleIds = new Set([
      state.bg?.artId,
      ...state.npcs.map((n) => n.artId),
      state.text?.artId,
    ].filter((id): id is number => id !== undefined))

    // Закрываем панель если её артефакт исчез
    if (playerStore.playerExpandedId !== null && !visibleIds.has(playerStore.playerExpandedId)) {
      playerStore.setExpanded(null)
    }

    // Чистим оффсеты при clear_all
    if (visibleIds.size === 0) playerStore.clearOffsets()
  },
  { deep: true },
)
</script>

<style scoped>
.scene-screen {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--t0);
  padding: 24px;
  min-height: 0;
}

.frame {
  width: 100%;
  max-width: 1040px;
  aspect-ratio: 16 / 9;
  border-radius: 8px;
  border: 1px solid var(--t14);
  overflow: hidden;
  position: relative;
  background: #0c0b09;
}

.bg-layer {
  position: absolute;
  inset: 0;
}

.bg-layer img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.bg-empty {
  position: absolute;
  inset: 0;
  background: #0c0b09;
}

.npc-layer {
  position: absolute;
  bottom: 0;
  width: min(26%, 300px);
  height: 78%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  z-index: 2;
}

.npc-layer.side-left { left: 6%; }
.npc-layer.side-right { right: 6%; }
.npc-layer.side-center { left: 50%; }

.npc-layer img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: bottom;
  display: block;
}

.npc-name {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  text-align: center;
  font-size: clamp(10px, 1.4vw, 16px);
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--t28);
  padding: 4px 6px 8px;
  background: linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.6));
}

.text-overlay {
  position: absolute;
  top: 7%;
  left: 50%;
  transform: translateX(-50%);
  max-width: 64%;
  background: var(--ov6, rgba(18, 15, 10, 0.9));
  border: 1px solid var(--t21);
  border-radius: 10px;
  padding: 16px 22px;
  text-align: center;
  z-index: 3;
}

.text-title {
  font-size: clamp(13px, 1.6vw, 18px);
  color: var(--t28);
}

/* Интерактивные элементы в режиме игрока */
.draggable {
  cursor: grab;
  user-select: none;
  touch-action: none;
  transition: box-shadow 0.12s, outline 0.12s;
}

.draggable:hover {
  outline: 1px solid var(--t21, rgba(255, 255, 255, 0.15));
  outline-offset: 2px;
}

.draggable:active {
  cursor: grabbing;
}

.bg-layer.interactive {
  cursor: default;
}

.bottom-bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 26px 30px 18px;
  background: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.7) 100%);
  pointer-events: none;
  z-index: 4;
}

.scene-label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: clamp(9px, 1vw, 12px);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--t29);
}

.scene-label.dim { color: var(--t34); }

.empty-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}

.empty-label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: clamp(10px, 1.2vw, 13px);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--t34);
}

/* Кнопка сброса смещений */
.btn-reset {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 10;
  background: var(--ov6, rgba(18, 15, 10, 0.85));
  border: 1px solid var(--t21);
  border-radius: 8px;
  color: var(--t34);
  font-size: 16px;
  width: 32px;
  height: 32px;
  cursor: pointer;
  transition: color 0.12s, border-color 0.12s;
}

.btn-reset:hover {
  color: var(--t28);
  border-color: var(--t28);
}
</style>
