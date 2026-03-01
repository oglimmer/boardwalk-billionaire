<template>
  <div v-if="store.buildPanel.visible" class="build-panel" :class="{ mortgage: store.buildPanel.mode === 'mortgage' }">
    <!-- Build Mode -->
    <template v-if="store.buildPanel.mode === 'build'">
      <h3>Build Houses / Hotels</h3>
      <template v-if="buildOptions.length">
        <div v-for="opt in buildOptions" :key="opt.si" class="build-option">
          <span><span :style="{ color: opt.groupColor }">&block;</span> {{ opt.name }} ({{ opt.cur }})</span>
          <span>
            <button :disabled="!opt.canBuild" @click="store.humanBuild(opt.si)">+{{ opt.label }} ${{ opt.houseCost }}</button>
            <button class="sell-house" :disabled="!opt.canSell" @click="store.humanSellHouse(opt.si)">Sell ${{ opt.sellVal }}</button>
          </span>
        </div>
      </template>
      <p v-else class="no-options">You need a complete color group to build.</p>
    </template>

    <!-- Mortgage Mode -->
    <template v-if="store.buildPanel.mode === 'mortgage'">
      <h3 class="mortgage-title">Mortgage / Unmortgage</h3>
      <template v-if="mortgageOptions.length">
        <div v-for="opt in mortgageOptions" :key="opt.si" class="build-option">
          <span>{{ opt.name }}{{ opt.mortgaged ? ' [MORTGAGED]' : '' }}{{ opt.hasHouses ? ` (${opt.houses}h)` : '' }}</span>
          <button v-if="opt.mortgaged" class="btn-opt" :disabled="!opt.canAfford" @click="store.humanUnmortgage(opt.si)">Unmortgage ${{ opt.cost }}</button>
          <button v-else-if="!opt.hasHouses" class="btn-mortgage" @click="store.humanMortgage(opt.si)">Mortgage +${{ opt.val }}</button>
          <span v-else class="sell-first">Sell houses first</span>
        </div>
      </template>
      <p v-else class="no-options">You have no properties.</p>
    </template>

    <button class="close-btn" @click="store.closeBuildPanel()">Close</button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { SPACES, GROUPS } from '../data'

const store = useGameStore()

const buildOptions = computed(() => {
  const opts = []
  const p = store.players[store.currentPlayer]
  for (const [groupName, group] of Object.entries(GROUPS)) {
    const hasMonopoly = group.members.every(m => store.properties[m] && store.properties[m].owner === store.currentPlayer && !store.properties[m].mortgaged)
    if (!hasMonopoly) continue
    let minHouses = 5, maxHouses = 0
    for (const m of group.members) {
      minHouses = Math.min(minHouses, store.properties[m].houses)
      maxHouses = Math.max(maxHouses, store.properties[m].houses)
    }
    for (const m of group.members) {
      const sp = SPACES[m]
      const prop = store.properties[m]
      const canBuild = prop.houses < 5 && prop.houses <= minHouses && p.money >= group.houseCost
      const canSell = prop.houses > 0 && prop.houses >= maxHouses
      opts.push({
        si: m,
        name: sp.name,
        groupColor: group.color,
        cur: prop.houses === 5 ? 'Hotel' : `${prop.houses}h`,
        label: prop.houses === 4 ? 'Hotel' : `House ${prop.houses + 1}`,
        houseCost: group.houseCost,
        sellVal: Math.floor(group.houseCost / 2),
        canBuild,
        canSell,
      })
    }
  }
  return opts
})

const mortgageOptions = computed(() => {
  const opts = []
  const p = store.players[store.currentPlayer]
  for (const [si, prop] of Object.entries(store.properties)) {
    if (prop.owner !== store.currentPlayer) continue
    const sp = SPACES[si]
    if (prop.mortgaged) {
      const cost = Math.floor(sp.price / 2 * 1.1)
      opts.push({ si: parseInt(si), name: sp.name, mortgaged: true, canAfford: p.money >= cost, cost, hasHouses: false })
    } else if (prop.houses === 0) {
      opts.push({ si: parseInt(si), name: sp.name, mortgaged: false, val: Math.floor(sp.price / 2), hasHouses: false })
    } else {
      opts.push({ si: parseInt(si), name: sp.name, mortgaged: false, hasHouses: true, houses: prop.houses })
    }
  }
  return opts
})
</script>

<style scoped>
.build-panel { background: #16213e; border: 2px solid #2ecc71; border-radius: 8px; padding: 12px; }
.build-panel.mortgage { border-color: #f39c12; }
h3 { color: #2ecc71; margin-bottom: 8px; font-size: 14px; }
.mortgage-title { color: #f39c12; }
.build-option { display: flex; align-items: center; justify-content: space-between; padding: 6px 4px; border-bottom: 1px solid #1a1a2e; font-size: 12px; }
.build-option button { padding: 4px 10px; border: none; border-radius: 4px; background: #2ecc71; color: white; cursor: pointer; font-size: 11px; }
.build-option button:disabled { opacity: 0.4; cursor: not-allowed; }
.sell-house { background: #e74c3c !important; }
.btn-opt { background: #3498db !important; }
.btn-mortgage { background: #f39c12 !important; }
.no-options { font-size: 12px; color: #aaa; }
.sell-first { font-size: 10px; color: #aaa; }
.close-btn { margin-top: 8px; padding: 6px 12px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer; }
</style>
