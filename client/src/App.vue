<template>
  <LobbyScreen v-if="lobby.screen === 'lobby'" />
  <LobbyWaiting v-else-if="lobby.screen === 'waiting'" />
  <template v-else>
    <div v-if="!connection.connected" class="reconnect-banner">
      Connection lost — reconnecting...
    </div>
    <div class="game-container">
      <div ref="gameRef" class="game">
        <GameBoard />
        <Sidebar />
      </div>
    </div>
    <ModalOverlay />
  </template>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useGameStore } from './stores/game'
import { useConnectionStore } from './stores/connection'
import { useLobbyStore } from './stores/lobby'
import GameBoard from './components/GameBoard.vue'
import Sidebar from './components/Sidebar.vue'
import ModalOverlay from './components/ModalOverlay.vue'
import LobbyScreen from './components/LobbyScreen.vue'
import LobbyWaiting from './components/LobbyWaiting.vue'

const store = useGameStore()
const connection = useConnectionStore()
const lobby = useLobbyStore()
const gameRef = ref<HTMLDivElement | null>(null)

function scaleGame() {
  const el = gameRef.value
  if (!el) return
  // Reset to measure natural (unscaled) size
  el.style.transform = 'translate(-50%, -50%)'
  const nat = { w: el.offsetWidth, h: el.offsetHeight }
  const padding = 32
  const avail = { w: window.innerWidth - padding, h: window.innerHeight - padding }
  const scale = Math.min(avail.w / nat.w, avail.h / nat.h)
  el.style.transform = `translate(-50%, -50%) scale(${scale})`
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'j') store.payJailFee()
}

// Scale game when entering game screen
watch(() => lobby.screen, (val) => {
  if (val === 'game') {
    setTimeout(scaleGame, 50)
  }
})

onMounted(async () => {
  window.addEventListener('resize', scaleGame)
  document.addEventListener('keydown', onKeydown)

  // Auto-rejoin if we have a saved session
  const saved = localStorage.getItem('bb-rejoin')
  if (saved) {
    try {
      const { gameCode, playerName } = JSON.parse(saved)
      const res = await fetch(`/api/lobby/can-rejoin?gameCode=${encodeURIComponent(gameCode)}&playerName=${encodeURIComponent(playerName)}`)
      if (res.ok) {
        lobby.screen = 'game'
        connection.connect(gameCode, playerName)
      } else {
        localStorage.removeItem('bb-rejoin')
      }
    } catch {
      localStorage.removeItem('bb-rejoin')
    }
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', scaleGame)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.reconnect-banner {
  position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
  background: #d32f2f; color: #fff; text-align: center;
  padding: 8px; font-weight: bold; font-size: 14px;
}
.game-container { width: 100vw; height: 100vh; position: relative; overflow: hidden; }
.game { display: flex; gap: 16px; position: absolute; top: 50%; left: 50%; transform-origin: center center; }

@media (max-width: 768px) {
  .game { flex-direction: column; align-items: center; }
}
</style>
