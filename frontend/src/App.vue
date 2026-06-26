<template>
  <div class="health">
    <h1>Tavern</h1>
    <div v-if="loading" class="status loading">Проверяю соединение...</div>
    <div v-else-if="error" class="status error">Ошибка: {{ error }}</div>
    <div v-else class="status ok">
      <div>Backend: {{ status.backend }}</div>
      <div>БД: {{ status.db }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import axios from 'axios'

interface HealthStatus {
  backend: string
  db: string
}

const loading = ref(true)
const error = ref<string | null>(null)
const status = ref<HealthStatus>({ backend: '—', db: '—' })

onMounted(async () => {
  try {
    const res = await axios.get<HealthStatus>('/api/health')
    status.value = res.data
  } catch (e: any) {
    error.value = e?.message ?? 'Неизвестная ошибка'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.health {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  font-family: monospace;
  gap: 1rem;
}

.status {
  font-size: 1.2rem;
  padding: 1rem 2rem;
  border-radius: 8px;
}

.loading { background: #333; color: #aaa; }
.error   { background: #3b1111; color: #f88; }
.ok      { background: #0f2b1a; color: #6f6; line-height: 2; }
</style>
