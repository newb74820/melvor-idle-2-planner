import { expect, it } from 'vitest';
import { calculateCookingPlan, cookingActions } from './cooking';
import { xpAtLevel } from './xp-table';

const shrimp = cookingActions[0];

it('tracks successful Cooking batches separately from expected attempts and whole ingredient costs', () => {
  const plan = calculateCookingPlan({
    action: shrimp,
    currentXp: 0,
    targetXp: xpAtLevel(2),
    inventory: { RawShrimp: 20, Shrimp: 5 },
  });
  expect(plan.startingSuccessChance).toBeCloseTo(0.7);
  expect(plan.actions).toBe(17);
  expect(plan.expectedAttempts).toBeCloseTo(17 / 0.7);
  expect(plan.trainingSeconds).toBeCloseTo(17 / 0.7 * 3);
  expect(plan.xpPerHour).toBeCloseTo(4200);
  expect(plan.resources[0]).toMatchObject({ required: 25, owned: 20, missing: 5 });
  expect(plan.products[0]).toMatchObject({ produced: 17, projected: 22 });
});

it('updates the success chance after the batch that gains a level and applies manual proficiency', () => {
  const input = { action: shrimp, currentXp: 82, targetXp: 97 };
  const plan = calculateCookingPlan(input);
  expect(plan.actions).toBe(3);
  expect(plan.expectedAttempts).toBeCloseTo(1 / 0.7 + 2 / 0.71);

  const guaranteed = calculateCookingPlan(input, 30);
  expect(guaranteed.expectedAttempts).toBe(3);
  expect(guaranteed.budgetedAttempts).toBe(3);
});

it('budgets all of a guaranteed bait recipe’s inputs and projects its full batch yield', () => {
  const bait = cookingActions.find(({ id }) => id === 'BasicBait')!;
  const currentXp = xpAtLevel(bait.requiredLevel);
  const plan = calculateCookingPlan({
    action: bait, currentXp, targetXp: currentXp + 9,
    inventory: { RawShrimp: 8, RawSardine: 1 },
    outputDoublingChance: 0.25,
  });
  expect(plan.budgetedAttempts).toBe(2);
  expect(plan.resources).toMatchObject([
    { itemId: 'RawShrimp', required: 2, missing: 0, remaining: 6 },
    { itemId: 'RawSardine', required: 2, missing: 1 },
  ]);
  expect(plan.products[0]).toMatchObject({ itemId: 'BasicBait', produced: 20 });
});
