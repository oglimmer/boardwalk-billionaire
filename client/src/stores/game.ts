import { defineStore } from 'pinia'
import { useConnectionStore } from './connection'
import { SPACES, GROUPS } from '../data'
import type {
  Player, OwnedProperty, Modal, BuildPanel, TradeState,
  PendingAiTrade, WealthRecord, PlayerWealthDetail,
} from '../types'

interface GameState {
  yourPlayerIndex: number
  players: Player[]
  currentPlayer: number
  properties: Record<number, OwnedProperty>
  phase: 'roll' | 'post_roll'
  lastDice: [number, number]
  gameOver: boolean
  turnCounter: number
  wealthHistory: WealthRecord[]
  logEntries: string[]
  centerInfo: string
  modal: Modal
  pendingAiTrade: PendingAiTrade | null
  // Local-only state
  activeLogTab: string
  buildPanel: BuildPanel
  tradeState: TradeState | null
}

export const useGameStore = defineStore('game', {
  state: (): GameState => ({
    yourPlayerIndex: 0,
    players: [],
    currentPlayer: 0,
    properties: {},
    phase: 'roll',
    lastDice: [0, 0],
    gameOver: false,
    turnCounter: 0,
    wealthHistory: [],
    logEntries: [],
    centerInfo: 'Waiting for game to start...',
    modal: { visible: false, type: null, payload: {} },
    pendingAiTrade: null,
    // Local-only
    activeLogTab: 'log',
    buildPanel: { visible: false, mode: null },
    tradeState: null,
  }),

  getters: {
    isHumanTurn: (state): boolean => {
      if (!state.players.length) return false
      return state.currentPlayer === state.yourPlayerIndex
        && !state.gameOver
        && state.players[state.currentPlayer] !== undefined
    },
    canRoll: (state): boolean => {
      if (!state.players.length) return false
      return state.currentPlayer === state.yourPlayerIndex
        && !state.gameOver
        && state.phase === 'roll'
        && !state.modal.visible
    },
    canEndTurn: (state): boolean => {
      if (!state.players.length) return false
      return state.currentPlayer === state.yourPlayerIndex
        && !state.gameOver
        && state.phase === 'post_roll'
        && !state.modal.visible
    },
    canBuildOrTrade: (state): boolean => {
      if (!state.players.length) return false
      return state.currentPlayer === state.yourPlayerIndex
        && !state.gameOver
        && (state.phase === 'post_roll' || state.phase === 'roll')
        && !state.modal.visible
    },
    getPlayerWealth: (state) => (pi: number): PlayerWealthDetail => {
      const cash = state.players[pi].money
      let propValue = 0
      let buildValue = 0
      let mortgageDebt = 0
      for (const [si, prop] of Object.entries(state.properties)) {
        if (prop.owner !== pi) continue
        const sp = SPACES[Number(si)]
        if (prop.mortgaged) {
          mortgageDebt += Math.floor(sp.price! / 2)
        } else {
          propValue += sp.price!
        }
        if (prop.houses > 0 && sp.group) {
          buildValue += prop.houses * GROUPS[sp.group].houseCost
        }
      }
      return { cash, propValue, buildValue, mortgageDebt, total: cash + propValue + buildValue + mortgageDebt }
    },
  },

  actions: {
    // === Apply server state ===
    applyServerState(dto: Record<string, unknown>) {
      const d = dto as {
        yourPlayerIndex: number
        players: Player[]
        currentPlayer: number
        properties: Record<string, { owner: number; houses: number; mortgaged: boolean }>
        phase: string
        lastDice: [number, number]
        gameOver: boolean
        turnCounter: number
        wealthHistory: WealthRecord[]
        logEntries: string[]
        centerInfo: string
        modal: Modal
        pendingAiTrade: PendingAiTrade | null
      }

      this.yourPlayerIndex = d.yourPlayerIndex
      this.players = d.players
      this.currentPlayer = d.currentPlayer

      // Convert string keys to number keys for properties
      const props: Record<number, OwnedProperty> = {}
      if (d.properties) {
        for (const [k, v] of Object.entries(d.properties)) {
          props[Number(k)] = v
        }
      }
      this.properties = props

      this.phase = d.phase as 'roll' | 'post_roll'
      this.lastDice = d.lastDice
      const wasGameOver = this.gameOver
      this.gameOver = d.gameOver
      this.turnCounter = d.turnCounter
      this.wealthHistory = d.wealthHistory
      this.logEntries = d.logEntries
      this.centerInfo = d.centerInfo
      this.pendingAiTrade = d.pendingAiTrade

      // Apply server modal if set, otherwise keep local modals (spaceInfo, trade UI)
      if (d.modal && d.modal.visible) {
        this.modal = d.modal
      } else if (this.modal.type !== 'spaceInfo' && this.modal.type !== 'tradeSelect'
                  && this.modal.type !== 'tradeUI' && this.modal.type !== 'tradeAccepted'
                  && this.modal.type !== 'tradeRejected') {
        this.modal = { visible: false, type: null, payload: {} }
      }

      // Show win modal when game ends
      if (d.gameOver && !wasGameOver) {
        const winner = d.players.find(p => !p.isBankrupt)
        if (winner) {
          this.modal = { visible: true, type: 'win', payload: { name: winner.name } }
        }
      }
    },

    // === Action wrappers (send to server) ===
    rollDice() {
      useConnectionStore().sendAction('ROLL_DICE')
    },

    buyProperty() {
      useConnectionStore().sendAction('BUY_PROPERTY')
    },

    declineBuy() {
      useConnectionStore().sendAction('DECLINE_BUY')
    },

    acknowledgeCard() {
      useConnectionStore().sendAction('ACKNOWLEDGE_CARD')
    },

    endTurn() {
      this.closeBuildPanel()
      useConnectionStore().sendAction('END_TURN')
    },

    payJailFee() {
      useConnectionStore().sendAction('PAY_JAIL_FEE')
    },

    humanBuild(si: number) {
      useConnectionStore().sendAction('BUILD_HOUSE', { si })
    },

    humanSellHouse(si: number) {
      useConnectionStore().sendAction('SELL_HOUSE', { si })
    },

    humanMortgage(si: number) {
      useConnectionStore().sendAction('MORTGAGE', { si })
    },

    humanUnmortgage(si: number) {
      useConnectionStore().sendAction('UNMORTGAGE', { si })
    },

    submitHumanTrade() {
      if (!this.tradeState) return
      const myProps = Array.from(this.tradeState.myProps)
      const theirProps = Array.from(this.tradeState.theirProps)
      if (myProps.length === 0 && theirProps.length === 0 && this.tradeState.myCash === 0 && this.tradeState.theirCash === 0) return
      useConnectionStore().sendAction('SUBMIT_TRADE', {
        partner: this.tradeState.partner,
        myProps,
        theirProps,
        myCash: this.tradeState.myCash,
        theirCash: this.tradeState.theirCash,
      })
      this.tradeState = null
      this.closeModal()
    },

    acceptAiTrade() {
      useConnectionStore().sendAction('ACCEPT_TRADE')
    },

    declineAiTrade() {
      useConnectionStore().sendAction('DECLINE_TRADE')
    },

    // === Local-only actions ===
    closeModal() {
      this.modal = { visible: false, type: null, payload: {} }
    },

    showModal(type: string, payload: Record<string, unknown> = {}) {
      this.modal = { visible: true, type: type as Modal['type'], payload }
    },

    toggleBuildPanel() {
      if (this.buildPanel.visible && this.buildPanel.mode === 'build') {
        this.closeBuildPanel()
        return
      }
      this.buildPanel = { visible: true, mode: 'build' }
    },

    toggleMortgagePanel() {
      if (this.buildPanel.visible && this.buildPanel.mode === 'mortgage') {
        this.closeBuildPanel()
        return
      }
      this.buildPanel = { visible: true, mode: 'mortgage' }
    },

    closeBuildPanel() {
      this.buildPanel = { visible: false, mode: null }
    },

    openTradePanel() {
      this.closeBuildPanel()
      this.showModal('tradeSelect', {})
    },

    selectTradePartner(pi: number) {
      this.tradeState = { partner: pi, myProps: new Set(), theirProps: new Set(), myCash: 0, theirCash: 0 }
      this.showModal('tradeUI', {})
    },

    toggleTradeProp(side: 'my' | 'their', si: number) {
      const set = side === 'my' ? this.tradeState!.myProps : this.tradeState!.theirProps
      if (set.has(si)) set.delete(si); else set.add(si)
    },

    updateTradeMyCash(value: string) {
      this.tradeState!.myCash = Math.max(0, Math.min(this.players[this.yourPlayerIndex].money, parseInt(value) || 0))
    },

    updateTradeTheirCash(value: string) {
      this.tradeState!.theirCash = Math.max(0, Math.min(this.players[this.tradeState!.partner].money, parseInt(value) || 0))
    },

    closeTradeModal() {
      this.tradeState = null
      this.closeModal()
    },

    showSpaceInfo(si: number) {
      this.showModal('spaceInfo', { si })
    },

    // === Computed helpers ===
    canTradeProperty(si: number): boolean {
      const prop = this.properties[si]
      if (!prop) return false
      if (prop.houses > 0) return false
      const sp = SPACES[si]
      if (sp.group) {
        const group = GROUPS[sp.group]
        for (const m of group.members) {
          if (this.properties[m] && this.properties[m].owner === prop.owner && this.properties[m].houses > 0) return false
        }
      }
      return true
    },

    getTradeableProperties(pi: number): number[] {
      const result: number[] = []
      for (const [si, prop] of Object.entries(this.properties)) {
        if (prop.owner === pi && this.canTradeProperty(parseInt(si))) result.push(parseInt(si))
      }
      return result
    },
  },
})
