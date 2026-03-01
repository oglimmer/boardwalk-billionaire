import { SPACES, GROUPS, PLAYER_COLORS } from './data.js';
import state from './state.js';

export function renderAll() {
  renderPlayers();
  renderBoard();
  renderControls();
  renderStats();
  renderChart();
}

export function switchLogTab(tab) {
  document.querySelectorAll('.log-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.getElementById('log').style.display = tab === 'log' ? 'block' : 'none';
  document.getElementById('stats').style.display = tab === 'stats' ? 'block' : 'none';
  document.getElementById('chart').style.display = tab === 'chart' ? 'block' : 'none';
  if (tab === 'stats') renderStats();
  if (tab === 'chart') renderChart();
}

export function getPlayerWealth(pi) {
  let cash = state.players[pi].money;
  let propValue = 0;
  let buildValue = 0;
  let mortgageDebt = 0;
  for (const [si, prop] of Object.entries(state.properties)) {
    if (prop.owner !== pi) continue;
    const sp = SPACES[si];
    if (prop.mortgaged) {
      mortgageDebt += Math.floor(sp.price / 2);
    } else {
      propValue += sp.price;
    }
    if (prop.houses > 0 && sp.group) {
      buildValue += prop.houses * GROUPS[sp.group].houseCost;
    }
  }
  return { cash, propValue, buildValue, mortgageDebt, total: cash + propValue + buildValue + mortgageDebt };
}

export function renderStats() {
  const el = document.getElementById('stats');
  if (!el || el.style.display === 'none') return;

  let totalCash = 0;
  let grandTotal = 0;
  const wealths = state.players.map((p, i) => {
    const w = getPlayerWealth(i);
    totalCash += p.isBankrupt ? 0 : w.cash;
    grandTotal += p.isBankrupt ? 0 : w.total;
    return w;
  });

  const maxTotal = Math.max(...wealths.map((w, i) => state.players[i].isBankrupt ? 0 : w.total), 1);

  let html = `<div class="stat-header">Game Economy</div>`;
  html += `<div class="stat-total">Total cash in game: <strong style="color:#2ecc71">$${totalCash}</strong> &nbsp;|&nbsp; Total wealth: <strong style="color:#fff">$${grandTotal}</strong></div>`;

  state.players.forEach((p, i) => {
    if (p.isBankrupt) {
      html += `<div class="stat-player" style="opacity:0.4">
        <div class="stat-player-header">
          <div class="stat-player-dot" style="background:${PLAYER_COLORS[i]}"></div>
          <div class="stat-player-name">${p.name}</div>
          <div class="stat-player-total" style="color:#e74c3c">BANKRUPT</div>
        </div>
      </div>`;
      return;
    }
    const w = wealths[i];
    const barWidth = (w.total / maxTotal) * 100;
    const cashPct = w.total > 0 ? (w.cash / w.total) * barWidth : 0;
    const propPct = w.total > 0 ? (w.propValue / w.total) * barWidth : 0;
    const buildPct = w.total > 0 ? (w.buildValue / w.total) * barWidth : 0;
    const mortPct = w.total > 0 ? (w.mortgageDebt / w.total) * barWidth : 0;

    html += `<div class="stat-player">
      <div class="stat-player-header">
        <div class="stat-player-dot" style="background:${PLAYER_COLORS[i]}"></div>
        <div class="stat-player-name">${p.name}</div>
        <div class="stat-player-total">$${w.total}</div>
      </div>
      <div class="stat-bar">
        <div class="stat-bar-cash" style="width:${cashPct}%" title="Cash: $${w.cash}"></div>
        <div class="stat-bar-prop" style="width:${propPct}%" title="Property: $${w.propValue}"></div>
        <div class="stat-bar-build" style="width:${buildPct}%" title="Buildings: $${w.buildValue}"></div>
        <div class="stat-bar-mort" style="width:${mortPct}%" title="Mortgaged: $${w.mortgageDebt}"></div>
      </div>
      <div class="stat-breakdown">
        <span><span class="stat-legend-dot" style="background:#2ecc71"></span> $${w.cash}</span>
        <span><span class="stat-legend-dot" style="background:#3498db"></span> $${w.propValue}</span>
        <span><span class="stat-legend-dot" style="background:#f39c12"></span> $${w.buildValue}</span>
        ${w.mortgageDebt > 0 ? `<span><span class="stat-legend-dot" style="background:#666"></span> $${w.mortgageDebt}</span>` : ''}
      </div>
    </div>`;
  });

  html += `<div class="stat-legend">
    <span><span class="stat-legend-dot" style="background:#2ecc71"></span> Cash</span>
    <span><span class="stat-legend-dot" style="background:#3498db"></span> Property</span>
    <span><span class="stat-legend-dot" style="background:#f39c12"></span> Buildings</span>
    <span><span class="stat-legend-dot" style="background:#666"></span> Mortgaged</span>
  </div>`;

  el.innerHTML = html;
}

export function recordWealth(round) {
  let totalCash = 0;
  const pData = state.players.map((p, i) => {
    const w = getPlayerWealth(i);
    if (!p.isBankrupt) totalCash += w.cash;
    return { cash: p.isBankrupt ? 0 : w.cash, total: p.isBankrupt ? 0 : w.total };
  });
  state.wealthHistory.push({ round, totalCash, players: pData });
}

export function renderChart() {
  const el = document.getElementById('chart');
  if (!el || el.style.display === 'none') return;
  if (!state.wealthHistory || state.wealthHistory.length < 1) return;

  const hist = [...state.wealthHistory];
  const liveRound = hist[hist.length - 1].round + 1;
  let liveCash = 0;
  const livePlayers = state.players.map((p, i) => {
    const w = getPlayerWealth(i);
    if (!p.isBankrupt) liveCash += w.cash;
    return { cash: p.isBankrupt ? 0 : w.cash, total: p.isBankrupt ? 0 : w.total };
  });
  const data = [...hist, { round: liveRound, totalCash: liveCash, players: livePlayers }];

  const canvas = document.getElementById('chart-canvas');
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = 260 * dpr;
  ctx.scale(dpr, dpr);
  const W = rect.width;
  const H = 260;

  ctx.clearRect(0, 0, W, H);

  const ml = 45, mr = 10, mt = 10, mb = 28;
  const cw = W - ml - mr;
  const ch = H - mt - mb;

  let maxVal = 0;
  data.forEach(d => {
    if (d.totalCash > maxVal) maxVal = d.totalCash;
    d.players.forEach(p => { if (p.total > maxVal) maxVal = p.total; });
  });
  maxVal = Math.ceil(maxVal / 500) * 500 || 1500;

  const xStep = data.length > 1 ? cw / (data.length - 1) : cw;
  const toX = i => ml + (data.length > 1 ? i * xStep : cw / 2);
  const toY = v => mt + ch - (v / maxVal) * ch;

  ctx.strokeStyle = '#2a2a44';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  const gridSteps = 4;
  for (let g = 0; g <= gridSteps; g++) {
    const val = (maxVal / gridSteps) * g;
    const y = toY(val);
    ctx.beginPath(); ctx.moveTo(ml, y); ctx.lineTo(W - mr, y); ctx.stroke();
    ctx.fillStyle = '#666';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('$' + Math.round(val), ml - 4, y + 3);
  }
  ctx.setLineDash([]);

  ctx.fillStyle = '#666';
  ctx.font = '9px sans-serif';
  ctx.textAlign = 'center';
  const labelEvery = Math.max(1, Math.floor(data.length / 8));
  data.forEach((d, i) => {
    if (i % labelEvery === 0 || i === data.length - 1) {
      ctx.fillText('R' + d.round, toX(i), H - mb + 14);
    }
  });

  ctx.strokeStyle = '#ffffff88';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  data.forEach((d, i) => {
    const x = toX(i), y = toY(d.totalCash);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.setLineDash([]);

  const lineColors = PLAYER_COLORS;
  for (let pi = 0; pi < 4; pi++) {
    if (state.players[pi].isBankrupt && data[data.length - 1].players[pi].total === 0) {
      let lastAlive = 0;
      data.forEach((d, i) => { if (d.players[pi].total > 0) lastAlive = i; });
      if (lastAlive === 0 && data[0].players[pi].total === 0) continue;
    }
    ctx.strokeStyle = lineColors[pi];
    ctx.lineWidth = 2;
    ctx.beginPath();
    let started = false;
    data.forEach((d, i) => {
      const x = toX(i), y = toY(d.players[pi].total);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    const last = data[data.length - 1];
    const lx = toX(data.length - 1), ly = toY(last.players[pi].total);
    ctx.fillStyle = lineColors[pi];
    ctx.beginPath(); ctx.arc(lx, ly, 3, 0, Math.PI * 2); ctx.fill();
  }

  const legend = document.getElementById('chart-legend');
  let lhtml = '';
  state.players.forEach((p, i) => {
    lhtml += `<span><span class="chart-legend-dot" style="background:${PLAYER_COLORS[i]}"></span> ${p.name}</span>`;
  });
  lhtml += `<span><span class="chart-legend-dot" style="background:#fff;opacity:0.5"></span> Total Cash</span>`;
  legend.innerHTML = lhtml;
}

export function renderBoard() {
  for (let i = 0; i < 40; i++) {
    const el = document.getElementById("space-" + i);
    if (!el) continue;
    el.classList.remove("owned", "mortgaged");
    el.style.removeProperty("--owner-color");
    const tokensEl = document.getElementById("tokens-" + i);
    const housesEl = document.getElementById("houses-" + i);
    tokensEl.innerHTML = "";
    housesEl.innerHTML = "";

    const prop = state.properties[i];
    if (prop && prop.owner !== undefined) {
      el.classList.add("owned");
      el.style.setProperty("--owner-color", PLAYER_COLORS[prop.owner]);
      if (prop.mortgaged) el.classList.add("mortgaged");
      if (prop.houses > 0 && prop.houses < 5) {
        for (let h = 0; h < prop.houses; h++) {
          housesEl.innerHTML += `<div class="house"></div>`;
        }
      } else if (prop.houses === 5) {
        housesEl.innerHTML = `<div class="hotel"></div>`;
      }
    }

    state.players.forEach((p, pi) => {
      if (!p.isBankrupt && p.position === i) {
        tokensEl.innerHTML += `<div class="token" style="background:${PLAYER_COLORS[pi]}">${pi === 0 ? "Y" : ""}</div>`;
      }
    });
  }
}

export function renderPlayers() {
  const container = document.getElementById("players");
  container.innerHTML = "";
  state.players.forEach((p, i) => {
    const card = document.createElement("div");
    card.className = "player-card" + (i === state.currentPlayer ? " active" : "") + (p.isBankrupt ? " bankrupt" : "");
    let propsHtml = "";
    for (const [si, prop] of Object.entries(state.properties)) {
      if (prop.owner === i) {
        const sp = SPACES[si];
        const color = sp.group ? GROUPS[sp.group].color : (sp.type === "railroad" ? "#555" : "#999");
        propsHtml += `<span class="prop-dot${prop.mortgaged ? " mort" : ""}" style="background:${color}" title="${sp.name}${prop.houses > 0 ? " (" + (prop.houses === 5 ? "H" : prop.houses + "h") + ")" : ""}${prop.mortgaged ? " [M]" : ""}"></span>`;
      }
    }
    card.innerHTML = `
      <div class="header">
        <div class="dot" style="background:${PLAYER_COLORS[i]}"></div>
        <div class="pname">${p.name}${p.inJail ? " (LOCKUP)" : ""}${p.isBankrupt ? " (BANKRUPT)" : ""}</div>
        <div class="money">$${p.money}</div>
      </div>
      <div class="props">${propsHtml || '<span style="color:#666">No properties</span>'}</div>
    `;
    container.appendChild(card);
  });
}

export function renderControls() {
  const p = state.players[state.currentPlayer];
  const isHuman = p.isHuman && !state.gameOver;
  document.getElementById("btn-roll").disabled = !(isHuman && state.phase === "roll");
  document.getElementById("btn-end-turn").disabled = !(isHuman && state.phase === "postRoll");
  document.getElementById("btn-build").disabled = !(isHuman && (state.phase === "postRoll" || state.phase === "roll"));
  document.getElementById("btn-mortgage").disabled = !(isHuman && (state.phase === "postRoll" || state.phase === "roll"));
  document.getElementById("btn-trade").disabled = !(isHuman && (state.phase === "postRoll" || state.phase === "roll"));

  const rollBtn = document.getElementById("btn-roll");
  if (isHuman && p.inJail && state.phase === "roll") {
    rollBtn.textContent = "Roll for Doubles";
    let jailBtn = document.getElementById("btn-jail-pay");
    if (!jailBtn) {
      jailBtn = document.createElement("button");
      jailBtn.id = "btn-jail-pay";
      jailBtn.style.cssText = "padding:10px;border:none;border-radius:6px;font-size:14px;font-weight:bold;cursor:pointer;background:#f39c12;color:white;";
      jailBtn.textContent = "Pay $50 to Leave Lockup";
      jailBtn.onclick = () => {
        if (p.money >= 50) {
          p.money -= 50;
          p.inJail = false;
          p.jailTurns = 0;
          log("You pay $50 to leave Lockup.");
          const jb = document.getElementById("btn-jail-pay");
          if (jb) jb.remove();
          renderAll();
        }
      };
      document.getElementById("controls").insertBefore(jailBtn, document.getElementById("btn-build"));
    }
  } else {
    rollBtn.textContent = "Roll Dice";
    const jailBtn = document.getElementById("btn-jail-pay");
    if (jailBtn) jailBtn.remove();
  }
}

export function log(msg) {
  const logEl = document.getElementById("log");
  logEl.innerHTML = `<div class="log-entry">${msg}</div>` + logEl.innerHTML;
}
