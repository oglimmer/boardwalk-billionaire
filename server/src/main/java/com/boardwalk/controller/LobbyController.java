package com.boardwalk.controller;

import com.boardwalk.dto.*;
import com.boardwalk.model.GameSession;
import com.boardwalk.service.SessionManager;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/lobby")
@RequiredArgsConstructor
public class LobbyController {

    private final SessionManager sessionManager;

    @PostMapping("/create")
    public ResponseEntity<LobbyResponse> createGame(@RequestBody CreateGameRequest request) {
        if (request.humanSlots() < 1 || request.humanSlots() > 4) {
            return ResponseEntity.badRequest().build();
        }
        if (request.playerName() == null || request.playerName().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        // We use a placeholder session ID here; the real WebSocket session ID
        // will be associated when the player connects via STOMP
        String tempSessionId = "http-" + System.nanoTime();
        GameSession session = sessionManager.createGame(tempSessionId, request.playerName(), request.humanSlots());
        return ResponseEntity.ok(sessionManager.toLobbyResponse(session));
    }

    @PostMapping("/join")
    public ResponseEntity<LobbyResponse> joinGame(@RequestBody JoinGameRequest request) {
        if (request.gameCode() == null || request.playerName() == null || request.playerName().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        String tempSessionId = "http-" + System.nanoTime();
        GameSession session = sessionManager.joinGame(request.gameCode().toUpperCase(), tempSessionId, request.playerName());
        if (session == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(sessionManager.toLobbyResponse(session));
    }

    @GetMapping("/games")
    public ResponseEntity<List<LobbyResponse>> listGames() {
        return ResponseEntity.ok(sessionManager.listOpenGames());
    }

    @GetMapping("/game/{gameCode}")
    public ResponseEntity<LobbyResponse> getGame(@PathVariable String gameCode) {
        GameSession session = sessionManager.getSession(gameCode.toUpperCase());
        if (session == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(sessionManager.toLobbyResponse(session));
    }

    @GetMapping("/can-rejoin")
    public ResponseEntity<Void> canRejoin(@RequestParam String gameCode, @RequestParam String playerName) {
        GameSession session = sessionManager.getSession(gameCode.toUpperCase());
        if (session == null) return ResponseEntity.notFound().build();
        synchronized (session) {
            if (!session.isStarted() || session.getGameState().isGameOver()) {
                return ResponseEntity.notFound().build();
            }
            String dcName = playerName + " (DC)";
            for (var player : session.getGameState().getPlayers()) {
                if (!player.isHuman() && !player.isBankrupt() && player.getName().equals(dcName)) {
                    return ResponseEntity.ok().build();
                }
            }
        }
        return ResponseEntity.notFound().build();
    }
}
