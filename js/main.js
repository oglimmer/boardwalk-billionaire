import state from './state.js';
import { buildBoard } from './board.js';
import { renderAll, log, recordWealth, switchLogTab } from './render.js';
import { rollDice, endTurn } from './game.js';
import { shuffleCardDeck } from './cards.js';
import {
  closeModal, buyProperty, declineBuy,
  toggleBuildPanel, humanBuild, humanSellHouse, closeBuildPanel,
  toggleMortgagePanel, humanMortgage, humanUnmortgage, closeMortgagePanel
} from './ui.js';
import {
  openTradePanel, selectTradePartner, renderTradeUI, toggleTradeProp,
  closeTradeModal, submitHumanTrade, acceptAiTrade, declineAiTrade,
  updateTradeMyCash, updateTradeTheirCash
} from './trade.js';

// === Init ===
export function initGame() {
  state.players = [
    { name: "You", money: 1500, position: 0, inJail: false, jailTurns: 0, isHuman: true, isBankrupt: false },
    { name: "Bot Alice", money: 1500, position: 0, inJail: false, jailTurns: 0, isHuman: false, isBankrupt: false },
    { name: "Bot Bob", money: 1500, position: 0, inJail: false, jailTurns: 0, isHuman: false, isBankrupt: false },
    { name: "Bot Carol", money: 1500, position: 0, inJail: false, jailTurns: 0, isHuman: false, isBankrupt: false },
  ];
  state.currentPlayer = 0;
  state.properties = {};
  state.doublesCount = 0;
  state.phase = "roll";
  state.lastDice = [0, 0];
  state.gameOver = false;
  state.turnCounter = 0;
  state.lastTradeAttempt = {};
  state.pendingAiTradeResume = null;
  state.pendingAiTrade = null;
  state.tradeState = null;
  state.wealthHistory = [];
  state.cardDeck = [];
  shuffleCardDeck();
  recordWealth(0);
  document.getElementById("log").innerHTML = "";
  log("Game started! You go first. Roll the dice!");
  buildBoard();
  renderAll();
}

function scaleGame() {
  const game = document.getElementById('game');
  game.style.transform = 'none';
  const nat = { w: game.offsetWidth, h: game.offsetHeight };
  const avail = { w: window.innerWidth, h: window.innerHeight };
  const scale = Math.min(avail.w / nat.w, avail.h / nat.h);
  game.style.transform = `scale(${scale})`;
}

// === Event listeners for static buttons ===
document.getElementById('btn-roll').addEventListener('click', rollDice);
document.getElementById('btn-build').addEventListener('click', toggleBuildPanel);
document.getElementById('btn-mortgage').addEventListener('click', toggleMortgagePanel);
document.getElementById('btn-trade').addEventListener('click', openTradePanel);
document.getElementById('btn-end-turn').addEventListener('click', endTurn);

document.querySelectorAll('.log-tab').forEach(tab => {
  tab.addEventListener('click', () => switchLogTab(tab.dataset.tab));
});

// === Keyboard shortcut ===
document.addEventListener("keydown", (e) => {
  if (e.key === "j" && state.players[state.currentPlayer].isHuman && state.players[state.currentPlayer].inJail && state.phase === "roll") {
    const p = state.players[state.currentPlayer];
    if (p.money >= 50) {
      p.money -= 50;
      p.inJail = false;
      p.jailTurns = 0;
      log("You pay $50 to leave Lockup.");
      renderAll();
    }
  }
});

// === window.* bindings for dynamic onclick handlers ===
// UI
window.closeModal = closeModal;
window.buyProperty = buyProperty;
window.declineBuy = declineBuy;
window.initGame = initGame;
window.humanBuild = humanBuild;
window.humanSellHouse = humanSellHouse;
window.closeBuildPanel = closeBuildPanel;
window.humanMortgage = humanMortgage;
window.humanUnmortgage = humanUnmortgage;
window.closeMortgagePanel = closeMortgagePanel;

// Trade
window.openTradePanel = openTradePanel;
window.selectTradePartner = selectTradePartner;
window.renderTradeUI = renderTradeUI;
window.toggleTradeProp = toggleTradeProp;
window.closeTradeModal = closeTradeModal;
window.submitHumanTrade = submitHumanTrade;
window.acceptAiTrade = acceptAiTrade;
window.declineAiTrade = declineAiTrade;
window.updateTradeMyCash = updateTradeMyCash;
window.updateTradeTheirCash = updateTradeTheirCash;

// Render
window.switchLogTab = switchLogTab;

// === Entry point ===
initGame();
scaleGame();
window.addEventListener('resize', scaleGame);
