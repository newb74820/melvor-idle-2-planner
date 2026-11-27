import { describe, expect, it } from 'vitest';
import { farmingCrops, farmingFlowers } from './data/farming';
import { hasSkillCalculator } from './data/skill-calculators';
import { calculateFarmingPlan } from './farming-planner';

const crop = (id: string) => farmingCrops.find((entry) => entry.id === id)!;
const potato = crop('Potato');
const penril = crop('PenrilHerb');
const banana = crop('BananaTree');

describe('passive Farming', () => {
  it('opens Farming and includes all plot recipes, with flowers listed separately', () => {
    expect(hasSkillCalculator('Farming')).toBe(true);
    expect(farmingCrops).toHaveLength(43);
    expect(farmingCrops.every((entry) => entry.output.quantity > 0)).toBe(true);
    expect(farmingFlowers).toHaveLength(6);
  });

  it('reaches its goal at the first shared harvest time across parallel plots', () => {
    const plan = calculateFarmingPlan({
      plantings: [{ crop: potato, plots: 2 }, { crop: penril, plots: 1 }],
      currentXp: 0, goal: { targetXp: 83 }, inventory: { PotatoSeed: 4, PenrilHerbSeed: 2 },
    });
    expect(plan.elapsedSeconds).toBe(7200);
    expect(plan.xpGained).toBe(115);
    expect(plan.crops.map(({ harvests }) => harvests)).toEqual([2, 1]);
    expect(plan.resources).toMatchObject([
      { itemId: 'PotatoSeed', required: 6, missing: 2 },
      { itemId: 'PenrilHerbSeed', required: 2, missing: 0 },
    ]);
  });

  it('counts orchard regrowth on its own timer and buys seeds only when replanting', () => {
    const run = (hours: number) => calculateFarmingPlan({
      plantings: [{ crop: banana, plots: 2 }], currentXp: 0, goal: { seconds: hours * 3600 },
    });
    expect(run(47.99).crops[0].harvests).toBe(0);
    expect(run(56).crops[0]).toMatchObject({ harvests: 4, plantings: 2, produced: 800 });
    expect(run(168).crops[0]).toMatchObject({ harvests: 32, plantings: 2 });
    expect(run(215.99).resources[0].required).toBe(2);
    expect(run(216).crops[0]).toMatchObject({ harvests: 34, plantings: 4 });
    expect(run(216).resources[0].required).toBe(4);
  });

  it('uses the available time for 24-hour compost and ignores partial growth', () => {
    const plan = calculateFarmingPlan({
      plantings: [{ crop: crop('SuperCompost'), plots: 2 }, { crop: potato, plots: 1 }],
      currentXp: 0, goal: { seconds: 25 * 3600 },
    });
    expect(plan.crops[0]).toMatchObject({ harvests: 2, produced: 30, xpGained: 18 });
    expect(plan.crops[1].harvests).toBe(16);
    expect(plan.resources.find((row) => row.itemId === 'Charcoal')?.required).toBe(40);
  });

  it('honours modifiers and does not plant crops whose first harvest is after the target', () => {
    const plan = calculateFarmingPlan({
      plantings: [{ crop: potato, plots: 1 }, { crop: banana, plots: 1 }],
      currentXp: 0, goal: { targetXp: 34 * 1.1 },
      xpBonusPercent: 10, growthTimePercent: -10,
    });
    expect(plan.elapsedSeconds).toBe(4860);
    expect(plan.crops[1].harvests).toBe(0);
    expect(plan.resources.map(({ itemId }) => itemId)).toEqual(['PotatoSeed']);
  });

  it('rejects assigning too many plots of the same type across crops', () => {
    expect(() => calculateFarmingPlan({
      plantings: [{ crop: potato, plots: 6 }, { crop: crop('Onion'), plots: 5 }],
      currentXp: 0, goal: { seconds: 3600 },
    })).toThrow('Allotments has at most 10 plots');
  });
});
