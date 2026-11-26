# Melvor Idle 2 Planner

A local-first planner for Melvor Idle 2 with skill calculators, an inventory-aware Resource Planner, and read-only save imports.

## Install on Windows

Download the **Windows x64 installer** from the latest release. Run the setup file, then open **Melvor Idle 2 Planner** from the Start menu. [Download the latest release](https://github.com/newb74820/melvor-idle-2-planner/releases/latest)

## Run the Windows app from source

### 1. Install the prerequisites

- **Git for Windows** to download the source. [Git for Windows](https://git-scm.com/install/windows)
- **Node.js 24 LTS**, which includes npm. [Node.js downloads](https://nodejs.org/en/download)
- **Rust 1.90 or newer** with the stable Windows MSVC toolchain. Use the MSVC default when installing with rustup. [Install Rust](https://rust-lang.org/tools/install/)
- **Microsoft C++ Build Tools** with the **Desktop development with C++** workload. The app also requires the **Microsoft Edge WebView2 Runtime**, which you can install separately if it is missing. [Tauri Windows prerequisites](https://v2.tauri.app/start/prerequisites/#windows)

Open a new PowerShell window after installing the tools.

### 2. Download and start the app

Run these commands from the folder where you want to keep the project.

```powershell
git clone https://github.com/newb74820/melvor-idle-2-planner.git
cd melvor-idle-2-planner
npm.cmd ci
npm.cmd run desktop:dev
```

The first launch can take a few minutes while Rust builds the desktop app. Leave PowerShell running while you use the planner. Press **Ctrl+C** in PowerShell to stop it. To start it again, run `npm.cmd run desktop:dev` from the project folder.

### 3. Import a save

On the Dashboard, click **Import character**. Choose your Melvor Idle 2 save folder and select a `save_*.sav` file, or use **Choose .sav** or **Paste string**. The planner reads the save locally. You can then click a skill card to open its calculator with your imported progress.

## Preview in a browser

With the dependencies installed, run `npm.cmd run dev` and open the local URL printed in PowerShell. The browser preview supports manual calculator inputs. Save importing and refreshing require the desktop app.

To run the frontend tests, use `npm.cmd test`.

## Current source features

- The Dashboard shows skill levels and XP from the selected character. Open an implemented skill from its card or the calculator dropdown.
- Fishing covers 24 spots with cast timing and expected fish, junk, and known special catches. Mining covers 28 rocks with expected break timing and per-hit geode drops. Both use imported XP and bank counts with manual XP and doubling bonuses.
- Firemaking covers 27 recipes with burn time, whole-batch material requirements, bank shortages, expected drops, and Prayer Points.
- Cooking covers 77 recipes with level-based success rates, expected cook time, ingredient shortages, and whole-batch yields.
- Smithing covers 208 recipes with per-step timing, whole-batch material costs and yields, bank shortages, and manual step-skipping estimates.
- Fletching covers 66 recipes using the same per-step timing, batch costs, and inventory estimates as Smithing.
- Crafting covers 173 recipes for materials, leather, jewellery, hunting traps, and quest objectives.
- Runecrafting covers 123 recipes, including standard runes, mastery-gated rune packs, magic gear, and quest recipes.
- Herblore covers 155 recipes with per-bottling ingredient costs and yields, brew setup time, and potion tier requirements.
- Thieving covers 44 targets with expected attempts, stuns, loot, damage, and a food budget based on healing and bank stock.
- Hunting covers 44 targets and 28 trap options, with trapless hunting where supported, optional bait, and bank-aware supply estimates. Farming and Ranching are tracked as passive skills.
- Beastcrafting covers 145 recipes with imported station bonuses, bank-aware ingredient costs, and Resource Planner support.
- Agility covers 57 selectable paths with imported technique progress, per-obstacle success, bank-aware food and arena ticket budgets, and projected technique levels.
- Astrology covers all 12 constellations with XP and Knowledge targets, imported node progress, and telescope bonuses.
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
