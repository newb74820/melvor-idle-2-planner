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

## Validation

On November 26, 2026, all 22 planner rows matched the [build 26724394 recipe extract](https://db.melvor.aevv.net/entity/Woodcutting) for unlock level, XP per cut, base cut time, and primary yield after correcting the Oak and Redwood unlock levels. All 120 XP thresholds matched the [published XP table for the same build](https://melvor2.com/xp-table/). The planner keeps the full table for reference and caps level targets and XP-derived levels at 99, as specified in the [developer's Early Access announcement](https://news.melvoridle.com/melvor-idle-2-a-runescape-adventure-releases-17-november-2026-into-steam-early-access-next-fest-roundup/).

The [build 26724394 Woodcutting calculator](https://melvor2.com/calculators/woodcutting/) provides the baseline of 28 Normal Tree cuts in 84 seconds for the 83 XP target. The recipe yield gives 28 Normal Logs, and 28 cuts award 84 XP. Automated tests run that case and additional cases against the planner's actual action data, including the 10-log and 30-log quest yields.

The [demo XP mechanics reference](https://melvoridle.wiki/melvor-idle-2/mechanics/experience) documents the same flat-then-percentage modifier order. Early Access fractional XP precision and modifier behavior still need direct observation. No paired live saves were available during the reference check.

A later pair of release saves recorded 109 Normal Tree cuts in 306.95 active seconds, with 333.54 XP and 116 Normal Logs gained. With the supported shop purchases and Deedree nodes, the model gives 333.54 XP, 300.52 expected seconds, and 115.54 expected logs for the same cut count. The timing model treats the weak-spot and double-damage rolls as independent and adds the listed chances from supported purchases. This single run checks plausibility rather than establishing the exact roll distribution.
