<template>
  <div class="player-card" :class="{ active: playerIndex === store.currentPlayer, bankrupt: player.isBankrupt }">
    <div class="header">
      <div class="dot" :style="{ background: PLAYER_COLORS[playerIndex] }"></div>
      <div class="pname">{{ player.name }}{{ player.inJail ? ' (LOCKUP)' : '' }}{{ player.isBankrupt ? ' (BANKRUPT)' : '' }}</div>
      <div class="money">${{ player.money }}</div>
    </div>
    <div class="props">
      <template v-if="ownedProps.length">
        <span
          v-for="op in ownedProps"
          :key="op.si"
          class="prop-dot"
          :class="{ mort: op.mortgaged }"
          :style="{ background: op.color }"
          :title="op.title"
        ></span>
      </template>
      <span v-else style="color:#666">No properties</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { SPACES, GROUPS, PLAYER_COLORS } from '../data'

const props = defineProps<{ playerIndex: number }>()
const store = useGameStore()

const player = computed(() => store.players[props.playerIndex])

const ownedProps = computed(() => {
  const result: { si: number; color: string; mortgaged: boolean; title: string }[] = []
  for (const [siStr, prop] of Object.entries(store.properties)) {
    if (prop.owner === props.playerIndex) {
      const si = Number(siStr)
      const sp = SPACES[si]
      const color = sp.group ? GROUPS[sp.group].color : (sp.type === 'railroad' ? '#555' : '#999')
      let title = sp.name
      if (prop.houses > 0) title += ` (${prop.houses === 5 ? 'H' : prop.houses + 'h'})`
      if (prop.mortgaged) title += ' [M]'
      result.push({ si, color, mortgaged: prop.mortgaged, title })
    }
  }
  return result
})
</script>

<style scoped>
.player-card { background: #16213e; border: 2px solid #333; border-radius: 8px; padding: 10px; }
.player-card.active { border-color: #e94560; box-shadow: 0 0 10px rgba(233,69,96,0.3); }
.player-card.bankrupt { opacity: 0.4; }
.header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.dot { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; }
.pname { font-weight: bold; font-size: 14px; flex-grow: 1; }
.money { font-weight: bold; color: #2ecc71; font-size: 14px; }
.props { font-size: 11px; color: #aaa; margin-top: 4px; display: flex; flex-wrap: wrap; gap: 3px; }
.prop-dot { width: 10px; height: 10px; border-radius: 2px; display: inline-block; border: 1px solid rgba(255,255,255,0.3); }
.prop-dot.mort { opacity: 0.3; }
</style>
