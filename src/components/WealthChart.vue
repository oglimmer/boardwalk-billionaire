<template>
  <div v-show="store.activeLogTab === 'chart'" class="chart">
    <canvas ref="canvasRef" height="260"></canvas>
    <div class="chart-legend">
      <span v-for="(p, i) in store.players" :key="i">
        <span class="chart-legend-dot" :style="{ background: PLAYER_COLORS[i] }"></span> {{ p.name }}
      </span>
      <span><span class="chart-legend-dot total-cash-dot"></span> Total Cash</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useGameStore } from '../stores/game'
import { PLAYER_COLORS } from '../data'

const store = useGameStore()
const canvasRef = ref<HTMLCanvasElement | null>(null)

function drawChart() {
  const canvas = canvasRef.value
  if (!canvas) return
  if (!store.wealthHistory || store.wealthHistory.length < 1) return

  const hist = [...store.wealthHistory]
  const liveRound = hist[hist.length - 1].round + 1
  let liveCash = 0
  const livePlayers = store.players.map((p, i) => {
    const w = store.getPlayerWealth(i)
    if (!p.isBankrupt) liveCash += w.cash
    return { cash: p.isBankrupt ? 0 : w.cash, total: p.isBankrupt ? 0 : w.total }
  })
  const data = [...hist, { round: liveRound, totalCash: liveCash, players: livePlayers }]

  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * dpr
  canvas.height = 260 * dpr
  ctx.scale(dpr, dpr)
  const W = rect.width
  const H = 260

  ctx.clearRect(0, 0, W, H)

  const ml = 45, mr = 10, mt = 10, mb = 28
  const cw = W - ml - mr
  const ch = H - mt - mb

  let maxVal = 0
  data.forEach(d => {
    if (d.totalCash > maxVal) maxVal = d.totalCash
    d.players.forEach(p => { if (p.total > maxVal) maxVal = p.total })
  })
  maxVal = Math.ceil(maxVal / 500) * 500 || 1500

  const xStep = data.length > 1 ? cw / (data.length - 1) : cw
  const toX = (i: number) => ml + (data.length > 1 ? i * xStep : cw / 2)
  const toY = (v: number) => mt + ch - (v / maxVal) * ch

  ctx.strokeStyle = '#2a2a44'
  ctx.lineWidth = 1
  ctx.setLineDash([3, 3])
  const gridSteps = 4
  for (let g = 0; g <= gridSteps; g++) {
    const val = (maxVal / gridSteps) * g
    const y = toY(val)
    ctx.beginPath(); ctx.moveTo(ml, y); ctx.lineTo(W - mr, y); ctx.stroke()
    ctx.fillStyle = '#666'
    ctx.font = '9px sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText('$' + Math.round(val), ml - 4, y + 3)
  }
  ctx.setLineDash([])

  ctx.fillStyle = '#666'
  ctx.font = '9px sans-serif'
  ctx.textAlign = 'center'
  const labelEvery = Math.max(1, Math.floor(data.length / 8))
  data.forEach((d, i) => {
    if (i % labelEvery === 0 || i === data.length - 1) {
      ctx.fillText('R' + d.round, toX(i), H - mb + 14)
    }
  })

  ctx.strokeStyle = '#ffffff88'
  ctx.lineWidth = 1.5
  ctx.setLineDash([5, 4])
  ctx.beginPath()
  data.forEach((d, i) => {
    const x = toX(i), y = toY(d.totalCash)
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  })
  ctx.stroke()
  ctx.setLineDash([])

  for (let pi = 0; pi < 4; pi++) {
    if (store.players[pi].isBankrupt && data[data.length - 1].players[pi].total === 0) {
      let lastAlive = 0
      data.forEach((d, i) => { if (d.players[pi].total > 0) lastAlive = i })
      if (lastAlive === 0 && data[0].players[pi].total === 0) continue
    }
    ctx.strokeStyle = PLAYER_COLORS[pi]
    ctx.lineWidth = 2
    ctx.beginPath()
    let started = false
    data.forEach((d, i) => {
      const x = toX(i), y = toY(d.players[pi].total)
      if (!started) { ctx.moveTo(x, y); started = true }
      else ctx.lineTo(x, y)
    })
    ctx.stroke()

    const last = data[data.length - 1]
    const lx = toX(data.length - 1), ly = toY(last.players[pi].total)
    ctx.fillStyle = PLAYER_COLORS[pi]
    ctx.beginPath(); ctx.arc(lx, ly, 3, 0, Math.PI * 2); ctx.fill()
  }
}

watch(
  () => [store.activeLogTab, store.wealthHistory.length, store.players.map(p => p.money)],
  () => {
    if (store.activeLogTab === 'chart') {
      requestAnimationFrame(drawChart)
    }
  },
  { deep: true }
)
</script>

<style scoped>
.chart { padding: 10px; }
canvas { width: 100%; border-radius: 4px; }
.chart-legend { display: flex; gap: 10px; font-size: 10px; color: #888; margin-top: 6px; justify-content: center; flex-wrap: wrap; }
.chart-legend span { display: flex; align-items: center; gap: 3px; }
.chart-legend-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.total-cash-dot { background: #fff; opacity: 0.5; }
</style>
