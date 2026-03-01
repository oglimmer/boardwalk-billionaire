import { SPACES, GROUPS, CARDS, PLAYER_COLORS } from './data.js';
import state from './state.js';
import { renderAll, log } from './render.js';

export function closeModal() {
  document.getElementById("modal-overlay").classList.remove("show");
}

export function showBuyModal(si) {
  const sp = SPACES[si];
  const p = state.players[state.currentPlayer];
  const modal = document.getElementById("modal");
  const canAfford = p.money >= sp.price;
  modal.innerHTML = `
    <h2>${sp.name}</h2>
    <p>Price: <strong>$${sp.price}</strong><br>Your cash: <strong>$${p.money}</strong>
    ${!canAfford ? "<br><em style='color:#e74c3c'>You can't afford this!</em>" : ""}</p>
    <div class="btn-group">
      <button class="btn-yes" onclick="buyProperty(${si})" ${!canAfford ? "disabled" : ""}>Buy - $${sp.price}</button>
      <button class="btn-no" onclick="declineBuy()">Pass</button>
    </div>
  `;
  document.getElementById("modal-overlay").classList.add("show");
}

export function buyProperty(si) {
  const sp = SPACES[si];
  const p = state.players[state.currentPlayer];
  p.money -= sp.price;
  state.properties[si] = { owner: state.currentPlayer, houses: 0, mortgaged: false };
  log(`${p.name} bought ${sp.name} for $${sp.price}.`);
  closeModal();
  state.phase = "postRoll";
  if (state.lastDice[0] === state.lastDice[1] && !p.inJail && state.doublesCount > 0 && p.isHuman) state.phase = "roll";
  renderAll();
}

export function declineBuy() {
  closeModal();
  const p = state.players[state.currentPlayer];
  log(`${p.name} passed on ${SPACES[p.position].name}.`);
  state.phase = "postRoll";
  if (state.lastDice[0] === state.lastDice[1] && !p.inJail && state.doublesCount > 0 && p.isHuman) state.phase = "roll";
  renderAll();
}

export function showWinModal(name) {
  const modal = document.getElementById("modal");
  modal.innerHTML = `
    <h2>Game Over!</h2>
    <p><strong>${name}</strong> wins the game!</p>
    <div class="btn-group">
      <button class="btn-yes" onclick="closeModal(); initGame();">Play Again</button>
    </div>
  `;
  document.getElementById("modal-overlay").classList.add("show");
}

export function showSpaceInfo(si) {
  const sp = SPACES[si];
  const prop = state.properties[si];
  const modal = document.getElementById("modal");
  let html = `<h2>${sp.name}</h2>`;

  if (sp.type === "property") {
    const group = GROUPS[sp.group];
    html += `<p><span style="color:${group.color}">\u25A0\u25A0\u25A0</span> ${sp.group} group<br>`;
    html += `Price: $${sp.price} | House cost: $${group.houseCost}<br>`;
    html += `<strong>Rent:</strong> $${sp.rent[0]}`;
    for (let i = 1; i <= 4; i++) html += ` | ${i}H: $${sp.rent[i]}`;
    html += ` | Hotel: $${sp.rent[5]}`;
    if (prop) {
      html += `<br><br><strong>Owner:</strong> ${state.players[prop.owner].name}`;
      html += `<br><strong>Houses:</strong> ${prop.houses === 5 ? "Hotel" : prop.houses}`;
      if (prop.mortgaged) html += `<br><em style="color:#f39c12">MORTGAGED</em>`;
    } else {
      html += `<br><br><em>Unowned</em>`;
    }
    html += `</p>`;
  } else if (sp.type === "railroad") {
    html += `<p>Price: $200<br>Rent: 1 owned=$25, 2=$50, 3=$100, 4=$200`;
    if (prop) {
      html += `<br><br><strong>Owner:</strong> ${state.players[prop.owner].name}`;
      if (prop.mortgaged) html += `<br><em style="color:#f39c12">MORTGAGED</em>`;
    } else {
      html += `<br><br><em>Unowned</em>`;
    }
    html += `</p>`;
  } else if (sp.type === "utility") {
    html += `<p>Price: $150<br>Rent: 1 owned = 4x dice, 2 owned = 10x dice`;
    if (prop) {
      html += `<br><br><strong>Owner:</strong> ${state.players[prop.owner].name}`;
      if (prop.mortgaged) html += `<br><em style="color:#f39c12">MORTGAGED</em>`;
    } else {
      html += `<br><br><em>Unowned</em>`;
    }
    html += `</p>`;
  } else if (sp.type === "tax") {
    html += `<p>Pay $${sp.amount} to the bank.</p>`;
  } else if (sp.type === "card") {
    html += `<p style="color:#9b59b6">Draw a Fortune card when you land here!<br><em style="font-size:11px;color:#888">${CARDS.length} cards in the deck.</em></p>`;
  } else {
    html += `<p>${sp.type === "go" ? "Collect $200 when passing Start." : sp.type === "jail" ? "Just passing through (or stuck here)." : sp.type === "gotojail" ? "Go directly to Lockup!" : "Nothing happens here."}</p>`;
  }

  html += `<div class="btn-group"><button class="btn-no" onclick="closeModal()">Close</button></div>`;
  modal.innerHTML = html;
  document.getElementById("modal-overlay").classList.add("show");
}

// === Build Panel ===
export function toggleBuildPanel() {
  const panel = document.getElementById("build-panel");
  if (panel.classList.contains("show")) {
    closeBuildPanel();
    return;
  }
  closeMortgagePanel();
  const p = state.players[state.currentPlayer];
  if (!p.isHuman) return;

  let html = "<h3>Build Houses / Hotels</h3>";
  let hasOptions = false;

  for (const [groupName, group] of Object.entries(GROUPS)) {
    const hasMonopoly = group.members.every(m => state.properties[m] && state.properties[m].owner === state.currentPlayer && !state.properties[m].mortgaged);
    if (!hasMonopoly) continue;

    let minHouses = 5, maxHouses = 0;
    for (const m of group.members) {
      minHouses = Math.min(minHouses, state.properties[m].houses);
      maxHouses = Math.max(maxHouses, state.properties[m].houses);
    }

    for (const m of group.members) {
      const sp = SPACES[m];
      const prop = state.properties[m];
      const canBuild = prop.houses < 5 && prop.houses <= minHouses && p.money >= group.houseCost;
      const canSell = prop.houses > 0 && prop.houses >= maxHouses;
      const label = prop.houses === 4 ? "Hotel" : `House ${prop.houses + 1}`;
      const cur = prop.houses === 5 ? "Hotel" : `${prop.houses}h`;
      hasOptions = true;
      html += `<div class="build-option">
        <span><span style="color:${group.color}">\u25A0</span> ${sp.name} (${cur})</span>
        <span>
          <button onclick="humanBuild(${m})" ${!canBuild ? "disabled" : ""}>+${label} $${group.houseCost}</button>
          <button class="sell-house" onclick="humanSellHouse(${m})" ${!canSell ? "disabled" : ""}>Sell $${Math.floor(group.houseCost/2)}</button>
        </span>
      </div>`;
    }
  }

  if (!hasOptions) html += "<p style='font-size:12px;color:#aaa'>You need a complete color group to build.</p>";
  html += `<button onclick="closeBuildPanel()" style="margin-top:8px;padding:6px 12px;background:#e74c3c;color:white;border:none;border-radius:4px;cursor:pointer;">Close</button>`;
  panel.innerHTML = html;
  panel.classList.add("show");
}

export function humanBuild(si) {
  const sp = SPACES[si];
  const group = GROUPS[sp.group];
  const p = state.players[state.currentPlayer];
  if (p.money < group.houseCost) return;
  state.properties[si].houses++;
  p.money -= group.houseCost;
  const label = state.properties[si].houses === 5 ? "a hotel" : `house #${state.properties[si].houses}`;
  log(`You build ${label} on ${sp.name} ($${group.houseCost}).`);
  renderAll();
  toggleBuildPanel(); // Refresh
  toggleBuildPanel();
}

export function humanSellHouse(si) {
  const sp = SPACES[si];
  const group = GROUPS[sp.group];
  const p = state.players[state.currentPlayer];
  const sellVal = Math.floor(group.houseCost / 2);
  state.properties[si].houses--;
  p.money += sellVal;
  log(`You sell a house on ${sp.name} for $${sellVal}.`);
  renderAll();
  toggleBuildPanel();
  toggleBuildPanel();
}

export function closeBuildPanel() {
  document.getElementById("build-panel").classList.remove("show");
}

// === Mortgage Panel ===
export function toggleMortgagePanel() {
  const panel = document.getElementById("build-panel");
  if (panel.classList.contains("show")) {
    closeMortgagePanel();
    return;
  }
  const p = state.players[state.currentPlayer];
  if (!p.isHuman) return;

  let html = "<h3>Mortgage / Unmortgage</h3>";
  let hasOptions = false;

  for (const [si, prop] of Object.entries(state.properties)) {
    if (prop.owner !== state.currentPlayer) continue;
    const sp = SPACES[si];
    hasOptions = true;

    if (prop.mortgaged) {
      const cost = Math.floor(sp.price / 2 * 1.1);
      const canAfford = p.money >= cost;
      html += `<div class="build-option">
        <span>${sp.name} [MORTGAGED]</span>
        <button class="btn-opt" onclick="humanUnmortgage(${si})" ${!canAfford ? "disabled" : ""}>Unmortgage $${cost}</button>
      </div>`;
    } else if (prop.houses === 0) {
      const val = Math.floor(sp.price / 2);
      html += `<div class="build-option">
        <span>${sp.name}</span>
        <button onclick="humanMortgage(${si})" style="background:#f39c12">Mortgage +$${val}</button>
      </div>`;
    } else {
      html += `<div class="build-option">
        <span>${sp.name} (${prop.houses}h)</span>
        <span style="font-size:10px;color:#aaa">Sell houses first</span>
      </div>`;
    }
  }

  if (!hasOptions) html += "<p style='font-size:12px;color:#aaa'>You have no properties.</p>";
  html += `<button onclick="closeMortgagePanel()" style="margin-top:8px;padding:6px 12px;background:#e74c3c;color:white;border:none;border-radius:4px;cursor:pointer;">Close</button>`;
  panel.innerHTML = html;
  panel.classList.add("show");
}

export function humanMortgage(si) {
  const sp = SPACES[si];
  const val = Math.floor(sp.price / 2);
  state.properties[si].mortgaged = true;
  state.players[state.currentPlayer].money += val;
  log(`You mortgage ${sp.name} for $${val}.`);
  renderAll();
  closeMortgagePanel();
  toggleMortgagePanel();
}

export function humanUnmortgage(si) {
  const sp = SPACES[si];
  const cost = Math.floor(sp.price / 2 * 1.1);
  if (state.players[state.currentPlayer].money < cost) return;
  state.properties[si].mortgaged = false;
  state.players[state.currentPlayer].money -= cost;
  log(`You unmortgage ${sp.name} for $${cost}.`);
  renderAll();
  closeMortgagePanel();
  toggleMortgagePanel();
}

export function closeMortgagePanel() {
  document.getElementById("build-panel").classList.remove("show");
}
