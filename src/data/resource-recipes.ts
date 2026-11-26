import type { ItemAmount } from '../calculator';
import type { ResourceRecipe } from '../resource-planner';
import type { DecodedSave } from '../schemas/save';
import { woodcuttingActions, woodcuttingSource } from './woodcutting';
import { resolveWoodcuttingRates } from './woodcutting-modifiers';
import { miningResourceRecipes } from './mining';
import { firemakingActions } from './firemaking';

const item = (itemId: string, itemName: string, quantity = 1): ItemAmount => ({ itemId, itemName, quantity });
const normalLog = item('NormalLog', 'Normal Log');
const bowstring = item('Bowstring', 'Bowstring');
const copperBar = item('CopperBar', 'Copper Bar');
const feathers = item('Feathers', 'Feathers');
const sand = item('BucketofSand', 'Bucket of Sand');
const glass = item('MoltenGlass', 'Molten Glass');

// Whole batches and base rates from build 26724394.
const artisanRecipes: ResourceRecipe[] = [
  { id: 'crafting-bowstring', skill: 'Crafting', name: 'Bowstring', requiredLevel: 1, baseXp: 2, intervalSeconds: 2,
    inputs: [item('Flax', 'Flax')], outputs: [bowstring], source: 'https://db.melvor.aevv.net/artisan-recipe/Bowstring' },
  { id: 'fletching-normal-bow', skill: 'Fletching', name: 'Normal Bow', requiredLevel: 1, baseXp: 7, intervalSeconds: 6,
    inputs: [{ ...normalLog, quantity: 2 }, bowstring], outputs: [item('NormalBow', 'Normal Bow')], source: 'https://db.melvor.aevv.net/artisan-recipe/NormalBow' },
  { id: 'fletching-arrow-shaft', skill: 'Fletching', name: 'Arrow Shaft', requiredLevel: 1, baseXp: 2, intervalSeconds: 2,
    inputs: [normalLog], outputs: [item('ArrowShaft', 'Arrow Shaft', 20)], source: 'https://db.melvor.aevv.net/artisan-recipe/ArrowShaft' },
  { id: 'fletching-headless-arrows', skill: 'Fletching', name: 'Headless Arrows', requiredLevel: 1, baseXp: 3, intervalSeconds: 2,
    inputs: [item('ArrowShaft', 'Arrow Shaft', 10), feathers], outputs: [item('HeadlessArrows', 'Headless Arrows', 10)], source: 'https://db.melvor.aevv.net/artisan-recipe/HeadlessArrows' },
  { id: 'smithing-copper-bar', skill: 'Smithing', name: 'Copper Bar', requiredLevel: 5, baseXp: 3, intervalSeconds: 2.5,
    inputs: [item('CopperOre', 'Copper Ore')], outputs: [copperBar], source: 'https://db.melvor.aevv.net/artisan-recipe/CopperBar' },
  { id: 'smithing-copper-arrowtips', skill: 'Smithing', name: 'Copper Arrowtips', requiredLevel: 5, baseXp: 4, intervalSeconds: 4,
    inputs: [copperBar], outputs: [item('CopperArrowtips', 'Copper Arrowtips', 10)], source: 'https://db.melvor.aevv.net/artisan-recipe/CopperArrowtips' },
  { id: 'fletching-copper-arrows', skill: 'Fletching', name: 'Copper Arrows', requiredLevel: 5, baseXp: 6, intervalSeconds: 4,
    inputs: [item('CopperArrowtips', 'Copper Arrowtips', 4), item('HeadlessArrows', 'Headless Arrows', 4)],
    outputs: [item('CopperArrows', 'Copper Arrows', 4)], source: 'https://db.melvor.aevv.net/artisan-recipe/CopperArrows' },
  { id: 'smithing-molten-glass', skill: 'Smithing', name: 'Molten Glass', requiredLevel: 2, baseXp: 2, intervalSeconds: 2.5,
    inputs: [sand], outputs: [glass], source: 'https://db.melvor.aevv.net/artisan-recipe/MoltenGlass' },
  { id: 'crafting-pack-of-vials', skill: 'Crafting', name: 'Pack of Vials', requiredLevel: 10, baseXp: 7, intervalSeconds: 4,
    inputs: [{ ...glass, quantity: 2 }], outputs: [item('EmptyVial', 'Pack of Vials', 20)], source: 'https://db.melvor.aevv.net/artisan-recipe/EmptyVial' },
];

const normalBurn = firemakingActions[0];
const firemakingSources: ResourceRecipe[] = normalBurn.drops.map(({ chance, ...drop }) => ({
  id: `firemaking-normal-${drop.itemId}`,
  skill: 'Firemaking',
  name: `Burn Normal Logs for ${drop.itemName}`,
  kind: 'gathering',
  requiredLevel: normalBurn.requiredLevel,
  baseXp: normalBurn.baseXp,
  intervalSeconds: normalBurn.intervalSeconds,
  outputChance: chance,
  inputs: normalBurn.inputs,
  outputs: [drop],
  source: normalBurn.source,
}));

function shop(output: ItemAmount, gp: number, inputs: ItemAmount[] = [], prerequisiteNote?: string): ResourceRecipe {
  return {
    id: `shop-${output.itemId}`, kind: 'purchase', skill: 'Shop', name: `Buy ${output.itemName}`,
    requiredLevel: 1, baseXp: 0, intervalSeconds: 0, inputs, outputs: [output],
    currencyCosts: gp > 0 ? [{ id: 'GoldPieces', name: 'GP', quantity: gp }] : [],
    prerequisiteNote, source: `https://db.melvor.aevv.net/shop-purchase/${output.itemId}`,
  };
}

const shopSources = [
  shop(sand, 5),
  shop(item('CopperArrows', 'Copper Arrows'), 15, [], 'Buying Copper Arrows requires Skilled Fletcher. Verify this rank in game.'),
  shop(item('HeadlessArrows', 'Headless Arrows', 10), 40, [feathers], 'Buying Headless Arrows requires Skilled Fletcher. Verify this rank in game.'),
  shop(bowstring, 0, [item('Flax', 'Flax')], 'Buying Bowstring requires Skilled Crafter. Verify this rank in game.'),
];

export function resourceRecipesForCharacter(save: DecodedSave | null, useImportedBonuses = true): ResourceRecipe[] {
  const gathering = woodcuttingActions.map((action): ResourceRecipe => {
    const rates = resolveWoodcuttingRates(action, save, useImportedBonuses);
    return {
      ...action,
      skill: 'Woodcutting',
      source: woodcuttingSource.recipeUrl,
      intervalSeconds: rates.intervalSeconds,
      baseXp: action.baseXp * (1 + rates.xpPercentage / 100),
      outputs: action.outputs.map((output, index) => ({
        ...output,
        quantity: output.quantity + (index === 0 ? rates.primaryQuantityBonus : 0),
      })),
    };
  });
  return [...gathering, ...miningResourceRecipes, ...artisanRecipes, ...firemakingSources, ...shopSources];
}
