import { expect, it } from 'vitest';
import { calculateActionPlan } from '../calculator';
import { planResources } from '../resource-planner';
import { beastcraftingActions, resolveBeastcraftingStations } from './beastcrafting';
import { resourceRecipesForCharacter } from './resource-recipes';
import { skillCalculators } from './skill-calculators';

it('registers the release recipes with their step timings, requirements, and product quantities', () => {
  expect(skillCalculators.Beastcrafting.actions).toHaveLength(145);
  expect(new Set(beastcraftingActions.map(({ id }) => id)).size).toBe(145);
  expect(beastcraftingActions[0]).toMatchObject({ id: 'FurCamoHat', baseXp: 11, steps: 3, intervalSeconds: 9 });
  expect(beastcraftingActions.find(({ id }) => id === 'GroundDreamleaf')).toMatchObject({
    requiredLevel: 45, intervalSeconds: 4,
    prerequisiteNote: 'Requires Unfortunate Teller at step 0 or 1.',
    outputs: [{ itemId: 'GroundDreamleaf', quantity: 10 }],
  });
  expect(beastcraftingActions.find(({ id }) => id === 'BoneCasing')?.outputs[0].quantity).toBe(180);
});

it('uses bank quantities for shortages and reuses the same recipes in the Resource Planner', () => {
  const inventory = { RabbitFur: 1, Leather: 2, Flax: 1 };
  const training = calculateActionPlan({ action: beastcraftingActions[0], currentXp: 0, targetXp: 22, inventory });
  expect(training.trainingSeconds).toBe(18);
  expect(training.resources[0]).toMatchObject({ itemId: 'RabbitFur', required: 2, owned: 1, missing: 1 });

  const resources = planResources({
    target: { itemId: 'FurCamoHat', itemName: 'Fur Camo Hat', quantity: 2 },
    recipes: resourceRecipesForCharacter(null), inventory,
  });
  expect(resources.tree.recipe?.skill).toBe('Beastcrafting');
  expect(resources.tree.children).toMatchObject([
    { itemId: 'RabbitFur', fromInventory: 1, external: 1 },
    { itemId: 'Leather', fromInventory: 2 },
    { itemId: 'String', batches: 1, recipe: { skill: 'Crafting' } },
  ]);
});

it('applies each confirmed station purchase once', () => {
  const save = { version: 32, demo: false, shopPurchases: {
    'MelvorBase:BeastcraftingStationI': 2,
    'MelvorBase:BeastcraftingStationII': 1,
    'MelvorBase:BeastcraftingStationIII': 1,
    'MelvorBase:BeastcraftingStationIV': 0,
  } };
  expect(resolveBeastcraftingStations(save)).toMatchObject({ stepSkipping: 6, doubling: 2, preservation: 2 });
  expect(resolveBeastcraftingStations({ ...save, demo: true }).purchased).toEqual([]);
});
