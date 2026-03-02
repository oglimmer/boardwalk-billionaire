package com.boardwalk.service;

import com.boardwalk.model.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

import static com.boardwalk.model.GameData.*;

@Service
@RequiredArgsConstructor
public class AiService {

    private final GameEngineService engine;

    /**
     * Execute a full AI turn: build, maybe pay jail fee, then roll.
     * Returns true if the AI's turn resulted in a pending interaction
     * (e.g. AI-to-human trade proposal) that requires human response before continuing.
     */
    public boolean aiTurn(GameState state) {
        if (state.isGameOver()) return false;
        Player p = state.getPlayers().get(state.getCurrentPlayer());
        if (p.isBankrupt()) {
            engine.nextPlayer(state);
            return false;
        }

        aiBuild(state, state.getCurrentPlayer());

        if (p.isInJail() && p.getMoney() > 200 && p.getJailTurns() < 3) {
            int totalProps = 0;
            for (var prop : state.getProperties().values()) {
                if (prop.getOwner() != state.getCurrentPlayer()) totalProps++;
            }
            if (totalProps < 15 || p.getMoney() > 500) {
                p.subtractMoney(50);
                p.setInJail(false);
                p.setJailTurns(0);
                state.log(p.getName() + " pays $50 to leave Lockup.");
            }
        }
        engine.rollDice(state);
        return false;
    }

    /**
     * AI post-roll logic: build, unmortgage, consider trades, then finish.
     * Returns true if waiting on human for trade response.
     */
    public boolean aiPostRoll(GameState state) {
        if (state.isGameOver()) return false;
        aiBuild(state, state.getCurrentPlayer());
        aiUnmortgage(state, state.getCurrentPlayer());
        boolean tradePaused = aiConsiderTrades(state, state.getCurrentPlayer());
        if (tradePaused) return true;
        return finishAiPostRoll(state);
    }

    /**
     * Finish AI post-roll: check doubles, then advance to next player.
     * Returns true if AI gets another turn (doubles) and needs scheduling.
     */
    public boolean finishAiPostRoll(GameState state) {
        int[] dice = state.getLastDice();
        if (dice[0] == dice[1] && !state.getPlayers().get(state.getCurrentPlayer()).isInJail() && state.getDoublesCount() > 0) {
            state.setPhase(GamePhase.ROLL);
            return true; // AI needs another turn
        } else {
            engine.nextPlayer(state);
            return !state.getPlayers().get(state.getCurrentPlayer()).isHuman(); // true if next is also AI
        }
    }

    public void aiBuild(GameState state, int pi) {
        Player p = state.getPlayers().get(pi);
        boolean built = true;
        while (built) {
            built = false;
            for (var groupEntry : GROUPS.entrySet()) {
                Group group = groupEntry.getValue();
                boolean hasMonopoly = true;
                for (int m : group.members()) {
                    OwnedProperty mp = state.getProperties().get(m);
                    if (mp == null || mp.getOwner() != pi || mp.isMortgaged()) { hasMonopoly = false; break; }
                }
                if (!hasMonopoly) continue;
                int minHouses = 5;
                for (int m : group.members()) {
                    minHouses = Math.min(minHouses, state.getProperties().get(m).getHouses());
                }
                if (minHouses >= 5) continue;
                for (int m : group.members()) {
                    if (state.getProperties().get(m).getHouses() == minHouses && p.getMoney() >= group.houseCost() + 100) {
                        OwnedProperty prop = state.getProperties().get(m);
                        prop.setHouses(prop.getHouses() + 1);
                        p.subtractMoney(group.houseCost());
                        String label = prop.getHouses() == 5 ? "a hotel" : "house #" + prop.getHouses();
                        state.log(p.getName() + " builds " + label + " on " + SPACES[m].name() + " ($" + group.houseCost() + ").");
                        built = true;
                        break;
                    }
                }
                if (built) break;
            }
        }
    }

    public void aiUnmortgage(GameState state, int pi) {
        Player p = state.getPlayers().get(pi);
        for (var entry : state.getProperties().entrySet()) {
            OwnedProperty prop = entry.getValue();
            if (prop.getOwner() == pi && prop.isMortgaged()) {
                int cost = (int) (SPACES[entry.getKey()].price() / 2 * 1.1);
                if (p.getMoney() >= cost + 200) {
                    prop.setMortgaged(false);
                    p.subtractMoney(cost);
                    state.log(p.getName() + " unmortgages " + SPACES[entry.getKey()].name() + " for $" + cost + ".");
                }
            }
        }
    }

    /**
     * Returns true if a trade proposal was sent to a human player (needs to wait for response).
     */
    public boolean aiConsiderTrades(GameState state, int pi) {
        Player p = state.getPlayers().get(pi);
        if (p.isBankrupt() || p.getMoney() < 100) return false;
        Integer lastAttempt = state.getLastTradeAttempt().get(pi);
        if (lastAttempt != null && state.getTurnCounter() - lastAttempt < 5) return false;

        for (var groupEntry : GROUPS.entrySet()) {
            Group group = groupEntry.getValue();
            List<Integer> aiOwned = new ArrayList<>();
            for (int m : group.members()) {
                OwnedProperty mp = state.getProperties().get(m);
                if (mp != null && mp.getOwner() == pi) aiOwned.add(m);
            }
            if (aiOwned.size() != group.members().length - 1) continue;
            Integer missing = null;
            for (int m : group.members()) {
                OwnedProperty mp = state.getProperties().get(m);
                if (mp == null || mp.getOwner() != pi) { missing = m; break; }
            }
            if (missing == null || state.getProperties().get(missing) == null) continue;
            if (!engine.canTradeProperty(state, missing)) continue;
            int targetOwner = state.getProperties().get(missing).getOwner();
            if (state.getPlayers().get(targetOwner).isBankrupt()) continue;
            state.getLastTradeAttempt().put(pi, state.getTurnCounter());

            final int missingProp = missing;
            List<Integer> expendable = engine.getTradeableProperties(state, pi).stream()
                .filter(si -> {
                    Space sp = SPACES[si];
                    if (sp.group() == null) return true;
                    Group grp = GROUPS.get(sp.group());
                    long ownedCount = 0;
                    for (int m : grp.members()) {
                        OwnedProperty mp = state.getProperties().get(m);
                        if (mp != null && mp.getOwner() == pi) ownedCount++;
                    }
                    if (ownedCount == grp.members().length) return false;
                    if (ownedCount >= grp.members().length - 1) return false;
                    return true;
                })
                .collect(Collectors.toList());

            for (int offSi : expendable) {
                int targetLoss = engine.getPropertyStrategicValue(state, missingProp, targetOwner);
                int targetGain = engine.getPropertyStrategicValue(state, offSi, targetOwner);
                int cashSweetener = Math.max(0, (int) Math.round(targetLoss * 0.85 - targetGain));
                cashSweetener = Math.min(cashSweetener, p.getMoney() - 200);
                if (cashSweetener < 0) continue;
                if (engine.aiWouldAcceptTrade(state, targetOwner, List.of(offSi), List.of(missingProp), cashSweetener, 0, pi)) {
                    if (state.getPlayers().get(targetOwner).isHuman()) {
                        PendingInteraction pending = new PendingInteraction(PendingInteractionType.AWAITING_TRADE_RESPONSE, targetOwner);
                        PendingAiTrade trade = new PendingAiTrade(pi, List.of(offSi), List.of(missingProp), cashSweetener, 0);
                        pending.setAiTrade(trade);
                        state.setPendingInteraction(pending);
                        return true;
                    } else {
                        engine.executeTrade(state, pi, targetOwner, List.of(offSi), List.of(missingProp), cashSweetener, 0);
                        return false;
                    }
                }
            }

            // Try cash-only offer
            int targetLoss = engine.getPropertyStrategicValue(state, missingProp, targetOwner);
            int cashOffer = (int) Math.round(targetLoss * 1.3);
            cashOffer = Math.min(cashOffer, p.getMoney() - 200);
            if (cashOffer > 0 && engine.aiWouldAcceptTrade(state, targetOwner, List.of(), List.of(missingProp), cashOffer, 0, pi)) {
                if (state.getPlayers().get(targetOwner).isHuman()) {
                    PendingInteraction pending = new PendingInteraction(PendingInteractionType.AWAITING_TRADE_RESPONSE, targetOwner);
                    PendingAiTrade trade = new PendingAiTrade(pi, List.of(), List.of(missingProp), cashOffer, 0);
                    pending.setAiTrade(trade);
                    state.setPendingInteraction(pending);
                    return true;
                } else {
                    engine.executeTrade(state, pi, targetOwner, List.of(), List.of(missingProp), cashOffer, 0);
                    return false;
                }
            }
        }
        return false;
    }
}
