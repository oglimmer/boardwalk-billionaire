# Boardwalk Billionaire

A multiplayer property trading board game with a Vue 3 frontend and Spring Boot backend, communicating over WebSocket (STOMP).

1–4 human players can join a lobby; AI fills remaining slots up to 4 players.

## Features

- **Multiplayer** — create/join games via lobby, real-time sync over WebSocket
- **Full property trading rules** — buying, rent, houses/hotels, mortgages, lockup, and bankruptcy
- **AI opponents** — bot players with strategic decision-making for buying, building, and trading
- **Trading system** — propose and receive trades with other players
- **Fortune cards** — 13 card types with various effects (collect/pay money, move, go to lockup, etc.)
- **Wealth tracking** — live stats and historical wealth chart
- **Dark theme UI** — 11x11 CSS grid board with color-coded properties and player tokens

## Getting Started

### Local Development

Start the server and client separately:

```sh
# Server (Java 21 + Maven)
cd server
mvn spring-boot:run

# Client (proxies /api and /ws to localhost:8080)
cd client
npm install
npm run dev
```

### Docker

```bash
# Backend
docker build -t boardwalk-billionaire-be ./server
docker run --rm -p 8080:8080 boardwalk-billionaire-be

# Frontend
docker build -t boardwalk-billionaire-fe ./client
docker run --rm -p 80:80 boardwalk-billionaire-fe
```

### Helm

```bash
helm install boardwalk-billionaire ./helm/boardwalk-billionaire
```

See `helm/boardwalk-billionaire/values.yaml` for configuration (image repos, ingress, resources).

## How to Play

1. Create or join a game from the lobby
2. Click **Roll Dice** to take your turn
3. Buy properties when you land on unowned spaces
4. Build houses/hotels on complete color sets using the **Build** panel
5. Trade with other players using the **Trade** panel
6. Manage cash flow with the **Mortgage** panel
7. Last player standing wins

## Scripts

**Client** (`client/`):
- `npm run dev` — start Vite dev server
- `npm run build` — type-check and build for production
- `npm run type-check` — run TypeScript type checking
- `npm run lint` — run ESLint

**Server** (`server/`):
- `mvn spring-boot:run` — start Spring Boot server
- `mvn compile` — compile Java sources
- `mvn test` — run tests

## Tech Stack

- **Client:** Vue 3 + TypeScript + Pinia, bundled with Vite
- **Server:** Spring Boot 3 + Java 21, WebSocket (STOMP)
- **Deployment:** Docker + Helm

## License

MIT
