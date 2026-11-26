import { expect, it } from 'vitest';
import { calculateAgilityPlan, evaluateAgilityPath, techniqueXpAtLevel } from './agility';
import { agilityActions, agilityTechniques, type AgilityTechniqueProgress } from './agility-courses';
import { foodBudget } from './food-budget';

const climb = agilityActions.find(({ id }) => id === 'Climb1SimplePath')!;
const arena = agilityActions.find(({ id }) => id === 'Arena1AdvancedPath')!;
const maxLevels: AgilityTechniqueProgress = Object.fromEntries(agilityTechniques.map((technique) => [technique, 40]));

it('includes all 57 selectable paths and estimates each with base technique levels', () => {
  expect(new Set(agilityActions.map(({ id }) => id)).size).toBe(57);
  for (const action of agilityActions) {
    const plan = calculateAgilityPlan({ action, currentXp: 0, targetXp: action.baseXp }, {});
    expect(Number.isFinite(plan.trainingSeconds)).toBe(true);
    expect(plan.trainingSeconds).toBeGreaterThan(0);
  }
});

it('restarts the path on failure and reaches zero food use when the technique clears the difficulty', () => {
  const input = { action: climb, currentXp: 0, targetXp: 6 };
  const startXp = techniqueXpAtLevel(4) - 5;
  const plan = calculateAgilityPlan(input, { Climbing: startXp });
  const p = Math.sqrt(0.95);
  expect(plan.starting.chance).toBeCloseTo(p);
  expect(plan.trainingSeconds).toBeCloseTo(5 / p + 5);
  expect(plan.expectedFailures).toBeCloseTo(1 / p - 1);
  expect(plan.expectedDamage).toBeCloseTo(13 * (1 / p - 1));
  expect(plan.maxFailureHit).toBe(25);
  expect(plan.endingLevels.Climbing).toBe(4);

  const guaranteed = calculateAgilityPlan(input, { Climbing: techniqueXpAtLevel(4) });
  expect(guaranteed.starting.chance).toBe(1);
  expect(guaranteed.expectedFailures).toBe(0);
  expect(guaranteed.expectedDamage).toBe(0);
  expect(foodBudget(guaranteed.expectedDamage, 15, 0)).toEqual({ required: 0, missing: 0 });
  expect(guaranteed.trainingSeconds).toBe(10);
});

it('caps traps at 95% and handles obstacle retries without charging a new entry', () => {
  const xp = Object.fromEntries(agilityTechniques.map((technique) => [technique, techniqueXpAtLevel(40)]));
  const input = { action: arena, currentXp: 0, targetXp: 96, inventory: { ArenaEntryTicket: 5 } };
  const baseline = calculateAgilityPlan(input, xp);
  expect(baseline.starting.chance).toBeCloseTo(0.8);
  expect(baseline.resources[0]).toMatchObject({ required: 10, owned: 5, missing: 5 });
  expect(baseline.products[0].produced).toBe(22);
  expect(evaluateAgilityPath(arena, maxLevels, { trapSuccessBonus: 0.15 }).chance).toBeCloseTo(0.95);

  const retry = calculateAgilityPlan(input, xp, { retryChance: 1, damageAvoidance: 1 });
  expect(retry.starting.chance).toBe(1);
  expect(retry.expectedFailures).toBeCloseTo(0.25);
  expect(retry.expectedDamage).toBe(0);
  expect(retry.resources[0].required).toBe(5);
});
