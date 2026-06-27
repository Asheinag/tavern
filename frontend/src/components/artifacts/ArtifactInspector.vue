<template>
  <div class="inspector-overlay" @click.self="$emit('close')">
    <div class="inspector-box">
      <div class="insp-header">
        <span class="mono-label">Артефакт</span>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>
      <div class="insp-preview">
        <img :src="`/uploads/${artifact.file_path}`" :alt="artifact.title" />
      </div>
      <div class="insp-body">
        <span class="type-tag" :class="artifact.type">
          {{ artifact.type === 'location_image' ? 'фон' : 'npc' }}
        </span>
        <input
          ref="titleInput"
          v-model="localTitle"
          class="title-input"
          placeholder="Название"
          @keydown.enter="save"
          @keydown.esc="$emit('close')"
        />
        <button class="save-btn" :disabled="saving" @click="save">
          {{ saving ? '...' : 'Сохранить' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useArtifactsStore } from '../../stores/artifacts'
import type { Artifact } from '../../api/artifacts'

const props = defineProps<{ artifact: Artifact }>()
const emit = defineEmits<{ close: [] }>()

const store = useArtifactsStore()
const localTitle = ref(props.artifact.title)
const saving = ref(false)
const titleInput = ref<HTMLInputElement | null>(null)

onMounted(() => titleInput.value?.focus())

async function save() {
  if (saving.value) return
  saving.value = true
  try {
    await store.patchArtifact(props.artifact.id, { title: localTitle.value })
    emit('close')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.inspector-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.inspector-box {
  background: var(--t2, var(--t1));
  border: 1px solid var(--t17);
  border-radius: 12px;
  width: 320px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.insp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 10px;
}

.mono-label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 9px;
  letter-spacing: 0.12em;
  color: var(--t34);
  text-transform: uppercase;
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

.insp-preview {
  width: 100%;
  height: 180px;
  background: var(--t0);
  overflow: hidden;
}

.insp-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.insp-body {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px 16px;
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

.title-input {
  flex: 1;
  background: var(--t5);
  border: 1px solid var(--t17);
  border-radius: 7px;
  color: var(--t29);
  font-size: 13px;
  padding: 6px 10px;
  outline: none;
  min-width: 0;
  transition: border-color 0.15s;
}

.title-input:focus {
  border-color: var(--accentBd);
}

.save-btn {
  flex-shrink: 0;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  background: var(--accentBg);
  border: 1px solid var(--accentBd);
  color: var(--accent);
  border-radius: 7px;
  padding: 6px 12px;
  cursor: pointer;
  transition: opacity 0.15s;
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
