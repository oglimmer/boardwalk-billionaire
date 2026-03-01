import { SPACES, GROUPS, RAILROAD_SPACES, UTILITY_SPACES } from './data.js';
import state from './state.js';
import { renderAll, log, recordWealth } from './render.js';
import { drawFortuneCard } from './cards.js';
import { showBuyModal, closeBuildPanel, showWinModal } from './ui.js';
import { aiDecideBuy, aiPostRoll, aiTurn } from './ai.js';

export function rollDice() {
  if (state.phase !== "roll" || state.gameOver) return;
  const d1 = Math.floor(Math.random() * 6) + 1;
  const d2 = Math.floor(Math.random() * 6) + 1;
  state.lastDice = [d1, d2];
  document.getElementById("die1").textContent = d1;
  document.getElementById("die2").textContent = d2;

  const p = state.players[state.currentPlayer];
  const isDoubles = d1 === d2;

  if (p.inJail) {
    handleJailRoll(d1, d2, isDoubles);
    return;
  }

  if (isDoubles) {
    state.doublesCount++;
    if (state.doublesCount >= 3) {
      log(`${p.name} rolled doubles 3 times - go to Lockup!`);
      goToJail(state.currentPlayer);
      state.phase = "postRoll";
      state.doublesCount = 0;
      renderAll();
      if (!p.isHuman) setTimeout(aiPostRoll, 800);
      return;
    }
  } else {
    state.doublesCount = 0;
  }

  const total = d1 + d2;
  log(`${p.name} rolled ${d1}+${d2} = ${total}${isDoubles ? " (doubles!)" : ""}`);
  movePlayer(state.currentPlayer, total);
}

export function handleJailRoll(d1, d2, isDoubles) {
  const p = state.players[state.currentPlayer];
  p.jailTurns++;

  if (isDoubles) {
    log(`${p.name} rolled doubles and gets out of Lockup!`);
    p.inJail = false;
    p.jailTurns = 0;
    state.doublesCount = 0;
    movePlayer(state.currentPlayer, d1 + d2);
    return;
  }

  if (p.jailTurns >= 3) {
    log(`${p.name} must pay $50 to leave Lockup.`);
    p.money -= 50;
    p.inJail = false;
    p.jailTurns = 0;
    checkBankrupt(state.currentPlayer);
    if (!p.isBankrupt) {
      movePlayer(state.currentPlayer, d1 + d2);
    } else {
      state.phase = "postRoll";
      renderAll();
    }
    return;
  }

  log(`${p.name} rolled ${d1}+${d2} - no doubles. Still in Lockup. (Turn ${p.jailTurns}/3)`);
  state.phase = "postRoll";
  renderAll();
  if (!p.isHuman) setTimeout(aiPostRoll, 800);
}

export function movePlayer(pi, steps) {
  const p = state.players[pi];
  const oldPos = p.position;
  const newPos = (oldPos + steps) % 40;

  if (newPos < oldPos && newPos !== 0) {
    p.money += 200;
    log(`${p.name} passed Start and collects $200!`);
  }
  if (oldPos + steps >= 40 && newPos === 0) {
    p.money += 200;
    log(`${p.name} landed on Start and collects $200!`);
  }

  p.position = newPos;
  renderAll();
  handleLanding(pi);
}

export function handleLanding(pi) {
  const p = state.players[pi];
  const sp = SPACES[p.position];
  const si = p.position;

  document.getElementById("center-info").textContent = `${p.name} landed on ${sp.name}`;

  if (sp.type === "go" || sp.type === "free" || sp.type === "jail") {
    state.phase = "postRoll";
    if (state.lastDice[0] === state.lastDice[1] && !p.inJail && state.doublesCount > 0 && p.isHuman) {
      log(`Doubles! Roll again.`);
      state.phase = "roll";
    }
    renderAll();
    if (!p.isHuman) setTimeout(aiPostRoll, 600);
    return;
  }

  if (sp.type === "card") {
    drawFortuneCard(pi);
    return;
  }

  if (sp.type === "gotojail") {
    log(`${p.name} goes to Lockup!`);
    goToJail(pi);
    state.doublesCount = 0;
    state.phase = "postRoll";
    renderAll();
    if (!p.isHuman) setTimeout(aiPostRoll, 800);
    return;
  }

  if (sp.type === "tax") {
    log(`${p.name} pays $${sp.amount} tax.`);
    p.money -= sp.amount;
    checkBankrupt(pi);
    state.phase = "postRoll";
    if (state.lastDice[0] === state.lastDice[1] && !p.inJail && state.doublesCount > 0 && p.isHuman) state.phase = "roll";
    renderAll();
    if (!p.isHuman) setTimeout(aiPostRoll, 600);
    return;
  }

  // Property, railroad, or utility
  const prop = state.properties[si];
  if (!prop) {
    if (p.isHuman) {
      showBuyModal(si);
    } else {
      aiDecideBuy(pi, si);
    }
    return;
  }

  if (prop.owner === pi || prop.mortgaged) {
    state.phase = "postRoll";
    if (state.lastDice[0] === state.lastDice[1] && !p.inJail && state.doublesCount > 0 && p.isHuman) state.phase = "roll";
    renderAll();
    if (!p.isHuman) setTimeout(aiPostRoll, 600);
    return;
  }

  // Pay rent
  const rent = calculateRent(si, state.lastDice[0] + state.lastDice[1]);
  const owner = state.players[prop.owner];
  if (owner.isBankrupt) {
    state.phase = "postRoll";
    if (state.lastDice[0] === state.lastDice[1] && !p.inJail && state.doublesCount > 0 && p.isHuman) state.phase = "roll";
    renderAll();
    if (!p.isHuman) setTimeout(aiPostRoll, 600);
    return;
  }
  log(`${p.name} pays $${rent} rent to ${owner.name} for ${sp.name}.`);
  p.money -= rent;
  owner.money += rent;
  checkBankrupt(pi, prop.owner);
  state.phase = "postRoll";
  if (state.lastDice[0] === state.lastDice[1] && !p.inJail && state.doublesCount > 0 && p.isHuman && !p.isBankrupt) state.phase = "roll";
  renderAll();
  if (!p.isHuman) setTimeout(aiPostRoll, 600);
}

export function calculateRent(si, diceTotal) {
  const sp = SPACES[si];
  const prop = state.properties[si];
  if (!prop || prop.mortgaged) return 0;

  if (sp.type === "railroad") {
    let count = RAILROAD_SPACES.filter(r => state.properties[r] && state.properties[r].owner === prop.owner).length;
    return 25 * Math.pow(2, count - 1);
  }

  if (sp.type === "utility") {
    let count = UTILITY_SPACES.filter(u => state.properties[u] && state.properties[u].owner === prop.owner).length;
    return (count === 1 ? 4 : 10) * diceTotal;
  }

  if (prop.houses > 0) {
    return sp.rent[prop.houses];
  }
  const group = GROUPS[sp.group];
  const hasMonopoly = group.members.every(m => state.properties[m] && state.properties[m].owner === prop.owner);
  return hasMonopoly ? sp.rent[0] * 2 : sp.rent[0];
}

export function goToJail(pi) {
  state.players[pi].position = 10;
  state.players[pi].inJail = true;
  state.players[pi].jailTurns = 0;
}

export function checkBankrupt(pi, creditor) {
  const p = state.players[pi];
  if (p.money >= 0) return;

  if (autoMortgage(pi)) return;

  p.isBankrupt = true;
  log(`${p.name} is BANKRUPT!`);

  for (const [si, prop] of Object.entries(state.properties)) {
    if (prop.owner === pi) {
      delete state.properties[si];
    }
  }

  const alive = state.players.filter(p => !p.isBankrupt);
  if (alive.length === 1) {
    state.gameOver = true;
    log(`${alive[0].name} WINS THE GAME!`);
    document.getElementById("center-info").innerHTML = `<strong>${alive[0].name} WINS!</strong>`;
    showWinModal(alive[0].name);
  }
}

export function autoMortgage(pi) {
  const p = state.players[pi];
  while (p.money < 0) {
    let found = false;
    for (const [si, prop] of Object.entries(state.properties)) {
      if (prop.owner === pi && !prop.mortgaged && prop.houses === 0) {
        const val = Math.floor(SPACES[si].price / 2);
        prop.mortgaged = true;
        p.money += val;
        log(`${p.name} mortgages ${SPACES[si].name} for $${val}.`);
        found = true;
        break;
      }
    }
    if (!found) {
      for (const [si, prop] of Object.entries(state.properties)) {
        if (prop.owner === pi && prop.houses > 0) {
          const sp = SPACES[si];
          const hCost = GROUPS[sp.group].houseCost;
          const sellVal = Math.floor(hCost / 2);
          prop.houses--;
          p.money += sellVal;
          log(`${p.name} sells a house on ${sp.name} for $${sellVal}.`);
          found = true;
          break;
        }
      }
    }
    if (!found) break;
  }
  return p.money >= 0;
}

export function endTurn() {
  if (state.phase !== "postRoll" || state.gameOver) return;
  closeBuildPanel();
  nextPlayer();
}

export function nextPlayer() {
  if (state.lastDice[0] === state.lastDice[1] && !state.players[state.currentPlayer].inJail && state.doublesCount > 0) {
    state.phase = "roll";
    renderAll();
    if (!state.players[state.currentPlayer].isHuman) setTimeout(aiTurn, 800);
    return;
  }

  state.doublesCount = 0;
  state.turnCounter++;
  const prevPlayer = state.currentPlayer;
  do {
    state.currentPlayer = (state.currentPlayer + 1) % 4;
  } while (state.players[state.currentPlayer].isBankrupt);

  if (state.currentPlayer === 0 || (prevPlayer !== 0 && state.currentPlayer < prevPlayer)) {
    recordWealth(Math.ceil(state.turnCounter / 4));
  }

  state.phase = "roll";
  renderAll();

  if (!state.players[state.currentPlayer].isHuman) {
    setTimeout(aiTurn, 800);
  }
}
