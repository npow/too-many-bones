# Too Many Bones - Development Progress

## Completed
- [x] Phase 1: Core engine, HTML shell, state machine, title/character select
- [x] Phase 2: Encounter system (18 encounters with choices, skill checks, rewards)
- [x] Phase 3: Battle mat (4x4 canvas grid with chip-style unit rendering)
- [x] Phase 4: Dice system (ATK/DEF/DEX dice, rolling, bones, backup plan)
- [x] Phase 5: Gearloc skills (8 skills each for Patches, Boomer, Picket, Tantrum)
- [x] Phase 6: Baddie AI (BFS pathfinding, 12 baddie types, targeting, status effects)
- [x] Phase 7: Tyrant boss battles (Nom, Goblin King, Mulmesh with unique abilities)
- [x] Phase 8: Loot (15 items), Training (skill tree + stat upgrades), Recovery
- [x] Phase 9: Audio (Web Audio API procedural SFX), animations, polish

## File Summary
| File | Lines | Purpose |
|------|-------|---------|
| index.html | 44 | Entry point |
| css/styles.css | 1392 | Dark fantasy theme, all UI styling |
| js/utils.js | 121 | RNG, BFS pathfinding, helpers |
| js/config.js | 379 | Game data (gearlocs, baddies, encounters, tyrants, loot) |
| js/state.js | 215 | State management, save/load |
| js/audio.js | 161 | Procedural Web Audio SFX |
| js/dice.js | 181 | Dice rolling, faces, allocation |
| js/renderer.js | 304 | Canvas battle mat rendering |
| js/gearloc.js | 465 | Skills, innate abilities, status effects |
| js/baddie-ai.js | 345 | AI movement, targeting, tyrant spawns |
| js/encounter.js | 257 | Encounter cards, choices, loot |
| js/combat.js | 522 | Combat loop, initiative, damage |
| js/ui.js | 791 | All DOM UI screens and panels |
| js/main.js | 715 | Game loop, state machine, orchestration |
| **Total** | **5892** | |

## Architecture
- State machine: TITLE → CHAR_SELECT → DAY_START → ENCOUNTER → BATTLE → TRAINING → RECOVERY → loop
- Canvas for battle mat, DOM for everything else
- Procedural audio (no asset files needed)
- LocalStorage save/load
- `window.render_game_to_text()` returns full state JSON
