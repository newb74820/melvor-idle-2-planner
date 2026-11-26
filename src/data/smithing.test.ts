import { expect, it } from 'vitest';
import { calculateActionPlan } from '../calculator';
import { expectedArtisanSteps } from './artisan';
import { resourceRecipesForCharacter } from './resource-recipes';
import { smithingActions } from './smithing';
import { xpAtLevel } from './xp-table';

it('applies XP and all ten arrowtips once per two-step batch', () => {
  const action = smithingActions.find(({ id }) => id === 'CopperArrowtips')!;
  const currentXp = xpAtLevel(5);
  const result = calculateActionPlan({
    action, currentXp, targetXp: currentXp + 9,
    inventory: { CopperBar: 2, CopperArrowtips: 5 },
  });
  expect(result.actions).toBe(3);
  expect(result.trainingSeconds).toBe(12);
  expect(result.products[0].projected).toBe(35);
  expect(result.resources[0]).toMatchObject({ itemId: 'CopperBar', required: 3, missing: 1 });
  expect(resourceRecipesForCharacter(null).find(({ id }) => id === 'smithing-copper-arrowtips')).toMatchObject({
    intervalSeconds: action.intervalSeconds, inputs: action.inputs, outputs: action.outputs,
  });
});

it('charges the final step even when every eligible Smithing step skips', () => {
  expect(expectedArtisanSteps(1, 1)).toBe(1);
  expect(expectedArtisanSteps(5, 0)).toBe(5);
  expect(expectedArtisanSteps(5, 1)).toBe(3);
  expect(expectedArtisanSteps(4, 0.5)).toBeCloseTo(2.875);
});

it('keeps quest-only work with no item reward and uses actual bank IDs for packed yields', () => {
  const repair = smithingActions.find(({ id }) => id === 'ShipKeelRepair')!;
  expect(repair).toMatchObject({ steps: 50, intervalSeconds: 100, outputs: [] });
  expect(repair.prerequisiteNote).toContain('Ship Shape');
  const pack = smithingActions.find(({ id }) => id === 'DragonArrowtipsPack')!;
  expect(pack.outputs[0].itemId).toBe('DragonArrowtips');
});
