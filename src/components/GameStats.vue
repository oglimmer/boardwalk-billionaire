<template>
  <div v-show="store.activeLogTab === 'stats'" class="stats">
    <div class="stat-header">Game Economy</div>
    <div class="stat-total">
      Total cash in game: <strong class="cash-green">${{ totalCash }}</strong>
      &nbsp;|&nbsp; Total wealth: <strong class="wealth-white">${{ grandTotal }}</strong>
    </div>
    <div v-for="(p, i) in store.players" :key="i" class="stat-player" :style="p.isBankrupt ? { opacity: 0.4 } : {}">
      <div class="stat-player-header">
        <div class="stat-player-dot" :style="{ background: PLAYER_COLORS[i] }"></div>
        <div class="stat-player-name">{{ p.name }}</div>
        <div v-if="p.isBankrupt" class="stat-player-total bankrupt">BANKRUPT</div>
        <div v-else class="stat-player-total">${{ wealths[i].total }}</div>
      </div>
      <template v-if="!p.isBankrupt">
        <div class="stat-bar">
          <div class="stat-bar-cash" :style="{ width: barWidths[i].cash + '%' }" :title="'Cash: $' + wealths[i].cash"></div>
          <div class="stat-bar-prop" :style="{ width: barWidths[i].prop + '%' }" :title="'Property: $' + wealths[i].propValue"></div>
          <div class="stat-bar-build" :style="{ width: barWidths[i].build + '%' }" :title="'Buildings: $' + wealths[i].buildValue"></div>
          <div class="stat-bar-mort" :style="{ width: barWidths[i].mort + '%' }" :title="'Mortgaged: $' + wealths[i].mortgageDebt"></div>
        </div>
        <div class="stat-breakdown">
          <span><span class="stat-legend-dot cash-bg"></span> ${{ wealths[i].cash }}</span>
          <span><span class="stat-legend-dot prop-bg"></span> ${{ wealths[i].propValue }}</span>
          <span><span class="stat-legend-dot build-bg"></span> ${{ wealths[i].buildValue }}</span>
          <span v-if="wealths[i].mortgageDebt > 0"><span class="stat-legend-dot mort-bg"></span> ${{ wealths[i].mortgageDebt }}</span>
        </div>
      </template>
    </div>
    <div class="stat-legend">
      <span><span class="stat-legend-dot cash-bg"></span> Cash</span>
      <span><span class="stat-legend-dot prop-bg"></span> Property</span>
      <span><span class="stat-legend-dot build-bg"></span> Buildings</span>
      <span><span class="stat-legend-dot mort-bg"></span> Mortgaged</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { PLAYER_COLORS } from '../data'

const store = useGameStore()

const wealths = computed(() => store.players.map((_, i) => store.getPlayerWealth(i)))

const totalCash = computed(() => {
  let t = 0
  store.players.forEach((p, i) => { if (!p.isBankrupt) t += wealths.value[i].cash })
  return t
})

const grandTotal = computed(() => {
  let t = 0
  store.players.forEach((p, i) => { if (!p.isBankrupt) t += wealths.value[i].total })
  return t
})

const barWidths = computed(() => {
  const maxTotal = Math.max(...wealths.value.map((w, i) => store.players[i].isBankrupt ? 0 : w.total), 1)
  return wealths.value.map((w, i) => {
    if (store.players[i].isBankrupt) return { cash: 0, prop: 0, build: 0, mort: 0 }
    const barWidth = (w.total / maxTotal) * 100
    return {
      cash: w.total > 0 ? (w.cash / w.total) * barWidth : 0,
      prop: w.total > 0 ? (w.propValue / w.total) * barWidth : 0,
      build: w.total > 0 ? (w.buildValue / w.total) * barWidth : 0,
      mort: w.total > 0 ? (w.mortgageDebt / w.total) * barWidth : 0,
    }
  })
})
</script>

<style scoped>
.stats { padding: 10px; overflow-y: auto; max-height: 300px; }
.stat-header { font-size: 13px; font-weight: bold; color: #e94560; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #333; }
.stat-total { font-size: 12px; color: #aaa; margin-bottom: 12px; }
.cash-green { color: #2ecc71; }
.wealth-white { color: #fff; }
.stat-player { margin-bottom: 10px; }
.stat-player-header { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.stat-player-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.stat-player-name { font-size: 12px; font-weight: bold; flex-grow: 1; }
.stat-player-total { font-size: 13px; font-weight: bold; color: #2ecc71; }
.stat-player-total.bankrupt { color: #e74c3c; }
.stat-bar { height: 14px; border-radius: 3px; display: flex; overflow: hidden; margin-bottom: 2px; }
.stat-bar-cash { background: #2ecc71; }
.stat-bar-prop { background: #3498db; }
.stat-bar-build { background: #f39c12; }
.stat-bar-mort { background: #666; }
.stat-breakdown { font-size: 10px; color: #888; display: flex; gap: 8px; flex-wrap: wrap; }
.stat-breakdown span { display: flex; align-items: center; gap: 3px; }
.stat-legend { display: flex; gap: 10px; font-size: 10px; color: #888; margin-top: 10px; padding-top: 8px; border-top: 1px solid #333; }
.stat-legend span { display: flex; align-items: center; gap: 3px; }
.stat-legend-dot { width: 8px; height: 8px; border-radius: 2px; display: inline-block; }
.cash-bg { background: #2ecc71; }
.prop-bg { background: #3498db; }
.build-bg { background: #f39c12; }
.mort-bg { background: #666; }
</style>
