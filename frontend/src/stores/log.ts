import { ref } from 'vue'
import { defineStore } from 'pinia'
import { logApi, type LogEntry } from '../api/log'

export const useLogStore = defineStore('log', () => {
  const entries = ref<LogEntry[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchLog(gameId: number) {
    loading.value = true
    error.value = null
    try {
      entries.value = await logApi.list(gameId)
    } catch {
      error.value = 'Не удалось загрузить журнал'
    } finally {
      loading.value = false
    }
  }

  async function addEntry(gameId: number, text: string) {
    const entry = await logApi.add(gameId, text)
    entries.value.push(entry)
    return entry
  }

  function clear() {
    entries.value = []
    error.value = null
  }

  return { entries, loading, error, fetchLog, addEntry, clear }
})
