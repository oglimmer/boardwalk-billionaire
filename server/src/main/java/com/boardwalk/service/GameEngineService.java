package com.boardwalk.service;

import com.boardwalk.model.*;
import org.springframework.stereotype.Service;

import java.util.*;

import static com.boardwalk.model.GameData.*;

@Service
public class GameEngineService {

    private final Random random = new Random();

    // === Init ===

    public void initGame(GameState state, List<Player> players) {
        state.getPlayers().clear();
        state.getPlayers().addAll(players);
        state.setCurrentPlayer(0);
        state.getProperties().clear();
        state.setDoublesCount(0);
        state.setPhase(GamePhase.ROLL);
        state.setLastDice(0, 0);
        state.setGameOver(false);
        state.setTurnCounter(0);
        state.getLastTradeAttempt().clear();
        state.setPendingInteraction(null);
        state.getWealthHistory().clear();
        state.getCardDeck().clear();
        state.getLogEntries().clear();
        state.setCenterInfo("Roll the dice to begin!");
        shuffleCardDeck(state);
        recordWealth(state, 0);
        state.log("Game started! " + players.get(0).getName() + " goes first. Roll the dice!");
    }

    // === Cards ===

    public void shuffleCardDeck(GameState state) {
        List<Integer> deck = state.getCardDeck();
        deck.clear();
        for (int i = 0; i < CARDS.length; i++) deck.add(i);
        Collections.shuffle(deck, random);
    }

    public void drawFortuneCard(GameState state, int pi) {
        if (state.getCardDeck().isEmpty()) shuffleCardDeck(state);
        int cardIdx = state.getCardDeck().removeLast();
        Card card = CARDS[cardIdx];
        Player p = state.getPlayers().get(pi);
        state.log(p.getName() + " draws Fortune: \"" + card.title() + "\"");

        if (p.isHuman()) {
            PendingInteraction pending = new PendingInteraction(PendingInteractionType.AWAITING_CARD_ACKNOWLEDGMENT, pi);
            pending.setCard(card);
            state.setPendingInteraction(pending);
        } else {
            executeCard(state, pi, card);
        }
    }

    public void executeCard(GameState state, int pi, Card card) {
        Player p = state.getPlayers().get(pi);
        switch (card.effect()) {
            case COLLECT -> {
                p.addMoney(card.amount());
                state.log(p.getName() + " collects $" + card.amount() + ".");
            }
            case PAY -> {
                p.subtractMoney(card.amount());
                state.log(p.getName() + " pays $" + card.amount() + ".");
                checkBankrupt(state, pi);
            }
            case COLLECT_FROM_ALL -> {
                int collected = 0;
                for (int oi = 0; oi < state.getPlayers().size(); oi++) {
                    if (oi != pi && !state.getPlayers().get(oi).isBankrupt()) {
                        state.getPlayers().get(oi).subtractMoney(card.amount());
                        collected += card.amount();
                        checkBankrupt(state, oi);
                    }
                }
                p.addMoney(collected);
                state.log(p.getName() + " collects $" + collected + " total from other players.");
            }
            case GO_TO_JAIL -> {
                goToJail(state, pi);
                state.setDoublesCount(0);
                state.log(p.getName() + " goes to Lockup!");
            }
            case ADVANCE_TO -> {
                int target = card.position();
                int oldPos = p.getPosition();
                if (target < oldPos) {
                    p.addMoney(200);
                    state.log(p.getName() + " passes GO and collects $200!");
                }
                p.setPosition(target);
                handleLanding(state, pi);
                return;
            }
            case GO_BACK -> {
                int newPos = p.getPosition() - card.amount();
                if (newPos < 0) newPos += 40;
                p.setPosition(newPos);
                state.log(p.getName() + " goes back " + card.amount() + " spaces to " + SPACES[newPos].name() + ".");
                handleLanding(state, pi);
                return;
            }
            case NEAREST_RAILROAD -> {
                int pos = p.getPosition();
                int target = -1;
                for (int r : RAILROAD_SPACES) {
                    if (r > pos) { target = r; break; }
                }
                if (target == -1) target = RAILROAD_SPACES[0];
                int oldPos = p.getPosition();
                if (target < oldPos) {
                    p.addMoney(200);
                    state.log(p.getName() + " passes GO and collects $200!");
                }
                p.setPosition(target);
                state.log(p.getName() + " advances to " + SPACES[target].name() + ".");
                OwnedProperty prop = state.getProperties().get(target);
                if (prop != null && prop.getOwner() != pi && !prop.isMortgaged() && !state.getPlayers().get(prop.getOwner()).isBankrupt()) {
                    int normalRent = calculateRent(state, target, state.getLastDice()[0] + state.getLastDice()[1]);
                    int doubleRent = normalRent * 2;
                    state.log(p.getName() + " pays double rent: $" + doubleRent + " to " + state.getPlayers().get(prop.getOwner()).getName() + "!");
                    p.subtractMoney(doubleRent);
                    state.getPlayers().get(prop.getOwner()).addMoney(doubleRent);
                    checkBankrupt(state, pi);
                } else if (prop == null) {
                    if (p.isHuman()) {
                        PendingInteraction pending = new PendingInteraction(PendingInteractionType.AWAITING_BUY_DECISION, pi);
                        pending.setSpaceIndex(target);
                        state.setPendingInteraction(pending);
                        return;
                    } else {
                        aiDecideBuy(state, pi, target);
                        return;
                    }
                }
            }
            case REPAIRS -> {
                int cost = 0;
                for (var entry : state.getProperties().entrySet()) {
                    if (entry.getValue().getOwner() != pi) continue;
                    if (entry.getValue().getHouses() == 5) cost += card.perHotel();
                    else if (entry.getValue().getHouses() > 0) cost += entry.getValue().getHouses() * card.perHouse();
                }
                if (cost > 0) {
                    p.subtractMoney(cost);
                    state.log(p.getName() + " pays $" + cost + " for repairs.");
                    checkBankrupt(state, pi);
                } else {
                    state.log(p.getName() + " has no buildings — no repair cost.");
                }
            }
        }
        state.setPhase(GamePhase.POST_ROLL);
        if (isDoubles(state) && !p.isInJail() && state.getDoublesCount() > 0 && p.isHuman() && !p.isBankrupt()) {
            state.log("Doubles! Roll again.");
            state.setPhase(GamePhase.ROLL);
        }
    }

    // === Dice / Movement ===

    public int[] rollDice(GameState state) {
        if (state.getPhase() != GamePhase.ROLL || state.isGameOver()) return null;
        int d1 = random.nextInt(6) + 1;
        int d2 = random.nextInt(6) + 1;
        state.setLastDice(d1, d2);
        Player p = state.getPlayers().get(state.getCurrentPlayer());
        boolean isDoubles = d1 == d2;

        if (p.isInJail()) {
            handleJailRoll(state, d1, d2, isDoubles);
            return new int[]{d1, d2};
        }
        if (isDoubles) {
            state.setDoublesCount(state.getDoublesCount() + 1);
            if (state.getDoublesCount() >= 3) {
                state.log(p.getName() + " rolled doubles 3 times - go to Lockup!");
                goToJail(state, state.getCurrentPlayer());
                state.setPhase(GamePhase.POST_ROLL);
                state.setDoublesCount(0);
                return new int[]{d1, d2};
            }
        } else {
            state.setDoublesCount(0);
        }
        int total = d1 + d2;
        state.log(p.getName() + " rolled " + d1 + "+" + d2 + " = " + total + (isDoubles ? " (doubles!)" : ""));
        movePlayer(state, state.getCurrentPlayer(), total);
        return new int[]{d1, d2};
    }

    public void handleJailRoll(GameState state, int d1, int d2, boolean isDoubles) {
        Player p = state.getPlayers().get(state.getCurrentPlayer());
        p.setJailTurns(p.getJailTurns() + 1);
        if (isDoubles) {
            state.log(p.getName() + " rolled doubles and gets out of Lockup!");
            p.setInJail(false);
            p.setJailTurns(0);
            state.setDoublesCount(0);
            movePlayer(state, state.getCurrentPlayer(), d1 + d2);
            return;
        }
        if (p.getJailTurns() >= 3) {
            state.log(p.getName() + " must pay $50 to leave Lockup.");
            p.subtractMoney(50);
            p.setInJail(false);
            p.setJailTurns(0);
            checkBankrupt(state, state.getCurrentPlayer());
            if (!p.isBankrupt()) {
                movePlayer(state, state.getCurrentPlayer(), d1 + d2);
            } else {
                state.setPhase(GamePhase.POST_ROLL);
            }
            return;
        }
        state.log(p.getName() + " rolled " + d1 + "+" + d2 + " - no doubles. Still in Lockup. (Turn " + p.getJailTurns() + "/3)");
        state.setPhase(GamePhase.POST_ROLL);
    }

    public void movePlayer(GameState state, int pi, int steps) {
        Player p = state.getPlayers().get(pi);
        int oldPos = p.getPosition();
        int newPos = (oldPos + steps) % 40;
        if (newPos < oldPos && newPos != 0) {
            p.addMoney(200);
            state.log(p.getName() + " passed Start and collects $200!");
        }
        if (oldPos + steps >= 40 && newPos == 0) {
            p.addMoney(200);
            state.log(p.getName() + " landed on Start and collects $200!");
        }
        p.setPosition(newPos);
        handleLanding(state, pi);
    }

    public void handleLanding(GameState state, int pi) {
        Player p = state.getPlayers().get(pi);
        Space sp = SPACES[p.getPosition()];
        int si = p.getPosition();
        state.setCenterInfo(p.getName() + " landed on " + sp.name());

        if (sp.type() == SpaceType.GO || sp.type() == SpaceType.FREE || sp.type() == SpaceType.JAIL) {
            state.setPhase(GamePhase.POST_ROLL);
            if (isDoubles(state) && !p.isInJail() && state.getDoublesCount() > 0 && p.isHuman()) {
                state.log("Doubles! Roll again.");
                state.setPhase(GamePhase.ROLL);
            }
            return;
        }
        if (sp.type() == SpaceType.CARD) {
            drawFortuneCard(state, pi);
            return;
        }
        if (sp.type() == SpaceType.GOTOJAIL) {
            state.log(p.getName() + " goes to Lockup!");
            goToJail(state, pi);
            state.setDoublesCount(0);
            state.setPhase(GamePhase.POST_ROLL);
            return;
        }
        if (sp.type() == SpaceType.TAX) {
            state.log(p.getName() + " pays $" + sp.amount() + " tax.");
            p.subtractMoney(sp.amount());
            checkBankrupt(state, pi);
            state.setPhase(GamePhase.POST_ROLL);
            if (isDoubles(state) && !p.isInJail() && state.getDoublesCount() > 0 && p.isHuman()) state.setPhase(GamePhase.ROLL);
            return;
        }

        OwnedProperty prop = state.getProperties().get(si);
        if (prop == null) {
            if (p.isHuman()) {
                PendingInteraction pending = new PendingInteraction(PendingInteractionType.AWAITING_BUY_DECISION, pi);
                pending.setSpaceIndex(si);
                state.setPendingInteraction(pending);
            } else {
                aiDecideBuy(state, pi, si);
            }
            return;
        }
        if (prop.getOwner() == pi || prop.isMortgaged()) {
            state.setPhase(GamePhase.POST_ROLL);
            if (isDoubles(state) && !p.isInJail() && state.getDoublesCount() > 0 && p.isHuman()) state.setPhase(GamePhase.ROLL);
            return;
        }
        int rent = calculateRent(state, si, state.getLastDice()[0] + state.getLastDice()[1]);
        Player owner = state.getPlayers().get(prop.getOwner());
        if (owner.isBankrupt()) {
            state.setPhase(GamePhase.POST_ROLL);
            if (isDoubles(state) && !p.isInJail() && state.getDoublesCount() > 0 && p.isHuman()) state.setPhase(GamePhase.ROLL);
            return;
        }
        state.log(p.getName() + " pays $" + rent + " rent to " + owner.getName() + " for " + sp.name() + ".");
        p.subtractMoney(rent);
        owner.addMoney(rent);
        checkBankrupt(state, pi);
        state.setPhase(GamePhase.POST_ROLL);
        if (isDoubles(state) && !p.isInJail() && state.getDoublesCount() > 0 && p.isHuman() && !p.isBankrupt()) state.setPhase(GamePhase.ROLL);
    }

    public int calculateRent(GameState state, int si, int diceTotal) {
        Space sp = SPACES[si];
        OwnedProperty prop = state.getProperties().get(si);
        if (prop == null || prop.isMortgaged()) return 0;
        if (sp.type() == SpaceType.RAILROAD) {
            int count = 0;
            for (int r : RAILROAD_SPACES) {
                OwnedProperty rp = state.getProperties().get(r);
                if (rp != null && rp.getOwner() == prop.getOwner()) count++;
            }
            return 25 * (int) Math.pow(2, count - 1);
        }
        if (sp.type() == SpaceType.UTILITY) {
            int count = 0;
            for (int u : UTILITY_SPACES) {
                OwnedProperty up = state.getProperties().get(u);
                if (up != null && up.getOwner() == prop.getOwner()) count++;
            }
            return (count == 1 ? 4 : 10) * diceTotal;
        }
        if (prop.getHouses() > 0) return sp.rent()[prop.getHouses()];
        Group group = GROUPS.get(sp.group());
        boolean hasMonopoly = true;
        for (int m : group.members()) {
            OwnedProperty mp = state.getProperties().get(m);
            if (mp == null || mp.getOwner() != prop.getOwner()) { hasMonopoly = false; break; }
        }
        return hasMonopoly ? sp.rent()[0] * 2 : sp.rent()[0];
    }

    public void goToJail(GameState state, int pi) {
        Player p = state.getPlayers().get(pi);
        p.setPosition(10);
        p.setInJail(true);
        p.setJailTurns(0);
    }

    public void checkBankrupt(GameState state, int pi) {
        Player p = state.getPlayers().get(pi);
        if (p.getMoney() >= 0) return;
        if (autoMortgage(state, pi)) return;
        p.setBankrupt(true);
        state.log(p.getName() + " is BANKRUPT!");
        state.getProperties().entrySet().removeIf(e -> e.getValue().getOwner() == pi);
        long alive = state.getPlayers().stream().filter(pl -> !pl.isBankrupt()).count();
        if (alive == 1) {
            Player winner = state.getPlayers().stream().filter(pl -> !pl.isBankrupt()).findFirst().orElseThrow();
            state.setGameOver(true);
            state.log(winner.getName() + " WINS THE GAME!");
            state.setCenterInfo(winner.getName() + " WINS!");
        }
    }

    public boolean autoMortgage(GameState state, int pi) {
        Player p = state.getPlayers().get(pi);
        while (p.getMoney() < 0) {
            boolean found = false;
            for (var entry : state.getProperties().entrySet()) {
                OwnedProperty prop = entry.getValue();
                if (prop.getOwner() == pi && !prop.isMortgaged() && prop.getHouses() == 0) {
                    int val = SPACES[entry.getKey()].price() / 2;
                    prop.setMortgaged(true);
                    p.addMoney(val);
                    state.log(p.getName() + " mortgages " + SPACES[entry.getKey()].name() + " for $" + val + ".");
                    found = true;
                    break;
                }
            }
            if (!found) {
                for (var entry : state.getProperties().entrySet()) {
                    OwnedProperty prop = entry.getValue();
                    if (prop.getOwner() == pi && prop.getHouses() > 0) {
                        Space sp = SPACES[entry.getKey()];
                        int hCost = GROUPS.get(sp.group()).houseCost();
                        int sellVal = hCost / 2;
                        prop.setHouses(prop.getHouses() - 1);
                        p.addMoney(sellVal);
                        state.log(p.getName() + " sells a house on " + sp.name() + " for $" + sellVal + ".");
                        found = true;
                        break;
                    }
                }
            }
            if (!found) break;
        }
        return p.getMoney() >= 0;
    }

    // === Turn Management ===

    public void endTurn(GameState state, int playerIndex) {
        if (state.getPhase() != GamePhase.POST_ROLL || state.isGameOver()) return;
        if (state.getCurrentPlayer() != playerIndex) return;
        nextPlayer(state);
    }

    public void nextPlayer(GameState state) {
        if (isDoubles(state) && !state.getPlayers().get(state.getCurrentPlayer()).isInJail() && state.getDoublesCount() > 0) {
            state.setPhase(GamePhase.ROLL);
            return;
        }
        state.setDoublesCount(0);
        state.setTurnCounter(state.getTurnCounter() + 1);
        int prevPlayer = state.getCurrentPlayer();
        do {
            state.setCurrentPlayer((state.getCurrentPlayer() + 1) % 4);
        } while (state.getPlayers().get(state.getCurrentPlayer()).isBankrupt());
        if (state.getCurrentPlayer() == 0 || (prevPlayer != 0 && state.getCurrentPlayer() < prevPlayer)) {
            recordWealth(state, (int) Math.ceil(state.getTurnCounter() / 4.0));
        }
        state.setPhase(GamePhase.ROLL);
    }

    // === Buy ===

    public void buyProperty(GameState state, int playerIndex, int si) {
        Space sp = SPACES[si];
        Player p = state.getPlayers().get(playerIndex);
        if (p.getMoney() < sp.price()) return;
        p.subtractMoney(sp.price());
        state.getProperties().put(si, new OwnedProperty(playerIndex));
        state.log(p.getName() + " bought " + sp.name() + " for $" + sp.price() + ".");
        state.setPendingInteraction(null);
        state.setPhase(GamePhase.POST_ROLL);
        if (isDoubles(state) && !p.isInJail() && state.getDoublesCount() > 0 && p.isHuman()) state.setPhase(GamePhase.ROLL);
    }

    public void declineBuy(GameState state, int playerIndex) {
        Player p = state.getPlayers().get(playerIndex);
        state.log(p.getName() + " passed on " + SPACES[p.getPosition()].name() + ".");
        state.setPendingInteraction(null);
        state.setPhase(GamePhase.POST_ROLL);
        if (isDoubles(state) && !p.isInJail() && state.getDoublesCount() > 0 && p.isHuman()) state.setPhase(GamePhase.ROLL);
    }

    // === Build / Mortgage (Human) ===

    public boolean humanBuild(GameState state, int playerIndex, int si) {
        Player p = state.getPlayers().get(playerIndex);
        OwnedProperty prop = state.getProperties().get(si);
        if (prop == null || prop.getOwner() != playerIndex) return false;
        Space sp = SPACES[si];
        if (sp.group() == null) return false;
        Group group = GROUPS.get(sp.group());
        if (p.getMoney() < group.houseCost()) return false;
        if (prop.getHouses() >= 5) return false;
        // Check monopoly
        for (int m : group.members()) {
            OwnedProperty mp = state.getProperties().get(m);
            if (mp == null || mp.getOwner() != playerIndex || mp.isMortgaged()) return false;
        }
        // Even build rule
        int minHouses = 5;
        for (int m : group.members()) {
            minHouses = Math.min(minHouses, state.getProperties().get(m).getHouses());
        }
        if (prop.getHouses() > minHouses) return false;

        prop.setHouses(prop.getHouses() + 1);
        p.subtractMoney(group.houseCost());
        String label = prop.getHouses() == 5 ? "a hotel" : "house #" + prop.getHouses();
        state.log(p.getName() + " builds " + label + " on " + sp.name() + " ($" + group.houseCost() + ").");
        return true;
    }

    public boolean humanSellHouse(GameState state, int playerIndex, int si) {
        OwnedProperty prop = state.getProperties().get(si);
        if (prop == null || prop.getOwner() != playerIndex || prop.getHouses() <= 0) return false;
        Space sp = SPACES[si];
        Group group = GROUPS.get(sp.group());
        // Even sell rule
        int maxHouses = 0;
        for (int m : group.members()) {
            maxHouses = Math.max(maxHouses, state.getProperties().get(m).getHouses());
        }
        if (prop.getHouses() < maxHouses) return false;

        int sellVal = group.houseCost() / 2;
        prop.setHouses(prop.getHouses() - 1);
        state.getPlayers().get(playerIndex).addMoney(sellVal);
        state.log(state.getPlayers().get(playerIndex).getName() + " sells a house on " + sp.name() + " for $" + sellVal + ".");
        return true;
    }

    public boolean humanMortgage(GameState state, int playerIndex, int si) {
        OwnedProperty prop = state.getProperties().get(si);
        if (prop == null || prop.getOwner() != playerIndex || prop.isMortgaged() || prop.getHouses() > 0) return false;
        Space sp = SPACES[si];
        int val = sp.price() / 2;
        prop.setMortgaged(true);
        state.getPlayers().get(playerIndex).addMoney(val);
        state.log(state.getPlayers().get(playerIndex).getName() + " mortgages " + sp.name() + " for $" + val + ".");
        return true;
    }

    public boolean humanUnmortgage(GameState state, int playerIndex, int si) {
        OwnedProperty prop = state.getProperties().get(si);
        if (prop == null || prop.getOwner() != playerIndex || !prop.isMortgaged()) return false;
        Space sp = SPACES[si];
        int cost = (int) (sp.price() / 2 * 1.1);
        if (state.getPlayers().get(playerIndex).getMoney() < cost) return false;
        prop.setMortgaged(false);
        state.getPlayers().get(playerIndex).subtractMoney(cost);
        state.log(state.getPlayers().get(playerIndex).getName() + " unmortgages " + sp.name() + " for $" + cost + ".");
        return true;
    }

    // === Jail ===

    public boolean payJailFee(GameState state, int playerIndex) {
        Player p = state.getPlayers().get(playerIndex);
        if (!p.isInJail() || state.getPhase() != GamePhase.ROLL || p.getMoney() < 50) return false;
        p.subtractMoney(50);
        p.setInJail(false);
        p.setJailTurns(0);
        state.log(p.getName() + " pays $50 to leave Lockup.");
        return true;
    }

    // === Wealth tracking ===

    public void recordWealth(GameState state, int round) {
        List<PlayerWealth> pData = new ArrayList<>();
        for (int i = 0; i < state.getPlayers().size(); i++) {
            Player p = state.getPlayers().get(i);
            int cash = p.isBankrupt() ? 0 : p.getMoney();
            int total = p.isBankrupt() ? 0 : getPlayerWealthTotal(state, i);
            pData.add(new PlayerWealth(cash, total));
        }
        int totalCash = 0;
        for (int i = 0; i < state.getPlayers().size(); i++) {
            if (!state.getPlayers().get(i).isBankrupt()) totalCash += pData.get(i).cash();
        }
        state.getWealthHistory().add(new WealthRecord(round, totalCash, pData));
    }

    public int getPlayerWealthTotal(GameState state, int pi) {
        int cash = state.getPlayers().get(pi).getMoney();
        int propValue = 0, buildValue = 0, mortgageDebt = 0;
        for (var entry : state.getProperties().entrySet()) {
            OwnedProperty prop = entry.getValue();
            if (prop.getOwner() != pi) continue;
            Space sp = SPACES[entry.getKey()];
            if (prop.isMortgaged()) {
                mortgageDebt += sp.price() / 2;
            } else {
                propValue += sp.price();
            }
            if (prop.getHouses() > 0 && sp.group() != null) {
                buildValue += prop.getHouses() * GROUPS.get(sp.group()).houseCost();
            }
        }
        return cash + propValue + buildValue + mortgageDebt;
    }

    // === Trade ===

    public boolean canTradeProperty(GameState state, int si) {
        OwnedProperty prop = state.getProperties().get(si);
        if (prop == null) return false;
        if (prop.getHouses() > 0) return false;
        Space sp = SPACES[si];
        if (sp.group() != null) {
            Group group = GROUPS.get(sp.group());
            for (int m : group.members()) {
                OwnedProperty mp = state.getProperties().get(m);
                if (mp != null && mp.getOwner() == prop.getOwner() && mp.getHouses() > 0) return false;
            }
        }
        return true;
    }

    public List<Integer> getTradeableProperties(GameState state, int pi) {
        List<Integer> result = new ArrayList<>();
        for (var entry : state.getProperties().entrySet()) {
            if (entry.getValue().getOwner() == pi && canTradeProperty(state, entry.getKey())) {
                result.add(entry.getKey());
            }
        }
        return result;
    }

    public int getPropertyStrategicValue(GameState state, int si, int forPlayer) {
        Space sp = SPACES[si];
        double value = sp.price();
        if (sp.group() != null) {
            Group group = GROUPS.get(sp.group());
            int owned = 0;
            for (int m : group.members()) {
                OwnedProperty mp = state.getProperties().get(m);
                if (mp != null && mp.getOwner() == forPlayer) owned++;
            }
            if (owned == group.members().length - 1) value *= 3;
            else if (owned >= 1) value *= 1.5;
        }
        if (sp.type() == SpaceType.RAILROAD) {
            int count = 0;
            for (int r : RAILROAD_SPACES) {
                OwnedProperty rp = state.getProperties().get(r);
                if (rp != null && rp.getOwner() == forPlayer) count++;
            }
            if (count >= 2) value *= 1.5;
        }
        if (sp.type() == SpaceType.UTILITY) {
            int count = 0;
            for (int u : UTILITY_SPACES) {
                OwnedProperty up = state.getProperties().get(u);
                if (up != null && up.getOwner() == forPlayer) count++;
            }
            if (count >= 1) value *= 1.3;
        }
        return (int) Math.round(value);
    }

    public void executeTrade(GameState state, int fromPlayer, int toPlayer,
                             List<Integer> fromProps, List<Integer> toProps,
                             int fromCash, int toCash) {
        for (int si : fromProps) state.getProperties().get(si).setOwner(toPlayer);
        for (int si : toProps) state.getProperties().get(si).setOwner(fromPlayer);
        state.getPlayers().get(fromPlayer).subtractMoney(fromCash);
        state.getPlayers().get(fromPlayer).addMoney(toCash);
        state.getPlayers().get(toPlayer).addMoney(fromCash);
        state.getPlayers().get(toPlayer).subtractMoney(toCash);

        List<String> fNames = fromProps.stream().map(si -> SPACES[si].name()).toList();
        List<String> tNames = toProps.stream().map(si -> SPACES[si].name()).toList();
        StringBuilder desc = new StringBuilder("Trade: " + state.getPlayers().get(fromPlayer).getName() + " gives");
        if (!fNames.isEmpty()) desc.append(" [").append(String.join(", ", fNames)).append("]");
        if (fromCash > 0) desc.append(!fNames.isEmpty() ? " +" : "").append(" $").append(fromCash);
        if (fNames.isEmpty() && fromCash == 0) desc.append(" nothing");
        desc.append(" ↔ gets");
        if (!tNames.isEmpty()) desc.append(" [").append(String.join(", ", tNames)).append("]");
        if (toCash > 0) desc.append(!tNames.isEmpty() ? " +" : "").append(" $").append(toCash);
        if (tNames.isEmpty() && toCash == 0) desc.append(" nothing");
        state.log(desc.toString());
    }

    public void submitHumanTrade(GameState state, int humanPlayer, int partner,
                                  List<Integer> myProps, List<Integer> theirProps,
                                  int myCash, int theirCash) {
        if (myProps.isEmpty() && theirProps.isEmpty() && myCash == 0 && theirCash == 0) return;
        Player partnerPlayer = state.getPlayers().get(partner);

        if (partnerPlayer.isHuman()) {
            // Human-to-human trade: create pending interaction for the target
            PendingInteraction pending = new PendingInteraction(PendingInteractionType.AWAITING_TRADE_RESPONSE, partner);
            PendingAiTrade trade = new PendingAiTrade(humanPlayer, myProps, theirProps, myCash, theirCash);
            pending.setAiTrade(trade);
            state.setPendingInteraction(pending);
        } else {
            // Human-to-AI trade: AI decides immediately
            boolean accepted = aiWouldAcceptTrade(state, partner, myProps, theirProps, myCash, theirCash, humanPlayer);
            if (accepted) {
                executeTrade(state, humanPlayer, partner, myProps, theirProps, myCash, theirCash);
                state.log(partnerPlayer.getName() + " accepted the trade!");
            } else {
                state.log(partnerPlayer.getName() + " declined the trade offer.");
            }
        }
    }

    public void acceptTradeProposal(GameState state, int respondingPlayer) {
        PendingInteraction pending = state.getPendingInteraction();
        if (pending == null || pending.getType() != PendingInteractionType.AWAITING_TRADE_RESPONSE) return;
        if (pending.getTargetPlayer() != respondingPlayer) return;
        PendingAiTrade trade = pending.getAiTrade();
        executeTrade(state, trade.getAiPlayer(), respondingPlayer,
                trade.getOfferedProps(), trade.getWantedProps(),
                trade.getOfferedCash(), trade.getWantedCash());
        state.log(state.getPlayers().get(respondingPlayer).getName() + " accepted the trade!");
        state.setPendingInteraction(null);
    }

    public void declineTradeProposal(GameState state, int respondingPlayer) {
        PendingInteraction pending = state.getPendingInteraction();
        if (pending == null || pending.getType() != PendingInteractionType.AWAITING_TRADE_RESPONSE) return;
        if (pending.getTargetPlayer() != respondingPlayer) return;
        state.log(state.getPlayers().get(respondingPlayer).getName() + " declined the trade offer.");
        state.setPendingInteraction(null);
    }

    // === AI helpers (used by both engine and AI service) ===

    public void aiDecideBuy(GameState state, int pi, int si) {
        Space sp = SPACES[si];
        Player p = state.getPlayers().get(pi);
        int buffer = 200;
        boolean wantsToBuy = p.getMoney() >= sp.price() + buffer;

        if (sp.group() != null) {
            Group group = GROUPS.get(sp.group());
            int owned = 0;
            for (int m : group.members()) {
                OwnedProperty mp = state.getProperties().get(m);
                if (mp != null && mp.getOwner() == pi) owned++;
            }
            if (owned == group.members().length - 1) {
                wantsToBuy = p.getMoney() >= sp.price() + 50;
            }
        }
        if ((sp.type() == SpaceType.RAILROAD || sp.type() == SpaceType.UTILITY) && p.getMoney() >= sp.price() + 100) {
            wantsToBuy = true;
        }
        if (wantsToBuy) {
            p.subtractMoney(sp.price());
            state.getProperties().put(si, new OwnedProperty(pi));
            state.log(p.getName() + " bought " + sp.name() + " for $" + sp.price() + ".");
        } else {
            state.log(p.getName() + " passed on " + sp.name() + ".");
        }
        state.setPhase(GamePhase.POST_ROLL);
    }

    public boolean aiWouldAcceptTrade(GameState state, int aiPlayer,
                                       List<Integer> propsFromHuman, List<Integer> propsFromAi,
                                       int cashFromHuman, int cashFromAi, int proposer) {
        double receiveVal = cashFromHuman;
        double giveVal = cashFromAi;
        for (int si : propsFromHuman) receiveVal += getPropertyStrategicValue(state, si, aiPlayer);
        for (int si : propsFromAi) giveVal += getPropertyStrategicValue(state, si, aiPlayer);

        boolean opponentGetsMonopoly = false;
        boolean aiGetsMonopoly = false;
        for (var groupEntry : GROUPS.entrySet()) {
            Group group = groupEntry.getValue();
            boolean oppComplete = true;
            boolean oppHadIt = true;
            boolean aiComplete = true;
            boolean aiHadIt = true;
            for (int m : group.members()) {
                // opponent monopoly check
                boolean oppOwnsAfter = propsFromAi.contains(m) ||
                    (!propsFromHuman.contains(m) && state.getProperties().get(m) != null && state.getProperties().get(m).getOwner() == proposer);
                if (!oppOwnsAfter) oppComplete = false;
                boolean oppOwnsBefore = state.getProperties().get(m) != null && state.getProperties().get(m).getOwner() == proposer;
                if (!oppOwnsBefore) oppHadIt = false;

                // ai monopoly check
                boolean aiOwnsAfter = propsFromHuman.contains(m) ||
                    (!propsFromAi.contains(m) && state.getProperties().get(m) != null && state.getProperties().get(m).getOwner() == aiPlayer);
                if (!aiOwnsAfter) aiComplete = false;
                boolean aiOwnsBefore = state.getProperties().get(m) != null && state.getProperties().get(m).getOwner() == aiPlayer;
                if (!aiOwnsBefore) aiHadIt = false;
            }
            if (oppComplete && !oppHadIt) opponentGetsMonopoly = true;
            if (aiComplete && !aiHadIt) aiGetsMonopoly = true;
        }
        if (opponentGetsMonopoly && !aiGetsMonopoly) giveVal *= 2.5;
        if (aiGetsMonopoly && !opponentGetsMonopoly) receiveVal *= 1.5;
        if (aiGetsMonopoly && opponentGetsMonopoly) giveVal *= 1.1;
        return receiveVal >= giveVal * 0.85;
    }

    // === Helpers ===

    private boolean isDoubles(GameState state) {
        return state.getLastDice()[0] == state.getLastDice()[1];
    }
}
