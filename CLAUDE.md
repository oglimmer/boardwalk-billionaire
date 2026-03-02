# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Vite dev server
- `npm run build` — type-check (`vue-tsc --build`) then production build (`vite build`)
- `npm run type-check` — TypeScript type checking only
- `npm run lint` — ESLint (`eslint .`)

No test framework is installed.

## Architecture

Boardwalk Billionaire is a single-page Vue 3 + TypeScript board game (human vs 3 AI opponents). No router — the entire app is one screen.

**State management:** A single Pinia options store (`src/stores/game.ts`, ~950 lines) holds all game state and logic. Components call `useGameStore()` directly — no prop drilling or emits for game data.

**Key files:**
- `src/types.ts` — all shared TypeScript interfaces (`Space`, `Player`, `Card`, `Modal`, etc.)
- `src/data.ts` — static game data: `SPACES` (40 board spaces), `GROUPS`, `CARDS`, `PLAYER_COLORS`, constants
- `src/stores/game.ts` — game state machine, AI logic, all actions (roll, buy, build, trade, mortgage, jail)
- `src/utils/board.ts` — `getGridPos(i)` maps board index 0–39 to CSS grid row/col

**Game state machine:** `phase` field (`'roll' | 'postRoll'`) drives the turn flow. Computed getters (`canRoll`, `canEndTurn`, `canBuildOrTrade`, `isHumanTurn`) derive all UI enable/disable logic.

**Board layout:** 11×11 CSS Grid in `GameBoard.vue`. The 40 spaces sit on the perimeter; `BoardCenter.vue` fills the 9×9 interior. Responsive scaling is handled via `transform: scale(...)` in `App.vue`.

**AI turns:** Executed asynchronously via `setTimeout` (600–800ms delays) to let the UI re-render between moves. `markRaw` is used on trade callbacks to prevent Pinia reactivity issues.

**Modal system:** Single `ModalOverlay.vue` handles all modal types via `store.modal.type` with `v-if` blocks.

**Houses:** Integer 0–5 on each property (0 = unbuilt, 1–4 = houses, 5 = hotel). Rent arrays are indexed directly by this value.

**Styling:** Scoped CSS in each `.vue` file. Dark theme. No preprocessor or utility framework.

**Deployment:** GitHub Pages via Actions on push to `main`. Vite `base` is set to `/boardwalk-billionaire/`.
