const state = {
  players: [],
  currentPlayer: 0,
  properties: {},
  doublesCount: 0,
  phase: "roll",
  lastDice: [0, 0],
  gameOver: false,
  turnCounter: 0,
  lastTradeAttempt: {},
  pendingAiTradeResume: null,
  pendingAiTrade: null,
  tradeState: null,
  wealthHistory: [],
  cardDeck: [],
};

export default state;
