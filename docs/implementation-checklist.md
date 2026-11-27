# Implementation Checklist

## Phase 0: research and foundation

- [x] Initialize React, TypeScript strict mode, Vite, Tailwind, and Vitest.
- [x] Add and verify standalone Tauri desktop packaging.
- [x] Document architecture, sources, current mechanics, formulas, and save-format uncertainty.
- [x] Import the complete build-specific XP table with source/version metadata.
- [x] Research a permitted Melvor Idle 2 save decoder and its license.
- [x] Verify the Idlewatch candidate against both provided samples and choose a Rust-side Tauri integration path.
- [x] Implement a read-only Rust decoder with streaming Brotli, size limits, and version-32 sample tests.
- [x] Add a local `.sav`/Base64 import dialog that keeps decoded data session-only.
- [x] Add a selected save directory preference and reread action for `save_*.sav` files.
- [x] Add an opt-in five-minute automatic save reread setting.
- [x] Add Zod schemas and IndexedDB persistence for explicitly saved character profiles.

## Phase 1: core calculator

- [x] Build a functional Woodcutting XP/action/time vertical slice.
- [x] Add manual hypothetical flat and percentage XP inputs.
- [x] Test baseline actions, modifiers, target already reached, and invalid XP/action inputs.
- [x] Add level-target mode using the attributed XP table.
- [x] Add verified product yields, costs, inventory, and resource calculations.
- [x] Validate the baseline Woodcutting formulas and action data against build-specific references. See [calculation formulas](calculation-formulas.md#validation).

## Later phases

- [x] Basic strictly read-only save import, directory reread, and Woodcutting XP handoff.
- [x] Save, load, refresh-by-reread, and delete character profiles locally.
- [x] Reconstruct supported Woodcutting XP modifiers from equipped toolbelt items in release version-32 saves.
- [x] Import Deedree Astrology nodes and apply their Woodcutting XP and primary output doubling bonuses.
- [x] Import the first three axe heads and handles from shop purchases and project their output and timing effects alongside Deedree weak spots.
- [x] Expand Woodcutting axe purchases and toolbelt equipment coverage for doubling, instant cuts, and recipe-specific health changes.
- [x] Reconstruct Woodcutting Mastery Guild ranks from imported task state and apply confirmed XP and timing bonuses.
- [x] Project Woodcutting secondary drops and supported permanent equipment effects, including the Skilled rank's extra nests.
- [x] Verify temporary Woodcutting effect rules and add bounded, manually entered Overgrowth estimates.
- [ ] Validate and import active temporary-effect counters using saves with equipped potions, Overgrowth, or an active Aurora.
- [x] Add the reusable inventory-aware resource planner, dependency tree, and resource checklist.
- [x] Extend resource acquisition with Mining break estimates, opt-in Firemaking drops, and shop purchase budgets.
- [x] Add Fishing and Mining calculators with imported XP and bank quantities, base recipe timing, and expected drops.
- [x] Add the Firemaking calculator with burn times, inventory shortages, expected drops, and Prayer Points.
- [x] Add Cooking recipes with level-based success rates, ingredient shortages, and whole-batch yields.
- [x] Add Smithing recipes with per-step timing, step-skipping estimates, and inventory-aware batch costs.
- [x] Add Fletching recipes through the shared artisan calculator and reuse their data in the Resource Planner.
- [x] Add Crafting recipes through the shared artisan calculator, including quest requirements and bank-aware batch costs.
- [x] Add Runecrafting recipes with Mastery Guild requirements and expected yields for each rune in a pack.
- [x] Add Herblore recipes with per-bottling costs and yields, recurring brew setup, and tier requirements.
- [x] Add Thieving targets with staged heists, expected damage and loot, and an inventory-aware food budget.
- [x] Add Hunting targets with compatible trap tiers, optional bait, and trap and bait inventory estimates.
- [x] Add Beastcrafting recipes with shared artisan timing, imported station bonuses, and resource planning.
- [x] Add Agility paths with technique progression, obstacle failure and restart estimates, and food and arena ticket budgets.
- [x] Add Astrology constellations with XP and Knowledge targets, imported node progress, and telescope bonuses.
- [x] Add a shared combat XP planner with all nine stances, simultaneous level goals, Hitpoints projections, and optional Prayer and Slayer.
- [x] Add passive Farming plans with parallel plots, orchard regrowth, level and time goals, and bank-aware planting supplies.
- [x] Add passive Ranching plans with enclosure capacity, parallel hourly production, maturity, replacements, and bank-aware feed.
- [ ] Additional skills and action comparisons.
- [ ] Progression plans, equipment comparison, and local persistence.
