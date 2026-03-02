<template>
  <div class="waiting">
    <h1 class="title">Waiting for Players</h1>

    <div class="code-display">
      <span class="label">Game Code:</span>
      <span class="code">{{ lobby.lobby?.gameCode }}</span>
    </div>

    <div class="players-list">
      <h2>Players ({{ lobby.lobby?.joinedCount }}/{{ lobby.lobby?.humanSlots }})</h2>
      <div v-for="(name, i) in lobby.lobby?.playerNames" :key="i" class="player-row">
        <div class="player-dot" :style="{ background: PLAYER_COLORS[i] }"></div>
        <span>{{ name }}</span>
        <span v-if="i === 0" class="host-badge">HOST</span>
      </div>
      <div v-for="i in aiCount" :key="'ai-' + i" class="player-row ai">
        <div class="player-dot" :style="{ background: PLAYER_COLORS[(lobby.lobby?.joinedCount ?? 0) + i - 1] }"></div>
        <span>AI Player</span>
      </div>
    </div>

    <button v-if="isHost" class="btn-start" :disabled="!canStart" @click="handleStart">
      {{ lobby.lobby?.humanSlots === 1 ? 'Start Game' : (canStart ? 'Start Game' : 'Waiting for players...') }}
    </button>
    <p v-else class="wait-msg">Waiting for host to start the game...</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLobbyStore } from '../stores/lobby'
import { useConnectionStore } from '../stores/connection'
import { PLAYER_COLORS } from '../data'

const lobby = useLobbyStore()
const connection = useConnectionStore()

const isHost = computed(() => {
  if (!lobby.lobby) return false
  return lobby.lobby.playerNames[0] === lobby.playerName
})

const canStart = computed(() => {
  if (!lobby.lobby) return false
  return lobby.lobby.joinedCount >= lobby.lobby.humanSlots || lobby.lobby.humanSlots === 1
})

const aiCount = computed(() => {
  if (!lobby.lobby) return 0
  return 4 - (lobby.lobby.humanSlots)
})

function handleStart() {
  connection.startGame()
}
</script>

<style scoped>
.waiting { max-width: 400px; margin: 0 auto; padding: 40px 20px; text-align: center; }
.title { color: #e94560; font-size: 24px; margin-bottom: 20px; }
.code-display { background: #16213e; border: 2px solid #e94560; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
.label { color: #888; font-size: 13px; display: block; margin-bottom: 4px; }
.code { font-size: 36px; font-weight: bold; color: #e94560; font-family: monospace; letter-spacing: 4px; }
.players-list { background: #16213e; border-radius: 8px; padding: 16px; margin-bottom: 20px; text-align: left; }
h2 { color: #aaa; font-size: 14px; margin-bottom: 12px; }
.player-row { display: flex; align-items: center; gap: 10px; padding: 6px 0; font-size: 14px; }
.player-row.ai { color: #666; }
.player-dot { width: 14px; height: 14px; border-radius: 50%; }
.host-badge { font-size: 10px; background: #e94560; color: white; padding: 2px 6px; border-radius: 3px; }
.btn-start { padding: 12px 24px; background: #2ecc71; color: white; border: none; border-radius: 6px; font-size: 16px; font-weight: bold; cursor: pointer; }
.btn-start:disabled { opacity: 0.4; cursor: not-allowed; }
.wait-msg { color: #888; font-size: 14px; }
</style>
