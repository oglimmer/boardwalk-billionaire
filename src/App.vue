<template>
  <div ref="gameRef" class="game">
    <GameBoard />
    <Sidebar />
  </div>
  <ModalOverlay />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useGameStore } from './stores/game'
import GameBoard from './components/GameBoard.vue'
import Sidebar from './components/Sidebar.vue'
import ModalOverlay from './components/ModalOverlay.vue'

const store = useGameStore()
const gameRef = ref<HTMLDivElement | null>(null)

function scaleGame() {
  const el = gameRef.value
  if (!el) return
  el.style.transform = 'none'
  const nat = { w: el.offsetWidth, h: el.offsetHeight }
  const avail = { w: window.innerWidth, h: window.innerHeight }
  const scale = Math.min(avail.w / nat.w, avail.h / nat.h)
  el.style.transform = `scale(${scale})`
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'j') store.payJailFee()
}

onMounted(() => {
  store.initGame()
  scaleGame()
  window.addEventListener('resize', scaleGame)
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('resize', scaleGame)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.game { display: flex; gap: 16px; transform-origin: center center; }

@media (max-width: 768px) {
  .game { flex-direction: column; align-items: center; }
}
</style>
