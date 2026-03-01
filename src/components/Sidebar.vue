<template>
  <div class="sidebar">
    <PlayerCard v-for="(_, i) in store.players" :key="i" :player-index="i" />
    <GameControls />
    <BuildPanel />
    <LogContainer />
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '../stores/game'
import PlayerCard from './PlayerCard.vue'
import GameControls from './GameControls.vue'
import BuildPanel from './BuildPanel.vue'
import LogContainer from './LogContainer.vue'

const store = useGameStore()
</script>

<style scoped>
.sidebar { width: 320px; height: calc(62px * 11 + 1px * 10 + 4px); display: flex; flex-direction: column; gap: 10px; overflow: hidden; }
</style>
