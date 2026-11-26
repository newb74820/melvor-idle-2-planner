import type { ItemAmount } from '../calculator';
import type { ResourceRecipe } from '../resource-planner';
import type { DecodedSave } from '../schemas/save';
import { expectedArtisanSteps } from './artisan';
import { beastcraftingActions, resolveBeastcraftingStations } from './beastcrafting';
import { woodcuttingActions, woodcuttingSource } from './woodcutting';
import { resolveWoodcuttingRates } from './woodcutting-modifiers';
import { miningResourceRecipes } from './mining';
import { craftingActions } from './crafting';
import { firemakingActions } from './firemaking';
import { fletchingActions } from './fletching';
import { smithingActions } from './smithing';

const item = (itemId: string, itemName: string, quantity = 1): ItemAmount => ({ itemId, itemName, quantity });
const bowstring = item('Bowstring', 'Bowstring');
const feathers = item('Feathers', 'Feathers');
const sand = item('BucketofSand', 'Bucket of Sand');

const artisanRecipeIds = new Map([
  ['Bowstring', 'crafting-bowstring'],
  ['String', 'crafting-string'],
  ['Leather', 'crafting-leather'],
  ['ReinforcedString', 'crafting-reinforced-string'],
  ['FortifiedString', 'crafting-fortified-string'],
  ['EmptyVial', 'crafting-pack-of-vials'],
  ['NormalBow', 'fletching-normal-bow'],
  ['ArrowShaft', 'fletching-arrow-shaft'],
  ['HeadlessArrows', 'fletching-headless-arrows'],
  ['CopperArrows', 'fletching-copper-arrows'],
  ['CopperBar', 'smithing-copper-bar'],
  ['CopperArrowtips', 'smithing-copper-arrowtips'],
  ['MoltenGlass', 'smithing-molten-glass'],
]);
const artisanSources: ResourceRecipe[] = ([
  ['Crafting', craftingActions],
  ['Fletching', fletchingActions],
  ['Smithing', smithingActions],
] as const).flatMap(([skill, actions]) => actions.flatMap((recipe) => {
  const id = artisanRecipeIds.get(recipe.id);
  return id ? [{ ...recipe, id, skill }] : [];
}));

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
  const { stepSkipping } = resolveBeastcraftingStations(useImportedBonuses ? save : null);
  const beastcrafting = beastcraftingActions.map((recipe): ResourceRecipe => ({
    ...recipe,
    id: `beastcrafting-${recipe.id}`,
    skill: 'Beastcrafting',
    intervalSeconds: recipe.secondsPerStep * expectedArtisanSteps(recipe.steps, stepSkipping / 100),
  }));
  return [...gathering, ...miningResourceRecipes, ...artisanSources, ...beastcrafting, ...firemakingSources, ...shopSources];
}
