export type SpaceType = 'go' | 'property' | 'card' | 'tax' | 'railroad' | 'utility' | 'jail' | 'gotojail' | 'free'

export type GroupName = 'brown' | 'lightblue' | 'pink' | 'orange' | 'red' | 'yellow' | 'green' | 'darkblue'

export interface Space {
  name: string
  type: SpaceType
  group?: GroupName
  price?: number
  rent?: number[]
  amount?: number
}

export interface Group {
  color: string
  members: number[]
  houseCost: number
}

export type CardEffect = 'collect' | 'pay' | 'collect_from_all' | 'go_to_jail' | 'advance_to' | 'go_back' | 'nearest_railroad' | 'repairs'

export interface Card {
  title: string
  desc: string
  effect: CardEffect
  amount?: number
  position?: number
  perHouse?: number
  perHotel?: number
}

export interface Player {
  name: string
  money: number
  position: number
  inJail: boolean
  jailTurns: number
  isHuman: boolean
  isBankrupt: boolean
}

export interface OwnedProperty {
  owner: number
  houses: number
  mortgaged: boolean
}

export type ModalType = 'buy' | 'win' | 'spaceInfo' | 'card' | 'tradeSelect' | 'tradeUI' | 'tradeRejected' | 'aiTradeProposal' | null

export interface Modal {
  visible: boolean
  type: ModalType
  payload: Record<string, unknown>
}

export type BuildMode = 'build' | 'mortgage' | null

export interface BuildPanel {
  visible: boolean
  mode: BuildMode
}

export interface TradeState {
  partner: number
  myProps: Set<number>
  theirProps: Set<number>
  myCash: number
  theirCash: number
}

export interface PendingAiTrade {
  aiPlayer: number
  offeredProps: number[]
  wantedProps: number[]
  offeredCash: number
  wantedCash: number
}

export interface PlayerWealth {
  cash: number
  total: number
}

export interface WealthRecord {
  round: number
  totalCash: number
  players: PlayerWealth[]
}

export interface PlayerWealthDetail {
  cash: number
  propValue: number
  buildValue: number
  mortgageDebt: number
  total: number
}
