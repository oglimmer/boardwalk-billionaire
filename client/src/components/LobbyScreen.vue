<template>
  <div class="lobby">
    <h1 class="title">Boardwalk Billionaire</h1>
    <p class="subtitle">Multiplayer Board Game</p>

    <div class="name-section">
      <label>Your Name:</label>
      <input v-model="playerName" type="text" maxlength="20" placeholder="Enter your name..." class="name-input" @keyup.enter="handleCreate">
    </div>

    <div class="actions">
      <div class="create-section">
        <h2>Create Game</h2>
        <div class="slot-select">
          <label>Human Players:</label>
          <select v-model="humanSlots" class="slot-input">
            <option :value="1">1 (solo + 3 AI)</option>
            <option :value="2">2 humans + 2 AI</option>
            <option :value="3">3 humans + 1 AI</option>
            <option :value="4">4 humans</option>
          </select>
        </div>
        <button class="btn-create" :disabled="!playerName.trim()" @click="handleCreate">Create Game</button>
      </div>

      <div class="join-section">
        <h2>Join Game</h2>
        <div class="code-input-row">
          <input v-model="joinCode" type="text" maxlength="6" placeholder="Game code..." class="code-input" @keyup.enter="handleJoin">
          <button class="btn-join" :disabled="!playerName.trim() || !joinCode.trim()" @click="handleJoin">Join</button>
        </div>
      </div>
    </div>

    <div v-if="lobby.openGames.length" class="open-games">
      <h2>Open Games</h2>
      <div v-for="game in lobby.openGames" :key="game.gameCode" class="game-row" @click="joinCode = game.gameCode">
        <span class="game-code">{{ game.gameCode }}</span>
        <span>{{ game.joinedCount }}/{{ game.humanSlots }} players</span>
        <span class="game-names">{{ game.playerNames.join(', ') }}</span>
      </div>
    </div>

    <p v-if="lobby.error" class="error">{{ lobby.error }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useLobbyStore } from '../stores/lobby'
import { useConnectionStore } from '../stores/connection'

const lobby = useLobbyStore()
const connection = useConnectionStore()

const playerName = ref('')
const humanSlots = ref(1)
const joinCode = ref('')

async function handleCreate() {
  if (!playerName.value.trim()) return
  const code = await lobby.createGame(playerName.value.trim(), humanSlots.value)
  if (code) {
    connection.connect(code, playerName.value.trim())
  }
}

async function handleJoin() {
  if (!playerName.value.trim() || !joinCode.value.trim()) return
  const code = await lobby.joinGame(playerName.value.trim(), joinCode.value.trim())
  if (code) {
    connection.connect(code, playerName.value.trim())
  }
}

onMounted(() => {
  lobby.fetchOpenGames()
})
</script>

<style scoped>
.lobby { max-width: 500px; margin: 0 auto; padding: 40px 20px; }
.title { color: #e94560; font-size: 32px; text-align: center; margin-bottom: 4px; }
.subtitle { color: #888; text-align: center; margin-bottom: 30px; font-size: 14px; }
.name-section { margin-bottom: 24px; }
.name-section label { display: block; margin-bottom: 6px; color: #aaa; font-size: 13px; }
.name-input { width: 100%; padding: 10px; background: #16213e; border: 1px solid #444; border-radius: 6px; color: white; font-size: 16px; box-sizing: border-box; }
.actions { display: flex; gap: 20px; margin-bottom: 24px; }
.create-section, .join-section { flex: 1; background: #16213e; border-radius: 8px; padding: 16px; }
h2 { color: #e94560; font-size: 16px; margin-bottom: 12px; }
.slot-select { margin-bottom: 12px; }
.slot-select label { font-size: 12px; color: #aaa; display: block; margin-bottom: 4px; }
.slot-input { width: 100%; padding: 8px; background: #0f3460; border: 1px solid #444; border-radius: 4px; color: white; font-size: 13px; }
.btn-create, .btn-join { padding: 10px 16px; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 14px; width: 100%; }
.btn-create { background: #2ecc71; color: white; }
.btn-join { background: #3498db; color: white; flex-shrink: 0; width: auto; }
.btn-create:disabled, .btn-join:disabled { opacity: 0.4; cursor: not-allowed; }
.code-input-row { display: flex; gap: 8px; }
.code-input { flex: 1; padding: 8px; background: #0f3460; border: 1px solid #444; border-radius: 4px; color: white; font-size: 16px; text-transform: uppercase; letter-spacing: 2px; text-align: center; }
.open-games { background: #16213e; border-radius: 8px; padding: 16px; }
.game-row { display: flex; gap: 12px; align-items: center; padding: 8px; border-radius: 4px; cursor: pointer; font-size: 13px; }
.game-row:hover { background: #0f3460; }
.game-code { font-weight: bold; color: #e94560; font-family: monospace; letter-spacing: 1px; }
.game-names { color: #888; font-size: 12px; }
.error { color: #e74c3c; text-align: center; font-size: 13px; margin-top: 12px; }
</style>
