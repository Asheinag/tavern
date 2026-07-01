<template>
  <div class="player-view">
    <div v-if="status === 'loading'" class="status-overlay">
      <span class="status-text">Подключение…</span>
    </div>

    <div v-else-if="status === 'error'" class="status-overlay">
      <span class="status-text error">{{ errorMessage }}</span>
    </div>

    <template v-else>
      <SceneScreen class="player-screen" mode="player" />
      <DetailPanel />

      <div v-if="!liveStore.connected" class="conn-badge">
        <span class="dot" />
        Ожидание мастера…
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import SceneScreen from '../components/player/SceneScreen.vue'
import DetailPanel from '../components/player/DetailPanel.vue'
import { gamesApi } from '../api/games'
import { useArtifactsStore } from '../stores/artifacts'
import { useLiveStore } from '../stores/live'

type Status = 'loading' | 'ready' | 'error'

const route = useRoute()
const liveStore = useLiveStore()
const artifactsStore = useArtifactsStore()

const status = ref<Status>('loading')
const errorMessage = ref('')

onMounted(async () => {
  const code = route.params.code as string
  try {
    const game = await gamesApi.getByCode(code)
    await artifactsStore.fetchLibrary()
    liveStore.connect(game.id, 'player')
    status.value = 'ready'
  } catch {
    status.value = 'error'
    errorMessage.value = 'Игра не найдена. Проверь ссылку.'
  }
})

onUnmounted(() => {
  liveStore.disconnect()
})
</script>

<style scoped>
.player-view {
  width: 100vw;
  height: 100vh;
  background: var(--t0);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.player-screen {
  width: 100%;
  height: 100%;
}

.status-overlay {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.status-text {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 14px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--t34);
}

.status-text.error {
  color: #e05f5f;
}

.conn-badge {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--t34);
  background: var(--ov6, rgba(18, 15, 10, 0.85));
  border: 1px solid var(--t14);
  border-radius: 20px;
  padding: 6px 14px;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--t34);
  animation: pulse 1.6s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}
</style>
