<template>
  <svg class="edges-svg" :width="svgWidth" :height="svgHeight" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
        <path d="M0,0 L0,6 L8,3 z" fill="var(--t20)" />
      </marker>
    </defs>
    <g v-for="edge in edges" :key="edge.id">
      <line
        v-if="getEdgePoints(edge.from_scene_id, edge.to_scene_id)"
        :x1="getEdgePoints(edge.from_scene_id, edge.to_scene_id)!.x1"
        :y1="getEdgePoints(edge.from_scene_id, edge.to_scene_id)!.y1"
        :x2="getEdgePoints(edge.from_scene_id, edge.to_scene_id)!.x2"
        :y2="getEdgePoints(edge.from_scene_id, edge.to_scene_id)!.y2"
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
const MARGIN = 6 // зазор между стрелкой и границей ноды

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

// Возвращает точку на границе прямоугольника ноды в направлении от (cx,cy) к (ox,oy)
function borderPoint(sceneId: number, ox: number, oy: number) {
  const s = props.scenes.find((sc) => sc.id === sceneId)
  if (!s) return null
  const cx = s.x + NODE_W / 2
  const cy = s.y + NODE_H / 2
  const dx = ox - cx
  const dy = oy - cy
  if (dx === 0 && dy === 0) return { x: cx, y: cy }

  const hw = NODE_W / 2 + MARGIN
  const hh = NODE_H / 2 + MARGIN

  // масштаб до пересечения с горизонтальной или вертикальной стенкой
  const tx = dx !== 0 ? hw / Math.abs(dx) : Infinity
  const ty = dy !== 0 ? hh / Math.abs(dy) : Infinity
  const t = Math.min(tx, ty)

  return { x: cx + dx * t, y: cy + dy * t }
}

function getEdgePoints(fromId: number, toId: number) {
  const from = getCenter(fromId)
  const to = getCenter(toId)
  if (!from || !to) return null

  const start = borderPoint(fromId, to.x, to.y)
  const end = borderPoint(toId, from.x, from.y)
  if (!start || !end) return null

  return { x1: start.x, y1: start.y, x2: end.x, y2: end.y }
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
}
</style>
