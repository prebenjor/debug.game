# Debug Simulator Improvement Notes

## Context
`index.html` was replaced with the latest provided version and now includes expanded systems:
- Save/load UI and local persistence
- CLOD mood, artifact system, CLOD upgrade tree
- Influencer tiers, competitors, journalists, patents, engines, regional sales

This document lists improvement suggestions and risk areas for next iterations.

## Current Health Check
- Script parses successfully (syntax check passed).
- `index.html` no longer embeds CSS/JS inline; assets are externalized.
- Main risk profile is runtime stability and maintainability due large single-file global-state architecture.
- Feature planning + ship scaling rework is integrated and save-compatible.

## P0 (Stability / Correctness)
1. Done (2026-03-05): Initialize `lastTick` before first `gameTick` call.
   - Implemented `let lastTick = Date.now();` in loop globals.
2. Done (2026-03-05): Prevent multiple game loops from starting.
   - Added `gameLoopStarted` guard in `bootIntoGame()`, `startGame()`, and `loadAndContinue()`.
3. Done (2026-03-05): Harden CLOD chat network behavior.
   - Added API key flow via chat commands:
     - `/key <anthropic_key>` stores key in `localStorage`
     - `/key clear` removes key
   - Chat now falls back to a local in-character responder when API call fails/unavailable.
   - `askClod()` now handles non-OK responses gracefully instead of hard network failure messaging.
4. Done (2026-03-05): Escape chat content before injecting into `.innerHTML`.
   - Added `escHtml()` and applied it to user chat echo rendering.
   - `addClodMsg()` now escapes CLOD/model text and preserves newlines via `<br>`.
5. Done (2026-03-05): Fix silent autosave behavior.
   - `saveGame(silent=false)` now honors `silent`.
   - Autosave no longer updates/flashes save UI every cycle.

## P1 (Maintainability / Architecture)
1. Done (2026-03-05): Split inline assets into external files as safe phase-1 modularization.
   - CSS moved to `styles.css`.
   - JS moved from a single inline block to ordered files:
     - `js/state-core.js`
     - `js/persistence.js`
     - `js/gameplay-systems.js`
     - `js/ui-render.js`
     - `js/extended-systems.js`
   - Combined parse check across all split JS files passes.
2. Continue splitting by domain with strict boundaries:
   - Target structure: `state.js`, `systems/*`, `ui/*`, `persistence.js`, `loop.js`.
3. Introduce a typed state schema and migration layer:
   - Save payload is large and versioned only by `v:4`.
   - Add explicit migration functions (`v4 -> v5`) and validation.
4. Replace repeated full re-renders with targeted patching:
   - Many render functions are called every few ticks and may become costly.
5. Centralize constants and balancing values:
   - Economy tuning values are distributed across many systems.
6. Add one event bus (or dispatcher) for cross-system communication:
   - Current approach relies on global mutable state and direct coupling.

## P2 (Gameplay / UX)
1. Done (2026-03-05): Replace early-game ship scaling and add feature planning flow.
   - Added `G_FEATURE_PLAN` global state:
     - `tierId`
     - `selected` (`Set` of feature ids)
     - `locked`
   - Added feature picker modal flow (`openFeaturePicker`, `renderFeaturePicker`, `confirmFeaturePlan`).
   - Added new ship requirement formula:
     - Era floor: `5 -> 8 -> 12 -> 16 -> 20 -> 26`
     - Per-game ramp: `floor(gamesShipped * 0.8)`
     - Plus selected feature task cost
   - Added launch quality penalty for missing required roles (non-blocking) and feature-plan sales multiplier.
   - Preserved save compatibility by storing/loading `G_FEATURE_PLAN` with fallback defaults for older saves.
2. Add explicit "Load / New Game" flow state:
   - Continue button exists, but no guard against accidental new run over existing save.
3. Add save integrity UI:
   - Last save timestamp and save-size warning (localStorage quota risk).
4. Add optional debug panel:
   - Expose FPS/tick time, loop count, save payload size, active multipliers.
5. Improve onboarding for new systems:
   - Many new subsystems unlock quickly; pacing/tutorial hints would help.

## Suggested Implementation Order
1. P0.1 + P0.2 (loop safety)
2. P0.3 + P0.4 (chat reliability/security)
3. P0.5 (autosave behavior)
4. P1 phase-1 split (external assets + ordered JS files)
5. P1 deep modularization + save schema migration

## Verification Checklist
- New game start works once, no duplicated ticks.
- Continue saved game restores key fields (cash, run, workers, upgrades).
- Autosave runs and does not spam UI.
- Chat input cannot inject HTML/script.
- `gameTick()` runs without reference errors.
