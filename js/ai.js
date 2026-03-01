import { SPACES, GROUPS, RAILROAD_SPACES, UTILITY_SPACES } from './data.js';
import state from './state.js';
import { renderAll, log } from './render.js';
import { rollDice, nextPlayer } from './game.js';
import { canTradeProperty, getTradeableProperties, getPropertyStrategicValue, executeTrade, showAiTradeProposal } from './trade.js';

export function aiTurn() {
  if (state.gameOver) return;
  const p = state.players[state.currentPlayer];
  if (p.isBankrupt) { nextPlayer(); return; }

  aiBuild(state.currentPlayer);

  if (p.inJail && p.money > 200 && p.jailTurns < 3) {
    const totalProps = Object.values(state.properties).filter(pr => pr.owner !== state.currentPlayer).length;
    if (totalProps < 15 || p.money > 500) {
      p.money -= 50;
      p.inJail = false;
      p.jailTurns = 0;
      log(`${p.name} pays $50 to leave Lockup.`);
    }
  }

  rollDice();
}

export function aiDecideBuy(pi, si) {
  const sp = SPACES[si];
  const p = state.players[pi];
  const buffer = 200;

  let wantsToBuy = p.money >= sp.price + buffer;

  if (sp.group) {
    const group = GROUPS[sp.group];
    const owned = group.members.filter(m => state.properties[m] && state.properties[m].owner === pi).length;
    if (owned === group.members.length - 1) {
      wantsToBuy = p.money >= sp.price + 50;
    }
  }

  if ((sp.type === "railroad" || sp.type === "utility") && p.money >= sp.price + 100) {
    wantsToBuy = true;
  }

  if (wantsToBuy) {
    p.money -= sp.price;
    state.properties[si] = { owner: pi, houses: 0, mortgaged: false };
    log(`${p.name} bought ${sp.name} for $${sp.price}.`);
  } else {
    log(`${p.name} passed on ${sp.name}.`);
  }

  state.phase = "postRoll";
  renderAll();
  setTimeout(aiPostRoll, 600);
}

export function aiPostRoll() {
  if (state.gameOver) return;
  aiBuild(state.currentPlayer);
  aiUnmortgage(state.currentPlayer);

  const tradePaused = aiConsiderTrades(state.currentPlayer);
  if (tradePaused) {
    state.pendingAiTradeResume = () => finishAiPostRoll();
    return;
  }
  finishAiPostRoll();
}

export function finishAiPostRoll() {
  if (state.lastDice[0] === state.lastDice[1] && !state.players[state.currentPlayer].inJail && state.doublesCount > 0) {
    state.phase = "roll";
    renderAll();
    setTimeout(aiTurn, 800);
  } else {
    nextPlayer();
  }
}

export function aiBuild(pi) {
  const p = state.players[pi];
  let built = true;
  while (built) {
    built = false;
    for (const [groupName, group] of Object.entries(GROUPS)) {
      const hasMonopoly = group.members.every(m => state.properties[m] && state.properties[m].owner === pi && !state.properties[m].mortgaged);
      if (!hasMonopoly) continue;

      let minHouses = 5;
      for (const m of group.members) {
        if (state.properties[m].houses < minHouses) minHouses = state.properties[m].houses;
      }
      if (minHouses >= 5) continue;

      for (const m of group.members) {
        if (state.properties[m].houses === minHouses && p.money >= group.houseCost + 100) {
          state.properties[m].houses++;
          p.money -= group.houseCost;
          const label = state.properties[m].houses === 5 ? "a hotel" : `house #${state.properties[m].houses}`;
          log(`${p.name} builds ${label} on ${SPACES[m].name} ($${group.houseCost}).`);
          built = true;
          break;
        }
      }
      if (built) break;
    }
  }
  renderAll();
}

export function aiUnmortgage(pi) {
  const p = state.players[pi];
  for (const [si, prop] of Object.entries(state.properties)) {
    if (prop.owner === pi && prop.mortgaged) {
      const cost = Math.floor(SPACES[si].price / 2 * 1.1);
      if (p.money >= cost + 200) {
        prop.mortgaged = false;
        p.money -= cost;
        log(`${p.name} unmortgages ${SPACES[si].name} for $${cost}.`);
      }
    }
  }
  renderAll();
}

export function aiConsiderTrades(pi) {
  const p = state.players[pi];
  if (p.isBankrupt || p.money < 100) return false;
  if (state.lastTradeAttempt[pi] && state.turnCounter - state.lastTradeAttempt[pi] < 5) return false;

  for (const [groupName, group] of Object.entries(GROUPS)) {
    const aiOwned = group.members.filter(m => state.properties[m] && state.properties[m].owner === pi);
    if (aiOwned.length !== group.members.length - 1) continue;

    const missing = group.members.find(m => !(state.properties[m] && state.properties[m].owner === pi));
    if (missing === undefined || !state.properties[missing]) continue;
    if (!canTradeProperty(missing)) continue;

    const targetOwner = state.properties[missing].owner;
    if (state.players[targetOwner].isBankrupt) continue;

    state.lastTradeAttempt[pi] = state.turnCounter;

    const expendable = getTradeableProperties(pi).filter(si => {
      const sp = SPACES[si];
      if (!sp.group) return true;
      const grp = GROUPS[sp.group];
      if (grp.members.every(m => state.properties[m] && state.properties[m].owner === pi)) return false;
      if (grp.members.filter(m => state.properties[m] && state.properties[m].owner === pi).length >= grp.members.length - 1) return false;
      return true;
    });

    for (const offSi of expendable) {
      const targetLoss = getPropertyStrategicValue(missing, targetOwner);
      const targetGain = getPropertyStrategicValue(offSi, targetOwner);
      let cashSweetener = Math.max(0, Math.round(targetLoss * 0.85 - targetGain));
      cashSweetener = Math.min(cashSweetener, p.money - 200);
      if (cashSweetener < 0) continue;

      if (aiWouldAcceptTrade(targetOwner, [offSi], [missing], cashSweetener, 0, pi)) {
        if (state.players[targetOwner].isHuman) {
          showAiTradeProposal(pi, [offSi], [missing], cashSweetener, 0);
          return true;
        } else {
          executeTrade(pi, targetOwner, [offSi], [missing], cashSweetener, 0);
          renderAll();
          return false;
        }
      }
    }

    const targetLoss = getPropertyStrategicValue(missing, targetOwner);
    let cashOffer = Math.round(targetLoss * 1.3);
    cashOffer = Math.min(cashOffer, p.money - 200);
    if (cashOffer > 0 && aiWouldAcceptTrade(targetOwner, [], [missing], cashOffer, 0, pi)) {
      if (state.players[targetOwner].isHuman) {
        showAiTradeProposal(pi, [], [missing], cashOffer, 0);
        return true;
      } else {
        executeTrade(pi, targetOwner, [], [missing], cashOffer, 0);
        renderAll();
        return false;
      }
    }
  }

  return false;
}

export function aiWouldAcceptTrade(aiPlayer, propsFromHuman, propsFromAi, cashFromHuman, cashFromAi, proposer) {
  let receiveVal = cashFromHuman;
  let giveVal = cashFromAi;

  propsFromHuman.forEach(si => { receiveVal += getPropertyStrategicValue(si, aiPlayer); });
  propsFromAi.forEach(si => { giveVal += getPropertyStrategicValue(si, aiPlayer); });

  let opponentGetsMonopoly = false;
  let aiGetsMonopoly = false;

  for (const [gn, group] of Object.entries(GROUPS)) {
    const oppComplete = group.members.every(m => {
      if (propsFromAi.includes(m)) return true;
      if (propsFromHuman.includes(m)) return false;
      return state.properties[m] && state.properties[m].owner === proposer;
    });
    const oppHadIt = group.members.every(m => state.properties[m] && state.properties[m].owner === proposer);
    if (oppComplete && !oppHadIt) opponentGetsMonopoly = true;

    const aiComplete = group.members.every(m => {
      if (propsFromHuman.includes(m)) return true;
      if (propsFromAi.includes(m)) return false;
      return state.properties[m] && state.properties[m].owner === aiPlayer;
    });
    const aiHadIt = group.members.every(m => state.properties[m] && state.properties[m].owner === aiPlayer);
    if (aiComplete && !aiHadIt) aiGetsMonopoly = true;
  }

  if (opponentGetsMonopoly && !aiGetsMonopoly) giveVal *= 2.5;
  if (aiGetsMonopoly && !opponentGetsMonopoly) receiveVal *= 1.5;
  if (aiGetsMonopoly && opponentGetsMonopoly) giveVal *= 1.1;

  return receiveVal >= giveVal * 0.85;
}
