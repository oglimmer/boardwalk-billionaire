import { SPACES, GROUPS } from './data.js';
import { showSpaceInfo } from './ui.js';

export function getGridPos(i) {
  if (i <= 10) return { row: 11, col: 11 - i };
  if (i <= 20) return { row: 11 - (i - 10), col: 1 };
  if (i <= 30) return { row: 1, col: 1 + (i - 20) };
  return { row: 1 + (i - 30), col: 11 };
}

export function buildBoard() {
  const board = document.getElementById("board");
  board.innerHTML = "";
  for (let i = 0; i < 40; i++) {
    const sp = SPACES[i];
    const pos = getGridPos(i);
    const div = document.createElement("div");
    div.className = "space" + ([0,10,20,30].includes(i) ? " corner" : "");
    div.id = "space-" + i;
    div.style.gridRow = pos.row;
    div.style.gridColumn = pos.col;
    div.onclick = () => showSpaceInfo(i);

    let html = "";
    if (sp.group && GROUPS[sp.group]) {
      html += `<div class="color-bar" style="background:${GROUPS[sp.group].color}"></div>`;
    } else if (sp.type === "railroad") {
      html += `<div class="color-bar" style="background:#555"></div>`;
    } else if (sp.type === "utility") {
      html += `<div class="color-bar" style="background:#999"></div>`;
    } else if (sp.type === "card") {
      html += `<div class="color-bar" style="background:linear-gradient(90deg,#e94560,#9b59b6)"></div>`;
    }
    html += `<div class="name">${sp.name}</div>`;
    if (sp.price) html += `<div class="price">$${sp.price}</div>`;
    if (sp.type === "tax") html += `<div class="price">-$${sp.amount}</div>`;
    html += `<div class="tokens" id="tokens-${i}"></div>`;
    html += `<div class="houses" id="houses-${i}"></div>`;
    div.innerHTML = html;
    board.appendChild(div);
  }
  // Center area
  const center = document.createElement("div");
  center.className = "center-area";
  center.innerHTML = `<h1>BOARDWALK<br>BILLIONAIRE</h1><div class="dice-display"><div class="die" id="die1">?</div><div class="die" id="die2">?</div></div><div class="center-info" id="center-info">Roll the dice to begin!</div>`;
  board.appendChild(center);
}
