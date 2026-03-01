<template>
  <div class="controls">
    <button class="btn-roll" :disabled="!store.canRoll" @click="store.rollDice()">
      {{ showJailRollText ? 'Roll for Doubles' : 'Roll Dice' }}
    </button>
    <button
      v-if="showJailPay"
      class="btn-jail-pay"
      @click="store.payJailFee()"
    >Pay $50 to Leave Lockup</button>
    <button class="btn-build" :disabled="!store.canBuildOrTrade" @click="store.toggleBuildPanel()">Build Houses</button>
    <button class="btn-mortgage" :disabled="!store.canBuildOrTrade" @click="store.toggleMortgagePanel()">Mortgage</button>
    <button class="btn-trade" :disabled="!store.canBuildOrTrade" @click="store.openTradePanel()">Trade</button>
    <button class="btn-end-turn" :disabled="!store.canEndTurn" @click="store.endTurn()">End Turn</button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'

const store = useGameStore()

const currentPlayer = computed(() => store.players[store.currentPlayer])
const showJailRollText = computed(() => store.isHumanTurn && currentPlayer.value?.inJail && store.phase === 'roll')
const showJailPay = computed(() => store.isHumanTurn && currentPlayer.value?.inJail && store.phase === 'roll')
</script>

<style scoped>
.controls { background: #16213e; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
.controls button { padding: 10px; border: none; border-radius: 6px; font-size: 14px; font-weight: bold; cursor: pointer; transition: all 0.15s; }
.controls button:hover { transform: translateY(-1px); }
.controls button:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
.btn-roll { background: #e94560; color: white; }
.btn-end-turn { background: #0f3460; color: white; border: 1px solid #e94560; }
.btn-build { background: #2ecc71; color: white; }
.btn-mortgage { background: #f39c12; color: white; }
.btn-trade { background: #9b59b6; color: white; }
.btn-jail-pay { background: #f39c12; color: white; }
</style>
