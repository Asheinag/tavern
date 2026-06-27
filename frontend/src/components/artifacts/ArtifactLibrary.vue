<template>
  <div class="library-panel">
    <div class="library-header">
      <span class="mono-label">Библиотека · {{ store.library.length }}</span>
      <div class="spacer" />
      <span class="add-label">добавить:</span>
      <button class="add-btn" @click="triggerUpload('location_image')">+ фон</button>
      <button class="add-btn" @click="triggerUpload('npc')">+ NPC</button>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </div>

    <div class="library-items">
      <div v-if="store.library.length === 0" class="empty-hint">
        Библиотека пуста. Загрузи фоны и NPC через кнопки выше.
      </div>
      <div
        v-for="artifact in store.library"
        :key="artifact.id"
        class="artifact-card"
        :class="{ 'is-attached': isAttached(artifact.id) }"
      >
        <div class="card-top">
          <span class="type-tag" :class="artifact.type">
            {{ artifact.type === 'location_image' ? 'фон' : 'npc' }}
          </span>
          <button class="icon-btn danger" title="Удалить" @click="handleDelete(artifact.id)">
            ✕
          </button>
        </div>
        <div class="card-title">{{ artifact.title || '—' }}</div>
        <div class="card-actions">
          <button
            v-if="currentSceneId"
            class="attach-btn"
            :class="{ attached: isAttached(artifact.id) }"
            @click="toggleAttach(artifact)"
          >
            {{ isAttached(artifact.id) ? 'отвязать' : '+ к сцене' }}
          </button>
        </div>
      </div>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif"
      style="display: none"
      @change="handleFileSelected"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useArtifactsStore } from '../../stores/artifacts'
import type { Artifact } from '../../api/artifacts'

const props = defineProps<{ currentSceneId: number | null }>()
defineEmits<{ close: [] }>()

const store = useArtifactsStore()
const fileInput = ref<HTMLInputElement | null>(null)
const pendingType = ref<string>('location_image')

const attachedIds = computed(() => new Set(store.sceneLinks.map((l) => l.artifact_id)))

function isAttached(artifactId: number) {
  return attachedIds.value.has(artifactId)
}

function triggerUpload(type: string) {
  pendingType.value = type
  fileInput.value?.click()
}

async function handleFileSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const title = file.name.replace(/\.[^/.]+$/, '')
  await store.upload(file, pendingType.value, title)
  ;(e.target as HTMLInputElement).value = ''
}

async function handleDelete(id: number) {
  await store.deleteArtifact(id)
}

async function toggleAttach(artifact: Artifact) {
  if (!props.currentSceneId) return
  if (isAttached(artifact.id)) {
    await store.detachFromScene(props.currentSceneId, artifact.id)
  } else {
    await store.attachToScene(props.currentSceneId, artifact.id)
  }
}
</script>

<style scoped>
.library-panel {
  position: absolute;
  left: 0;
  right: 380px;
  bottom: 0;
  height: 208px;
  background: var(--t2, var(--t1));
  border-top: 1px solid var(--t17);
  box-shadow: 0 -16px 40px rgba(0, 0, 0, 0.5);
  padding: 14px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 20;
}

.library-header {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.mono-label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 9px;
  letter-spacing: 0.12em;
  color: var(--t34);
  text-transform: uppercase;
}

.add-label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10px;
  color: var(--t35);
}

.spacer {
  flex: 1;
}

.add-btn {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  background: var(--t5);
  border: 1px solid var(--t16);
  color: var(--t29);
  border-radius: 7px;
  padding: 5px 10px;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}

.add-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.close-btn {
  background: none;
  border: none;
  color: var(--t34);
  cursor: pointer;
  font-size: 15px;
  padding: 0 4px;
}

.close-btn:hover {
  color: var(--t28);
}

.library-items {
  flex: 1;
  display: flex;
  gap: 10px;
  overflow-x: auto;
  align-items: stretch;
  padding-bottom: 4px;
}

.empty-hint {
  font-size: 12.5px;
  color: var(--t34);
  font-style: italic;
  align-self: center;
}

.artifact-card {
  flex: none;
  width: 140px;
  background: var(--t5);
  border: 1px solid var(--t17);
  border-radius: 9px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 7px;
  transition: border-color 0.15s;
}

.artifact-card.is-attached {
  border-color: var(--accentBd);
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.type-tag {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 9px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border-radius: 4px;
  padding: 2px 6px;
}

.type-tag.location_image {
  background: var(--accentBg);
  color: var(--accent);
}

.type-tag.npc {
  background: #1a1230;
  color: #a07adf;
}

.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  padding: 0 2px;
  color: var(--t35);
}

.icon-btn.danger:hover {
  color: #e05050;
}

.card-title {
  font-size: 12.5px;
  color: var(--t30);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.card-actions {
  margin-top: auto;
}

.attach-btn {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10px;
  width: 100%;
  background: var(--t5);
  border: 1px solid var(--t17);
  color: var(--t33);
  border-radius: 6px;
  padding: 5px 0;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}

.attach-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.attach-btn.attached {
  border-color: var(--accentBd);
  color: var(--accent);
}

.attach-btn.attached:hover {
  border-color: #e05050;
  color: #e05050;
}
</style>
