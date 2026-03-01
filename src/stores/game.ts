import { defineStore } from 'pinia'
import { markRaw } from 'vue'
import { SPACES, GROUPS, RAILROAD_SPACES, UTILITY_SPACES, CARDS } from '../data'
import type {
  Player, OwnedProperty, ModalType, Modal, BuildPanel, TradeState,
  PendingAiTrade, WealthRecord, PlayerWealthDetail, Card, GroupName,
} from '../types'

interface GameState {
  players: Player[]
  currentPlayer: number
  properties: Record<number, OwnedProperty>
  doublesCount: number
  phase: 'roll' | 'postRoll'
  lastDice: [number, number]
  gameOver: boolean
  turnCounter: number
  lastTradeAttempt: Record<number, number>
  pendingAiTradeResume: (() => void) | null
  pendingAiTrade: PendingAiTrade | null
  tradeState: TradeState | null
  wealthHistory: WealthRecord[]
  cardDeck: number[]
  logEntries: string[]
  centerInfo: string
  activeLogTab: string
  modal: Modal
  buildPanel: BuildPanel
}

export const useGameStore = defineStore('game', {
  state: (): GameState => ({
    players: [],
    currentPlayer: 0,
    properties: {},
    doublesCount: 0,
    phase: 'roll',
    lastDice: [0, 0],
    gameOver: false,
    turnCounter: 0,
    lastTradeAttempt: {},
    pendingAiTradeResume: null,
    pendingAiTrade: null,
    tradeState: null,
    wealthHistory: [],
    cardDeck: [],
    logEntries: [],
    centerInfo: 'Roll the dice to begin!',
    activeLogTab: 'log',
    modal: { visible: false, type: null, payload: {} },
    buildPanel: { visible: false, mode: null },
  }),

  getters: {
    isHumanTurn: (state): boolean => {
      if (!state.players.length) return false
      return state.players[state.currentPlayer].isHuman && !state.gameOver
    },
    canRoll: (state): boolean => {
      if (!state.players.length) return false
      const p = state.players[state.currentPlayer]
      return p.isHuman && !state.gameOver && state.phase === 'roll'
    },
    canEndTurn: (state): boolean => {
      if (!state.players.length) return false
      const p = state.players[state.currentPlayer]
      return p.isHuman && !state.gameOver && state.phase === 'postRoll'
    },
    canBuildOrTrade: (state): boolean => {
      if (!state.players.length) return false
      const p = state.players[state.currentPlayer]
      return p.isHuman && !state.gameOver && (state.phase === 'postRoll' || state.phase === 'roll')
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
    log(msg: string) {
      this.logEntries.unshift(msg)
    },

    // === Init ===
    initGame() {
      this.players = [
        { name: "You", money: 1500, position: 0, inJail: false, jailTurns: 0, isHuman: true, isBankrupt: false },
        { name: "Bot Alice", money: 1500, position: 0, inJail: false, jailTurns: 0, isHuman: false, isBankrupt: false },
        { name: "Bot Bob", money: 1500, position: 0, inJail: false, jailTurns: 0, isHuman: false, isBankrupt: false },
        { name: "Bot Carol", money: 1500, position: 0, inJail: false, jailTurns: 0, isHuman: false, isBankrupt: false },
      ]
      this.currentPlayer = 0
      this.properties = {}
      this.doublesCount = 0
      this.phase = 'roll'
      this.lastDice = [0, 0]
      this.gameOver = false
      this.turnCounter = 0
      this.lastTradeAttempt = {}
      this.pendingAiTradeResume = null
      this.pendingAiTrade = null
      this.tradeState = null
      this.wealthHistory = []
      this.cardDeck = []
      this.logEntries = []
      this.centerInfo = 'Roll the dice to begin!'
      this.activeLogTab = 'log'
      this.modal = { visible: false, type: null, payload: {} }
      this.buildPanel = { visible: false, mode: null }
      this.shuffleCardDeck()
      this.recordWealth(0)
      this.log("Game started! You go first. Roll the dice!")
    },

    // === Modal ===
    showModal(type: ModalType, payload: Record<string, unknown> = {}) {
      this.modal = { visible: true, type, payload }
    },
    closeModal() {
      this.modal = { visible: false, type: null, payload: {} }
    },

    // === Cards ===
    shuffleCardDeck() {
      this.cardDeck = [...Array(CARDS.length).keys()]
      for (let i = this.cardDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.cardDeck[i], this.cardDeck[j]] = [this.cardDeck[j], this.cardDeck[i]]
      }
    },

    drawFortuneCard(pi: number) {
      if (this.cardDeck.length === 0) this.shuffleCardDeck()
      const cardIdx = this.cardDeck.pop()!
      const card = CARDS[cardIdx]
      const p = this.players[pi]
      this.log(`${p.name} draws Fortune: "${card.title}"`)
      if (p.isHuman) {
        this.showModal('card', { card, pi })
      } else {
        this.executeCard(pi, card)
      }
    },

    executeCard(pi: number, card: Card) {
      const p = this.players[pi]
      switch (card.effect) {
        case 'collect':
          p.money += card.amount!
          this.log(`${p.name} collects $${card.amount}.`)
          break
        case 'pay':
          p.money -= card.amount!
          this.log(`${p.name} pays $${card.amount}.`)
          this.checkBankrupt(pi)
          break
        case 'collect_from_all': {
          let collected = 0
          this.players.forEach((other, oi) => {
            if (oi !== pi && !other.isBankrupt) {
              other.money -= card.amount!
              collected += card.amount!
              this.checkBankrupt(oi)
            }
          })
          p.money += collected
          this.log(`${p.name} collects $${collected} total from other players.`)
          break
        }
        case 'go_to_jail':
          this.goToJail(pi)
          this.doublesCount = 0
          this.log(`${p.name} goes to Lockup!`)
          break
        case 'advance_to': {
          const target = card.position!
          const oldPos = p.position
          if (target < oldPos) {
            p.money += 200
            this.log(`${p.name} passes GO and collects $200!`)
          }
          p.position = target
          this.handleLanding(pi)
          return
        }
        case 'go_back': {
          let newPos = p.position - card.amount!
          if (newPos < 0) newPos += 40
          p.position = newPos
          this.log(`${p.name} goes back ${card.amount} spaces to ${SPACES[newPos].name}.`)
          this.handleLanding(pi)
          return
        }
        case 'nearest_railroad': {
          const pos = p.position
          let target = RAILROAD_SPACES.find(r => r > pos)
          if (target === undefined) target = RAILROAD_SPACES[0]
          const oldPos = p.position
          if (target < oldPos) {
            p.money += 200
            this.log(`${p.name} passes GO and collects $200!`)
          }
          p.position = target
          this.log(`${p.name} advances to ${SPACES[target].name}.`)
          const prop = this.properties[target]
          if (prop && prop.owner !== pi && !prop.mortgaged && !this.players[prop.owner].isBankrupt) {
            const normalRent = this.calculateRent(target, this.lastDice[0] + this.lastDice[1])
            const doubleRent = normalRent * 2
            this.log(`${p.name} pays double rent: $${doubleRent} to ${this.players[prop.owner].name}!`)
            p.money -= doubleRent
            this.players[prop.owner].money += doubleRent
            this.checkBankrupt(pi)
          } else if (!prop) {
            if (p.isHuman) { this.showModal('buy', { si: target }); return }
            else { this.aiDecideBuy(pi, target); return }
          }
          break
        }
        case 'repairs': {
          let cost = 0
          for (const [, prop] of Object.entries(this.properties)) {
            if (prop.owner !== pi) continue
            if (prop.houses === 5) cost += card.perHotel!
            else if (prop.houses > 0) cost += prop.houses * card.perHouse!
          }
          if (cost > 0) {
            p.money -= cost
            this.log(`${p.name} pays $${cost} for repairs.`)
            this.checkBankrupt(pi)
          } else {
            this.log(`${p.name} has no buildings — no repair cost.`)
          }
          break
        }
      }
      this.phase = 'postRoll'
      if (this.lastDice[0] === this.lastDice[1] && !p.inJail && this.doublesCount > 0 && p.isHuman && !p.isBankrupt) {
        this.log('Doubles! Roll again.')
        this.phase = 'roll'
      }
      if (!p.isHuman) setTimeout(() => this.aiPostRoll(), 600)
    },

    // === Dice / Movement ===
    rollDice() {
      if (this.phase !== 'roll' || this.gameOver) return
      const d1 = Math.floor(Math.random() * 6) + 1
      const d2 = Math.floor(Math.random() * 6) + 1
      this.lastDice = [d1, d2]
      const p = this.players[this.currentPlayer]
      const isDoubles = d1 === d2

      if (p.inJail) {
        this.handleJailRoll(d1, d2, isDoubles)
        return
      }
      if (isDoubles) {
        this.doublesCount++
        if (this.doublesCount >= 3) {
          this.log(`${p.name} rolled doubles 3 times - go to Lockup!`)
          this.goToJail(this.currentPlayer)
          this.phase = 'postRoll'
          this.doublesCount = 0
          if (!p.isHuman) setTimeout(() => this.aiPostRoll(), 800)
          return
        }
      } else {
        this.doublesCount = 0
      }
      const total = d1 + d2
      this.log(`${p.name} rolled ${d1}+${d2} = ${total}${isDoubles ? " (doubles!)" : ""}`)
      this.movePlayer(this.currentPlayer, total)
    },

    handleJailRoll(d1: number, d2: number, isDoubles: boolean) {
      const p = this.players[this.currentPlayer]
      p.jailTurns++
      if (isDoubles) {
        this.log(`${p.name} rolled doubles and gets out of Lockup!`)
        p.inJail = false
        p.jailTurns = 0
        this.doublesCount = 0
        this.movePlayer(this.currentPlayer, d1 + d2)
        return
      }
      if (p.jailTurns >= 3) {
        this.log(`${p.name} must pay $50 to leave Lockup.`)
        p.money -= 50
        p.inJail = false
        p.jailTurns = 0
        this.checkBankrupt(this.currentPlayer)
        if (!p.isBankrupt) {
          this.movePlayer(this.currentPlayer, d1 + d2)
        } else {
          this.phase = 'postRoll'
        }
        return
      }
      this.log(`${p.name} rolled ${d1}+${d2} - no doubles. Still in Lockup. (Turn ${p.jailTurns}/3)`)
      this.phase = 'postRoll'
      if (!p.isHuman) setTimeout(() => this.aiPostRoll(), 800)
    },

    movePlayer(pi: number, steps: number) {
      const p = this.players[pi]
      const oldPos = p.position
      const newPos = (oldPos + steps) % 40
      if (newPos < oldPos && newPos !== 0) {
        p.money += 200
        this.log(`${p.name} passed Start and collects $200!`)
      }
      if (oldPos + steps >= 40 && newPos === 0) {
        p.money += 200
        this.log(`${p.name} landed on Start and collects $200!`)
      }
      p.position = newPos
      this.handleLanding(pi)
    },

    handleLanding(pi: number) {
      const p = this.players[pi]
      const sp = SPACES[p.position]
      const si = p.position
      this.centerInfo = `${p.name} landed on ${sp.name}`

      if (sp.type === 'go' || sp.type === 'free' || sp.type === 'jail') {
        this.phase = 'postRoll'
        if (this.lastDice[0] === this.lastDice[1] && !p.inJail && this.doublesCount > 0 && p.isHuman) {
          this.log('Doubles! Roll again.')
          this.phase = 'roll'
        }
        if (!p.isHuman) setTimeout(() => this.aiPostRoll(), 600)
        return
      }
      if (sp.type === 'card') {
        this.drawFortuneCard(pi)
        return
      }
      if (sp.type === 'gotojail') {
        this.log(`${p.name} goes to Lockup!`)
        this.goToJail(pi)
        this.doublesCount = 0
        this.phase = 'postRoll'
        if (!p.isHuman) setTimeout(() => this.aiPostRoll(), 800)
        return
      }
      if (sp.type === 'tax') {
        this.log(`${p.name} pays $${sp.amount} tax.`)
        p.money -= sp.amount!
        this.checkBankrupt(pi)
        this.phase = 'postRoll'
        if (this.lastDice[0] === this.lastDice[1] && !p.inJail && this.doublesCount > 0 && p.isHuman) this.phase = 'roll'
        if (!p.isHuman) setTimeout(() => this.aiPostRoll(), 600)
        return
      }
      const prop = this.properties[si]
      if (!prop) {
        if (p.isHuman) {
          this.showModal('buy', { si })
        } else {
          this.aiDecideBuy(pi, si)
        }
        return
      }
      if (prop.owner === pi || prop.mortgaged) {
        this.phase = 'postRoll'
        if (this.lastDice[0] === this.lastDice[1] && !p.inJail && this.doublesCount > 0 && p.isHuman) this.phase = 'roll'
        if (!p.isHuman) setTimeout(() => this.aiPostRoll(), 600)
        return
      }
      const rent = this.calculateRent(si, this.lastDice[0] + this.lastDice[1])
      const owner = this.players[prop.owner]
      if (owner.isBankrupt) {
        this.phase = 'postRoll'
        if (this.lastDice[0] === this.lastDice[1] && !p.inJail && this.doublesCount > 0 && p.isHuman) this.phase = 'roll'
        if (!p.isHuman) setTimeout(() => this.aiPostRoll(), 600)
        return
      }
      this.log(`${p.name} pays $${rent} rent to ${owner.name} for ${sp.name}.`)
      p.money -= rent
      owner.money += rent
      this.checkBankrupt(pi)
      this.phase = 'postRoll'
      if (this.lastDice[0] === this.lastDice[1] && !p.inJail && this.doublesCount > 0 && p.isHuman && !p.isBankrupt) this.phase = 'roll'
      if (!p.isHuman) setTimeout(() => this.aiPostRoll(), 600)
    },

    calculateRent(si: number, diceTotal: number): number {
      const sp = SPACES[si]
      const prop = this.properties[si]
      if (!prop || prop.mortgaged) return 0
      if (sp.type === 'railroad') {
        const count = RAILROAD_SPACES.filter(r => this.properties[r] && this.properties[r].owner === prop.owner).length
        return 25 * Math.pow(2, count - 1)
      }
      if (sp.type === 'utility') {
        const count = UTILITY_SPACES.filter(u => this.properties[u] && this.properties[u].owner === prop.owner).length
        return (count === 1 ? 4 : 10) * diceTotal
      }
      if (prop.houses > 0) return sp.rent![prop.houses]
      const group = GROUPS[sp.group as GroupName]
      const hasMonopoly = group.members.every(m => this.properties[m] && this.properties[m].owner === prop.owner)
      return hasMonopoly ? sp.rent![0] * 2 : sp.rent![0]
    },

    goToJail(pi: number) {
      this.players[pi].position = 10
      this.players[pi].inJail = true
      this.players[pi].jailTurns = 0
    },

    checkBankrupt(pi: number) {
      const p = this.players[pi]
      if (p.money >= 0) return
      if (this.autoMortgage(pi)) return
      p.isBankrupt = true
      this.log(`${p.name} is BANKRUPT!`)
      for (const [si, prop] of Object.entries(this.properties)) {
        if (prop.owner === pi) delete this.properties[Number(si)]
      }
      const alive = this.players.filter(pl => !pl.isBankrupt)
      if (alive.length === 1) {
        this.gameOver = true
        this.log(`${alive[0].name} WINS THE GAME!`)
        this.centerInfo = `${alive[0].name} WINS!`
        this.showModal('win', { name: alive[0].name })
      }
    },

    autoMortgage(pi: number): boolean {
      const p = this.players[pi]
      while (p.money < 0) {
        let found = false
        for (const [si, prop] of Object.entries(this.properties)) {
          if (prop.owner === pi && !prop.mortgaged && prop.houses === 0) {
            const val = Math.floor(SPACES[Number(si)].price! / 2)
            prop.mortgaged = true
            p.money += val
            this.log(`${p.name} mortgages ${SPACES[Number(si)].name} for $${val}.`)
            found = true
            break
          }
        }
        if (!found) {
          for (const [si, prop] of Object.entries(this.properties)) {
            if (prop.owner === pi && prop.houses > 0) {
              const sp = SPACES[Number(si)]
              const hCost = GROUPS[sp.group as GroupName].houseCost
              const sellVal = Math.floor(hCost / 2)
              prop.houses--
              p.money += sellVal
              this.log(`${p.name} sells a house on ${sp.name} for $${sellVal}.`)
              found = true
              break
            }
          }
        }
        if (!found) break
      }
      return p.money >= 0
    },

    // === Turn Management ===
    endTurn() {
      if (this.phase !== 'postRoll' || this.gameOver) return
      this.closeBuildPanel()
      this.nextPlayer()
    },

    nextPlayer() {
      if (this.lastDice[0] === this.lastDice[1] && !this.players[this.currentPlayer].inJail && this.doublesCount > 0) {
        this.phase = 'roll'
        if (!this.players[this.currentPlayer].isHuman) setTimeout(() => this.aiTurn(), 800)
        return
      }
      this.doublesCount = 0
      this.turnCounter++
      const prevPlayer = this.currentPlayer
      do {
        this.currentPlayer = (this.currentPlayer + 1) % 4
      } while (this.players[this.currentPlayer].isBankrupt)
      if (this.currentPlayer === 0 || (prevPlayer !== 0 && this.currentPlayer < prevPlayer)) {
        this.recordWealth(Math.ceil(this.turnCounter / 4))
      }
      this.phase = 'roll'
      if (!this.players[this.currentPlayer].isHuman) {
        setTimeout(() => this.aiTurn(), 800)
      }
    },

    // === Buy ===
    buyProperty(si: number) {
      const sp = SPACES[si]
      const p = this.players[this.currentPlayer]
      p.money -= sp.price!
      this.properties[si] = { owner: this.currentPlayer, houses: 0, mortgaged: false }
      this.log(`${p.name} bought ${sp.name} for $${sp.price}.`)
      this.closeModal()
      this.phase = 'postRoll'
      if (this.lastDice[0] === this.lastDice[1] && !p.inJail && this.doublesCount > 0 && p.isHuman) this.phase = 'roll'
    },

    declineBuy() {
      this.closeModal()
      const p = this.players[this.currentPlayer]
      this.log(`${p.name} passed on ${SPACES[p.position].name}.`)
      this.phase = 'postRoll'
      if (this.lastDice[0] === this.lastDice[1] && !p.inJail && this.doublesCount > 0 && p.isHuman) this.phase = 'roll'
    },

    // === Build Panel ===
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

    humanBuild(si: number) {
      const sp = SPACES[si]
      const group = GROUPS[sp.group as GroupName]
      const p = this.players[this.currentPlayer]
      if (p.money < group.houseCost) return
      this.properties[si].houses++
      p.money -= group.houseCost
      const label = this.properties[si].houses === 5 ? 'a hotel' : `house #${this.properties[si].houses}`
      this.log(`You build ${label} on ${sp.name} ($${group.houseCost}).`)
    },

    humanSellHouse(si: number) {
      const sp = SPACES[si]
      const group = GROUPS[sp.group as GroupName]
      const p = this.players[this.currentPlayer]
      const sellVal = Math.floor(group.houseCost / 2)
      this.properties[si].houses--
      p.money += sellVal
      this.log(`You sell a house on ${sp.name} for $${sellVal}.`)
    },

    humanMortgage(si: number) {
      const sp = SPACES[si]
      const val = Math.floor(sp.price! / 2)
      this.properties[si].mortgaged = true
      this.players[this.currentPlayer].money += val
      this.log(`You mortgage ${sp.name} for $${val}.`)
    },

    humanUnmortgage(si: number) {
      const sp = SPACES[si]
      const cost = Math.floor(sp.price! / 2 * 1.1)
      if (this.players[this.currentPlayer].money < cost) return
      this.properties[si].mortgaged = false
      this.players[this.currentPlayer].money -= cost
      this.log(`You unmortgage ${sp.name} for $${cost}.`)
    },

    // === Jail ===
    payJailFee() {
      if (!this.players.length) return
      const p = this.players[this.currentPlayer]
      if (p.isHuman && p.inJail && this.phase === 'roll' && p.money >= 50) {
        p.money -= 50
        p.inJail = false
        p.jailTurns = 0
        this.log("You pay $50 to leave Lockup.")
      }
    },

    // === Wealth tracking ===
    recordWealth(round: number) {
      const pData = this.players.map((p, i) => {
        const w = this.getPlayerWealth(i)
        return { cash: p.isBankrupt ? 0 : w.cash, total: p.isBankrupt ? 0 : w.total }
      })
      let totalCash = 0
      pData.forEach((d, i) => { if (!this.players[i].isBankrupt) totalCash += d.cash })
      this.wealthHistory.push({ round, totalCash, players: pData })
    },

    // === Trade ===
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

    getPropertyStrategicValue(si: number, forPlayer: number): number {
      const sp = SPACES[si]
      let value = sp.price!
      if (sp.group) {
        const group = GROUPS[sp.group]
        const owned = group.members.filter(m => this.properties[m] && this.properties[m].owner === forPlayer).length
        if (owned === group.members.length - 1) value *= 3
        else if (owned >= 1) value *= 1.5
      }
      if (sp.type === 'railroad') {
        const count = RAILROAD_SPACES.filter(r => this.properties[r] && this.properties[r].owner === forPlayer).length
        if (count >= 2) value *= 1.5
      }
      if (sp.type === 'utility') {
        const count = UTILITY_SPACES.filter(u => this.properties[u] && this.properties[u].owner === forPlayer).length
        if (count >= 1) value *= 1.3
      }
      return Math.round(value)
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
      this.tradeState!.myCash = Math.max(0, Math.min(this.players[0].money, parseInt(value) || 0))
    },

    updateTradeTheirCash(value: string) {
      this.tradeState!.theirCash = Math.max(0, Math.min(this.players[this.tradeState!.partner].money, parseInt(value) || 0))
    },

    closeTradeModal() {
      this.tradeState = null
      this.closeModal()
    },

    submitHumanTrade() {
      const myProps = Array.from(this.tradeState!.myProps)
      const theirProps = Array.from(this.tradeState!.theirProps)
      if (myProps.length === 0 && theirProps.length === 0 && this.tradeState!.myCash === 0 && this.tradeState!.theirCash === 0) return

      const accepted = this.aiWouldAcceptTrade(this.tradeState!.partner, myProps, theirProps, this.tradeState!.myCash, this.tradeState!.theirCash, 0)
      if (accepted) {
        this.executeTrade(0, this.tradeState!.partner, myProps, theirProps, this.tradeState!.myCash, this.tradeState!.theirCash)
        this.log(`${this.players[this.tradeState!.partner].name} accepted your trade!`)
        this.closeTradeModal()
      } else {
        this.showModal('tradeRejected', { partnerName: this.players[this.tradeState!.partner].name })
      }
    },

    executeTrade(fromPlayer: number, toPlayer: number, fromProps: number[], toProps: number[], fromCash: number, toCash: number) {
      fromProps.forEach(si => { this.properties[si].owner = toPlayer })
      toProps.forEach(si => { this.properties[si].owner = fromPlayer })
      this.players[fromPlayer].money -= fromCash
      this.players[fromPlayer].money += toCash
      this.players[toPlayer].money += fromCash
      this.players[toPlayer].money -= toCash

      const fNames = fromProps.map(si => SPACES[si].name)
      const tNames = toProps.map(si => SPACES[si].name)
      let desc = `Trade: ${this.players[fromPlayer].name} gives`
      if (fNames.length) desc += ` [${fNames.join(", ")}]`
      if (fromCash > 0) desc += `${fNames.length ? " +" : ""} $${fromCash}`
      if (!fNames.length && fromCash === 0) desc += " nothing"
      desc += ` \u2194 gets`
      if (tNames.length) desc += ` [${tNames.join(", ")}]`
      if (toCash > 0) desc += `${tNames.length ? " +" : ""} $${toCash}`
      if (!tNames.length && toCash === 0) desc += " nothing"
      this.log(desc)
    },

    acceptAiTrade() {
      if (!this.pendingAiTrade) return
      const t = this.pendingAiTrade
      this.executeTrade(t.aiPlayer, 0, t.offeredProps, t.wantedProps, t.offeredCash, t.wantedCash)
      this.log(`You accepted ${this.players[t.aiPlayer].name}'s trade!`)
      this.pendingAiTrade = null
      this.closeModal()
      if (this.pendingAiTradeResume) {
        const cb = this.pendingAiTradeResume
        this.pendingAiTradeResume = null
        setTimeout(cb, 600)
      }
    },

    declineAiTrade() {
      if (!this.pendingAiTrade) return
      this.log(`You declined ${this.players[this.pendingAiTrade.aiPlayer].name}'s trade offer.`)
      this.pendingAiTrade = null
      this.closeModal()
      if (this.pendingAiTradeResume) {
        const cb = this.pendingAiTradeResume
        this.pendingAiTradeResume = null
        setTimeout(cb, 600)
      }
    },

    // === AI ===
    aiTurn() {
      if (this.gameOver) return
      const p = this.players[this.currentPlayer]
      if (p.isBankrupt) { this.nextPlayer(); return }

      this.aiBuild(this.currentPlayer)

      if (p.inJail && p.money > 200 && p.jailTurns < 3) {
        const totalProps = Object.values(this.properties).filter(pr => pr.owner !== this.currentPlayer).length
        if (totalProps < 15 || p.money > 500) {
          p.money -= 50
          p.inJail = false
          p.jailTurns = 0
          this.log(`${p.name} pays $50 to leave Lockup.`)
        }
      }
      this.rollDice()
    },

    aiDecideBuy(pi: number, si: number) {
      const sp = SPACES[si]
      const p = this.players[pi]
      const buffer = 200
      let wantsToBuy = p.money >= sp.price! + buffer

      if (sp.group) {
        const group = GROUPS[sp.group]
        const owned = group.members.filter(m => this.properties[m] && this.properties[m].owner === pi).length
        if (owned === group.members.length - 1) {
          wantsToBuy = p.money >= sp.price! + 50
        }
      }
      if ((sp.type === 'railroad' || sp.type === 'utility') && p.money >= sp.price! + 100) {
        wantsToBuy = true
      }
      if (wantsToBuy) {
        p.money -= sp.price!
        this.properties[si] = { owner: pi, houses: 0, mortgaged: false }
        this.log(`${p.name} bought ${sp.name} for $${sp.price}.`)
      } else {
        this.log(`${p.name} passed on ${sp.name}.`)
      }
      this.phase = 'postRoll'
      setTimeout(() => this.aiPostRoll(), 600)
    },

    aiPostRoll() {
      if (this.gameOver) return
      this.aiBuild(this.currentPlayer)
      this.aiUnmortgage(this.currentPlayer)
      const tradePaused = this.aiConsiderTrades(this.currentPlayer)
      if (tradePaused) {
        this.pendingAiTradeResume = markRaw(() => this.finishAiPostRoll()) as unknown as () => void
        return
      }
      this.finishAiPostRoll()
    },

    finishAiPostRoll() {
      if (this.lastDice[0] === this.lastDice[1] && !this.players[this.currentPlayer].inJail && this.doublesCount > 0) {
        this.phase = 'roll'
        setTimeout(() => this.aiTurn(), 800)
      } else {
        this.nextPlayer()
      }
    },

    aiBuild(pi: number) {
      const p = this.players[pi]
      let built = true
      while (built) {
        built = false
        for (const [, group] of Object.entries(GROUPS)) {
          const hasMonopoly = group.members.every(m => this.properties[m] && this.properties[m].owner === pi && !this.properties[m].mortgaged)
          if (!hasMonopoly) continue
          let minHouses = 5
          for (const m of group.members) {
            if (this.properties[m].houses < minHouses) minHouses = this.properties[m].houses
          }
          if (minHouses >= 5) continue
          for (const m of group.members) {
            if (this.properties[m].houses === minHouses && p.money >= group.houseCost + 100) {
              this.properties[m].houses++
              p.money -= group.houseCost
              const label = this.properties[m].houses === 5 ? 'a hotel' : `house #${this.properties[m].houses}`
              this.log(`${p.name} builds ${label} on ${SPACES[m].name} ($${group.houseCost}).`)
              built = true
              break
            }
          }
          if (built) break
        }
      }
    },

    aiUnmortgage(pi: number) {
      const p = this.players[pi]
      for (const [si, prop] of Object.entries(this.properties)) {
        if (prop.owner === pi && prop.mortgaged) {
          const cost = Math.floor(SPACES[Number(si)].price! / 2 * 1.1)
          if (p.money >= cost + 200) {
            prop.mortgaged = false
            p.money -= cost
            this.log(`${p.name} unmortgages ${SPACES[Number(si)].name} for $${cost}.`)
          }
        }
      }
    },

    aiConsiderTrades(pi: number): boolean {
      const p = this.players[pi]
      if (p.isBankrupt || p.money < 100) return false
      if (this.lastTradeAttempt[pi] && this.turnCounter - this.lastTradeAttempt[pi] < 5) return false

      for (const [, group] of Object.entries(GROUPS)) {
        const aiOwned = group.members.filter(m => this.properties[m] && this.properties[m].owner === pi)
        if (aiOwned.length !== group.members.length - 1) continue
        const missing = group.members.find(m => !(this.properties[m] && this.properties[m].owner === pi))
        if (missing === undefined || !this.properties[missing]) continue
        if (!this.canTradeProperty(missing)) continue
        const targetOwner = this.properties[missing].owner
        if (this.players[targetOwner].isBankrupt) continue
        this.lastTradeAttempt[pi] = this.turnCounter

        const expendable = this.getTradeableProperties(pi).filter(si => {
          const sp = SPACES[si]
          if (!sp.group) return true
          const grp = GROUPS[sp.group]
          if (grp.members.every(m => this.properties[m] && this.properties[m].owner === pi)) return false
          if (grp.members.filter(m => this.properties[m] && this.properties[m].owner === pi).length >= grp.members.length - 1) return false
          return true
        })

        for (const offSi of expendable) {
          const targetLoss = this.getPropertyStrategicValue(missing, targetOwner)
          const targetGain = this.getPropertyStrategicValue(offSi, targetOwner)
          let cashSweetener = Math.max(0, Math.round(targetLoss * 0.85 - targetGain))
          cashSweetener = Math.min(cashSweetener, p.money - 200)
          if (cashSweetener < 0) continue
          if (this.aiWouldAcceptTrade(targetOwner, [offSi], [missing], cashSweetener, 0, pi)) {
            if (this.players[targetOwner].isHuman) {
              this.pendingAiTrade = { aiPlayer: pi, offeredProps: [offSi], wantedProps: [missing], offeredCash: cashSweetener, wantedCash: 0 }
              this.showModal('aiTradeProposal', {})
              return true
            } else {
              this.executeTrade(pi, targetOwner, [offSi], [missing], cashSweetener, 0)
              return false
            }
          }
        }

        const targetLoss = this.getPropertyStrategicValue(missing, targetOwner)
        let cashOffer = Math.round(targetLoss * 1.3)
        cashOffer = Math.min(cashOffer, p.money - 200)
        if (cashOffer > 0 && this.aiWouldAcceptTrade(targetOwner, [], [missing], cashOffer, 0, pi)) {
          if (this.players[targetOwner].isHuman) {
            this.pendingAiTrade = { aiPlayer: pi, offeredProps: [], wantedProps: [missing], offeredCash: cashOffer, wantedCash: 0 }
            this.showModal('aiTradeProposal', {})
            return true
          } else {
            this.executeTrade(pi, targetOwner, [], [missing], cashOffer, 0)
            return false
          }
        }
      }
      return false
    },

    aiWouldAcceptTrade(aiPlayer: number, propsFromHuman: number[], propsFromAi: number[], cashFromHuman: number, cashFromAi: number, proposer: number): boolean {
      let receiveVal = cashFromHuman
      let giveVal = cashFromAi
      propsFromHuman.forEach(si => { receiveVal += this.getPropertyStrategicValue(si, aiPlayer) })
      propsFromAi.forEach(si => { giveVal += this.getPropertyStrategicValue(si, aiPlayer) })

      let opponentGetsMonopoly = false
      let aiGetsMonopoly = false
      for (const [, group] of Object.entries(GROUPS)) {
        const oppComplete = group.members.every(m => {
          if (propsFromAi.includes(m)) return true
          if (propsFromHuman.includes(m)) return false
          return this.properties[m] && this.properties[m].owner === proposer
        })
        const oppHadIt = group.members.every(m => this.properties[m] && this.properties[m].owner === proposer)
        if (oppComplete && !oppHadIt) opponentGetsMonopoly = true

        const aiComplete = group.members.every(m => {
          if (propsFromHuman.includes(m)) return true
          if (propsFromAi.includes(m)) return false
          return this.properties[m] && this.properties[m].owner === aiPlayer
        })
        const aiHadIt = group.members.every(m => this.properties[m] && this.properties[m].owner === aiPlayer)
        if (aiComplete && !aiHadIt) aiGetsMonopoly = true
      }
      if (opponentGetsMonopoly && !aiGetsMonopoly) giveVal *= 2.5
      if (aiGetsMonopoly && !opponentGetsMonopoly) receiveVal *= 1.5
      if (aiGetsMonopoly && opponentGetsMonopoly) giveVal *= 1.1
      return receiveVal >= giveVal * 0.85
    },

    // === Space Info ===
    showSpaceInfo(si: number) {
      this.showModal('spaceInfo', { si })
    },
  },
})
