# Boardwalk Billionaire

A fully playable digital property trading board game built with vanilla HTML, CSS, and JavaScript — no dependencies, no build step.

Play as a human against 3 AI opponents on a classic 40-space board.

## Features

- **Full property trading rules** — buying, rent, houses/hotels, mortgages, lockup, and bankruptcy
- **AI opponents** — 3 bot players with strategic decision-making for buying, building, and trading
- **Trading system** — propose and receive trades with AI players
- **Fortune cards** — 13 card types with various effects (collect/pay money, move, go to lockup, etc.)
- **Wealth tracking** — live stats and historical wealth chart
- **Dark theme UI** — 11x11 CSS grid board with color-coded properties and player tokens

## Getting Started

Open `index.html` in any modern web browser. No installation or build step required.

```sh
open index.html
```

Or serve it locally:

```sh
npx serve .
```

### Docker

```bash
docker build -t boardwalk-billionaire .
docker run --rm -p 8080:80 boardwalk-billionaire
```

Then open [http://localhost:8080](http://localhost:8080).

## How to Play

1. Click **Roll Dice** to take your turn
2. Buy properties when you land on unowned spaces
3. Build houses/hotels on complete color sets using the **Build** panel
4. Trade with AI players using the **Trade** panel
5. Manage cash flow with the **Mortgage** panel
6. Last player standing wins

## Tech Stack

- Vanilla JavaScript (ES6+)
- HTML5 + CSS3
- Zero external dependencies
- Single-file architecture (~1,850 lines)

## License

MIT
