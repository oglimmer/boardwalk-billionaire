package com.boardwalk.service;

import com.boardwalk.dto.*;
import com.boardwalk.model.*;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class SessionManager {

    private final ConcurrentHashMap<String, GameSession> sessions = new ConcurrentHashMap<>();
    private final Random random = new Random();

    public GameSession createGame(String hostSessionId, String hostName, int humanSlots) {
        String code = generateCode();
        GameSession session = new GameSession(code, hostSessionId, hostName, humanSlots);
        sessions.put(code, session);
        return session;
    }

    public GameSession joinGame(String gameCode, String sessionId, String playerName) {
        GameSession session = sessions.get(gameCode);
        if (session == null) return null;
        synchronized (session) {
            if (session.isStarted() || session.isFull()) return null;
            session.getSessionNames().put(sessionId, playerName);
        }
        return session;
    }

    public GameSession getSession(String gameCode) {
        return sessions.get(gameCode);
    }

    public List<LobbyResponse> listOpenGames() {
        List<LobbyResponse> result = new ArrayList<>();
        for (GameSession s : sessions.values()) {
            if (!s.isStarted() && !s.isFull()) {
                result.add(toLobbyResponse(s));
            }
        }
        return result;
    }

    public LobbyResponse toLobbyResponse(GameSession session) {
        return new LobbyResponse(
            session.getGameCode(),
            session.getHumanSlots(),
            session.getJoinedCount(),
            new ArrayList<>(session.getSessionNames().values()),
            session.isStarted()
        );
    }

    public String findGameCodeBySessionId(String sessionId) {
        for (var entry : sessions.entrySet()) {
            GameSession session = entry.getValue();
            if (session.getSessionNames().containsKey(sessionId)) {
                return entry.getKey();
            }
        }
        return null;
    }

    public Collection<GameSession> getAllSessions() {
        return sessions.values();
    }

    public void removeSession(String gameCode) {
        sessions.remove(gameCode);
    }

    private String generateCode() {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        StringBuilder sb = new StringBuilder(6);
        for (int i = 0; i < 6; i++) {
            sb.append(chars.charAt(random.nextInt(chars.length())));
        }
        String code = sb.toString();
        if (sessions.containsKey(code)) return generateCode();
        return code;
    }
}
