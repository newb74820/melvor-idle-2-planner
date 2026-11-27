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

The Cooking calculator uses the 77 recipes in build `26724394`. Recipe and item links supply stable IDs for ingredients and products. For recipes below 100% success, the integer difficulty is inferred from the published base XP per hour at the unlock level and the success formula. Those values reproduce the published rates at their displayed precision. Recipes listed at 100% already succeed at unlock. [Cooking recipe extract](https://db.melvor.aevv.net/entity/Cooking) · [Cooking mechanics](https://melvoridle.wiki/melvor-idle-2/mechanics/cooking)

The Smithing calculator uses the 208 recipes in build `26724394`, including the per-step interval, step count, ingredients, and output IDs. It treats the Ironsteel Platebody's listed 200% roll as a guaranteed single item and leaves the Ship Keel Repair's 0% item out of the yield. The Resource Planner's Copper Bar, Copper Arrowtips, and Molten Glass recipes share the catalog. [Smithing recipe extract](https://db.melvor.aevv.net/entity/Smithing)

The Fletching calculator uses the 66 recipes in build `26724394`. The Resource Planner's four Fletching recipes share the catalog. The Sea Griffin Arrows quest recipe produces the bank item `SeaGriffinArrow`. [Fletching recipe extract](https://db.melvor.aevv.net/entity/Fletching) · [Sea Griffin Arrows recipe](https://db.melvor.aevv.net/artisan-recipe/SeaGriffinArrows)

Crafting uses all 173 recipes in build `26724394`. The Resource Planner's Bowstring and Pack of Vials recipes share the catalog. Pack of Vials uses the bank ID `EmptyVial`. Ship Sail Repair lists a 0% placeholder item, so its plan estimates XP and costs without an item yield. [Crafting recipe extract](https://db.melvor.aevv.net/entity/Crafting)

Runecrafting uses the 123 recipes in build `26724394`. The seven rune packs use individual product rolls and require Skilled or Veteran Runecrafter. Quest recipes display their recorded quest requirements. [Runecrafting recipe extract](https://db.melvor.aevv.net/entity/Runecrafting) · [Elemental Rune Pack](https://db.melvor.aevv.net/artisan-recipe/ElementalRunePack)

Herblore uses all 155 recipes in build `26724394`. The individual recipe records confirm a half-second bottling interval for every recipe. They also supply each potion tier's cumulative brew requirement, Super Potion Research requirements, and quest visibility. [Herblore recipe extract](https://db.melvor.aevv.net/entity/Herblore) · [Woodcutting Potion P2-A](https://db.melvor.aevv.net/herblore-recipe/WoodcuttingPotionP2A)

Thieving uses the 44 targets in build `26724394`. Target records supply perception, maximum damage, attempt intervals, stage counts, currency rolls, and weighted item tables. Food choices use base item healing, which can be overridden in the calculator. [Thieving target extract](https://db.melvor.aevv.net/entity/Thieving) · [Shrimp healing](https://db.melvor.aevv.net/item/Shrimp)

Hunting uses the 44 animals and 28 traps in build `26724394`. Animal records supply preferred bait and trapless requirements. Trap records supply the initial and per-failure catch modifiers and preservation rates. [Hunting data](https://db.melvor.aevv.net/entity/Hunting) · [Reinforced Snare](https://db.melvor.aevv.net/item/ReinforcedSnare)

Beastcrafting uses 145 recipes across ten groups in build `26724394`. Recipe records supply exact ingredient and product IDs, quantities, XP, timing, and quest requirements. Station purchases supply step skipping, output doubling, and input preservation bonuses. [Beastcrafting data](https://db.melvor.aevv.net/entity/Beastcrafting) · [Beastcrafting Station VIII](https://db.melvor.aevv.net/shop-purchase/BeastcraftingStationVIII)

Agility uses the 57 paths referenced by the 38 courses in the installed Steam build `26886380`. The game data provides ordered obstacles, difficulty, intervals, maximum damage, technique XP, entry tickets, and completion tokens. Version-32 saves supply technique XP directly. [Agility course and path reference](https://db.melvor.aevv.net/entity/Agility)

Astrology uses 12 constellations and eight telescope upgrades from Steam build `26886380`. The game data supplies observation XP, Knowledge, interval, requirements, and node thresholds. [Astrology constellation data](https://db.melvor.aevv.net/entity/Astrology) · [Dragon Telescope](https://db.melvor.aevv.net/shop-purchase/DragonTelescope)

The combat picker uses the 179 enemies referenced by 40 populated combat areas and 14 dungeons in the installed Steam build `26886380`. It uses the `Enemy`, `CombatArea`, and `Dungeon` records from the local `MelvorBase` package. Enemy HP is Hitpoints level multiplied by 10. Base Armour and MaximumWard come from the enemy's base stats and default to zero if absent. Dungeon data includes ordered enemy groups, repeat counts, and guaranteed completion items from fixed rewards and guaranteed one-item rolls. All dungeon enemy groups in this build have one possible enemy. [Public Golbin record](https://db.melvor.aevv.net/enemy/Golbin) · [Max Hitpoints formula](https://melvoridle.wiki/melvor-idle-2/mechanics/character)

## XP table reference

The public [Melvor Idle 2 XP table](https://melvor2.com/xp-table/) identifies build `26724394` and says its table is from the game's own code. All thresholds for levels 1-120 are included in `src/data/xp-table.ts`; values are attributed to that community reference and have not been independently verified in-game.
