<template>
  <div class="modal-overlay" :class="{ show: store.modal.visible }">
    <div class="modal" :class="{ wide: isWide }">

      <!-- Buy Property -->
      <template v-if="store.modal.type === 'buy'">
        <h2>{{ buySpace.name }}</h2>
        <p>
          Price: <strong>${{ buySpace.price }}</strong><br>
          Your cash: <strong>${{ currentPlayer.money }}</strong>
          <template v-if="!canAffordBuy"><br><em class="cant-afford">You can't afford this!</em></template>
        </p>
        <div class="btn-group">
          <button class="btn-yes" :disabled="!canAffordBuy" @click="store.buyProperty(store.modal.payload.si)">Buy - ${{ buySpace.price }}</button>
          <button class="btn-no" @click="store.declineBuy()">Pass</button>
        </div>
      </template>

      <!-- Win -->
      <template v-if="store.modal.type === 'win'">
        <h2>Game Over!</h2>
        <p><strong>{{ store.modal.payload.name }}</strong> wins the game!</p>
        <div class="btn-group">
          <button class="btn-yes" @click="store.closeModal(); store.initGame()">Play Again</button>
        </div>
      </template>

      <!-- Space Info -->
      <template v-if="store.modal.type === 'spaceInfo'">
        <h2>{{ infoSpace.name }}</h2>
        <div v-if="infoSpace.type === 'property'" class="info-body">
          <p>
            <span :style="{ color: GROUPS[infoSpace.group].color }">&block;&block;&block;</span> {{ infoSpace.group }} group<br>
            Price: ${{ infoSpace.price }} | House cost: ${{ GROUPS[infoSpace.group].houseCost }}<br>
            <strong>Rent:</strong> ${{ infoSpace.rent[0] }}
            <template v-for="h in 4" :key="h"> | {{ h }}H: ${{ infoSpace.rent[h] }}</template>
             | Hotel: ${{ infoSpace.rent[5] }}
            <template v-if="infoProp">
              <br><br><strong>Owner:</strong> {{ store.players[infoProp.owner].name }}
              <br><strong>Houses:</strong> {{ infoProp.houses === 5 ? 'Hotel' : infoProp.houses }}
              <template v-if="infoProp.mortgaged"><br><em class="mortgaged-label">MORTGAGED</em></template>
            </template>
            <template v-else><br><br><em>Unowned</em></template>
          </p>
        </div>
        <div v-else-if="infoSpace.type === 'railroad'" class="info-body">
          <p>
            Price: $200<br>Rent: 1 owned=$25, 2=$50, 3=$100, 4=$200
            <template v-if="infoProp">
              <br><br><strong>Owner:</strong> {{ store.players[infoProp.owner].name }}
              <template v-if="infoProp.mortgaged"><br><em class="mortgaged-label">MORTGAGED</em></template>
            </template>
            <template v-else><br><br><em>Unowned</em></template>
          </p>
        </div>
        <div v-else-if="infoSpace.type === 'utility'" class="info-body">
          <p>
            Price: $150<br>Rent: 1 owned = 4x dice, 2 owned = 10x dice
            <template v-if="infoProp">
              <br><br><strong>Owner:</strong> {{ store.players[infoProp.owner].name }}
              <template v-if="infoProp.mortgaged"><br><em class="mortgaged-label">MORTGAGED</em></template>
            </template>
            <template v-else><br><br><em>Unowned</em></template>
          </p>
        </div>
        <div v-else-if="infoSpace.type === 'tax'" class="info-body">
          <p>Pay ${{ infoSpace.amount }} to the bank.</p>
        </div>
        <div v-else-if="infoSpace.type === 'card'" class="info-body">
          <p class="card-info">Draw a Fortune card when you land here!<br><em class="card-count">{{ CARDS.length }} cards in the deck.</em></p>
        </div>
        <div v-else class="info-body">
          <p>{{ infoSpace.type === 'go' ? 'Collect $200 when passing Start.' : infoSpace.type === 'jail' ? 'Just passing through (or stuck here).' : infoSpace.type === 'gotojail' ? 'Go directly to Lockup!' : 'Nothing happens here.' }}</p>
        </div>
        <div class="btn-group"><button class="btn-no" @click="store.closeModal()">Close</button></div>
      </template>

      <!-- Fortune Card -->
      <template v-if="store.modal.type === 'card'">
        <h2 class="card-title">&#10024; Fortune Card</h2>
        <div class="card-display">
          <div class="card-name">{{ store.modal.payload.card?.title }}</div>
          <div class="card-desc">{{ store.modal.payload.card?.desc }}</div>
        </div>
        <div class="btn-group">
          <button class="btn-opt" @click="store.closeModal(); store.executeCard(store.modal.payload.pi, store.modal.payload.card)">OK</button>
        </div>
      </template>

      <!-- Trade Select -->
      <template v-if="store.modal.type === 'tradeSelect'">
        <h2>Trade</h2>
        <p>Select a player to trade with:</p>
        <div class="btn-group vertical">
          <template v-for="(pl, i) in store.players" :key="i">
            <button
              v-if="i !== 0 && !pl.isBankrupt && (tradePartnerProps(i).length > 0 || tradeMyProps.length > 0)"
              class="btn-opt trade-partner-btn"
              @click="store.selectTradePartner(i)"
            >
              <span class="partner-dot" :style="{ background: PLAYER_COLORS[i] }"></span>
              {{ pl.name }} — ${{ pl.money }} — {{ tradePartnerProps(i).length }} tradeable props
            </button>
          </template>
          <p v-if="!hasTradePartner" class="no-options">No players with tradeable properties available.</p>
        </div>
        <div class="btn-group" style="margin-top:10px"><button class="btn-no" @click="store.closeModal()">Cancel</button></div>
      </template>

      <!-- Trade UI -->
      <template v-if="store.modal.type === 'tradeUI' && store.tradeState">
        <h2>Trade with {{ store.players[store.tradeState.partner].name }}</h2>
        <div class="trade-columns">
          <div class="trade-col">
            <h3 class="give-title">You Give:</h3>
            <template v-if="tradeMyProps.length">
              <label v-for="si in tradeMyProps" :key="si" class="trade-prop-label">
                <input type="checkbox" :checked="store.tradeState.myProps.has(si)" @change="store.toggleTradeProp('my', si)">
                <span :style="{ color: propColor(si) }">&block;</span> {{ SPACES[si].name }} (${{ SPACES[si].price }})
              </label>
            </template>
            <em v-else class="no-trade-props">No tradeable properties</em>
            <div class="trade-cash">
              + Cash: $<input
                type="number"
                :value="store.tradeState.myCash"
                min="0"
                :max="store.players[0].money"
                step="10"
                class="cash-input"
                @change="store.updateTradeMyCash($event.target.value)"
              >
            </div>
          </div>
          <div class="trade-col">
            <h3 class="get-title">You Get:</h3>
            <template v-if="tradePartnerTradeProps.length">
              <label v-for="si in tradePartnerTradeProps" :key="si" class="trade-prop-label">
                <input type="checkbox" :checked="store.tradeState.theirProps.has(si)" @change="store.toggleTradeProp('their', si)">
                <span :style="{ color: propColor(si) }">&block;</span> {{ SPACES[si].name }} (${{ SPACES[si].price }})
              </label>
            </template>
            <em v-else class="no-trade-props">No tradeable properties</em>
            <div class="trade-cash">
              + Cash: $<input
                type="number"
                :value="store.tradeState.theirCash"
                min="0"
                :max="store.players[store.tradeState.partner].money"
                step="10"
                class="cash-input"
                @change="store.updateTradeTheirCash($event.target.value)"
              >
            </div>
          </div>
        </div>
        <div class="btn-group" style="margin-top:14px">
          <button class="btn-yes" @click="store.submitHumanTrade()">Propose Trade</button>
          <button class="btn-opt" @click="store.openTradePanel()">Back</button>
          <button class="btn-no" @click="store.closeTradeModal()">Cancel</button>
        </div>
      </template>

      <!-- Trade Rejected -->
      <template v-if="store.modal.type === 'tradeRejected'">
        <h2>Trade Rejected</h2>
        <p>{{ store.modal.payload.partnerName }} declined your offer. Try sweetening the deal!</p>
        <div class="btn-group">
          <button class="btn-opt" @click="store.showModal('tradeUI', {})">Modify Offer</button>
          <button class="btn-no" @click="store.closeTradeModal()">Cancel</button>
        </div>
      </template>

      <!-- AI Trade Proposal -->
      <template v-if="store.modal.type === 'aiTradeProposal' && store.pendingAiTrade">
        <h2>{{ store.players[store.pendingAiTrade.aiPlayer].name }} wants to trade!</h2>
        <div class="trade-columns">
          <div class="trade-col">
            <h3 class="give-title">They give you:</h3>
            <div v-for="si in store.pendingAiTrade.offeredProps" :key="si" class="ai-trade-prop">
              <span :style="{ color: propColor(si) }">&block;</span> {{ SPACES[si].name }}
            </div>
            <div v-if="store.pendingAiTrade.offeredCash > 0" class="ai-trade-cash give">+ ${{ store.pendingAiTrade.offeredCash }} cash</div>
            <div v-if="store.pendingAiTrade.offeredProps.length === 0 && store.pendingAiTrade.offeredCash === 0" class="nothing">Nothing</div>
          </div>
          <div class="trade-col">
            <h3 class="get-title">They want from you:</h3>
            <div v-for="si in store.pendingAiTrade.wantedProps" :key="si" class="ai-trade-prop">
              <span :style="{ color: propColor(si) }">&block;</span> {{ SPACES[si].name }}
            </div>
            <div v-if="store.pendingAiTrade.wantedCash > 0" class="ai-trade-cash want">+ ${{ store.pendingAiTrade.wantedCash }} cash</div>
          </div>
        </div>
        <div class="btn-group" style="margin-top:14px">
          <button class="btn-yes" @click="store.acceptAiTrade()">Accept Trade</button>
          <button class="btn-no" @click="store.declineAiTrade()">Decline</button>
        </div>
      </template>

    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { SPACES, GROUPS, PLAYER_COLORS, CARDS } from '../data'

const store = useGameStore()

const currentPlayer = computed(() => store.players[store.currentPlayer])
const buySpace = computed(() => SPACES[store.modal.payload.si] || {})
const canAffordBuy = computed(() => currentPlayer.value && currentPlayer.value.money >= (buySpace.value.price || 0))

const infoSpace = computed(() => SPACES[store.modal.payload.si] || {})
const infoProp = computed(() => store.properties[store.modal.payload.si])

const isWide = computed(() => ['tradeUI', 'aiTradeProposal'].includes(store.modal.type))

const tradeMyProps = computed(() => store.getTradeableProperties(0))
function tradePartnerProps(i) { return store.getTradeableProperties(i) }
const tradePartnerTradeProps = computed(() => store.tradeState ? store.getTradeableProperties(store.tradeState.partner) : [])

const hasTradePartner = computed(() => {
  return store.players.some((pl, i) => {
    if (i === 0 || pl.isBankrupt) return false
    return tradePartnerProps(i).length > 0 || tradeMyProps.value.length > 0
  })
})

function propColor(si) {
  const sp = SPACES[si]
  if (sp.group) return GROUPS[sp.group].color
  if (sp.type === 'railroad') return '#555'
  return '#999'
}
</script>

<style scoped>
.modal-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 100; align-items: center; justify-content: center; }
.modal-overlay.show { display: flex; }
.modal { background: #16213e; border: 2px solid #e94560; border-radius: 12px; padding: 20px; max-width: 400px; width: 90%; }
.modal.wide { max-width: 520px; }
h2 { color: #e94560; margin-bottom: 10px; font-size: 18px; }
p { margin-bottom: 12px; font-size: 13px; line-height: 1.5; }
.btn-group { display: flex; gap: 8px; flex-wrap: wrap; }
.btn-group.vertical { flex-direction: column; }
.modal button { padding: 8px 16px; border: none; border-radius: 6px; font-size: 13px; font-weight: bold; cursor: pointer; }
.btn-yes { background: #2ecc71; color: white; }
.btn-no { background: #e74c3c; color: white; }
.btn-opt { background: #3498db; color: white; }
.cant-afford { color: #e74c3c; }
.mortgaged-label { color: #f39c12; }
.card-info { color: #9b59b6; }
.card-count { font-size: 11px; color: #888; }
.card-title { color: #9b59b6; }
.card-display { background: #0f3460; border: 2px solid #9b59b6; border-radius: 8px; padding: 14px; margin: 10px 0; text-align: center; }
.card-name { font-size: 16px; font-weight: bold; color: #e94560; margin-bottom: 6px; }
.card-desc { font-size: 13px; color: #ccc; }
.trade-columns { display: flex; gap: 16px; }
.trade-col { flex: 1; }
.give-title { color: #2ecc71; font-size: 13px; margin-bottom: 6px; }
.get-title { color: #e94560; font-size: 13px; margin-bottom: 6px; }
.trade-prop-label { display: flex; align-items: center; font-size: 11px; padding: 2px 0; cursor: pointer; gap: 4px; }
.no-trade-props { font-size: 11px; color: #666; }
.trade-cash { margin-top: 8px; font-size: 11px; }
.cash-input { width: 70px; background: #0f3460; color: white; border: 1px solid #444; padding: 3px 5px; border-radius: 3px; }
.trade-partner-btn { text-align: left; }
.partner-dot { display: inline-block; width: 12px; height: 12px; border-radius: 50%; vertical-align: middle; }
.no-options { font-size: 12px; color: #aaa; }
.ai-trade-prop { font-size: 12px; padding: 2px 0; }
.ai-trade-cash { font-size: 12px; margin-top: 4px; }
.ai-trade-cash.give { color: #2ecc71; }
.ai-trade-cash.want { color: #e94560; }
.nothing { font-size: 11px; color: #666; }
.info-body p { margin-bottom: 12px; font-size: 13px; line-height: 1.5; }
</style>
