package com.boardwalk.model;

import lombok.Getter;
import lombok.Setter;

import java.util.*;

@Getter
@Setter
public class GameState {
    private List<Player> players = new ArrayList<>();
    private int currentPlayer = 0;
    private Map<Integer, OwnedProperty> properties = new HashMap<>();
    private int doublesCount = 0;
    private GamePhase phase = GamePhase.ROLL;
    private int[] lastDice = {0, 0};
    private boolean gameOver = false;
    private int turnCounter = 0;
    private Map<Integer, Integer> lastTradeAttempt = new HashMap<>();
    private PendingInteraction pendingInteraction;
    private List<WealthRecord> wealthHistory = new ArrayList<>();
    private List<Integer> cardDeck = new ArrayList<>();
    private List<String> logEntries = new ArrayList<>();
    private String centerInfo = "Roll the dice to begin!";

    public void setLastDice(int d1, int d2) { this.lastDice = new int[]{d1, d2}; }

    public void log(String msg) {
        logEntries.add(0, msg);
    }
}
