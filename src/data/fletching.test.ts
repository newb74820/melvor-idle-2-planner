import { expect, it } from 'vitest';
import { calculateActionPlan } from '../calculator';
import { expectedArtisanSteps } from './artisan';
import { fletchingActions } from './fletching';
import { resourceRecipesForCharacter } from './resource-recipes';

it('uses the same Normal Bow inputs and three-step timing in both calculators', () => {
  const action = fletchingActions.find(({ id }) => id === 'NormalBow')!;
  const result = calculateActionPlan({
    action, currentXp: 0, targetXp: 14,
    effectiveIntervalSeconds: expectedArtisanSteps(action.steps, 1) * action.secondsPerStep,
    inventory: { NormalLog: 3, Bowstring: 2, NormalBow: 1 },
  });
  expect(result.actions).toBe(2);
  expect(result.trainingSeconds).toBe(8);
  expect(result.resources).toMatchObject([{ itemId: 'NormalLog', required: 4, missing: 1 }, { itemId: 'Bowstring', required: 2, missing: 0 }]);
  expect(result.products[0].projected).toBe(3);
  expect(resourceRecipesForCharacter(null).find(({ id }) => id === 'fletching-normal-bow')).toMatchObject({
    intervalSeconds: 6, inputs: action.inputs, outputs: action.outputs,
  });
});

it('uses the quest recipe ID for selection and the singular arrow ID for bank inventory', () => {
  const action = fletchingActions.find(({ id }) => id === 'SeaGriffinArrows')!;
  expect(action.prerequisiteNote).toContain('The Big City');
  const result = calculateActionPlan({ action, currentXp: 0, targetXp: 15, inventory: { SeaGriffinArrow: 7 } });
  expect(result.products[0]).toMatchObject({ itemId: 'SeaGriffinArrow', owned: 7, produced: 4, projected: 11 });
});
