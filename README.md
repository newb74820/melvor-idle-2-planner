# Melvor Idle 2 Planner

A local-first planner for Melvor Idle 2. The current slice includes a source-attributed Woodcutting calculator and a read-only local save importer. The original save is never modified.

## Run locally

```sh
npm install
npm run dev
```

Run the unit tests with `npm test` and create a production build with `npm run build`.

## Run as a desktop app

On Windows with Rust, Microsoft C++ Build Tools, and WebView2 installed, run `npm run desktop:dev` to open a standalone desktop window. Run `npm run desktop:build` to create the Windows installer under `src-tauri/target/release/bundle/nsis/`.

## Current support

- The Dashboard shows skill levels and XP from the selected character. Woodcutting, Fishing, Mining, and Firemaking are available from both the skill cards and the calculator dropdown.
- Fishing covers 24 spots with cast timing and expected fish, junk, and known special catches. Mining covers 28 rocks with expected break timing and per-hit geode drops. Both use imported XP and bank counts with manual XP and doubling bonuses.
- Firemaking covers 27 recipes with burn time, whole-batch material requirements, bank shortages, expected drops, and Prayer Points.
- 22 Woodcutting actions referenced against the public Melvor2.com calculator for Early Access build `26724394`.
- Deterministic action count, XP/hour, elapsed action time, and XP overshoot calculations.
- Build-specific primary Woodcutting yields, zero input costs, and projected inventory totals using imported or manually entered quantities.
- Hypothetical flat and percentage XP modifiers.
- Read-only `.sav` and Base64 save-string decoding for the tested version-32 sample layout.
- Choose a save directory, select a `save_*.sav`, and reread that same file with the refresh control.
- Optional Settings checkbox refreshes the selected save immediately when enabled and every 5 minutes while the desktop app is open.
- The directory/file preference is stored locally. Decoded character data stays session-only unless explicitly saved as a profile.
- Character profiles are Zod-validated and stored locally in IndexedDB; they can be loaded, refreshed by rereading, or deleted.
- Release version-32 saves supply supported Woodcutting toolbelt, shop, Deedree, and Mastery Guild modifiers.
- Expected secondary drops include nests, sticks, and seeds. Temporary effects still need verification.
- The Resource Planner builds an inventory-aware recipe tree and checklist. It accounts for whole batches, shared stock, surplus, external inputs, shop currency costs, and optional random-yield estimates.

See [docs/implementation-checklist.md](docs/implementation-checklist.md) for what is implemented and what remains.
