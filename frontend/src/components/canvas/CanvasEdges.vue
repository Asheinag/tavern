<template>
  <svg class="edges-svg" :width="svgWidth" :height="svgHeight" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
        <path d="M0,0 L0,6 L8,3 z" fill="var(--t20)" />
      </marker>
    </defs>
    <g v-for="edge in edges" :key="edge.id">
      <line
        v-if="getCenter(edge.from_scene_id) && getCenter(edge.to_scene_id)"
        :x1="getCenter(edge.from_scene_id)!.x"
        :y1="getCenter(edge.from_scene_id)!.y"
        :x2="getCenter(edge.to_scene_id)!.x"
        :y2="getCenter(edge.to_scene_id)!.y"
        class="edge-line"
        marker-end="url(#arrow)"
      />
    </g>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Scene, Edge } from '../../api/games'

const NODE_W = 184
const NODE_H = 80

const props = defineProps<{ scenes: Scene[]; edges: Edge[] }>()

const svgWidth = computed(() =>
  props.scenes.length ? Math.max(...props.scenes.map((s) => s.x + NODE_W + 80)) : 800,
)
const svgHeight = computed(() =>
  props.scenes.length ? Math.max(...props.scenes.map((s) => s.y + NODE_H + 80)) : 600,
)

function getCenter(sceneId: number) {
  const s = props.scenes.find((sc) => sc.id === sceneId)
  if (!s) return null
  return { x: s.x + NODE_W / 2, y: s.y + NODE_H / 2 }
}
</script>

<style scoped>
.edges-svg {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}

.edge-line {
  stroke: var(--t20);
  stroke-width: 1.5;
  stroke-dasharray: none;
}
</style>
