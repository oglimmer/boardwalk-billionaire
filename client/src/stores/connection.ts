import { defineStore } from 'pinia'
import { Client } from '@stomp/stompjs'
import { useGameStore } from './game'
import { useLobbyStore } from './lobby'

// Keep STOMP client outside Pinia state to avoid Vue reactive proxy
// (Client has internal state that breaks when proxied)
let stompClient: Client | null = null

interface ConnectionState {
  connected: boolean
  gameCode: string | null
  playerName: string | null
}

export const useConnectionStore = defineStore('connection', {
  state: (): ConnectionState => ({
    connected: false,
    gameCode: null,
    playerName: null,
  }),

  actions: {
    connect(gameCode: string, playerName: string) {
      this.gameCode = gameCode
      this.playerName = playerName
      localStorage.setItem('bb-rejoin', JSON.stringify({ gameCode, playerName }))

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const host = window.location.host
      const wsUrl = `${protocol}//${host}/ws`

      const client = new Client({
        brokerURL: wsUrl,
        reconnectDelay: 3000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        onConnect: () => {
          this.connected = true

          // Subscribe to personal game state
          client.subscribe('/user/queue/game-state', (message) => {
            const gameStore = useGameStore()
            const lobbyStore = useLobbyStore()
            const dto = JSON.parse(message.body)
            gameStore.applyServerState(dto)
            // Transition to game screen when we receive game state
            if (lobbyStore.screen !== 'game') {
              lobbyStore.goToGame()
            }
          })

          // Subscribe to lobby updates
          client.subscribe(`/topic/game/${gameCode}/lobby`, (message) => {
            const lobbyStore = useLobbyStore()
            const lobby = JSON.parse(message.body)
            lobbyStore.updateLobby(lobby)
          })

          // Join the game via STOMP
          client.publish({
            destination: `/app/game/${gameCode}/join`,
            body: JSON.stringify({ playerName }),
          })
        },
        onDisconnect: () => {
          this.connected = false
        },
        onWebSocketClose: () => {
          this.connected = false
        },
        onStompError: (frame) => {
          console.error('STOMP error:', frame.headers['message'])
        },
      })

      stompClient = client
      client.activate()
    },

    startGame() {
      if (!stompClient || !this.gameCode || !this.connected) return
      stompClient.publish({
        destination: `/app/game/${this.gameCode}/start`,
        body: '{}',
      })
    },

    sendAction(type: string, payload: Record<string, unknown> = {}) {
      if (!stompClient || !this.gameCode || !this.connected) return
      stompClient.publish({
        destination: `/app/game/${this.gameCode}/action`,
        body: JSON.stringify({ type, payload }),
      })
    },

    disconnect() {
      if (stompClient) {
        stompClient.deactivate()
        stompClient = null
      }
      this.connected = false
      this.gameCode = null
      this.playerName = null
      localStorage.removeItem('bb-rejoin')
    },
  },
})
