<template>
  <div class="log-container">
    <div class="log-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="log-tab"
        :class="{ active: store.activeLogTab === tab.id }"
        @click="store.activeLogTab = tab.id"
      >{{ tab.label }}</button>
    </div>
    <GameLog />
    <GameStats />
    <WealthChart />
  </div>
</template>

<script setup>
import { useGameStore } from '../stores/game'
import GameLog from './GameLog.vue'
import GameStats from './GameStats.vue'
import WealthChart from './WealthChart.vue'

const store = useGameStore()
const tabs = [
  { id: 'log', label: 'Log' },
  { id: 'stats', label: 'Stats' },
  { id: 'chart', label: 'History' },
]
</script>

<style scoped>
.log-container { background: #16213e; border-radius: 8px; flex-grow: 1; display: flex; flex-direction: column; overflow: hidden; }
.log-tabs { display: flex; border-bottom: 2px solid #0f3460; flex-shrink: 0; }
.log-tab { flex: 1; padding: 8px; border: none; background: transparent; color: #666; font-size: 12px; font-weight: bold; cursor: pointer; transition: all 0.15s; }
.log-tab:hover { color: #aaa; }
.log-tab.active { color: #e94560; border-bottom: 2px solid #e94560; margin-bottom: -2px; }
</style>
