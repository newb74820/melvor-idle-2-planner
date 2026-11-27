# Calculation Formulas

For a selected deterministic action:

```text
effective XP/action = (base XP + flat XP bonus) * (1 + percentage XP bonus)
remaining XP = max(0, target XP - current XP)
actions = ceil(remaining XP / effective XP/action)
XP gained = actions * effective XP/action
XP overshoot = XP gained - remaining XP
expected active training seconds = actions * expected cut interval seconds
XP/hour = effective XP/action * 3600 / expected cut interval seconds
required input quantity = actions * input quantity/action
missing input quantity = max(0, required input quantity - owned quantity)
expected primary output quantity = actions * output quantity/action * (1 + supported output doubling chance)
projected inventory = owned quantity + primary output quantity
expected on-hit drops = cuts * expected hits per cut * on-hit chance * on-hit quantity * (1 + output doubling chance)
expected on-cut drops = cuts * on-cut chance * on-cut quantity
```

The planner keeps intermediate XP unrounded. Woodcutting computes expected hits to finish a cut by weighting the remaining health after each possible hit. Maximum HP applies flat changes before percentage reduction and rounds up to a whole hit point. Instant cuts are rolled above 1 remaining HP, then the model combines eligible weak-spot and double-damage chances for hits that continue. Timing modifiers apply to trees and bushes, and Deedree Major 2 weak spots apply only to trees. Confirmed Mastery Guild bonuses are included in XP and timing.

Primary output doubling applies after changes to base quantity. Secondary output uses the published recipe rates, which can be rounded, and adds supported nest or on-cut chance bonuses to matching existing rolls. The [documented hit sequence](https://melvoridle.wiki/melvor-idle-2/mechanics/woodcutting) applies output doubling to on-hit drops, with seed rolls modeled separately on completed cuts. The Skilled rank's extra Bird or Eagle Nest is added before doubling. All secondary quantities are averages over repeated plans.

For a bush with manually entered Overgrowth, the first `min(planned cuts, stacks)` cuts gain one extra base primary item and one extra item per successful secondary roll. The remaining cuts use the usual quantities. The entered count stays available for what-if comparisons, and the calculation details show the projected remaining stacks.

## Fishing and Mining

Fishing pays the spot's XP on every cast. Expected time per cast is the midpoint of its minimum and maximum intervals. Fish and junk are exclusive outcomes. Each expected quantity is the cast count times the listed probability and quantity, with manual doubling applied. For each known special catch, its effective probability is its listed probability multiplied by the chance that every earlier, rarer special fails. [Fishing mechanics](https://melvoridle.wiki/melvor-idle-2/mechanics/fishing)

Mining pays XP on each rock break. With base break probability `p`, the hit cap is `ceil(0.9999 / p)` and expected hits per break are `(1 - (1 - p)^hit cap) / p`. Multiply by the hit interval for expected time per break. Expected geodes use the number of breaks times expected hits per break and the geode chance per hit. Fishing and Mining use manual XP and doubling modifiers with base timing and drop chances. [Mining mechanics](https://melvoridle.wiki/melvor-idle-2/mechanics/mining)

## Firemaking

Burns to target use the shared XP formula. Multiply burns by the recipe interval for active time and by each ingredient quantity for material requirements. Compare requirements with the planning inventory. Costs use full batches before preservation. Each item's expected output is burns times its quantity, roll chance, and manual output-doubling multiplier. Prayer Points are tracked as a separate reward. [Firemaking mechanics](https://melvoridle.wiki/melvor-idle-2/mechanics/firemaking)

## Cooking

Only successful attempts award XP or output. Required successful batches use the shared XP formula. For each group of batches attempted at a given Cooking level, divide the number of successes needed by the base success chance at that level. Success chance is capped at 100% and calculated as `(69 + Cooking level + manual proficiency) / (69 + recipe difficulty)`. For a locked recipe the preview uses at least its required level.

Sum the expected attempts across levels and multiply by the recipe interval for expected time. Ingredient costs round the expected attempt count up to a whole attempt, then apply the full per-attempt recipe cost before preservation. This is a budget based on the mean, so actual ingredient use can vary. Outputs use the successful batch count and manual doubling probability. [Cooking mechanics](https://melvoridle.wiki/melvor-idle-2/mechanics/cooking)

## Smithing, Fletching, Crafting, and Runecrafting

Each completed batch awards the recipe's XP and outputs and consumes its inputs once. Base time per batch is the time per step multiplied by the number of steps. For a manual step-skipping chance `p`, expected steps follow `E(n) = 1 + (1 - p) × E(n - 1) + p × E(n - 2)` with `E(0) = 0` and `E(1) = 1`. Step skipping affects time. Ingredient budgets use full batch costs before preservation. [Artisan mechanics](https://melvoridle.wiki/melvor-idle-2/mechanics/artisan)

Beastcrafting adds imported station bonuses to manually entered step skipping and output doubling. The calculator shows expected ingredient use after station preservation alongside the full recipe budget. The Resource Planner uses expected timing and budgets whole batches using base yields and costs.

Rune packs grant XP on every completed batch. For each rune in the pack, multiply the batch count by that rune's chance, quantity on success, and the output-doubling multiplier to estimate its yield. [Runecrafting recipe extract](https://db.melvor.aevv.net/entity/Runecrafting)

## Herblore

XP, ingredient costs, and potion output apply at each bottling. A fresh brew pays the combined preparation, heating, and stirring time before its first bottling and repeats that setup every ten bottlings. From a fresh brew, training time is `ceil(bottlings / 10) × setup time + bottlings × bottling time`. The XP/hour display uses complete brew cycles. Ingredient costs use the listed per-bottling quantities before preservation. [Herblore mechanics](https://melvoridle.wiki/melvor-idle-2/mechanics/herblore)

## Thieving

Stealth starts at the Thieving level plus bonuses from supported equipped items and manually entered bonuses. The calculator multiplies base target Perception by the area's imported shop Perception modifier and rounds down. Each stage succeeds with probability `min(1, (100 + Stealth) / (100 + Perception))`.

Only completed pickpockets and heists award XP. Each successful roll advances one stage, and a failure keeps the stage. At each level, divide the required successful stages by the stage success chance to estimate attempts. Attempts use the target's interval, and expected failures add two seconds each. A failure that deals damage rolls uniformly from 1 through the target's maximum hit. Damage avoidance reduces expected HP lost while the base stun still applies. [Thieving mechanics](https://melvoridle.wiki/melvor-idle-2/mechanics/thieving)

GP and regular item loot roll on successful stages, while completion loot rolls once per completed target. Manual doubling applies to stage items. The food budget divides expected HP lost by effective healing per item, rounds up, and compares with the selected food stock. The budget assumes full healing per item and excludes regeneration, newly looted food, and Auto Eat's timing.

## Hunting

An already-discovered target uses an average of 1.75 surveys and the midpoint of its tracking step and time ranges. Each failed trap adds the minimum tracking steps before another attempt. Trapping expectations weight each attempt by the chance of reaching it, applying the chosen trap's accumulating failure bonus to catch chance. Expected trap costs apply the chosen trap's preservation chance. Preferred bait reduces trapping intervals by 10% and is budgeted once per attempt when enabled. [Hunting mechanics](https://melvoridle.wiki/melvor-idle-2/mechanics/hunting)

Catch XP uses the mean size and weight factor at the entered journal level. Standard item yields account for rounding, item roll chance, doubling, and the base rare-species multiplier. Setup uses a fixed journal level and base surveying and tracking rates. Survey XP, survey loot, unique rare-species rewards, and automatic fallback to unbaited hunting or other traps are outside the estimates.

## Agility

An obstacle succeeds with `0.95 ^ (max(0, difficulty − techniqueLevel + 1) / 2)`. It reaches 100% when the technique level exceeds its adjusted difficulty. Traps start at 80% and cap at 95%. The planner works backward through each path to weight obstacle reach, restarts, manual retries, and manual skips. It divides expected time, damage, and attempts per start by the chance to finish that start. Technique XP from completions is applied before the next run. [Agility mechanics](https://melvoridle.wiki/melvor-idle-2/mechanics/agility)

Arena tickets budget the rounded-up expected number of paid starts, including restarts and manual entry preservation. Food budgets use expected damage after manual mitigation and avoidance, rounded up by healing per food. Obstacle drops and timed rewards are outside the loot projection. Equipment, technique bonuses, and other Agility modifiers can be entered manually using the values shown in the game.

## Astrology

Each observation awards XP and Knowledge to the selected constellation. The calculator rounds up the observations required for either the XP or Knowledge target. Every unlocked minor node adds 2% Knowledge in that constellation. Purchased telescope bonuses and manual percentage modifiers are additive within each stat, and the observation interval is rounded down to a whole millisecond. [Astrology mechanics](https://melvoridle.wiki/melvor-idle-2/mechanics/astrology)

Knowledge thresholds grant minor-node slots. Every four unlocked minor nodes grant one major-node slot. Projections hold the currently unlocked nodes fixed through the plan and exclude random sightings and temporary event effects.

## Combat

The planner estimates repeated kills of one enemy or full dungeon clears. It assumes the player deals the enemy's full health as stance damage and adds `4 × base armour + 50 × base ward` to the damage used for stance and Hitpoints XP. Each stance has its own XP split, and every stance awards 0.133 Hitpoints XP per point in that total. For dungeons the planner adds XP across the ordered lineup, including repeated enemies, and shows base completion items. [Early Access stance data](https://melvoridle2.th.gl/db/attacks) · [Combat XP mechanics](https://melvoridle.wiki/melvor-idle-2/mechanics/combat-experience) · [Dungeon mechanics](https://melvoridle.wiki/melvor-idle-2/mechanics/combat-areas)

Prayer estimates XP using average health damage per damaging hit across the kill or clear and the total base cost of the active prayers. For single-enemy tasks, Slayer uses `enemy HP / 8 + 4` per eligible kill and assumes every planned kill counts toward a task. [Prayer XP](https://melvoridle2.th.gl/db/skill/legacyskillnavigationoption-legacyprayer) · [Slayer XP](https://melvoridle.wiki/melvor-idle-2/skills/slayer)

For each goal, divide remaining XP by XP per kill or clear and round up to a whole number. The highest count sets the plan, and all skills gain XP over the same kills or clears. Timing uses a manually entered average that includes spawn waits. The planner keeps XP rates fixed and applies manually entered percentage bonuses. Timing and Prayer XP are estimates, and combat formulas have not been validated against paired release saves.

## Farming

Each assigned plot starts empty and grows concurrently. A planting yields its first harvest after its growth interval. For orchard trees, each later harvest uses the regrowth interval until all regrowths are spent. Only then does another growing cycle require another seed. The planner counts whole harvests within the chosen time or finds the earliest harvest time that meets the XP target across all plots. [Farming mechanics](https://melvoridle.wiki/melvor-idle-2/mechanics/farming)

Elapsed time assumes prompt harvests and replanting. Crop inputs are compared against starting bank quantities without crediting crops produced later in the plan. Output uses fully protected base yields. Growth time and XP modifiers are optional manual inputs. Flower bonuses are listed separately because flowers have no harvest.

## Ranching

Enclosures produce concurrently at one-hour ticks. At fixed happiness, the planner multiplies each animal's base XP and products by its happiness and its age factor. The age factor is 0.5 for children and 1 for standard adults. Product quantities are combined by item before rounding down each hourly payout. New purchases grant base XP immediately. [Ranching mechanics](https://melvoridle.wiki/melvor-idle-2/mechanics/ranching)

The first tick is assumed to occur one hour into the estimate. Maturity and expiry are applied before production at the same timestamp. Optional replacement buys a new child at expiry. Feed uses the base hourly rate and compares against starting stock without adjusting happiness when the plan reports a shortfall. The estimate assumes the selected enclosures are built and excludes repair and construction costs, variants other than the standard adult, breeding, and petting XP.

## Validation

On November 26, 2026, all 22 planner rows matched the [build 26724394 recipe extract](https://db.melvor.aevv.net/entity/Woodcutting) for unlock level, XP per cut, base cut time, and primary yield after correcting the Oak and Redwood unlock levels. All 120 XP thresholds matched the [published XP table for the same build](https://melvor2.com/xp-table/). The planner keeps the full table for reference and caps level targets and XP-derived levels at 99, as specified in the [developer's Early Access announcement](https://news.melvoridle.com/melvor-idle-2-a-runescape-adventure-releases-17-november-2026-into-steam-early-access-next-fest-roundup/).

The [build 26724394 Woodcutting calculator](https://melvor2.com/calculators/woodcutting/) provides the baseline of 28 Normal Tree cuts in 84 seconds for the 83 XP target. The recipe yield gives 28 Normal Logs, and 28 cuts award 84 XP. Automated tests run that case and additional cases against the planner's actual action data, including the 10-log and 30-log quest yields.

The [demo XP mechanics reference](https://melvoridle.wiki/melvor-idle-2/mechanics/experience) documents the same flat-then-percentage modifier order. Early Access fractional XP precision and modifier behavior still need direct observation. No paired live saves were available during the reference check.

A later pair of release saves recorded 109 Normal Tree cuts in 306.95 active seconds, with 333.54 XP and 116 Normal Logs gained. With the supported shop purchases and Deedree nodes, the model gives 333.54 XP, 300.52 expected seconds, and 115.54 expected logs for the same cut count. The timing model treats the weak-spot and double-damage rolls as independent and adds the listed chances from supported purchases. This single run checks plausibility rather than establishing the exact roll distribution.
