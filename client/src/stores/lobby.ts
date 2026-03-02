import { defineStore } from 'pinia'

interface LobbyData {
  gameCode: string
  humanSlots: number
  joinedCount: number
  playerNames: string[]
  started: boolean
}

interface LobbyState {
  screen: 'lobby' | 'waiting' | 'game'
  playerName: string
  lobby: LobbyData | null
  openGames: LobbyData[]
  error: string | null
}

export const useLobbyStore = defineStore('lobby', {
  state: (): LobbyState => ({
    screen: 'lobby',
    playerName: '',
    lobby: null,
    openGames: [],
    error: null,
  }),

  actions: {
    async createGame(playerName: string, humanSlots: number) {
      this.error = null
      try {
        const res = await fetch('/api/lobby/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerName, humanSlots }),
        })
        if (!res.ok) throw new Error('Failed to create game')
        const data = await res.json()
        this.lobby = data
        this.playerName = playerName
        this.screen = 'waiting'
        return data.gameCode as string
      } catch (e: unknown) {
        this.error = (e as Error).message
        return null
      }
    },

    async joinGame(playerName: string, gameCode: string) {
      this.error = null
      try {
        const res = await fetch('/api/lobby/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerName, gameCode: gameCode.toUpperCase() }),
        })
        if (!res.ok) throw new Error('Game not found or already full')
        const data = await res.json()
        this.lobby = data
        this.playerName = playerName
        this.screen = 'waiting'
        return data.gameCode as string
      } catch (e: unknown) {
        this.error = (e as Error).message
        return null
      }
    },

    async fetchOpenGames() {
      try {
        const res = await fetch('/api/lobby/games')
        if (res.ok) {
          this.openGames = await res.json()
        }
      } catch {
        // ignore
      }
    },

    updateLobby(data: LobbyData) {
      this.lobby = data
      if (data.started) {
        this.screen = 'game'
      }
    },

    goToGame() {
      this.screen = 'game'
    },

    reset() {
      this.screen = 'lobby'
      this.playerName = ''
      this.lobby = null
      this.openGames = []
      this.error = null
    },
  },
})
