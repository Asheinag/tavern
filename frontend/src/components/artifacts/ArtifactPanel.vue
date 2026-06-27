<template>
  <div class="artifact-panel">
    <div class="section-header">
      <span class="mono-label">Артефакты сцены</span>
    </div>

    <div v-if="store.sceneLinks.length === 0" class="empty-hint">
      Пусто. Открой библиотеку и привяжи артефакты к сцене.
    </div>

    <div v-else class="links-list">
      <div v-for="link in store.sceneLinks" :key="link.artifact_id" class="link-card">
        <div class="link-row">
          <span class="type-tag" :class="link.artifact.type">
            {{ link.artifact.type === 'location_image' ? 'фон' : 'npc' }}
          </span>
          <span class="link-title">{{ link.artifact.title || '—' }}</span>
          <button
            class="action-btn"
            :class="{ active: link.is_active }"
            :title="actionTitle(link)"
            @click="handleActivate(link)"
          >
            {{ actionLabel(link) }}
          </button>
          <button class="icon-btn" title="Отвязать" @click="handleDetach(link)">✕</button>
        </div>

        <div v-if="link.artifact.type === 'npc'" class="position-row">
          <button
            v-for="pos in positions"
            :key="pos.value"
            class="pos-btn"
            :class="{ selected: link.position === pos.value }"
            @click="handlePosition(link, pos.value)"
          >
            {{ pos.label }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useArtifactsStore } from '../../stores/artifacts'
import type { SceneArtifactLink } from '../../api/artifacts'

const props = defineProps<{ sceneId: number }>()

const store = useArtifactsStore()

const positions = [
  { value: 'left', label: 'слева' },
  { value: 'center', label: 'центр' },
  { value: 'right', label: 'справа' },
]

function actionLabel(link: SceneArtifactLink) {
  if (link.artifact.type === 'location_image') {
    return link.is_active ? 'фон ✓' : '→ фоном'
  }
  if (link.is_active) {
    const pos = positions.find((p) => p.value === link.position)
    return pos ? `${pos.label} ✕` : 'скрыть'
  }
  return 'на сцену'
}

function actionTitle(link: SceneArtifactLink) {
  return link.is_active ? 'Скрыть' : 'Показать'
}

async function handleActivate(link: SceneArtifactLink) {
  await store.patchLink(props.sceneId, link.artifact_id, { is_active: !link.is_active })
}

async function handlePosition(link: SceneArtifactLink, pos: string) {
  if (link.position === pos) return
  await store.patchLink(props.sceneId, link.artifact_id, { position: pos })
}

async function handleDetach(link: SceneArtifactLink) {
  await store.detachFromScene(props.sceneId, link.artifact_id)
}
</script>

<style scoped>
.artifact-panel {
  display: flex;
  flex-direction: column;
  gap: 11px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mono-label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 9px;
  letter-spacing: 0.12em;
  color: var(--t34);
  text-transform: uppercase;
}

.empty-hint {
  font-size: 12.5px;
  color: var(--t34);
  font-style: italic;
  padding: 4px 2px;
}

.links-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.link-card {
  background: var(--t5);
  border: 1px solid var(--t17);
  border-radius: 8px;
  overflow: hidden;
}

.link-row {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
}

.type-tag {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 9px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border-radius: 4px;
  padding: 2px 6px;
  flex-shrink: 0;
}

.type-tag.location_image {
  background: var(--accentBg);
  color: var(--accent);
}

.type-tag.npc {
  background: #1a1230;
  color: #a07adf;
}

.link-title {
  flex: 1;
  font-size: 13px;
  color: var(--t30);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.action-btn {
  flex-shrink: 0;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10px;
  background: var(--t5);
  border: 1px solid var(--t17);
  color: var(--t33);
  border-radius: 6px;
  padding: 4px 8px;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
  white-space: nowrap;
}

.action-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.action-btn.active {
  border-color: var(--accentBd);
  color: var(--accent);
}

.icon-btn {
  flex-shrink: 0;
  background: none;
  border: none;
  color: var(--t35);
  cursor: pointer;
  font-size: 13px;
  padding: 0 1px;
}

.icon-btn:hover {
  color: #e05050;
}

.position-row {
  display: flex;
  gap: 6px;
  padding: 0 10px 10px;
}

.pos-btn {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10px;
  flex: 1;
  background: var(--t5);
  border: 1px solid var(--t17);
  color: var(--t34);
  border-radius: 6px;
  padding: 4px 0;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}

.pos-btn:hover {
  border-color: var(--t20);
  color: var(--t29);
}

.pos-btn.selected {
  border-color: var(--accentBd);
  color: var(--accent);
}
</style>
