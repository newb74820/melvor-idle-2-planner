# Melvor Idle 2 — Skill & Resource Planner

## Project objective

Develop a comprehensive, accurate, character-aware calculator and progression planning application for Melvor Idle 2.

The application should allow users to determine the actions, resources, and time required to reach specific skill levels, produce quantities of items, and plan progression across multiple interconnected skills.

The application should support both manual configuration and importing exported Melvor Idle 2 character saves.

This project is specifically for **Melvor Idle 2**, not the original Melvor Idle. Do not assume that mechanics, modifiers, recipes, or save formats from the original game apply to the sequel.

## 1. Technology and architecture

Build the application as a local-first, responsive web application.

Preferred technology stack:

- React
- TypeScript with strict mode enabled
- Vite
- Tailwind CSS
- IndexedDB for persistent character profiles, game data, and saved plans
- Zod for data validation
- Vitest for calculation engine unit tests
- Playwright for end-to-end testing

Avoid requiring a backend unless a demonstrated technical requirement makes one necessary.

Structure the application so that it can eventually be packaged as a desktop application using Tauri without substantial architectural changes.

Separate the following concerns:

- User interface
- Game database
- Calculation engine
- Modifier resolution engine
- Character save decoder
- Resource dependency planner
- Progression optimizer
- Local persistence
- Game data importing and updating

All calculation logic must remain independent of UI components.

## 2. Research and game data acquisition

Before implementing game-specific calculations, research the current version of Melvor Idle 2 and identify reliable sources for its game data.

Starting references:

- https://melvor2.com/calculators/
- https://melvor2.com/xp-table/
- https://melvor2wiki.github.io/
- https://melvoridle.wiki/melvor-idle-2/mechanics
- https://melvoridle.wiki/melvor-idle-2/mechanics/experience
- https://melvoridle.wiki/melvor-idle-2/mechanics/artisan
- https://melvor.aevv.net/save-editor/
- https://falorfrozen-cmd.github.io/MelvorModLoader/modding/inside-the-game.html

Investigate whether game data can be obtained through:

1. Publicly available structured game data.
2. Public repositories containing extracted or normalized data.
3. Permitted community database exports or APIs.
4. Wiki pages and structured tables.
5. User-provided data extracted from their locally installed game, where permitted.

Prefer structured game data over scraping rendered wiki pages.

Respect source licensing, access restrictions, and attribution requirements. Do not bypass protections to obtain game data.

Create a repeatable data ingestion pipeline. Avoid manually hardcoding hundreds of recipes or items.

The application should maintain a versioned database containing:

- Skills
- Skill level caps
- Cumulative XP requirements
- Skill actions
- Recipes
- Items
- Equipment
- Tools
- Consumables
- Currencies
- Modifiers
- Skill unlock requirements
- Mastery Guild mechanics
- Astrology bonuses
- Agility bonuses
- Pets and passive bonuses
- Shop upgrades
- Resource acquisition sources
- Drop tables
- Relevant environmental and conditional effects

Only include mechanics confirmed to exist in Melvor Idle 2.

Record the game version, source, import date, and verification status of the dataset.

Never silently combine incompatible game versions.

## 3. Core game data models

Create normalized TypeScript models for the game's data.

Each skill action or recipe should support, where applicable:

- Unique game identifier
- Display name
- Associated skill
- Action category
- Required skill level
- Additional unlock requirements
- Base XP per action
- Base action duration
- Required input items and quantities
- Currency requirements
- Produced items and quantities
- Secondary products
- Random drops and probabilities
- Success or failure probabilities
- Applicable modifier categories
- Source information

Use stable game identifiers rather than display names to establish relationships between items, recipes, skills, and modifiers.

Support multiple recipes or acquisition methods for the same item.

Do not assume every skill follows the same action model.

Design extensible calculation strategies for:

- Gathering skills
- Artisan and production skills
- Passive or time-based skills
- Probability-based skills
- Combat skills
- Hybrid skills

## 4. Primary skill calculator

The primary application view should allow the user to select:

- Character profile, if available
- Skill
- Current skill level
- Exact current XP, optionally
- Target skill level
- Target XP, optionally
- Action or recipe
- Active modifier configuration

Selecting a skill should populate its available actions.

Actions should display:

- Name and icon, where permitted
- Required level
- Base XP
- Modified XP
- Base action interval
- Modified action interval
- Resource requirements
- Expected output
- Whether the action is currently unlocked

Locked actions should remain visible but clearly marked.

Calculate and display:

- Current cumulative XP
- Target cumulative XP
- Remaining XP
- Effective XP per action
- Required successful actions
- Expected total attempts, where failure is possible
- XP gained per hour
- Total estimated training time
- Total resource requirements
- Expected product quantities
- Currency consumed or generated
- XP overshoot upon reaching the target
- Resulting skill level

When exact current XP is unavailable, assume the minimum cumulative XP required for the selected current level and clearly disclose that assumption.

The user must be able to select an action manually regardless of whether it is the most efficient action.

## 5. Calculation modes

Provide multiple calculation modes using the same underlying calculation engine.

### Level target

Calculate the resources, actions, and time required to reach a specified skill level.

### XP target

Calculate the actions and resources required to reach an exact cumulative XP value or gain a specified amount of XP.

### Item quantity target

Determine how many actions and resources are required to obtain a specified quantity of an item.

### Available resources

Given a quantity of available ingredients, determine:

- Maximum possible actions without preservation
- Expected actions with preservation
- Expected XP gained
- Resulting skill level
- Expected products
- Limiting ingredient
- Remaining resources

### Time target

Given an available training duration, determine:

- Expected actions completed
- XP gained
- Resulting level
- Resources consumed
- Products generated

### Fixed action count

Calculate the results of performing a specified number of actions.

All modes should update their results immediately when inputs or modifiers change.

## 6. XP calculation engine

Implement a centralized experience calculation engine.

Use verified Melvor Idle 2 experience tables and formulas.

The documented baseline XP modifier formula to investigate and verify against the current game version is:

Effective XP = (Base XP + Flat XP Bonus) × (1 + Percentage XP Bonus)

Required XP = Maximum of zero and target cumulative XP minus current cumulative XP.

For deterministic successful actions with constant XP rewards:

Required actions = Round up (Required XP / Effective XP per action)

Account for the game's actual XP precision and rounding behavior.

When actions can fail, distinguish between successful actions and expected attempts. Do not incorrectly present probability-based estimates as guaranteed results.

Where experience modifiers or unlocks change during progression, support segmenting the calculation into multiple stages.

Include unit tests covering:

- Exact level thresholds
- Partial progress within a level
- Percentage modifiers
- Flat modifiers
- Combined modifiers
- Fractional XP
- Level caps
- Targets already reached
- Invalid actions
- Zero XP actions
- Very large XP values

## 7. Modifier resolution engine

The modifier engine is a core architectural requirement.

Do not simply implement a generic percentage bonus applied to every action.

Create a data-driven system capable of handling different modifier scopes, stacking rules, activation requirements, and calculation orders.

Investigate and support applicable modifiers such as:

- Percentage skill XP increase
- Flat skill XP increase
- Global XP increases
- Action interval reduction
- Flat action interval reduction
- Resource preservation chance
- Resource cost reduction
- Chance to double products
- Guaranteed additional products
- Flat product quantity increases
- Percentage product quantity increases
- Additional random products
- Success chance modifiers
- Currency generation modifiers
- Resource respawn time modifiers
- Skill-specific effects
- Action-specific effects
- Conditional bonuses

Potential modifier sources include:

- Equipped items
- Skill tools
- Purchased upgrades
- Astrology
- Agility
- Mastery Guild progression
- Skill ranks
- Pets
- Consumables
- Temporary buffs
- Environmental effects
- Other permanent unlocks

Verify which modifier sources and mechanics actually exist in the current game.

Each modifier should define:

- Unique identifier
- Modifier type
- Value
- Applicable skills
- Applicable actions
- Source
- Activation requirements
- Stacking behavior
- Priority or calculation order
- Minimum and maximum values, where applicable
- Whether it is permanent or temporary
- Verification status

Display an expandable modifier breakdown.

For example:

**Total Smithing XP bonus: +17%**

- Skill rank: +10%
- Equipped gloves: +2%
- Other active bonus: +5%

The values above are illustrative.

Allow users to individually enable, disable, or override modifiers for hypothetical calculations.

Clearly distinguish between:

- Imported active modifiers
- Imported but inactive modifiers
- Manually entered modifiers
- Hypothetical modifiers
- Unverified modifiers

Prevent the same bonus from being counted twice when it is both imported and manually configured.

Apply actual game-defined caps and stacking rules. Do not invent caps or assume that all percentages are additive.

## 8. Probability and resource consumption

Resource preservation, item doubling, bonus products, and action success chances introduce randomness.

The application must distinguish between deterministic requirements, expected outcomes, and probability-based planning estimates.

For a simple verified mechanic where each action independently has a chance to preserve its entire input cost:

Expected resources consumed = Actions × Resource cost × (1 − Preservation chance)

For a simple verified mechanic where a successful action has one independent chance to double its base output:

Expected output = Successful actions × Base output × (1 + Doubling chance)

These are baseline examples, not universal formulas. Verify the actual mechanics and interactions before implementation.

Provide the following resource planning modes:

### Expected

Uses statistically expected consumption and production.

### Conservative

Assumes no favorable random preservation or doubling events while respecting verified deterministic effects.

### Confidence-based

Allows users to select a resource budget or production target with a specified probability of success, such as:

- 90%
- 95%
- 99%

Where appropriate, use binomial distributions or other mathematically suitable models.

Use Monte Carlo simulations for complex mechanics that cannot be represented accurately with simpler distributions.

Run expensive simulations in a Web Worker to prevent the UI from becoming unresponsive.

Clearly identify estimates rather than presenting them as guarantees.

Item doubling should not automatically increase XP unless the game explicitly awards XP based on the quantity produced.

## 9. Character save importing

Investigate the exported Melvor Idle 2 character save string and local save file format.

Support, where technically feasible:

- Pasting an exported character save string
- Uploading a local save file
- Loading a previously imported character
- Updating an existing character with a newer save

Do not assume the original Melvor Idle save decoding implementation is compatible.

Investigate existing community implementations and their licenses.

The importer must be strictly read-only. This application is a planner, not a save editor.

Attempt to extract:

- Character name
- Game mode
- Save timestamp
- Game version
- Skill levels
- Exact skill XP
- Bank inventory
- Currency balances
- Equipped items
- Equipment loadouts
- Tools
- Purchased upgrades
- Unlocked actions
- Skill ranks
- Mastery Guild progression
- Astrology progression
- Agility progression
- Pets
- Permanent unlocks
- Active bonuses
- Other state relevant to calculation accuracy

Determine which values are directly stored in the save and which must be reconstructed from game data.

Do not assume the save contains a precomputed list of every active modifier.

Build the modifier resolver so it can reconstruct bonuses from imported equipment, progression, upgrades, and other state.

If a particular value cannot be decoded or reconstructed reliably:

- Preserve it as unknown rather than zero.
- Inform the user.
- Allow manual configuration.
- Reflect the uncertainty in calculation results.

Validate and sanitize all imported data.

Handle:

- Invalid or corrupted saves
- Unsupported save versions
- Missing fields
- Unknown item identifiers
- Missing game content
- Unexpected data structures
- Excessively large inputs

Decode saves locally. Never upload saves to a server or external service without explicit user consent.

Do not modify or overwrite the original game save.

## 10. Character profiles

Allow multiple locally stored character profiles.

Each profile should display:

- Character name
- Last import date
- Game mode
- Total skill progression
- Skill levels and exact XP
- Bank inventory
- Equipment
- Permanent bonuses
- Temporary bonuses
- Unresolved import information

Support refreshing a character through another save import.

Preserve user-created hypothetical configurations separately from the imported character state.

Allow users to compare:

- Current character
- Character with different equipment
- Character with additional upgrades
- Character with hypothetical future progression

Do not require a character import to use the application.

## 11. Inventory-aware resource requirements

When a character is imported, compare calculated resource requirements against its bank inventory.

For each ingredient, display:

- Base quantity required
- Expected quantity required after modifiers
- Conservative quantity required
- Quantity owned
- Quantity allocated to other planned tasks
- Quantity missing
- Expected remaining inventory

Allow users to manually adjust inventory availability for individual calculations.

Include an option to ignore bank inventory entirely.

Do not mutate the imported bank when a hypothetical calculation is performed.

Instead, use a separate virtual planning inventory.

## 12. Recursive resource dependency planner

Build a resource dependency engine capable of resolving multi-stage crafting and gathering chains.

For example, a weapon may require:

Weapon → Metal bars → Ore and secondary ingredients → Gathering actions

The actual recipes must come from verified game data.

For every missing ingredient:

1. Identify available acquisition methods.
2. Determine whether the character meets their requirements.
3. Calculate the necessary production or gathering actions.
4. Apply the modifiers relevant to that acquisition method.
5. Calculate the resources required by those actions.
6. Recursively resolve their dependencies.
7. Subtract available inventory without counting it more than once.
8. Continue until all dependencies are resolved or marked unavailable.

Support acquisition methods including:

- Gathering
- Crafting
- Refining
- Purchasing
- Farming
- Ranching
- Hunting
- Thieving
- Combat drops
- Other verified game mechanics

When an item has multiple acquisition methods, allow the user to choose between them.

Provide automatic recommendations based on available and verified metrics.

Display the complete dependency chain as both an expandable tree and a flattened resource checklist.

Calculate:

- Total raw materials required
- Intermediate products required
- Actions per skill
- XP gained per skill
- Time per production stage
- Total active training time
- Total currency required
- Missing prerequisites
- Expected surplus products

Account for recipes producing multiple items per action.

Aggregate shared dependencies so that the same resources are not unnecessarily gathered or produced twice.

Detect circular dependencies and prevent infinite recursion.

For time-gated or concurrent activities, distinguish between active training time and elapsed wall-clock time.

## 13. Action comparison

Create an action comparison view for the selected skill.

Compare all applicable actions using the character's current modifiers.

Include columns for:

- Action name
- Required level
- Effective XP per action
- Effective action interval
- XP per hour
- Actions to target
- Training time to target
- Resource requirements
- Estimated resource acquisition time
- Total progression time
- Products generated
- Currency impact
- Availability

Allow sorting and filtering.

Provide filters such as:

- Currently unlocked actions only
- Actions using owned resources
- Gathering-only actions
- Fastest XP per hour
- Lowest resource consumption
- Lowest total progression time
- Highest expected profit
- Include locked actions

Distinguish between the fastest action when ingredients are already owned and the fastest action when ingredients must first be acquired.

## 14. Multi-stage progression optimizer

Implement this after the single-action calculator and dependency engine are reliable.

Allow the user to plan progression across multiple actions.

Example:

- Train using Action A until level 30.
- Switch to Action B when unlocked.
- Switch to Action C at level 45.
- Continue until level 60.

Determine appropriate transition points using the actual unlock requirements.

Optimization objectives should include:

- Fastest overall progression
- Lowest total resource consumption
- Lowest currency expenditure
- Best use of existing inventory
- Highest expected profit
- Lowest active training time

The optimizer must consider the time required to acquire ingredients, not just XP per hour.

Allow users to:

- Exclude specific actions
- Require specific actions
- Reserve ingredients
- Prevent certain skills from being trained
- Limit currency expenditure
- Choose between expected and conservative resource consumption

For complex optimization problems, use bounded search or other appropriate optimization strategies.

Do not claim a plan is globally optimal unless the algorithm guarantees it. Label heuristic results as recommendations.

## 15. Equipment and upgrade comparison

Create a what-if calculator for equipment, upgrades, and passive bonuses.

Allow users to compare their current configuration against hypothetical changes.

For example:

- Current equipment versus equipment providing additional XP.
- Current tool versus an upgraded tool.
- Training with and without a preservation bonus.
- Training with and without a doubling bonus.
- Training before and after unlocking a passive upgrade.

Show:

- Change in effective XP per action
- Change in XP per hour
- Actions saved
- Resources saved
- Training time saved
- Additional expected products
- Upgrade acquisition requirements
- Break-even point, where meaningful

Where acquisition costs and time are available, calculate whether obtaining an upgrade before training would reduce total progression time.

Respect equipment slot restrictions, unlock requirements, mutually exclusive bonuses, and consumable availability.

Do not recommend equipment combinations that cannot be used together.

## 16. Saved progression plans

Allow users to build and save multi-skill progression plans.

Example:

- Mining to level 50
- Smithing to level 50
- Crafting to level 40
- Produce 10,000 units of a specified item

Each plan should maintain a virtual character and inventory state.

As planned tasks are processed, simulate:

- Skill XP gained
- Newly unlocked actions
- Resources consumed
- Resources generated
- Currency changes
- Modifier changes, when applicable

Allow users to reorder tasks and immediately recalculate the remaining plan.

Display aggregate totals across the entire plan.

Refreshing the actual character from a save import should allow the user to recalculate outstanding requirements without losing the saved goals.

Keep projected character state separate from actual imported character state.

## 17. User interface and design

Create a clean, modern, information-dense interface appropriate for an idle RPG companion application.

Use a consistent dark theme by default, with optional light mode.

Avoid excessively large cards, unnecessary whitespace, and oversized typography.

Use a collapsible sidebar with:

- Dashboard
- Skill Calculator
- Action Comparison
- Resource Planner
- Progression Plans
- Equipment Comparison
- Character Profiles
- Game Database
- Settings

The main skill calculator should prioritize:

1. Skill and action selection.
2. Current progression and target.
3. Modifier configuration.
4. Calculation results.
5. Resource requirements.
6. Resource acquisition dependencies.

Use searchable dropdowns for skills, recipes, equipment, and items.

Display icons where licensing permits, with graceful fallbacks.

Format large numbers consistently and provide options for abbreviated or exact quantities.

Use readable time formatting such as 2d 14h 32m.

Provide tooltips explaining:

- Modifier behavior
- Expected versus guaranteed quantities
- Calculation assumptions
- Resource requirements
- Unsupported mechanics
- Data verification status

Advanced options should be collapsible so users who only need a basic calculator are not overwhelmed.

## 18. Game database browser

Provide a searchable reference database within the application.

Allow users to browse:

- Skills
- Actions
- Recipes
- Items
- Equipment
- Modifiers
- Upgrades
- Experience tables

Selecting an item should show:

- How it is obtained
- Recipes that produce it
- Recipes that consume it
- Required unlocks
- Relevant modifiers
- Available character inventory

Provide shortcuts to open relevant calculators and resource plans.

## 19. Game data versioning and updates

Melvor Idle 2 is actively developing, so game data must be independently updateable.

Implement:

- Versioned game data packages
- Data schema validation
- Update and import utilities
- Dataset migrations
- Source attribution
- Game version compatibility checks
- Change detection
- Missing data reports

When updating game data, identify:

- Added or removed actions
- Changed XP rewards
- Changed recipes
- Changed action intervals
- Changed modifiers
- Changed skill requirements

Do not silently invalidate saved plans.

Warn users if an existing plan references outdated or removed content.

Allow the application to continue operating offline with its locally cached data.

## 20. Accuracy and transparency

Calculation accuracy is more important than having every skill superficially implemented.

Every supported calculation should be traceable.

Provide an expandable calculation details section showing:

- Base values
- Applied modifiers
- Formula order
- Intermediate results
- Rounding behavior
- Final results
- Source and data version

Use appropriate numerical precision for fractional XP and very large item quantities.

Avoid rounding intermediate calculations unless the game itself does so.

Classify support for each skill or mechanic as:

- Verified
- Partially supported
- Experimental
- Unsupported

Never fabricate missing game data.

Unknown modifier behavior should generate a visible warning rather than being silently ignored.

## 21. Testing requirements

Build comprehensive automated tests for the calculation engine.

Test at minimum:

- XP tables and level conversion
- XP percentage and flat bonuses
- Action count rounding
- Interval reduction
- Resource preservation
- Product doubling
- Multiple input ingredients
- Multiple output items
- Random drops
- Failed actions
- Inventory shortages
- Currency costs
- Multi-stage crafting
- Shared resource dependencies
- Circular dependencies
- Level-locked actions
- Conditional modifiers
- Modifier stacking and caps
- Save importing
- Character refresh
- Unsupported save versions
- Game data version changes
- Virtual inventory allocation
- Multi-stage progression

Where possible, create verified reference fixtures using actual game behavior.

Keep synthetic test data separate from production game data.

Validate calculated results against observed in-game outcomes or trusted game-data references.

## 22. Implementation roadmap

### Phase 0 — Research and technical foundation

- Research Melvor Idle 2 game data sources.
- Identify the current supported game version.
- Investigate character export strings and local saves.
- Determine which modifiers can be reconstructed.
- Establish normalized schemas.
- Document verified formulas and unknown mechanics.
- Initialize the project and testing infrastructure.

### Phase 1 — Core calculator

- Implement the game database.
- Implement the XP engine.
- Implement basic gathering and artisan calculators.
- Implement manual modifiers.
- Implement all basic calculation modes.
- Build the primary calculator interface.
- Verify calculations against reference data.

Prioritize representative skills such as Woodcutting, Mining, Smithing, and Crafting.

### Phase 2 — Character integration

- Implement save decoding.
- Implement character profiles.
- Import skill XP and bank inventory.
- Resolve supported character modifiers.
- Implement manual overrides.
- Implement inventory-aware resource calculations.

### Phase 3 — Resource dependencies

- Implement recursive dependency resolution.
- Implement alternative acquisition methods.
- Implement virtual inventory allocation.
- Implement resource acquisition time calculations.
- Implement probability-aware resource budgeting.

### Phase 4 — Expanded skill coverage

- Add remaining gathering and artisan skills.
- Add skill-specific calculation strategies.
- Implement passive and time-based skill mechanics.
- Implement probability-based skills.
- Add combat calculation support separately where appropriate.

### Phase 5 — Advanced planning

- Implement action comparison.
- Implement multi-stage progression optimization.
- Implement saved progression plans.
- Implement equipment and upgrade comparisons.
- Implement hypothetical character states.

### Phase 6 — Polish and distribution

- Refine UI consistency and responsiveness.
- Improve performance.
- Complete documentation.
- Implement game data update tools.
- Improve accessibility.
- Prepare production builds.
- Evaluate optional Tauri desktop packaging.

## 23. Development instructions

Begin by inspecting the repository and identifying any existing implementation.

If the repository is empty, initialize the proposed project structure.

Before substantial feature implementation, create:

- README.md
- docs/architecture.md
- docs/game-data-sources.md
- docs/game-mechanics.md
- docs/save-format.md
- docs/calculation-formulas.md
- docs/implementation-checklist.md

Maintain the implementation checklist throughout development.

Mark features as completed only when their implementation and relevant tests are complete.

Document blockers, assumptions, unknown mechanics, and data licensing considerations.

Do not attempt to implement every feature simultaneously.

Complete the research phase, then implement the core calculator as a functional vertical slice.

The initial working application should allow a user to:

1. Select a supported skill.
2. Select an actual game action.
3. Enter their current level or exact XP.
4. Select a target level.
5. Configure supported modifiers.
6. Calculate required actions.
7. Calculate resource consumption.
8. Calculate expected production.
9. Calculate estimated training time.
10. Inspect how the result was calculated.

Once the initial implementation is functional and tested, continue through the development roadmap.

Prioritize maintainability, calculation accuracy, extensibility, and clear communication of uncertainty over prematurely implementing every possible feature.