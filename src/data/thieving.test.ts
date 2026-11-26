import { expect, it } from 'vitest';
import { calculateThievingPlan, resolveThievingPerceptionDistractions, resolveThievingStealthEquipment, thievingActions } from './thieving';
import { foodBudget, healingFoods } from './food-budget';
import { xpAtLevel } from './xp-table';

const citizen = thievingActions.find(({ id }) => id === 'Citizen')!;

it('includes repeat attempts, stun time, damage, and food while success chance improves by level', () => {
  const plan = calculateThievingPlan({ action: citizen, currentXp: 82, targetXp: 96 });
  const failures = 31 / 101 + 30 / 102;
  expect(plan.actions).toBe(2);
  expect(plan.startingSuccessChance).toBeCloseTo(101 / 132);
  expect(plan.expectedAttempts).toBeCloseTo(2 + failures);
  expect(plan.trainingSeconds).toBeCloseTo(6 + 5 * failures);
  expect(plan.expectedDamage).toBeCloseTo(13 * failures);
  expect(plan.maxFailureHit).toBe(25);
  expect(plan.expectedGp).toBeCloseTo(12.75);
  expect(foodBudget(plan.expectedDamage, healingFoods[0].healing, 0)).toEqual({ required: 1, missing: 1 });
});

it('rolls stage loot at each heist success and completion loot only once when XP is awarded', () => {
  const action = thievingActions.find(({ id }) => id === 'LowerFloors')!;
  const currentXp = xpAtLevel(50);
  const plan = calculateThievingPlan({
    action, currentXp, targetXp: currentXp + 4000, outputDoublingChance: 0.25,
    inventory: { Bread: 10 },
  });
  expect(plan.actions).toBe(1);
  expect(plan.expectedAttempts).toBeCloseTo(30 / (150 / 1520));
  expect(plan.expectedGp).toBe(1440);
  expect(plan.products.find(({ itemId }) => itemId === 'Bread')?.projected).toBeCloseTo(88.75);
  expect(plan.products.find(({ itemId }) => itemId === 'AbyssalVaultKeyMould')?.produced).toBeCloseTo(2 / 3);
});

it('keeps stuns when damage is avoided and removes failures only at guaranteed success', () => {
  const input = { action: citizen, currentXp: 0, targetXp: 70 };
  const baseline = calculateThievingPlan(input);
  const avoided = calculateThievingPlan(input, 0, 1);
  expect(avoided.expectedDamage).toBe(0);
  expect(avoided.maxFailureHit).toBe(0);
  expect(avoided.trainingSeconds).toBe(baseline.trainingSeconds);
  const guaranteed = calculateThievingPlan(input, 31);
  expect(guaranteed.expectedFailures).toBe(0);
  expect(guaranteed.trainingSeconds).toBe(30);
});

it('applies a purchased perception distraction once, only to targets in its area', () => {
  const save = { version: 32, demo: false, shopPurchases: {
    'MelvorBase:GoldRingsonStrings': 2,
    'MelvorBase:TaintedWine': 1,
    'MelvorBase:RareFind': 0,
  } };
  const target = (id: string) => thievingActions.find((action) => action.id === id)!;
  expect(resolveThievingPerceptionDistractions(citizen, save).map(({ id }) => id)).toEqual(['GoldRingsonStrings']);
  expect(resolveThievingPerceptionDistractions(target('Thug'), save)).toHaveLength(1);
  expect(resolveThievingPerceptionDistractions(target('Bandit'), save).map(({ id }) => id)).toEqual(['TaintedWine']);
  expect(resolveThievingPerceptionDistractions(target('Blacksmith'), save)).toEqual([]);
  expect(resolveThievingPerceptionDistractions(target('Fisherman'), save)).toEqual([]);
  expect(resolveThievingPerceptionDistractions(citizen, { ...save, shopPurchases: null })).toEqual([]);
});

it('reduces Citizen perception to 30 and recomputes failures as Stealth increases', () => {
  const input = { action: citizen, currentXp: xpAtLevel(30) - 7, targetXp: xpAtLevel(30) + 7 };
  const baseline = calculateThievingPlan(input);
  const distracted = calculateThievingPlan(input, 0, 0, -5);
  const guaranteed = calculateThievingPlan(input, 1, 0, -5);
  expect(baseline.startingSuccessChance).toBeCloseTo(129 / 132);
  expect(distracted.perception).toBe(30);
  expect(distracted.startingStealth).toBe(29);
  expect(distracted.startingSuccessChance).toBeCloseTo(129 / 130);
  expect(distracted.expectedFailures).toBeCloseTo(1 / 129);
  expect(distracted.expectedDamage).toBeCloseTo(13 / 129);
  expect(guaranteed.startingSuccessChance).toBe(1);
  expect(guaranteed.expectedFailures).toBe(0);
  expect(guaranteed.expectedDamage).toBe(0);
});

it('matches the saved Citizen setup with Gold Rings and an equipped Balaclava', () => {
  const save = {
    version: 32, demo: false,
    shopPurchases: { 'MelvorBase:GoldRingsonStrings': 1 },
    thievingToolbelt: {
      'MelvorBase:ThievingHelmet': 'MelvorBase:Balaclava',
      'MelvorBase:ThievingTool': 'MelvorBase:Lockpick',
    },
  };
  const equipment = resolveThievingStealthEquipment(save);
  const distractions = resolveThievingPerceptionDistractions(citizen, save);
  const stealth = equipment.reduce((total, bonus) => total + bonus.stealth, 0);
  const perception = distractions.reduce((total, bonus) => total + bonus.percentage, 0);
  const plan = calculateThievingPlan({ action: citizen, currentXp: 12576, targetXp: xpAtLevel(30) }, stealth, 0, perception);
  expect(plan.startingStealth).toBe(44);
  expect(plan.perception).toBe(30);
  expect(plan.startingSuccessChance).toBe(1);
  expect(plan.expectedDamage).toBe(0);
  expect(resolveThievingStealthEquipment({ ...save, thievingToolbelt: undefined })).toEqual([]);
});
