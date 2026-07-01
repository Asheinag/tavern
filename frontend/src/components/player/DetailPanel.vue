<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="artifact" class="detail-overlay" @click.self="close">
        <div class="detail-card">
          <button class="btn-close" aria-label="Закрыть" @click="close">✕</button>

          <div class="detail-image">
            <img
              v-if="artifact.file_path"
              :src="`/uploads/${artifact.file_path}`"
              :alt="artifact.title"
            />
            <div v-else class="detail-img-placeholder" />
          </div>

          <div class="detail-body">
            <h2 class="detail-title">{{ artifact.title }}</h2>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { usePlayerStore } from '../../stores/player'
import { useArtifactsStore } from '../../stores/artifacts'

const playerStore = usePlayerStore()
const artifactsStore = useArtifactsStore()

const artifact = computed(() => {
  const id = playerStore.playerExpandedId
  if (id === null) return null
  return artifactsStore.library.find((a) => a.id === id) ?? null
})

function close() {
  playerStore.setExpanded(null)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.detail-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.detail-card {
  position: relative;
  display: flex;
  gap: 28px;
  align-items: flex-start;
  background: var(--t1, #111);
  border: 1px solid var(--t21);
  border-radius: 16px;
  padding: 28px;
  max-width: 760px;
  width: 100%;
  box-shadow: 0 32px 80px rgba(0, 0, 0, 0.7);
}

.btn-close {
  position: absolute;
  top: 14px;
  right: 14px;
  background: none;
  border: none;
  color: var(--t34);
  font-size: 18px;
  cursor: pointer;
  padding: 4px 6px;
  line-height: 1;
  border-radius: 6px;
  transition: color 0.12s;
}

.btn-close:hover {
  color: var(--t28);
}

.detail-image {
  flex: none;
  width: 220px;
  height: 300px;
  border-radius: 10px;
  overflow: hidden;
  background: var(--t5, #1a1a1a);
}

.detail-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.detail-img-placeholder {
  width: 100%;
  height: 100%;
  background: var(--accentBg, #1a2a1a);
}

.detail-body {
  flex: 1;
  min-width: 0;
  padding-top: 4px;
}

.detail-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--t28);
  line-height: 1.2;
}

/* Анимация появления */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
