package com.boardwalk.controller;

import com.boardwalk.dto.*;
import com.boardwalk.model.*;
import com.boardwalk.service.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.*;
import java.util.concurrent.*;

@Slf4j
@Controller
@RequiredArgsConstructor
public class GameWebSocketController {

    private final SessionManager sessionManager;
    private final GameEngineService engine;
    private final AiService aiService;
    private final GameStateDtoMapper mapper;
    private final SimpMessagingTemplate messaging;
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(4);

    @MessageMapping("/game/{gameCode}/join")
    public void joinGame(@DestinationVariable String gameCode, SimpMessageHeaderAccessor headerAccessor,
                         Map<String, String> payload) {
        String sessionId = headerAccessor.getSessionId();
        String playerName = payload.get("playerName");
        GameSession session = sessionManager.getSession(gameCode);
        if (session == null) return;

        synchronized (session) {
            // Associate the STOMP session ID with this player name
            // Replace the temp HTTP session ID with the real one
            String tempId = null;
            for (var entry : session.getSessionNames().entrySet()) {
                if (entry.getValue().equals(playerName) && entry.getKey().startsWith("http-")) {
                    tempId = entry.getKey();
                    break;
                }
            }
            if (tempId != null) {
                session.getSessionNames().remove(tempId);
                session.getSessionNames().put(sessionId, playerName);
            } else if (!session.isFull() && !session.isStarted()) {
                session.getSessionNames().put(sessionId, playerName);
            }
        }

        // Broadcast lobby update
        messaging.convertAndSend("/topic/game/" + gameCode + "/lobby",
            sessionManager.toLobbyResponse(session));
    }

    @MessageMapping("/game/{gameCode}/start")
    public void startGame(@DestinationVariable String gameCode, SimpMessageHeaderAccessor headerAccessor) {
        String sessionId = headerAccessor.getSessionId();
        GameSession session = sessionManager.getSession(gameCode);
        if (session == null) return;

        synchronized (session) {
            if (session.isStarted()) return;
            // Only host can start
            if (!session.getSessionNames().containsKey(sessionId)) return;
            // Check if the session ID is the first one (host)
            String firstSessionId = session.getSessionNames().keySet().iterator().next();
            if (!firstSessionId.equals(sessionId)) return;

            session.setStarted(true);

            // Build player list: humans first, then AI
            List<Player> players = new ArrayList<>();
            int playerIdx = 0;
            for (var entry : session.getSessionNames().entrySet()) {
                session.getPlayerSessions().put(playerIdx, entry.getKey());
                players.add(new Player(entry.getValue(), 1500, true));
                playerIdx++;
            }
            String[] aiNames = {"Bot Alice", "Bot Bob", "Bot Carol", "Bot Diana"};
            int aiIdx = 0;
            while (players.size() < 4) {
                players.add(new Player(aiNames[aiIdx++], 1500, false));
            }

            GameState state = new GameState();
            engine.initGame(state, players);
            session.setGameState(state);
        }

        // Broadcast lobby update with started=true so clients transition to game screen
        messaging.convertAndSend("/topic/game/" + gameCode + "/lobby",
            sessionManager.toLobbyResponse(session));

        broadcastState(session);

        // If first player is AI, start AI turns
        scheduleAiIfNeeded(session);
    }

    @MessageMapping("/game/{gameCode}/action")
    public void handleAction(@DestinationVariable String gameCode, SimpMessageHeaderAccessor headerAccessor,
                              PlayerActionDto action) {
        String sessionId = headerAccessor.getSessionId();
        GameSession session = sessionManager.getSession(gameCode);
        if (session == null || !session.isStarted()) return;

        synchronized (session) {
            GameState state = session.getGameState();
            if (state.isGameOver()) return;

            Integer playerIndex = session.getPlayerIndexForSession(sessionId);
            if (playerIndex == null) return;

            switch (action.type()) {
                case "ROLL_DICE" -> {
                    if (state.getCurrentPlayer() != playerIndex) return;
                    if (state.getPendingInteraction() != null) return;
                    engine.rollDice(state);
                }
                case "BUY_PROPERTY" -> {
                    PendingInteraction pending = state.getPendingInteraction();
                    if (pending == null || pending.getType() != PendingInteractionType.AWAITING_BUY_DECISION) return;
                    if (pending.getTargetPlayer() != playerIndex) return;
                    engine.buyProperty(state, playerIndex, pending.getSpaceIndex());
                }
                case "DECLINE_BUY" -> {
                    PendingInteraction pending = state.getPendingInteraction();
                    if (pending == null || pending.getType() != PendingInteractionType.AWAITING_BUY_DECISION) return;
                    if (pending.getTargetPlayer() != playerIndex) return;
                    engine.declineBuy(state, playerIndex);
                }
                case "ACKNOWLEDGE_CARD" -> {
                    PendingInteraction pending = state.getPendingInteraction();
                    if (pending == null || pending.getType() != PendingInteractionType.AWAITING_CARD_ACKNOWLEDGMENT) return;
                    if (pending.getTargetPlayer() != playerIndex) return;
                    Card card = pending.getCard();
                    state.setPendingInteraction(null);
                    engine.executeCard(state, playerIndex, card);
                }
                case "END_TURN" -> {
                    if (state.getPendingInteraction() != null) return;
                    engine.endTurn(state, playerIndex);
                }
                case "PAY_JAIL_FEE" -> {
                    if (state.getCurrentPlayer() != playerIndex) return;
                    engine.payJailFee(state, playerIndex);
                }
                case "BUILD_HOUSE" -> {
                    if (!canDoFreeBuildAction(state, playerIndex)) return;
                    engine.humanBuild(state, playerIndex, action.getInt("si"));
                }
                case "SELL_HOUSE" -> {
                    if (!canDoFreeBuildAction(state, playerIndex)) return;
                    engine.humanSellHouse(state, playerIndex, action.getInt("si"));
                }
                case "MORTGAGE" -> {
                    if (!canDoFreeBuildAction(state, playerIndex)) return;
                    engine.humanMortgage(state, playerIndex, action.getInt("si"));
                }
                case "UNMORTGAGE" -> {
                    if (!canDoFreeBuildAction(state, playerIndex)) return;
                    engine.humanUnmortgage(state, playerIndex, action.getInt("si"));
                }
                case "SUBMIT_TRADE" -> {
                    if (!canDoFreeBuildAction(state, playerIndex)) return;
                    int partner = action.getInt("partner");
                    List<Integer> myProps = action.getIntList("myProps");
                    List<Integer> theirProps = action.getIntList("theirProps");
                    int myCash = action.getInt("myCash");
                    int theirCash = action.getInt("theirCash");
                    engine.submitHumanTrade(state, playerIndex, partner, myProps, theirProps, myCash, theirCash);
                }
                case "ACCEPT_TRADE" -> {
                    engine.acceptTradeProposal(state, playerIndex);
                }
                case "DECLINE_TRADE" -> {
                    engine.declineTradeProposal(state, playerIndex);
                }
                default -> {
                    log.warn("Unknown action type: {}", action.type());
                    return;
                }
            }
        }

        broadcastState(session);
        scheduleAiIfNeeded(session);
    }

    private boolean canDoFreeBuildAction(GameState state, int playerIndex) {
        if (state.getCurrentPlayer() != playerIndex) return false;
        if (state.getPendingInteraction() != null) return false;
        return state.getPlayers().get(playerIndex).isHuman();
    }

    private void broadcastState(GameSession session) {
        GameState state = session.getGameState();
        for (var entry : session.getPlayerSessions().entrySet()) {
            int playerIdx = entry.getKey();
            String stompSessionId = entry.getValue();
            GameStateDto dto = mapper.toDto(state, playerIdx);
            SimpMessageHeaderAccessor headers = SimpMessageHeaderAccessor.create();
            headers.setSessionId(stompSessionId);
            headers.setLeaveMutable(true);
            messaging.convertAndSendToUser(stompSessionId, "/queue/game-state", dto,
                headers.getMessageHeaders());
        }
    }

    private void scheduleAiIfNeeded(GameSession session) {
        GameState state = session.getGameState();
        if (state.isGameOver()) return;
        if (state.getPendingInteraction() != null) return;

        Player current = state.getPlayers().get(state.getCurrentPlayer());
        if (!current.isHuman() && !current.isBankrupt()) {
            scheduler.schedule(() -> runAiTurn(session), 700, TimeUnit.MILLISECONDS);
        }
    }

    private void runAiTurn(GameSession session) {
        synchronized (session) {
            GameState state = session.getGameState();
            if (state.isGameOver()) return;
            Player current = state.getPlayers().get(state.getCurrentPlayer());
            if (current.isHuman() || current.isBankrupt()) return;

            if (state.getPhase() == GamePhase.ROLL) {
                aiService.aiTurn(state);
            } else {
                aiService.aiPostRoll(state);
            }
        }

        broadcastState(session);

        // Check if we need to continue AI or wait for human
        GameState state = session.getGameState();
        if (state.isGameOver()) return;

        if (state.getPendingInteraction() != null) {
            // AI proposed trade to human, wait for response
            return;
        }

        Player current = state.getPlayers().get(state.getCurrentPlayer());
        if (!current.isHuman() && !current.isBankrupt()) {
            // More AI turns needed
            scheduler.schedule(() -> runAiTurn(session), 700, TimeUnit.MILLISECONDS);
        }
    }

}
