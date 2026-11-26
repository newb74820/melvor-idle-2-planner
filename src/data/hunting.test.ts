import { expect, it } from 'vitest';
import { huntingActions, huntingTraps } from './hunting-animals';
import { calculateHuntingPlan, selectedHuntingTrap, traplessId } from './hunting';

const chicken = huntingActions.find(({ id }) => id === 'WildChicken')!;
const basic = huntingTraps.find(({ itemId }) => itemId === 'BasicSnare')!;
const strengthened = huntingTraps.find(({ itemId }) => itemId === 'ReinforcedSnare')!;

it('budgets every attempt and includes surveying and retracking in unbaited hunt time', () => {
  const plan = calculateHuntingPlan({
    action: chicken, currentXp: 0, targetXp: 83, inventory: { BasicSnare: 3, SeedBait: 20 },
  }, basic);
  expect(plan.actions).toBe(2);
  expect(plan.effectiveXpPerAction).toBeCloseTo(72.8);
  expect(plan.trappingAttempts).toBe(5);
  expect(plan.secondsPerCatch).toBe(74.5);
  expect(plan.resources).toMatchObject([{ itemId: 'BasicSnare', required: 5, missing: 2 }]);
  expect(plan.products.map(({ itemId }) => itemId)).toEqual(['RawChicken', 'Feathers', 'Bone']);
});

it('uses tier failure bonuses and preservation, and buys a shorter trap interval with optional bait', () => {
  const input = { action: chicken, currentXp: 0, targetXp: 830, inventory: { SeedBait: 1 } };
  const basicPlan = calculateHuntingPlan(input, basic);
  const improved = calculateHuntingPlan(input, strengthened);
  const baited = calculateHuntingPlan(input, strengthened, true);
  expect(improved.firstCatchChance).toBeCloseTo(0.45);
  expect(improved.trappingAttempts).toBeLessThan(basicPlan.trappingAttempts);
  expect(baited.trappingAttempts).toBe(improved.trappingAttempts);
  expect(improved.trainingSeconds - baited.trainingSeconds).toBeCloseTo(improved.trappingAttempts * 0.9);
  expect(baited.resources).toMatchObject([
    { itemId: 'ReinforcedSnare', required: Math.ceil(improved.trappingAttempts * 0.8) },
    { itemId: 'SeedBait', required: Math.ceil(improved.trappingAttempts), owned: 1 },
  ]);
});

it('only permits compatible traps, and charges no trap or bait for a trapless quest plan', () => {
  expect(selectedHuntingTrap(chicken, {}, { ReinforcedSnare: 2 })).toBe(strengthened);
  const wagon = huntingActions.find(({ id }) => id === 'PrisonerWagon')!;
  const trapless = selectedHuntingTrap(wagon, { trapsByType: { Snare: traplessId } }, {});
  expect(trapless).toBeNull();
  expect(calculateHuntingPlan({ action: wagon, currentXp: 0, targetXp: 500 }, trapless, true).resources).toEqual([]);
  const bird = huntingActions.find(({ id }) => id === 'GreentailBird')!;
  expect(() => calculateHuntingPlan({ action: bird, currentXp: 0, targetXp: 83 }, basic)).toThrow('compatible trap');
});
