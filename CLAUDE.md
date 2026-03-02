# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Client** (from `client/` directory):
- `npm run dev` — start Vite dev server (proxies /api and /ws to server)
- `npm run build` — type-check (`vue-tsc --build`) then production build (`vite build`)
- `npm run type-check` — TypeScript type checking only
- `npm run lint` — ESLint (`eslint .`)

**Server** (from `server/` directory):
- `mvn spring-boot:run` — start Spring Boot server on port 8080
- `mvn compile` — compile Java sources
- `mvn test` — run tests

No test framework on the client. Server uses Spring Boot Test + JUnit 5.

## Architecture

Boardwalk Billionaire is a multiplayer board game (1–4 humans + AI to fill 4 slots). Client/server architecture with STOMP over WebSocket.

### Project Structure

```
boardwalk-billionaire/
  client/              ← Vue 3 + TypeScript SPA
    src/stores/
      game.ts          ← thin state container, receives state from server
      connection.ts    ← STOMP WebSocket client
      lobby.ts         ← lobby state and REST calls
    src/components/
      LobbyScreen.vue  ← create/join game UI
      LobbyWaiting.vue ← waiting room
      (existing game components)
  server/              ← Spring Boot 3 + Java 21 + Maven
    src/main/java/com/boardwalk/
      config/          ← WebSocket + CORS config
      model/           ← game state classes (GameState, Player, Space, etc.)
      dto/             ← wire format (GameStateDto, PlayerActionDto, etc.)
      service/
        GameEngineService.java   ← all game rules (stateless)
        AiService.java           ← AI decision logic
        SessionManager.java      ← in-memory ConcurrentHashMap of games
        GameStateDtoMapper.java  ← converts GameState → per-player DTO
      controller/
        LobbyController.java           ← REST: create/join/list
        GameWebSocketController.java   ← STOMP message handlers + AI scheduling
```

### Communication

**Client → Server** (player actions):
- `STOMP SEND /app/game/{gameCode}/action` with `{ type: "ROLL_DICE" | "BUY_PROPERTY" | "END_TURN" | ..., payload: {} }`

**Server → Client** (state updates):
- `/user/queue/game-state` — per-player `GameStateDto` (full game state + personalized modal)
- `/topic/game/{gameCode}/lobby` — lobby updates

### Server State Machine

The server uses `GamePhase.ROLL / POST_ROLL` plus `PendingInteraction` for:
- `AWAITING_BUY_DECISION` — human landed on unowned property
- `AWAITING_CARD_ACKNOWLEDGMENT` — human drew a card
- `AWAITING_TRADE_RESPONSE` — trade proposal sent to a human

### AI on Server

AI runs via `ScheduledExecutorService` with 700ms delays. All `GameSession` mutations are `synchronized`.

### Client Store

`game.ts` (~250 lines) is a thin state container:
- `applyServerState(dto)` — receives full state from server
- Action methods are one-liners that call `connection.sendAction()`
- Local-only state: `activeLogTab`, `buildPanel`, `tradeState` (UI for building trades)
- `yourPlayerIndex` replaces hardcoded `0`

**Board layout:** 11×11 CSS Grid. Responsive scaling via `transform: scale(...)` in `App.vue`.

**Modal system:** Single `ModalOverlay.vue`. Server-driven modals (buy, card, trade proposal) come via DTO. Client-only modals (spaceInfo, trade UI) are managed locally.

**Styling:** Scoped CSS in each `.vue` file. Dark theme. No preprocessor.
