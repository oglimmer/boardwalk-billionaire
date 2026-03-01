import { CARDS, SPACES, RAILROAD_SPACES } from './data.js';
import state from './state.js';
import { renderAll, log } from './render.js';
import { goToJail, handleLanding, calculateRent, checkBankrupt } from './game.js';
import { showBuyModal } from './ui.js';
import { aiDecideBuy, aiPostRoll } from './ai.js';

export function shuffleCardDeck() {
  state.cardDeck = [...Array(CARDS.length).keys()];
  for (let i = state.cardDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [state.cardDeck[i], state.cardDeck[j]] = [state.cardDeck[j], state.cardDeck[i]];
  }
}

export function drawFortuneCard(pi) {
  if (state.cardDeck.length === 0) shuffleCardDeck();
  const cardIdx = state.cardDeck.pop();
  const card = CARDS[cardIdx];
  const p = state.players[pi];

  log(`${p.name} draws Fortune: "${card.title}"`);

  if (p.isHuman) {
    showCardModal(card, () => executeCard(pi, card));
  } else {
    executeCard(pi, card);
  }
}

export function showCardModal(card, onClose) {
  const modal = document.getElementById("modal");
  modal.innerHTML = `
    <h2 style="color:#9b59b6">\u2728 Fortune Card</h2>
    <div style="background:#0f3460;border:2px solid #9b59b6;border-radius:8px;padding:14px;margin:10px 0;text-align:center">
      <div style="font-size:16px;font-weight:bold;color:#e94560;margin-bottom:6px">${card.title}</div>
      <div style="font-size:13px;color:#ccc">${card.desc}</div>
    </div>
    <div class="btn-group">
      <button class="btn-opt" onclick="closeModal(); window._cardCallback && window._cardCallback();">OK</button>
    </div>
  `;
  window._cardCallback = onClose;
  document.getElementById("modal-overlay").classList.add("show");
}

export function executeCard(pi, card) {
  const p = state.players[pi];

  switch (card.effect) {
    case "collect":
      p.money += card.amount;
      log(`${p.name} collects $${card.amount}.`);
      break;

    case "pay":
      p.money -= card.amount;
      log(`${p.name} pays $${card.amount}.`);
      checkBankrupt(pi);
      break;

    case "collect_from_all": {
      let collected = 0;
      state.players.forEach((other, oi) => {
        if (oi !== pi && !other.isBankrupt) {
          const amt = Math.min(card.amount, other.money + 500);
          other.money -= card.amount;
          collected += card.amount;
          checkBankrupt(oi);
        }
      });
      p.money += collected;
      log(`${p.name} collects $${collected} total from other players.`);
      break;
    }

    case "go_to_jail":
      goToJail(pi);
      state.doublesCount = 0;
      log(`${p.name} goes to Lockup!`);
      break;

    case "advance_to": {
      const target = card.position;
      const oldPos = p.position;
      if (target < oldPos) {
        p.money += 200;
        log(`${p.name} passes GO and collects $200!`);
      }
      p.position = target;
      renderAll();
      handleLanding(pi);
      return;
    }

    case "go_back": {
      let newPos = p.position - card.amount;
      if (newPos < 0) newPos += 40;
      p.position = newPos;
      log(`${p.name} goes back ${card.amount} spaces to ${SPACES[newPos].name}.`);
      renderAll();
      handleLanding(pi);
      return;
    }

    case "nearest_railroad": {
      const pos = p.position;
      let target = RAILROAD_SPACES.find(r => r > pos);
      if (!target && target !== 0) target = RAILROAD_SPACES[0];
      const oldPos = p.position;
      if (target < oldPos) {
        p.money += 200;
        log(`${p.name} passes GO and collects $200!`);
      }
      p.position = target;
      log(`${p.name} advances to ${SPACES[target].name}.`);
      renderAll();
      const prop = state.properties[target];
      if (prop && prop.owner !== pi && !prop.mortgaged && !state.players[prop.owner].isBankrupt) {
        const normalRent = calculateRent(target, state.lastDice[0] + state.lastDice[1]);
        const doubleRent = normalRent * 2;
        log(`${p.name} pays double rent: $${doubleRent} to ${state.players[prop.owner].name}!`);
        p.money -= doubleRent;
        state.players[prop.owner].money += doubleRent;
        checkBankrupt(pi, prop.owner);
      } else if (!prop) {
        if (p.isHuman) { showBuyModal(target); return; }
        else { aiDecideBuy(pi, target); return; }
      }
      break;
    }

    case "repairs": {
      let cost = 0;
      for (const [si, prop] of Object.entries(state.properties)) {
        if (prop.owner !== pi) continue;
        if (prop.houses === 5) cost += card.perHotel;
        else if (prop.houses > 0) cost += prop.houses * card.perHouse;
      }
      if (cost > 0) {
        p.money -= cost;
        log(`${p.name} pays $${cost} for repairs.`);
        checkBankrupt(pi);
      } else {
        log(`${p.name} has no buildings — no repair cost.`);
      }
      break;
    }
  }

  // Standard post-card flow
  state.phase = "postRoll";
  if (state.lastDice[0] === state.lastDice[1] && !p.inJail && state.doublesCount > 0 && p.isHuman && !p.isBankrupt) {
    log(`Doubles! Roll again.`);
    state.phase = "roll";
  }
  renderAll();
  if (!p.isHuman) setTimeout(aiPostRoll, 600);
}
