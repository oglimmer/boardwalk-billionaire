import { SPACES, GROUPS, PLAYER_COLORS, RAILROAD_SPACES, UTILITY_SPACES } from './data.js';
import state from './state.js';
import { renderAll, log } from './render.js';
import { closeModal, closeBuildPanel } from './ui.js';
import { aiWouldAcceptTrade } from './ai.js';

export function canTradeProperty(si) {
  const prop = state.properties[si];
  if (!prop) return false;
  if (prop.houses > 0) return false;
  const sp = SPACES[si];
  if (sp.group) {
    const group = GROUPS[sp.group];
    for (const m of group.members) {
      if (state.properties[m] && state.properties[m].owner === prop.owner && state.properties[m].houses > 0) return false;
    }
  }
  return true;
}

export function getTradeableProperties(pi) {
  const result = [];
  for (const [si, prop] of Object.entries(state.properties)) {
    if (prop.owner === pi && canTradeProperty(parseInt(si))) result.push(parseInt(si));
  }
  return result;
}

export function getPropertyStrategicValue(si, forPlayer) {
  const sp = SPACES[si];
  let value = sp.price;
  if (sp.group) {
    const group = GROUPS[sp.group];
    const owned = group.members.filter(m => state.properties[m] && state.properties[m].owner === forPlayer).length;
    if (owned === group.members.length - 1) value *= 3;
    else if (owned >= 1) value *= 1.5;
  }
  if (sp.type === "railroad") {
    const count = RAILROAD_SPACES.filter(r => state.properties[r] && state.properties[r].owner === forPlayer).length;
    if (count >= 2) value *= 1.5;
  }
  if (sp.type === "utility") {
    const count = UTILITY_SPACES.filter(u => state.properties[u] && state.properties[u].owner === forPlayer).length;
    if (count >= 1) value *= 1.3;
  }
  return Math.round(value);
}

export function openTradePanel() {
  closeBuildPanel();
  const modal = document.getElementById("modal");
  let html = '<h2>Trade</h2><p>Select a player to trade with:</p><div class="btn-group" style="flex-direction:column">';
  let hasPartner = false;
  state.players.forEach((pl, i) => {
    if (i === 0 || pl.isBankrupt) return;
    const theirProps = getTradeableProperties(i);
    const myProps = getTradeableProperties(0);
    if (theirProps.length === 0 && myProps.length === 0) return;
    hasPartner = true;
    html += `<button class="btn-opt" onclick="selectTradePartner(${i})" style="text-align:left">
      <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${PLAYER_COLORS[i]};vertical-align:middle"></span>
      ${pl.name} — $${pl.money} — ${theirProps.length} tradeable props
    </button>`;
  });
  if (!hasPartner) html += '<p style="font-size:12px;color:#aaa">No players with tradeable properties available.</p>';
  html += '</div><div class="btn-group" style="margin-top:10px"><button class="btn-no" onclick="closeModal()">Cancel</button></div>';
  modal.innerHTML = html;
  document.getElementById("modal-overlay").classList.add("show");
}

export function selectTradePartner(pi) {
  state.tradeState = { partner: pi, myProps: new Set(), theirProps: new Set(), myCash: 0, theirCash: 0 };
  renderTradeUI();
}

export function renderTradeUI() {
  const partner = state.players[state.tradeState.partner];
  const myProps = getTradeableProperties(0);
  const theirProps = getTradeableProperties(state.tradeState.partner);
  const modal = document.getElementById("modal");
  modal.style.maxWidth = "520px";

  let html = `<h2>Trade with ${partner.name}</h2>`;
  html += '<div style="display:flex;gap:16px">';

  // Your offer
  html += '<div style="flex:1"><h3 style="color:#2ecc71;font-size:13px;margin-bottom:6px">You Give:</h3>';
  if (myProps.length > 0) {
    myProps.forEach(si => {
      const sp = SPACES[si];
      const color = sp.group ? GROUPS[sp.group].color : (sp.type === "railroad" ? "#555" : "#999");
      const checked = state.tradeState.myProps.has(si) ? "checked" : "";
      html += `<label style="display:flex;align-items:center;font-size:11px;padding:2px 0;cursor:pointer;gap:4px">
        <input type="checkbox" ${checked} onchange="toggleTradeProp('my',${si})">
        <span style="color:${color}">\u25A0</span> ${sp.name} ($${sp.price})
      </label>`;
    });
  } else {
    html += '<em style="font-size:11px;color:#666">No tradeable properties</em>';
  }
  html += `<div style="margin-top:8px;font-size:11px">+ Cash: $<input type="number" id="trade-my-cash" value="${state.tradeState.myCash}" min="0" max="${state.players[0].money}" step="10" style="width:70px;background:#0f3460;color:white;border:1px solid #444;padding:3px 5px;border-radius:3px" onchange="updateTradeMyCash(this.value)"></div>`;
  html += '</div>';

  // You want
  html += `<div style="flex:1"><h3 style="color:#e94560;font-size:13px;margin-bottom:6px">You Get:</h3>`;
  if (theirProps.length > 0) {
    theirProps.forEach(si => {
      const sp = SPACES[si];
      const color = sp.group ? GROUPS[sp.group].color : (sp.type === "railroad" ? "#555" : "#999");
      const checked = state.tradeState.theirProps.has(si) ? "checked" : "";
      html += `<label style="display:flex;align-items:center;font-size:11px;padding:2px 0;cursor:pointer;gap:4px">
        <input type="checkbox" ${checked} onchange="toggleTradeProp('their',${si})">
        <span style="color:${color}">\u25A0</span> ${sp.name} ($${sp.price})
      </label>`;
    });
  } else {
    html += '<em style="font-size:11px;color:#666">No tradeable properties</em>';
  }
  html += `<div style="margin-top:8px;font-size:11px">+ Cash: $<input type="number" id="trade-their-cash" value="${state.tradeState.theirCash}" min="0" max="${partner.money}" step="10" style="width:70px;background:#0f3460;color:white;border:1px solid #444;padding:3px 5px;border-radius:3px" onchange="updateTradeTheirCash(this.value)"></div>`;
  html += '</div></div>';

  html += `<div class="btn-group" style="margin-top:14px">
    <button class="btn-yes" onclick="submitHumanTrade()">Propose Trade</button>
    <button class="btn-opt" onclick="document.getElementById('modal').style.maxWidth='400px';openTradePanel()">Back</button>
    <button class="btn-no" onclick="closeTradeModal()">Cancel</button>
  </div>`;

  modal.innerHTML = html;
}

export function toggleTradeProp(side, si) {
  const set = side === 'my' ? state.tradeState.myProps : state.tradeState.theirProps;
  if (set.has(si)) set.delete(si); else set.add(si);
}

export function updateTradeMyCash(value) {
  state.tradeState.myCash = Math.max(0, Math.min(state.players[0].money, parseInt(value) || 0));
}

export function updateTradeTheirCash(value) {
  state.tradeState.theirCash = Math.max(0, Math.min(state.players[state.tradeState.partner].money, parseInt(value) || 0));
}

export function closeTradeModal() {
  document.getElementById("modal").style.maxWidth = "400px";
  state.tradeState = null;
  closeModal();
}

export function submitHumanTrade() {
  state.tradeState.myCash = Math.max(0, Math.min(state.players[0].money, parseInt(document.getElementById("trade-my-cash").value) || 0));
  state.tradeState.theirCash = Math.max(0, Math.min(state.players[state.tradeState.partner].money, parseInt(document.getElementById("trade-their-cash").value) || 0));
  const myProps = Array.from(state.tradeState.myProps);
  const theirProps = Array.from(state.tradeState.theirProps);

  if (myProps.length === 0 && theirProps.length === 0 && state.tradeState.myCash === 0 && state.tradeState.theirCash === 0) return;

  const accepted = aiWouldAcceptTrade(state.tradeState.partner, myProps, theirProps, state.tradeState.myCash, state.tradeState.theirCash, 0);

  if (accepted) {
    executeTrade(0, state.tradeState.partner, myProps, theirProps, state.tradeState.myCash, state.tradeState.theirCash);
    log(`${state.players[state.tradeState.partner].name} accepted your trade!`);
    closeTradeModal();
    renderAll();
  } else {
    const modal = document.getElementById("modal");
    modal.innerHTML = `
      <h2>Trade Rejected</h2>
      <p>${state.players[state.tradeState.partner].name} declined your offer. Try sweetening the deal!</p>
      <div class="btn-group">
        <button class="btn-opt" onclick="renderTradeUI()">Modify Offer</button>
        <button class="btn-no" onclick="closeTradeModal()">Cancel</button>
      </div>`;
  }
}

export function executeTrade(fromPlayer, toPlayer, fromProps, toProps, fromCash, toCash) {
  fromProps.forEach(si => { state.properties[si].owner = toPlayer; });
  toProps.forEach(si => { state.properties[si].owner = fromPlayer; });
  state.players[fromPlayer].money -= fromCash;
  state.players[fromPlayer].money += toCash;
  state.players[toPlayer].money += fromCash;
  state.players[toPlayer].money -= toCash;

  const fNames = fromProps.map(si => SPACES[si].name);
  const tNames = toProps.map(si => SPACES[si].name);
  let desc = `Trade: ${state.players[fromPlayer].name} gives`;
  if (fNames.length) desc += ` [${fNames.join(", ")}]`;
  if (fromCash > 0) desc += `${fNames.length ? " +" : ""} $${fromCash}`;
  if (!fNames.length && fromCash === 0) desc += " nothing";
  desc += ` \u2194 gets`;
  if (tNames.length) desc += ` [${tNames.join(", ")}]`;
  if (toCash > 0) desc += `${tNames.length ? " +" : ""} $${toCash}`;
  if (!tNames.length && toCash === 0) desc += " nothing";
  log(desc);
}

export function showAiTradeProposal(aiPlayer, offeredProps, wantedProps, offeredCash, wantedCash) {
  const ai = state.players[aiPlayer];
  const modal = document.getElementById("modal");
  modal.style.maxWidth = "450px";
  state.pendingAiTrade = { aiPlayer, offeredProps, wantedProps, offeredCash, wantedCash };

  let html = `<h2>${ai.name} wants to trade!</h2>`;
  html += '<div style="display:flex;gap:20px;margin:12px 0">';

  html += '<div style="flex:1"><h3 style="color:#2ecc71;font-size:13px;margin-bottom:6px">They give you:</h3>';
  offeredProps.forEach(si => {
    const sp = SPACES[si];
    const color = sp.group ? GROUPS[sp.group].color : (sp.type === "railroad" ? "#555" : "#999");
    html += `<div style="font-size:12px;padding:2px 0"><span style="color:${color}">\u25A0</span> ${sp.name}</div>`;
  });
  if (offeredCash > 0) html += `<div style="font-size:12px;color:#2ecc71;margin-top:4px">+ $${offeredCash} cash</div>`;
  if (offeredProps.length === 0 && offeredCash === 0) html += '<div style="font-size:11px;color:#666">Nothing</div>';
  html += '</div>';

  html += '<div style="flex:1"><h3 style="color:#e94560;font-size:13px;margin-bottom:6px">They want from you:</h3>';
  wantedProps.forEach(si => {
    const sp = SPACES[si];
    const color = sp.group ? GROUPS[sp.group].color : (sp.type === "railroad" ? "#555" : "#999");
    html += `<div style="font-size:12px;padding:2px 0"><span style="color:${color}">\u25A0</span> ${sp.name}</div>`;
  });
  if (wantedCash > 0) html += `<div style="font-size:12px;color:#e94560;margin-top:4px">+ $${wantedCash} cash</div>`;
  html += '</div></div>';

  html += `<div class="btn-group" style="margin-top:14px">
    <button class="btn-yes" onclick="acceptAiTrade()">Accept Trade</button>
    <button class="btn-no" onclick="declineAiTrade()">Decline</button>
  </div>`;

  modal.innerHTML = html;
  document.getElementById("modal-overlay").classList.add("show");
}

export function acceptAiTrade() {
  if (!state.pendingAiTrade) return;
  const t = state.pendingAiTrade;
  executeTrade(t.aiPlayer, 0, t.offeredProps, t.wantedProps, t.offeredCash, t.wantedCash);
  log(`You accepted ${state.players[t.aiPlayer].name}'s trade!`);
  state.pendingAiTrade = null;
  document.getElementById("modal").style.maxWidth = "400px";
  closeModal();
  renderAll();
  if (state.pendingAiTradeResume) {
    const cb = state.pendingAiTradeResume;
    state.pendingAiTradeResume = null;
    setTimeout(cb, 600);
  }
}

export function declineAiTrade() {
  if (!state.pendingAiTrade) return;
  log(`You declined ${state.players[state.pendingAiTrade.aiPlayer].name}'s trade offer.`);
  state.pendingAiTrade = null;
  document.getElementById("modal").style.maxWidth = "400px";
  closeModal();
  if (state.pendingAiTradeResume) {
    const cb = state.pendingAiTradeResume;
    state.pendingAiTradeResume = null;
    setTimeout(cb, 600);
  }
}
