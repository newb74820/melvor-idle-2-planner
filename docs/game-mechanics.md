# Game Mechanics

## Implemented

- Woodcutting rows expose the required level, base XP, and interval reported by the cited calculator.
- Equipped [Treesprout Boots](https://db.melvor.aevv.net/item/TreesproutBoots) in the imported Woodcutting Boots slot contribute +3% Woodcutting XP. Users can toggle this bonus and add hypothetical flat or percentage XP.
- Imported [Deedree nodes](https://db.melvor.aevv.net/astrology-constellation/Deedree) add 2 percentage points of Woodcutting XP per A node and 1 percentage point of output doubling per B node. Major 2 gives a 4% weak-spot chance on trees and affects expected cut time.
- Imported axe heads through Dragon increase double-damage chance on trees and bushes. Axe handles through Redwood increase expected primary output through doubling. Reinforced, Bolstered, and Fortified axe bindings add instant-cut chance. The Ironsteel coating reduces maximum HP by 1 for Teak, Maple, and Mahogany. [Woodcutting game data](https://db.melvor.aevv.net/entity/Woodcutting) · [Ironsteel coating](https://db.melvor.aevv.net/shop-purchase/IronsteelAxeHeadCoating)
- Supported equipped pieces add double-damage chance. Three equipped Elite pieces activate the set's instant-cut bonus. Woodcutters Gloves also add output doubling, and Feathers Flax Basket adds output doubling for Flax Bush only. [Elite set](https://db.melvor.aevv.net/equipment-set-bonus/EliteWoodcuttingGear) · [Gloves](https://db.melvor.aevv.net/item/WoodcuttersGloves) · [Basket](https://db.melvor.aevv.net/item/FeathersFlaxBasket)
- Formula used: `(base XP + flat XP bonus) * (1 + percentage XP bonus)`.
- Required successful actions use ceiling division of remaining XP by effective XP per action.
- Training time is action count times the listed interval. This is active action time and excludes respawn, offline, or other elapsed-time effects.
- Each Woodcutting row includes its build-specific primary product quantity. Ordinary trees and bushes produce one primary item, while Wood Debris, Fortress Wall variants, and Fort Gate produce 10, 20, and 30 logs respectively.
- The cited Woodcutting actions have no input item costs. Current imported or manually entered inventory is retained and the planned primary output is added to it.
- Secondary-drop estimates use the published build-specific rolls. Nests and sticks roll on each hit, while tree seeds roll on each completed cut. Supported axe bindings raise nest chances. Supported toolbelt gear can raise nest or on-cut chances, and Bushy Axe adds one base primary item per bush cut. [Woodcutting recipe data](https://db.melvor.aevv.net/entity/Woodcutting) · [Bushy Axe](https://db.melvor.aevv.net/item/BushyAxe)

## Unknown or unsupported

- Exact game rounding/precision behavior for modifiers and fractional XP.
- Whether listed intervals are affected by game state or mode.
- Imported potion quantities, Overgrowth stacks, and active rare-event charges.
- Preservation, resource acquisition, and non-Woodcutting skills.

## Woodcutting Mastery Guild

The planner scores the 113 tasks for build 26724394 using their published category weights, saved completion and trigger flags, the imported Woodcutting level, and Woody's unlock flag. Rank thresholds apply to the 413-point total. Missing condition data can produce a range, and only the confirmed rank contributes bonuses. The saved training run resolves to 8 points and Woodcutting Initiate, with Apprentice at 21 points. [Woodcutting task and rank catalog](https://db.melvor.aevv.net/entity/Woodcutting)

Apprentice adds 10% XP, Journeyman adds 10% double-damage chance on trees and bushes, and Veteran adds another 10% XP plus a 20% maximum-HP reduction on trees and bushes. Skilled adds one Bird Nest or Eagle Nest when the corresponding drop succeeds.

## Temporary Woodcutting effects

- **Potions.** The equipped slot identifies the potion. The game consumes it on the Woodcutting tree-damage event, so a use is spent per eligible hit. The tested saves have an empty potion slot and cannot confirm the occupied slot counter. The planner shows a recognized equipped potion without applying its effects. [Potion record](https://db.melvor.aevv.net/item/WoodcuttingPotionP1A)
- **Overgrowth.** Deedree Major 1 gives eligible tree hits a chance to add a stack to unlocked bushes. The effect adds one to base primary and secondary quantities, and a completed bush cut spends one stack. The planner uses the stack count entered for the selected bush and ends the effect when that count runs out. [Deedree Major 1](https://db.melvor.aevv.net/astrology-node/DeedreeMajor1) · [Overgrowth effect](https://melvoridle.wiki/melvor-idle-2/effects/overgrowth)
- **Woodcutting Aurora.** The game-data record specifies 180 base charges, −3% interval, +2% output doubling chance, and +3% XP. A Woodcutting rare-event timer event consumes charges. Calculating the duration requires confirming when that event fires and how active charges are saved. [Woodcutting Aurora record](https://db.melvor.aevv.net/rare-bonuses-event/WoodcuttingAurora)

Unknown values are not represented as zero or as guaranteed outcomes.
