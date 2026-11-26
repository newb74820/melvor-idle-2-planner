# Game Data Sources

## Current dataset

- Source: [Melvor2 Woodcutting Calculator](https://melvor2.com/calculators/woodcutting/)
- Dataset label on source: Melvor Idle 2 game files, Early Access build `26724394`.
- Rows included: action name, required level, base XP, interval, primary product name and quantity, and displayed input costs for 22 Woodcutting actions.
- Retrieved: 2026-11-26.
- Verification: community game-file reference, not independently verified in-game. Primary product quantities and the absence of input costs are represented; secondary drop chances and modifier behavior are not inferred.
- Site attribution: the source identifies itself as an unofficial fan site, not affiliated with or endorsed by Games by Malcs or Jagex.

The [same-build Woodcutting recipe extract](https://db.melvor.aevv.net/entity/Woodcutting) supplies unlock requirements, base hit and cut intervals, and the published chances and quantities for per-hit and per-cut drops. Use its recipe requirements for unlock checks. Oak and Redwood require levels 10 and 92 even though the calculator lists their nominal levels as 5 and 90. Individual recipe records also specify quest visibility, equipped tools, and the Ashen Tree Agility requirement.

The source is a public rendered calculator, not a structured data API. Do not silently extend its rows or combine them with a different game build. Before wider data ingestion, assess source terms/licensing and prefer permitted game data exports or user-provided local data.

The resource planner also uses whole-batch inputs, outputs and timings from build `26724394` recipe records for [Bowstring](https://db.melvor.aevv.net/artisan-recipe/Bowstring), [Normal Bow](https://db.melvor.aevv.net/artisan-recipe/NormalBow), [Arrow Shaft](https://db.melvor.aevv.net/artisan-recipe/ArrowShaft), [Headless Arrows](https://db.melvor.aevv.net/artisan-recipe/HeadlessArrows), [Copper Bar](https://db.melvor.aevv.net/artisan-recipe/CopperBar), [Copper Arrowtips](https://db.melvor.aevv.net/artisan-recipe/CopperArrowtips), [Copper Arrows](https://db.melvor.aevv.net/artisan-recipe/CopperArrows), [Molten Glass](https://db.melvor.aevv.net/artisan-recipe/MoltenGlass), and [Pack of Vials](https://db.melvor.aevv.net/artisan-recipe/EmptyVial). Multi-step recipes use their full time per batch.

[Copper Ore](https://db.melvor.aevv.net/mining-recipe/CopperOre) and [Iron Ore](https://db.melvor.aevv.net/mining-recipe/IronOre) supply the base per-hit interval, break chance, and yield per break. The expected duration uses the documented progress fallback from the [Mining mechanics reference](https://melvoridle.wiki/melvor-idle-2/mechanics/mining). Random [Normal Log Firemaking drops](https://db.melvor.aevv.net/firemaking-recipe/NormalLog) can be budgeted individually in estimated-yield mode.

Shop records supply [Bucket of Sand](https://db.melvor.aevv.net/shop-purchase/BucketofSand), [Copper Arrows](https://db.melvor.aevv.net/shop-purchase/CopperArrows), [Headless Arrows](https://db.melvor.aevv.net/shop-purchase/HeadlessArrows), and [Bowstring](https://db.melvor.aevv.net/shop-purchase/Bowstring) prices, item costs, and requirements. Skilled Fletcher and Skilled Crafter ranks are shown as prerequisites for manual verification.

The Fishing and Mining calculators use the 24 spots and 28 rocks in the same build. The recipe extracts supply base XP, level requirements, intervals, yields, and drop probabilities. Quest, equipment, and Agility prerequisites appear alongside the affected recipes. Glow Spore uses the reported 100% base chance and is awarded when earlier special rolls fail. [Fishing recipe extract](https://db.melvor.aevv.net/entity/Fishing) · [Mining recipe extract](https://db.melvor.aevv.net/entity/Mining) · [Glow Spore game data](https://melvor2.com/items/glow-spore/)

The Firemaking calculator uses all 27 recipes in build `26724394`, including log burns, lantern batches, Prayer Point rewards, and quest burns. The Resource Planner takes its existing Normal Log drop sources from the same catalog. [Firemaking recipe extract](https://db.melvor.aevv.net/entity/Firemaking)

## XP table reference

The public [Melvor Idle 2 XP table](https://melvor2.com/xp-table/) identifies build `26724394` and says its table is from the game's own code. All thresholds for levels 1-120 are included in `src/data/xp-table.ts`; values are attributed to that community reference and have not been independently verified in-game.
