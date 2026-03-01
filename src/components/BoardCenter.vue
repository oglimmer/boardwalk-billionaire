<template>
  <div class="center-area">
    <h1>BOARDWALK<br>BILLIONAIRE</h1>
    <div class="dice-display">
      <div class="die">{{ store.lastDice[0] || '?' }}</div>
      <div class="die">{{ store.lastDice[1] || '?' }}</div>
    </div>
    <div class="center-info">{{ store.centerInfo }}</div>
  </div>
</template>

<script setup>
import { useGameStore } from '../stores/game'
const store = useGameStore()
</script>

<style scoped>
.center-area { grid-column: 2 / 11; grid-row: 2 / 11; background: #0f3460; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 10px; border-radius: 4px; }
h1 { font-size: 20px; color: #e94560; margin-bottom: 5px; letter-spacing: 2px; line-height: 1.2; }
.dice-display { font-size: 40px; margin: 10px; display: flex; gap: 10px; }
.die { width: 50px; height: 50px; background: white; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 28px; color: #333; font-weight: bold; box-shadow: 2px 2px 5px rgba(0,0,0,0.3); }
.center-info { font-size: 12px; text-align: center; color: #ccc; margin-top: 5px; max-height: 80px; overflow-y: auto; }
</style>
