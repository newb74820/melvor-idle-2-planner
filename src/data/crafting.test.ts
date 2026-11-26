import { expect, it } from 'vitest';
import { calculateActionPlan } from '../calculator';
import { craftingActions } from './crafting';
import { resourceRecipesForCharacter } from './resource-recipes';
import { xpAtLevel } from './xp-table';

it('uses the Pack of Vials bank ID and shares its full batch with the Resource Planner', () => {
  const action = craftingActions.find(({ id }) => id === 'EmptyVial')!;
  const currentXp = xpAtLevel(action.requiredLevel);
  const plan = calculateActionPlan({
    action, currentXp, targetXp: currentXp + 14,
    inventory: { MoltenGlass: 3, EmptyVial: 5 },
  });
  expect(plan.trainingSeconds).toBe(8);
  expect(plan.resources[0]).toMatchObject({ itemId: 'MoltenGlass', required: 4, missing: 1 });
  expect(plan.products[0]).toMatchObject({ itemId: 'EmptyVial', produced: 40, projected: 45 });
  expect(resourceRecipesForCharacter(null).find(({ id }) => id === 'crafting-pack-of-vials')).toMatchObject({
    intervalSeconds: action.intervalSeconds, inputs: action.inputs, outputs: action.outputs,
  });
});

it('counts each Ship Sail Repair ingredient and excludes the zero-probability reward', () => {
  const action = craftingActions.find(({ id }) => id === 'ShipSailRepair')!;
  const currentXp = xpAtLevel(action.requiredLevel);
  const plan = calculateActionPlan({
    action, currentXp, targetXp: currentXp + 2500,
    inventory: { YewLog: 95, ReinforcedRope: 10, SailCloth: 8, GreenDragonhide: 50 },
  });
  expect(action.prerequisiteNote).toBe('Requires Ship Shape at step 2.');
  expect(plan.trainingSeconds).toBe(100);
  expect(plan.resources.map(({ missing }) => missing)).toEqual([5, 0, 2, 0]);
  expect(plan.products).toEqual([]);
});
