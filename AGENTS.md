# AGENTS.md

## Scope
This repository currently uses a single-file game implementation in `index.html`.

## Required Reading
Before making changes, read:
- `docs/debug-simulator-improvement-notes.md`

## Working Rules
- Preserve save compatibility when changing local save/load logic.
- Keep gameplay updates deterministic enough to be testable.
- Avoid adding new global state without documenting it in the improvement notes.
- After JS edits, run a syntax check on the script block.

## Suggested Workflow
1. Read the improvement notes and pick a priority tier (`P0`, `P1`, `P2`).
2. Implement the smallest safe change set.
3. Verify save/load, boot flow, and game loop behavior.
4. Update `docs/debug-simulator-improvement-notes.md` with what changed.
