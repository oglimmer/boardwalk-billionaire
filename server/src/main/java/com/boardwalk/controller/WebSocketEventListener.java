package com.boardwalk.controller;

import com.boardwalk.model.GameSession;
import com.boardwalk.service.SessionManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketEventListener {

    private final SessionManager sessionManager;
    private final SimpMessagingTemplate messaging;

    @EventListener
    public void handleDisconnect(SessionDisconnectEvent event) {
        String sessionId = event.getSessionId();
        String gameCode = sessionManager.findGameCodeBySessionId(sessionId);
        if (gameCode == null) return;

        GameSession session = sessionManager.getSession(gameCode);
        if (session == null) return;

        synchronized (session) {
            if (!session.isStarted()) {
                // Remove from lobby
                session.getSessionNames().remove(sessionId);
                if (session.getSessionNames().isEmpty()) {
                    sessionManager.removeSession(gameCode);
                    return;
                }
                messaging.convertAndSend("/topic/game/" + gameCode + "/lobby",
                    sessionManager.toLobbyResponse(session));
            } else {
                // Game in progress: mark player as disconnected (convert to AI)
                Integer playerIdx = session.getPlayerIndexForSession(sessionId);
                if (playerIdx != null) {
                    session.getGameState().getPlayers().get(playerIdx).setHuman(false);
                    session.getGameState().getPlayers().get(playerIdx).setName(
                        session.getGameState().getPlayers().get(playerIdx).getName() + " (DC)");
                    session.getPlayerSessions().entrySet().removeIf(e -> e.getValue().equals(sessionId));
                    log.info("Player {} disconnected from game {}, converted to AI", playerIdx, gameCode);
                }
            }
        }
    }
}
