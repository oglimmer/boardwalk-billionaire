<template>
  <div
    class="space"
    :class="{ corner: isCorner, owned: isOwned, mortgaged: isMortgaged }"
    :style="{ gridRow: pos.row, gridColumn: pos.col, '--owner-color': ownerColor }"
    @click="store.showSpaceInfo(index)"
  >
    <div v-if="colorBar" class="color-bar" :style="{ background: colorBar }"></div>
    <div class="name">{{ space.name }}</div>
    <div v-if="space.price" class="price">${{ space.price }}</div>
    <div v-if="space.type === 'tax'" class="price">-${{ space.amount }}</div>
    <div class="tokens">
      <div
        v-for="pi in playersHere"
        :key="pi"
        class="token"
        :style="{ background: PLAYER_COLORS[pi] }"
      >{{ store.players[pi]?.name?.charAt(0) ?? '' }}</div>
    </div>
    <div class="houses">
      <template v-if="prop && prop.houses > 0 && prop.houses < 5">
        <div v-for="h in prop.houses" :key="h" class="house"></div>
      </template>
      <div v-if="prop && prop.houses === 5" class="hotel"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { getGridPos } from '../utils/board'
import { SPACES, GROUPS, PLAYER_COLORS } from '../data'

const props = defineProps<{ index: number }>()
const store = useGameStore()

const space = computed(() => SPACES[props.index])
const pos = computed(() => getGridPos(props.index))
const isCorner = computed(() => [0, 10, 20, 30].includes(props.index))
const prop = computed(() => store.properties[props.index])
const isOwned = computed(() => prop.value && prop.value.owner !== undefined)
const isMortgaged = computed(() => prop.value && prop.value.mortgaged)
const ownerColor = computed(() => isOwned.value ? PLAYER_COLORS[prop.value.owner] : undefined)

const colorBar = computed(() => {
  const sp = space.value
  if (sp.group && GROUPS[sp.group]) return GROUPS[sp.group].color
  if (sp.type === 'railroad') return '#555'
  if (sp.type === 'utility') return '#999'
  if (sp.type === 'card') return 'linear-gradient(90deg,#e94560,#9b59b6)'
  return null
})

const playersHere = computed(() => {
  const result: number[] = []
  store.players.forEach((p, pi) => {
    if (!p.isBankrupt && p.position === props.index) result.push(pi)
  })
  return result
})
</script>

<style scoped>
.space { background: #16213e; font-size: 7.5px; padding: 2px; display: flex; flex-direction: column; position: relative; overflow: hidden; cursor: pointer; border: 1px solid #333; }
.space:hover { border-color: #888; z-index: 2; }
.color-bar { height: 8px; margin: -2px -2px 1px -2px; flex-shrink: 0; }
.name { font-weight: bold; line-height: 1.1; flex-grow: 1; font-size: 7px; }
.price { font-size: 7px; color: #aaa; }
.tokens { display: flex; gap: 2px; flex-wrap: wrap; position: absolute; bottom: 2px; right: 2px; }
.token { width: 18px; height: 18px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.8); font-size: 9px; font-weight: bold; color: #fff; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.5); text-shadow: 0 1px 1px rgba(0,0,0,0.5); }
.houses { display: flex; gap: 1px; position: absolute; bottom: 1px; left: 1px; }
.house { width: 6px; height: 6px; background: #2ecc71; border: 1px solid #27ae60; }
.hotel { width: 8px; height: 8px; background: #e74c3c; border: 1px solid #c0392b; }
.corner { font-size: 8px; font-weight: bold; text-align: center; justify-content: center; align-items: center; }
.owned { box-shadow: inset 0 0 0 2px var(--owner-color); }
.mortgaged { opacity: 0.5; }
</style>
