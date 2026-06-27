<template>
  <div class="placeholder">
    <div class="back" @click="router.push('/games')">← все игры</div>
    <div class="label">Холст мастера — скоро</div>
    <div class="id">Игра #{{ route.params.id }}</div>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
</script>

<style scoped>
.placeholder {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--t34);
}

.back {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 12px;
  color: var(--accent);
  cursor: pointer;
}
.back:hover { text-decoration: underline; }

.label {
  font-size: 20px;
  font-weight: 600;
  color: var(--t30);
}

.id {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
}
</style>
