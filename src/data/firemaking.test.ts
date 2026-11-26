import { expect, it } from 'vitest';
import { calculateActionPlan } from '../calculator';
import { firemakingActions } from './firemaking';
import { resourceRecipesForCharacter } from './resource-recipes';
import { expectedExtraProducts } from './skill-calculators';
import { xpAtLevel } from './xp-table';

it('budgets full Normal Logs and projects both random drops from the same data as the resource planner', () => {
  const burn = firemakingActions[0];
  const result = calculateActionPlan({
    action: { ...burn, outputs: expectedExtraProducts(burn) },
    currentXp: 0,
    targetXp: xpAtLevel(2),
    inventory: { NormalLog: 9, Ash: 2 },
    outputDoublingChance: 0.1,
  });

  expect(result.actions).toBe(14);
  expect(result.trainingSeconds).toBe(56);
  expect(result.resources[0]).toMatchObject({ itemId: 'NormalLog', required: 14, owned: 9, missing: 5 });
  expect(result.products[0].projected).toBeCloseTo(9.7);
  expect(result.products[1].produced).toBeCloseTo(3.08);
  expect(resourceRecipesForCharacter(null).find(({ id }) => id === 'firemaking-normal-Ash')).toMatchObject({
    inputs: burn.inputs, intervalSeconds: 4, outputChance: 0.25,
    outputs: [{ itemId: 'Ash', quantity: 2 }],
  });
});

it('uses full lantern batches and tracks the unlit and lit items separately', () => {
  const burn = firemakingActions.find(({ id }) => id === 'SteelLanternLit')!;
  const currentXp = xpAtLevel(burn.requiredLevel);
  const result = calculateActionPlan({
    action: burn, currentXp, targetXp: currentXp + 15,
    inventory: { SteelLantern: 21, SteelLanternLit: 3 },
  });
  expect(result.actions).toBe(2);
  expect(result.resources[0]).toMatchObject({ required: 20, missing: 0, remaining: 1 });
  expect(result.products[0]).toMatchObject({ itemId: 'SteelLanternLit', produced: 20, projected: 23 });
});

it('tracks every quest ingredient and keeps prayer rewards separate from bank drops', () => {
  const burn = firemakingActions.find(({ id }) => id === 'Brazier2')!;
  const currentXp = xpAtLevel(burn.requiredLevel);
  const result = calculateActionPlan({
    action: burn, currentXp, targetXp: currentXp + burn.baseXp,
    inventory: { Bone: 25, BigBone: 10, BlessedLog: 1 },
  });
  expect(result.resources.map(({ missing }) => missing)).toEqual([5, 0, 4]);
  expect(burn.prerequisiteNote).toContain('In the Thick of It');
  const blessed = firemakingActions.find(({ id }) => id === 'BlessedLog')!;
  expect(blessed.prayerPoints).toBe(55);
  expect(expectedExtraProducts(blessed)).toEqual([{ itemId: 'BlessedFragments', itemName: 'Blessed Fragments', quantity: 0.1 }]);
});
