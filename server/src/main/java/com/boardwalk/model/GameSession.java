package com.boardwalk.model;

import lombok.Getter;
import lombok.Setter;

import java.util.*;

@Getter
public class GameSession {
    private final String gameCode;
    private final String hostSessionId;
    private final int humanSlots;
    private final Map<Integer, String> playerSessions = new LinkedHashMap<>();
    private final Map<String, String> sessionNames = new LinkedHashMap<>();
    @Setter private GameState gameState;
    @Setter private boolean started = false;

    public GameSession(String gameCode, String hostSessionId, String hostName, int humanSlots) {
        this.gameCode = gameCode;
        this.hostSessionId = hostSessionId;
        this.humanSlots = humanSlots;
        this.sessionNames.put(hostSessionId, hostName);
    }

    public int getJoinedCount() {
        return sessionNames.size();
    }

    public boolean isFull() {
        return sessionNames.size() >= humanSlots;
    }

    public Integer getPlayerIndexForSession(String sessionId) {
        for (var entry : playerSessions.entrySet()) {
            if (entry.getValue().equals(sessionId)) {
                return entry.getKey();
            }
        }
        return null;
    }
}
