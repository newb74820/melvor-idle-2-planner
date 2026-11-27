import { describe, expect, it } from 'vitest';
import { ranchAnimals, ranchEnclosures, ranchLandLevels } from './data/ranching';
import { hasSkillCalculator } from './data/skill-calculators';
import { calculateRanchingPlan, type RanchCohort } from './ranching-planner';

const sheep = ranchAnimals.find(({ id }) => id === 'Sheep')!;
const chicken = ranchAnimals.find(({ id }) => id === 'Chicken')!;
const pasture = ranchEnclosures.find(({ id }) => id === 'CowSheepEnclosureI')!;
const coop = ranchEnclosures.find(({ id }) => id === 'ChickenCoopI')!;
const sheepGroup: RanchCohort = { animal: sheep, count: 1, ageHours: null, happinessPercent: 96 };

describe('passive Ranching', () => {
  it('registers the calculator with all animals, enclosures, and land', () => {
    expect(hasSkillCalculator('Ranching')).toBe(true);
    expect([ranchAnimals.length, ranchEnclosures.length, ranchLandLevels.length]).toEqual([20, 53, 15]);
  });

  it('adds purchase XP immediately and reaches the next target at a whole hourly tick', () => {
    const plan = calculateRanchingPlan({
      pens: [{ enclosure: pasture, cohorts: [sheepGroup] }],
      currentXp: 0, goal: { targetXp: 83 }, replace: false,
    });
    expect(plan).toMatchObject({ elapsedSeconds: 4 * 3600, goalReached: true, animalsPurchased: 1, gold: 13000, resources: [] });
    expect(plan.xpGained).toBeCloseTo(34 + 4 * 34 * 0.5 * 0.96);
    expect(plan.products.find(({ itemId }) => itemId === 'Wool')?.quantity).toBe(4);
  });

  it('switches output from young to adult at maturity without rebuying an existing animal', () => {
    const plan = calculateRanchingPlan({
      pens: [{ enclosure: pasture, cohorts: [{ ...sheepGroup, ageHours: 11, happinessPercent: 100 }] }],
      currentXp: 100, goal: { hours: 2 }, replace: false,
    });
    expect(plan).toMatchObject({ projectedXp: 151, animalsPurchased: 0, gold: 0 });
    expect(plan.products.find(({ itemId }) => itemId === 'Wool')?.quantity).toBe(6);
  });

  it('rounds products after combining animals and budgets feed across concurrent enclosures', () => {
    const cohorts = [{ animal: chicken, count: 1, ageHours: null, happinessPercent: 100 }];
    const plan = calculateRanchingPlan({
      pens: [{ enclosure: coop, cohorts }, { enclosure: coop, cohorts }],
      currentXp: 0, goal: { hours: 2.5 }, replace: false, inventory: { Grain: 25 },
    });
    expect(plan.elapsedSeconds).toBe(9000);
    expect(plan.resources).toMatchObject([{ itemId: 'Grain', required: 40, owned: 25, missing: 15 }]);
    expect(plan.products.find(({ itemId }) => itemId === 'RawChicken')?.quantity).toBe(2);
  });

  it('stops after expiry or pays for a new young animal when replacements are on', () => {
    const pens = [{ enclosure: pasture, cohorts: [{ ...sheepGroup, ageHours: 127, happinessPercent: 100 }] }];
    expect(calculateRanchingPlan({ pens, currentXp: 0, goal: { targetXp: 83 }, replace: false })).toMatchObject({
      elapsedSeconds: 3600, goalReached: false, xpGained: 0,
    });
    expect(calculateRanchingPlan({ pens, currentXp: 0, goal: { hours: 2 }, replace: true })).toMatchObject({
      animalsPurchased: 1, gold: 13000, xpGained: 68,
    });
  });

  it('shares capacity between animal groups in the same enclosure', () => {
    expect(() => calculateRanchingPlan({
      pens: [{ enclosure: pasture, cohorts: [{ ...sheepGroup, count: 2 }, sheepGroup] }],
      currentXp: 0, goal: { hours: 4 }, replace: false,
    })).toThrow('holds up to 2 animals');
  });
});
