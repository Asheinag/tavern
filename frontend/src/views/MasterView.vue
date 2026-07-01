<template>
  <div class="master">
    <!-- ── Шапка ── -->
    <div class="topbar">
      <div
        class="topbar-back"
        title="Ко всем играм"
        @click="router.push('/games')"
      >
        <div class="back-diamond"></div>
        <div class="back-text">
          <span class="back-title">{{ store.currentGame?.title ?? '…' }}</span>
          <span class="back-sub">← все игры · {{ store.currentGame?.scenes.length ?? 0 }} сцен</span>
        </div>
      </div>

      <div class="tab-group">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="tab-btn"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <div style="flex: 1"></div>

      <button class="btn-scene" @click="openAddScene">＋ Создать сцену</button>
      <button class="btn-library" :class="{ active: libraryOpen }" @click="toggleLibrary">
        Библиотека
      </button>

      <div class="live-indicator" :class="{ active: liveStore.connected && !!liveStore.liveState.bg }">
        <span class="live-dot"></span>
        <span class="live-label">{{ liveLabel }}</span>
      </div>
    </div>

    <!-- ── Тело ── -->
    <div class="body">
      <!-- Загрузка / ошибка -->
      <div v-if="store.gameLoading" class="state-msg">Загружаю...</div>
      <div v-else-if="store.gameError" class="state-msg error">{{ store.gameError }}</div>

      <!-- Вкладка Схема -->
      <template v-else-if="activeTab === 'schema'">
        <div
          class="canvas"
          :style="{ minWidth: canvasMinW + 'px', minHeight: canvasMinH + 'px' }"
          @click="selectedId = null"
        >
          <CanvasEdges
            v-if="store.currentGame"
            :scenes="store.currentGame.scenes"
            :edges="store.currentGame.edges"
          />
          <SceneNode
            v-for="scene in store.currentGame?.scenes"
            :key="scene.id"
            :scene="scene"
            :selected="selectedId === scene.id"
            @select="selectedId = $event"
            @move="onNodeMove"
          />
          <div v-if="!store.currentGame?.scenes.length" class="canvas-empty">
            <div class="canvas-empty-icon">🜂</div>
            <div class="canvas-empty-text">Нет сцен — создай первую</div>
          </div>
        </div>
      </template>

      <!-- Вкладки-заглушки -->
      <div v-else-if="activeTab === 'map'" class="tab-stub">Вид «Карта» — скоро</div>
      <SceneScreen v-else-if="activeTab === 'stage'" />
      <SessionLog v-else-if="activeTab === 'log'" :game-id="gameId" class="tab-full" />

      <!-- ── Библиотека ── -->
      <ArtifactLibrary
        v-if="libraryOpen"
        :current-scene-id="selectedId"
        @close="libraryOpen = false"
      />

      <!-- ── Инспектор ── -->
      <aside v-if="selectedScene" class="inspector">
        <div class="insp-head">
          <div class="insp-chips">
            <span class="chip" :class="`status-${selectedScene.status}`">
              {{ statusLabel(selectedScene.status) }}
            </span>
            <span class="chip-type">{{ selectedScene.type || 'Сцена' }}</span>
          </div>
          <button class="btn-close" @click="selectedId = null">✕</button>
        </div>

        <div class="insp-title">{{ selectedScene.title }}</div>

        <div class="insp-scroll">
          <div class="insp-section">
            <div class="insp-label">Описание</div>
            <p class="insp-summary">{{ selectedScene.summary || 'Нет описания' }}</p>
          </div>

          <div class="insp-section">
            <ArtifactPanel :scene-id="selectedScene.id" />
          </div>

          <div class="insp-section">
            <div class="insp-label">Переходы из сцены</div>
            <div v-if="outEdges.length === 0" class="insp-empty">Нет переходов</div>
            <div
              v-for="edge in outEdges"
              :key="edge.id"
              class="transition-row"
            >
              <span class="transition-arrow">→</span>
              <span class="transition-target">{{ sceneTitle(edge.to_scene_id) }}</span>
              <span v-if="edge.cond" class="transition-cond">{{ edge.cond }}</span>
              <button
                class="btn-edge-del"
                title="Удалить переход"
                @click="onDeleteEdge(edge.id)"
              >
                ✕
              </button>
            </div>

            <div class="edge-add-row">
              <select v-model="newEdgeTargetId" class="edge-select">
                <option :value="null" disabled>Выбрать цель…</option>
                <option
                  v-for="scene in edgeTargetOptions"
                  :key="scene.id"
                  :value="scene.id"
                >
                  {{ scene.title }}
                </option>
              </select>
              <button
                class="btn-add-edge"
                :disabled="newEdgeTargetId === null || addingEdge"
                @click="onAddEdge"
              >
                {{ addingEdge ? '…' : '+ Связь' }}
              </button>
            </div>
          </div>

          <div class="insp-section">
            <button class="btn-delete" @click="onDeleteScene">Удалить сцену</button>
          </div>
        </div>
      </aside>
    </div>

    <!-- ── Модалка создания сцены ── -->
    <Teleport to="body">
      <div v-if="addSceneOpen" class="modal-overlay" @click.self="addSceneOpen = false">
        <div class="modal">
          <div class="modal-header">
            <h3>Новая сцена</h3>
            <button class="btn-close" @click="addSceneOpen = false">✕</button>
          </div>
          <label class="field-label">Название</label>
          <input
            v-model="newSceneTitle"
            autofocus
            class="field-input"
            placeholder="Таверна «Пьяный дракон»"
            @keydown.enter="submitAddScene"
          />
          <div class="modal-actions">
            <button
              class="btn-primary"
              :disabled="!newSceneTitle.trim() || addingScene"
              @click="submitAddScene"
            >
              {{ addingScene ? 'Создаю...' : 'Создать' }}
            </button>
            <button class="btn-secondary" @click="addSceneOpen = false">Отмена</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCampaignStore } from '../stores/campaign'
import { useArtifactsStore } from '../stores/artifacts'
import { useLiveStore } from '../stores/live'
import SceneNode from '../components/canvas/SceneNode.vue'
import CanvasEdges from '../components/canvas/CanvasEdges.vue'
import ArtifactLibrary from '../components/artifacts/ArtifactLibrary.vue'
import ArtifactPanel from '../components/artifacts/ArtifactPanel.vue'
import SceneScreen from '../components/player/SceneScreen.vue'
import SessionLog from '../components/master/SessionLog.vue'

const route = useRoute()
const router = useRouter()
const store = useCampaignStore()
const artifactsStore = useArtifactsStore()
const liveStore = useLiveStore()

const gameId = Number(route.params.id)
onMounted(() => {
  store.fetchGame(gameId)
  artifactsStore.fetchLibrary()
  liveStore.connect(gameId)
})

const tabs = [
  { key: 'schema', label: 'Схема' },
  { key: 'map', label: 'Карта' },
  { key: 'stage', label: 'Сцена' },
  { key: 'log', label: 'Журнал' },
]
const activeTab = ref('schema')

const selectedId = ref<number | null>(null)
const libraryOpen = ref(false)

function toggleLibrary() {
  libraryOpen.value = !libraryOpen.value
}

watch(selectedId, (id) => {
  if (id !== null) {
    artifactsStore.fetchSceneArtifacts(id)
  } else {
    artifactsStore.clearSceneArtifacts()
  }
})

const selectedScene = computed(
  () => store.currentGame?.scenes.find((s) => s.id === selectedId.value) ?? null,
)

const outEdges = computed(() =>
  store.currentGame?.edges.filter((e) => e.from_scene_id === selectedId.value) ?? [],
)

const edgeTargetOptions = computed(() => {
  const existing = new Set(outEdges.value.map((e) => e.to_scene_id))
  return (store.currentGame?.scenes ?? []).filter(
    (s) => s.id !== selectedId.value && !existing.has(s.id),
  )
})

function sceneTitle(id: number) {
  return store.currentGame?.scenes.find((s) => s.id === id)?.title ?? `#${id}`
}

function statusLabel(s: string) {
  return ({ draft: 'Черновик', available: 'Доступна', locked: 'Скрыта' } as Record<string, string>)[s] ?? s
}

const liveLabel = computed(() => {
  if (!liveStore.connected) return 'Не подключено'
  if (liveStore.liveState.bg) return 'В эфире'
  return 'Экран затемнён'
})

const canvasMinW = computed(() => {
  const scenes = store.currentGame?.scenes ?? []
  return scenes.length ? Math.max(...scenes.map((s) => s.x + 280)) : 800
})
const canvasMinH = computed(() => {
  const scenes = store.currentGame?.scenes ?? []
  return scenes.length ? Math.max(...scenes.map((s) => s.y + 200)) : 500
})

// ── Drag ─────────────────────────────────────────────────────────────────────

let moveTimer: ReturnType<typeof setTimeout> | null = null

function onNodeMove(id: number, x: number, y: number) {
  const scene = store.currentGame?.scenes.find((s) => s.id === id)
  if (!scene) return
  scene.x = Math.max(0, x)
  scene.y = Math.max(0, y)

  if (moveTimer) clearTimeout(moveTimer)
  moveTimer = setTimeout(() => store.updateScene(id, { x: scene.x, y: scene.y }), 300)
}

onUnmounted(() => {
  if (moveTimer) clearTimeout(moveTimer)
  liveStore.disconnect()
})

// ── Рёбра ────────────────────────────────────────────────────────────────────

const newEdgeTargetId = ref<number | null>(null)
const addingEdge = ref(false)

async function onAddEdge() {
  if (!selectedId.value || newEdgeTargetId.value === null || addingEdge.value) return
  addingEdge.value = true
  try {
    await store.addEdge(selectedId.value, newEdgeTargetId.value)
    newEdgeTargetId.value = null
  } finally {
    addingEdge.value = false
  }
}

async function onDeleteEdge(edgeId: number) {
  await store.removeEdge(edgeId)
}

// ── Сцены ────────────────────────────────────────────────────────────────────

const addSceneOpen = ref(false)
const newSceneTitle = ref('')
const addingScene = ref(false)

function openAddScene() {
  newSceneTitle.value = ''
  addSceneOpen.value = true
}

async function submitAddScene() {
  if (!newSceneTitle.value.trim() || addingScene.value) return
  addingScene.value = true
  try {
    await store.addScene(newSceneTitle.value.trim())
    addSceneOpen.value = false
  } finally {
    addingScene.value = false
  }
}

async function onDeleteScene() {
  if (!selectedId.value) return
  if (!window.confirm(`Удалить сцену «${selectedScene.value?.title}»?`)) return
  await store.removeScene(selectedId.value)
  selectedId.value = null
}
</script>

<style scoped>
.master {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--t0);
  overflow: hidden;
}

.topbar {
  height: 56px;
  flex: none;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 16px;
  border-bottom: 1px solid var(--t14);
  background: var(--t1);
}

.topbar-back {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  min-width: 190px;
}
.topbar-back:hover .back-title { color: var(--accent); }

.back-diamond {
  width: 9px;
  height: 9px;
  background: var(--accent);
  transform: rotate(45deg);
  border-radius: 1px;
  flex: none;
}

.back-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.back-title {
  font-weight: 600;
  font-size: 15px;
  letter-spacing: -.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color .12s;
}

.back-sub {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10px;
  letter-spacing: .1em;
  color: var(--t34);
  text-transform: uppercase;
}

.tab-group {
  display: flex;
  background: var(--t5);
  border: 1px solid var(--t16);
  border-radius: 9px;
  padding: 3px;
  gap: 2px;
}

.tab-btn {
  background: none;
  border: none;
  color: var(--t33);
  font-size: 12.5px;
  font-weight: 500;
  border-radius: 7px;
  padding: 5px 12px;
  transition: background .1s, color .1s;
}
.tab-btn:hover { color: var(--t28); }
.tab-btn.active { background: var(--t16); color: var(--t28); }

.btn-scene {
  background: var(--t5);
  border: 1px solid var(--t19);
  color: var(--t29);
  border-radius: 8px;
  padding: 7px 13px;
  font-size: 12.5px;
  font-weight: 500;
  transition: border-color .12s, color .12s;
}
.btn-scene:hover { border-color: var(--accent); color: var(--accent); }

.btn-library {
  background: var(--t5);
  border: 1px solid var(--t19);
  color: var(--t29);
  border-radius: 8px;
  padding: 7px 13px;
  font-size: 12.5px;
  font-weight: 500;
  transition: border-color .12s, color .12s;
}
.btn-library:hover { border-color: var(--accent); color: var(--accent); }
.btn-library.active { border-color: var(--accentBd); color: var(--accent); background: var(--accentBg); }

.live-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--t17);
  border-radius: 8px;
  padding: 6px 11px;
}

.live-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--t20);
  transition: background 0.2s;
}

.live-indicator.active .live-dot {
  background: var(--accent);
  box-shadow: 0 0 6px var(--accent);
}

.live-label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10px;
  letter-spacing: .06em;
  color: var(--t34);
  text-transform: uppercase;
  transition: color 0.2s;
}

.live-indicator.active .live-label {
  color: var(--accent);
}

.body {
  flex: 1;
  display: flex;
  min-height: 0;
  position: relative;
}

.state-msg {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--t34);
  font-size: 14px;
}
.state-msg.error { color: #f88; }

.tab-stub {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--t34);
  font-size: 14px;
  font-family: 'IBM Plex Mono', monospace;
}

.tab-full {
  flex: 1;
  min-height: 0;
}

.canvas {
  flex: 1;
  overflow: auto;
  position: relative;
  background: var(--t0);
}

.canvas-empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--t34);
}
.canvas-empty-icon { font-size: 36px; }
.canvas-empty-text { font-size: 14px; }

.inspector {
  width: 380px;
  flex: none;
  border-left: 1px solid var(--t14);
  background: var(--t1);
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.insp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px 12px;
  border-bottom: 1px solid var(--t15);
  gap: 8px;
}

.insp-chips {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.chip {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 9px;
  letter-spacing: .06em;
  text-transform: uppercase;
  border-radius: 5px;
  padding: 3px 7px;
  background: var(--t5);
  color: var(--t33);
  border: 1px solid var(--t19);
}
.chip.status-available { color: var(--accent); border-color: var(--accentBd); background: var(--accentBg); }
.chip.status-locked { color: #c98a5a; border-color: #4a2e1a; background: #1e1208; }

.chip-type {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 9px;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: var(--t33);
  border: 1px solid var(--t19);
  border-radius: 4px;
  padding: 2px 6px;
}

.insp-title {
  padding: 12px 20px 14px;
  font-size: 21px;
  font-weight: 700;
  letter-spacing: -.02em;
  border-bottom: 1px solid var(--t15);
  word-break: break-word;
}

.insp-scroll {
  flex: 1;
  overflow: auto;
  padding: 18px 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.insp-section { display: flex; flex-direction: column; gap: 8px; }

.insp-label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 9px;
  letter-spacing: .12em;
  color: var(--t34);
  text-transform: uppercase;
}

.insp-summary {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--t30);
}

.insp-empty { font-size: 12.5px; color: var(--t34); font-style: italic; }

.transition-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 11px;
  background: var(--t5);
  border: 1px solid var(--t17);
  border-radius: 8px;
}
.transition-arrow { font-family: 'IBM Plex Mono', monospace; color: var(--t34); font-size: 11px; }
.transition-target { flex: 1; font-size: 13px; font-weight: 500; color: var(--t30); }
.transition-cond { font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: var(--t34); }

.btn-edge-del {
  background: none;
  border: none;
  color: var(--t34);
  font-size: 13px;
  padding: 2px 4px;
  line-height: 1;
  flex: none;
}
.btn-edge-del:hover { color: #c98a5a; }

.edge-add-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.edge-select {
  flex: 1;
  background: var(--t5);
  border: 1px solid var(--t17);
  border-radius: 7px;
  color: var(--t28);
  font-size: 12.5px;
  padding: 7px 10px;
}
.edge-select:focus { border-color: var(--t20); }

.btn-add-edge {
  background: var(--t5);
  border: 1px solid var(--t19);
  color: var(--t29);
  border-radius: 7px;
  padding: 7px 11px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  transition: border-color .12s, color .12s;
}
.btn-add-edge:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.btn-add-edge:disabled { opacity: .5; cursor: not-allowed; }

.btn-close {
  background: none;
  border: none;
  color: var(--t34);
  font-size: 16px;
  padding: 4px;
}
.btn-close:hover { color: var(--t28); }

.btn-delete {
  align-self: flex-start;
  background: #1e1208;
  border: 1px solid #4a2e1a;
  color: #c98a5a;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 500;
  transition: border-color .12s;
}
.btn-delete:hover { border-color: #7a4a28; }

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 30;
  background: var(--ov4);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.modal {
  width: 100%;
  max-width: 400px;
  background: var(--t1);
  border: 1px solid var(--t21);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, .6);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.modal-header h3 {
  margin: 0;
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -.01em;
}

.field-label {
  display: block;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 9px;
  letter-spacing: .1em;
  color: var(--t35);
  text-transform: uppercase;
  margin-bottom: 7px;
}

.field-input {
  display: block;
  width: 100%;
  background: var(--t5);
  border: 1px solid var(--t17);
  border-radius: 8px;
  padding: 10px 12px;
  color: var(--t28);
  font-size: 14px;
  margin-bottom: 18px;
  transition: border-color .12s;
}
.field-input:focus { border-color: var(--t20); }

.modal-actions { display: flex; gap: 10px; }

.btn-primary {
  background: var(--accent);
  color: var(--onAccent);
  border: none;
  border-radius: 9px;
  padding: 11px 17px;
  font-size: 13px;
  font-weight: 700;
  transition: background .12s;
}
.btn-primary:hover:not(:disabled) { background: var(--accentH); }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }

.btn-secondary {
  background: var(--t5);
  border: 1px solid var(--t19);
  color: var(--t29);
  border-radius: 9px;
  padding: 11px 17px;
  font-size: 13px;
  font-weight: 500;
  transition: border-color .12s;
}
.btn-secondary:hover { border-color: var(--t20); }
</style>
