# Debug Simulator Improvement Notes

## Context
`index.html` was replaced with the latest provided version and now includes expanded systems:
- Save/load UI and local persistence
- CLOD mood, artifact system, CLOD upgrade tree
- Influencer tiers, competitors, journalists, patents, engines, regional sales

This document lists improvement suggestions and risk areas for next iterations.

## Current Health Check
- Script parses successfully (syntax check passed).
- Main risk profile is runtime stability and maintainability due large single-file global-state architecture.

## P0 (Stability / Correctness)
1. Done (2026-03-05): Initialize `lastTick` before first `gameTick` call.
   - Implemented `let lastTick = Date.now();` in loop globals.
2. Done (2026-03-05): Prevent multiple game loops from starting.
   - Added `gameLoopStarted` guard in `bootIntoGame()`, `startGame()`, and `loadAndContinue()`.
3. Harden CLOD chat network behavior.
   - `askClod()` calls Anthropic directly from browser without API key flow.
   - Add local fallback response path and optional key storage command, or proxy through backend.
4. Escape user chat input before injecting into `.innerHTML`.
   - `ud.innerHTML` currently interpolates raw user content (`q`) and allows XSS payloads.
5. Fix silent autosave behavior.
   - `saveGame(silent=false)` accepts `silent` but does not use it.
   - Autosave currently updates UI every interval even when intended silent.

## P1 (Maintainability / Architecture)
1. Split `index.html` script into modules:
   - `state.js`, `systems/*`, `ui/*`, `persistence.js`, `loop.js`.
2. Introduce a typed state schema and migration layer:
   - Save payload is large and versioned only by `v:4`.
   - Add explicit migration functions (`v4 -> v5`) and validation.
3. Replace repeated full re-renders with targeted patching:
   - Many render functions are called every few ticks and may become costly.
4. Centralize constants and balancing values:
   - Economy tuning values are distributed across many systems.
5. Add one event bus (or dispatcher) for cross-system communication:
   - Current approach relies on global mutable state and direct coupling.

## P2 (Gameplay / UX)
1. Add explicit "Load / New Game" flow state:
   - Continue button exists, but no guard against accidental new run over existing save.
2. Add save integrity UI:
   - Last save timestamp and save-size warning (localStorage quota risk).
3. Add optional debug panel:
   - Expose FPS/tick time, loop count, save payload size, active multipliers.
4. Improve onboarding for new systems:
   - Many new subsystems unlock quickly; pacing/tutorial hints would help.

## Suggested Implementation Order
1. P0.1 + P0.2 (loop safety)
2. P0.3 + P0.4 (chat reliability/security)
3. P0.5 (autosave behavior)
4. P1 modularization and save schema migration

## Verification Checklist
- New game start works once, no duplicated ticks.
- Continue saved game restores key fields (cash, run, workers, upgrades).
- Autosave runs and does not spam UI.
- Chat input cannot inject HTML/script.
- `gameTick()` runs without reference errors.
