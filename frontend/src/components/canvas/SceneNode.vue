<template>
  <div
    class="node"
    :class="{ selected, [`status-${scene.status}`]: true }"
    :style="{ left: scene.x + 'px', top: scene.y + 'px' }"
    @click.stop="$emit('select', scene.id)"
  >
    <div v-if="scene.color" class="color-bar" :style="{ background: scene.color }"></div>
    <div class="node-head">
      <span class="node-title">{{ scene.title }}</span>
      <span class="node-dot"></span>
    </div>
    <div class="node-meta">
      <span class="node-type">{{ scene.type || 'Сцена' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Scene } from '../../api/games'

defineProps<{ scene: Scene; selected: boolean }>()
defineEmits<{ select: [id: number] }>()
</script>

<style scoped>
.node {
  position: absolute;
  width: 184px;
  background: var(--t5);
  border: 1px solid var(--t17);
  border-radius: 11px;
  padding: 14px 15px 13px;
  cursor: pointer;
  transition: border-color .12s, box-shadow .12s;
  user-select: none;
}

.node:hover { border-color: var(--t20); }

.node.selected {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 20%, transparent);
}

.color-bar {
  height: 3px;
  border-radius: 3px;
  margin-bottom: 10px;
  opacity: .8;
}

.node-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.node-title {
  font-weight: 600;
  font-size: 13.5px;
  line-height: 1.25;
  letter-spacing: -.01em;
  word-break: break-word;
}

.node-dot {
  flex: none;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  margin-top: 3px;
  background: var(--t34);
}

.node.status-available .node-dot { background: var(--accent); }
.node.status-locked .node-dot { background: #c98a5a; }

.node-meta {
  margin-top: 9px;
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}

.node-type {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 9px;
  letter-spacing: .05em;
  text-transform: uppercase;
  color: var(--t33);
  border: 1px solid var(--t19);
  border-radius: 4px;
  padding: 1px 5px;
}
</style>
