<template>
  <div class="session-log">
    <div class="log-header">
      <span class="log-title">Журнал сессии</span>
    </div>

    <div class="log-add">
      <input
        v-model="noteText"
        class="note-input"
        placeholder="Добавить заметку мастера…"
        :disabled="adding"
        @keydown.enter="submitNote"
      />
      <button class="btn-add" :disabled="!noteText.trim() || adding" @click="submitNote">
        {{ adding ? '…' : '＋' }}
      </button>
    </div>

    <div v-if="logStore.error" class="log-error">{{ logStore.error }}</div>

    <div v-else-if="logStore.loading" class="log-empty">Загружаю…</div>

    <div v-else-if="logStore.entries.length === 0" class="log-empty">
      Журнал пуст — события появятся во время игры
    </div>

    <div v-else ref="listRef" class="log-list">
      <div v-for="entry in logStore.entries" :key="entry.id" class="log-entry">
        <span class="entry-icon">{{ kindIcon(entry.kind) }}</span>
        <div class="entry-body">
          <span class="entry-text">{{ entry.text }}</span>
          <span class="entry-time">{{ formatTime(entry.ts) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useLogStore } from '../../stores/log'

const props = defineProps<{ gameId: number }>()

const logStore = useLogStore()
const noteText = ref('')
const adding = ref(false)
const listRef = ref<HTMLElement | null>(null)

logStore.fetchLog(props.gameId)

async function submitNote() {
  if (!noteText.value.trim() || adding.value) return
  adding.value = true
  try {
    await logStore.addEntry(props.gameId, noteText.value.trim())
    noteText.value = ''
    await nextTick()
    scrollToBottom()
  } finally {
    adding.value = false
  }
}

function scrollToBottom() {
  if (listRef.value) listRef.value.scrollTop = listRef.value.scrollHeight
}

watch(
  () => logStore.entries.length,
  () => nextTick(scrollToBottom),
)

const KIND_ICONS: Record<string, string> = {
  move: '→',
  show: '◈',
  roll: '⚄',
  note: '✎',
}

function kindIcon(kind: string): string {
  return KIND_ICONS[kind] ?? '·'
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.session-log {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--t0);
}

.log-header {
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--t14);
  flex: none;
}

.log-title {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--t34);
}

.log-add {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--t14);
  flex: none;
}

.note-input {
  flex: 1;
  background: var(--t5);
  border: 1px solid var(--t17);
  border-radius: 8px;
  padding: 8px 12px;
  color: var(--t28);
  font-size: 13px;
  transition: border-color 0.12s;
}

.note-input:focus {
  border-color: var(--t20);
  outline: none;
}

.note-input:disabled {
  opacity: 0.5;
}

.btn-add {
  background: var(--t5);
  border: 1px solid var(--t17);
  border-radius: 8px;
  color: var(--t28);
  font-size: 16px;
  width: 36px;
  cursor: pointer;
  transition: border-color 0.12s, color 0.12s;
  flex: none;
}

.btn-add:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}

.btn-add:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.log-error {
  margin: 16px;
  padding: 10px 14px;
  background: #3b1111;
  border-radius: 8px;
  color: #f88;
  font-size: 13px;
}

.log-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.08em;
  color: var(--t34);
  text-align: center;
  padding: 20px;
}

.log-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.log-entry {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 7px 16px;
  transition: background 0.08s;
}

.log-entry:hover {
  background: var(--t3);
}

.entry-icon {
  flex: none;
  font-size: 12px;
  color: var(--t34);
  width: 14px;
  text-align: center;
}

.entry-body {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.entry-text {
  flex: 1;
  font-size: 13px;
  color: var(--t28);
  line-height: 1.4;
  word-break: break-word;
}

.entry-time {
  flex: none;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10px;
  color: var(--t34);
  letter-spacing: 0.04em;
}
</style>
