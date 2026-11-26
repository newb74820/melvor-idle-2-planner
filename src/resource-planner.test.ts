import { expect, it } from 'vitest';
import type { ItemAmount } from './calculator';
import { resourceRecipesForCharacter } from './data/resource-recipes';
import { mergePlanningInventory, planResources, type ResourceRecipe } from './resource-planner';
import { decodedSaveSchema } from './schemas/save';
import { rockBreakTiming } from './data/mining';

const item = (id: string, quantity: number): ItemAmount => ({ itemId: id, itemName: id, quantity });
const recipe = (id: string, inputs: ItemAmount[], outputs: ItemAmount[]): ResourceRecipe => ({
  id, name: id, skill: 'Test', requiredLevel: 1, baseXp: 2, intervalSeconds: 1, source: '', inputs, outputs,
});

it('uses owned bows and ingredients without mutating the source bank', () => {
  const inventory = Object.freeze({ NormalBow: 1, NormalLog: 4, Bowstring: 1, Flax: 1 });
  const result = planResources({
    target: { itemId: 'NormalBow', itemName: 'Normal Bow', quantity: 4 },
    recipes: resourceRecipesForCharacter(null),
    inventory,
    skillLevels: { Woodcutting: 5 },
  });
  expect(result.tree.fromInventory).toBe(1);
  expect(result.steps.map(({ recipe, batches }) => [recipe.id, batches])).toEqual([
    ['normal-tree', 2], ['flax-bush', 1], ['crafting-bowstring', 2], ['fletching-normal-bow', 3],
  ]);
  expect(result.activeSeconds).toBe(30);
  expect(result.external).toEqual([]);
  expect(result.prerequisites).toEqual([]);
  expect(inventory).toEqual({ NormalBow: 1, NormalLog: 4, Bowstring: 1, Flax: 1 });
});

it('resolves whole batches and flags sources that require prerequisites or external inputs', () => {
  const recipes = resourceRecipesForCharacter(null);
  const result = planResources({
    target: item('CopperArrows', 9), recipes, skillLevels: { Smithing: 2, Fletching: 5, Mining: 5 },
  });
  expect(result.steps.at(-1)?.batches).toBe(3);
  expect(result.items.find(({ itemId }) => itemId === 'CopperArrows')).toMatchObject({ produced: 12, surplus: 3 });
  expect(result.external.map(({ itemId, external }) => [itemId, external])).toEqual([['Feathers', 2]]);
  const mining = result.steps.find(({ recipe }) => recipe.id === 'mining-CopperOre');
  expect(mining?.batches).toBe(2);
  expect(mining?.seconds).toBeCloseTo(7.599);
  expect(mining?.xp).toBe(12);
  expect(result.prerequisites).toHaveLength(2);

  const automatic = planResources({ target: item('OakLog', 3), recipes, skillLevels: { Woodcutting: 10 } });
  expect(automatic.tree.recipe?.id).toBe('oak-tree');
  const alternative = planResources({
    target: item('OakLog', 3), recipes, skillLevels: { Woodcutting: 10 }, recipeChoices: { OakLog: 'wood-debris' },
  });
  expect(alternative.items[0]).toMatchObject({ produced: 10, surplus: 7 });
  expect(alternative.prerequisites).toHaveLength(1);
});

it('prices shop purchases once across an inventory-aware crafting chain', () => {
  const result = planResources({
    target: item('EmptyVial', 21),
    recipes: resourceRecipesForCharacter(null),
    inventory: { MoltenGlass: 1, BucketofSand: 1 },
    skillLevels: { Crafting: 10, Smithing: 2 },
    currencyBalances: { GoldPieces: 7n },
  });
  expect(result.steps.map(({ recipe, batches }) => [recipe.id, batches])).toEqual([
    ['shop-BucketofSand', 2], ['smithing-molten-glass', 3], ['crafting-pack-of-vials', 2],
  ]);
  expect(result.currencies).toMatchObject([{ amount: 10n, available: 7n, shortage: 3n }]);
  expect(result.activeSeconds).toBeCloseTo(15.5);
  expect(result.skills.map(({ skill }) => skill)).toEqual(['Smithing', 'Crafting']);
});

it('charges exact currencies on explicitly chosen shop routes and reports rank prerequisites', () => {
  const result = planResources({
    target: item('CopperArrows', 9),
    recipes: resourceRecipesForCharacter(null),
    inventory: { CopperArrows: 2 },
    recipeChoices: { CopperArrows: 'shop-CopperArrows' },
    currencyBalances: { GoldPieces: 9_007_199_254_740_999n },
  });
  expect(result.steps[0].batches).toBe(7);
  expect(result.prerequisites[0]).toContain('Skilled Fletcher');
  expect(result.currencies).toMatchObject([{ amount: 105n, available: 9_007_199_254_740_999n, shortage: 0n }]);
  expect(result.external).toEqual([]);
});

it('requires opt-in to budget chance-based drops and keeps expected surplus out of inventory', () => {
  const recipes = resourceRecipesForCharacter(null);
  const target = item('Ash', 3);
  const conservative = planResources({ target, recipes });
  expect(conservative.tree).toMatchObject({ reason: 'chance-based source excluded', external: 3 });
  const expected = planResources({ target, recipes, allowEstimatedYields: true, inventory: { NormalLog: 8 } });
  expect(expected.tree.batches).toBe(8);
  expect(expected.activeSeconds).toBe(32);
  expect(expected.hasEstimatedYields).toBe(true);
  expect(expected.items[0]).toMatchObject({ expectedProduced: 4, remaining: 0, surplus: 0 });
  expect(expected.items[1].allocated).toBe(8);
});

it('uses capped early-break rolls to estimate completion time', () => {
  expect(rockBreakTiming(0.3, 1.5)).toMatchObject({ maximumHits: 4, secondsPerHit: 1.5 });
  expect(rockBreakTiming(0.3, 1.5).expectedHits).toBeCloseTo(2.533);
  expect(rockBreakTiming(1, 1.5).expectedHits).toBe(1);
  expect(() => rockBreakTiming(0, 1.5)).toThrow(RangeError);
});

it('allocates shared inventory once and carries earlier batch surplus and co-products forward', () => {
  const recipes = [
    recipe('final', [item('left', 1), item('right', 1), item('byproduct', 1)], [item('goal', 1)]),
    recipe('left', [item('bar', 2)], [item('left', 1)]),
    recipe('right', [item('bar', 2)], [item('right', 1)]),
    recipe('smelt', [item('ore', 1)], [item('bar', 3), item('byproduct', 1)]),
  ];
  const result = planResources({ target: item('goal', 1), recipes, inventory: { bar: 1, ore: 1 } });
  expect(result.steps.filter(({ recipe }) => recipe.id === 'smelt')).toHaveLength(1);
  expect(result.items.find(({ itemId }) => itemId === 'bar')).toMatchObject({ quantity: 4, allocated: 1, produced: 3, surplus: 0 });
  expect(result.tree.children[2].fromProduction).toBe(1);
  expect(result.external).toEqual([]);
});

it('stops cyclic paths and identifies the outside supply needed to break the cycle', () => {
  const recipes = [recipe('a', [item('b', 1)], [item('a', 1)]), recipe('b', [item('a', 1)], [item('b', 1)])];
  const result = planResources({ target: item('a', 1), recipes });
  expect(result.tree.children[0].children[0]).toMatchObject({ reason: 'circular dependency', external: 1 });
  expect(result.external[0]).toMatchObject({ itemId: 'a', external: 1 });
});

it('allows a zero override or ignoring imported bank values', () => {
  expect(mergePlanningInventory({ Flax: 50, NormalLog: 20 }, { Flax: 0 })).toEqual({ Flax: 0, NormalLog: 20 });
  expect(mergePlanningInventory({ Flax: 50, NormalLog: 20 }, { Flax: 0 }, false)).toEqual({ Flax: 0 });
  expect(() => planResources({ target: item('Flax', 1.5), recipes: [] })).toThrow(RangeError);
});

it('shares supported Woodcutting rates and budgets only guaranteed output', () => {
  const save = decodedSaveSchema.parse({
    version: 32, demo: false, name: 'Planner fixture', mode: 'Normal',
    uuid: '00000000-0000-4000-8000-000000000001', savedAt: '2026-11-26T12:00:00Z',
    totalLevel: 10, gp: '0', slayerCoins: '0', wallet: {}, unknownComponents: [],
    activity: { kind: null, target: null }, skills: [],
    bank: { stacks: 0, tabs: 1, items: {}, unknownTrailingBytes: 0 },
    deedreeNodes: ['MelvorBase:DeedreeA1', 'MelvorBase:DeedreeB1'],
    woodcuttingToolbelt: { 'MelvorBase:WoodcuttingTool': 'MelvorBase:BushyAxe' },
    shopPurchases: { 'MelvorBase:CopperAxeHead': 1, 'MelvorBase:WillowAxeHandle': 1 },
  });
  const rates = resourceRecipesForCharacter(save);
  const flax = rates.find(({ id }) => id === 'flax-bush');
  expect(flax?.baseXp).toBeCloseTo(3.06);
  expect(flax?.intervalSeconds).toBeCloseTo(1.98);
  expect(flax?.outputs[0].quantity).toBe(2);
  const result = planResources({ target: item('Flax', 3), recipes: rates, skillLevels: { Woodcutting: 5 } });
  expect(result.steps[0].batches).toBe(2);
  expect(result.items[0]).toMatchObject({ produced: 4, surplus: 1 });
});
