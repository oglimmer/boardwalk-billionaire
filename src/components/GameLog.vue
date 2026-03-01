<template>
  <div v-show="store.activeLogTab === 'log'" class="log">
    <div v-for="(entry, i) in store.logEntries" :key="i" class="log-entry">{{ entry }}</div>
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '../stores/game'
const store = useGameStore()
</script>

<style scoped>
.log { padding: 10px; overflow-y: auto; max-height: 300px; font-size: 11px; line-height: 1.5; }
.log-entry { padding: 2px 0; border-bottom: 1px solid #1a1a2e; }
</style>
