import { expect, it } from 'vitest';
import { calculateActionPlan } from '../calculator';
import { expectedExtraProducts, skillCalculators } from './skill-calculators';
import { miningResourceRecipes } from './mining';
import { xpAtLevel } from './xp-table';

it('counts every Shallow Pools cast toward the XP target and separates expected fish, junk, and special items', () => {
  const spot = skillCalculators.Fishing.actions[0];
  const result = calculateActionPlan({
    action: { ...spot, outputs: [...spot.outputs, ...expectedExtraProducts(spot)] },
    currentXp: 0,
    targetXp: xpAtLevel(2),
    inventory: { RawShrimp: 4 },
  });
  expect(result.actions).toBe(11);
  expect(result.trainingSeconds).toBe(66);
  expect(result.xpPerHour).toBe(4800);
  expect(result.products[0].projected).toBeCloseTo(12.8);
  expect(result.products[1].produced).toBeCloseTo(2.2);
  expect(result.products[2].produced).toBeCloseTo(0.11);
});

it('weights Dock Waters special items in ascending chance order', () => {
  const spot = skillCalculators.Fishing.actions.find(({ id }) => id === 'DockWaters')!;
  const [seaweed, baitBox] = expectedExtraProducts(spot);
  expect(seaweed).toMatchObject({ itemId: 'SeaweedClump', quantity: 0.007 });
  expect(baitBox.itemId).toBe('BaitBox');
  expect(baitBox.quantity).toBeCloseTo(3 * 0.02 * (1 - 0.007), 8);
  const depths = skillCalculators.Fishing.actions.find(({ id }) => id === 'ShimmeringDepths')!;
  expect(expectedExtraProducts(depths)[1]).toMatchObject({ itemId: 'GlowSpore', quantity: 2 * (1 - 0.0002) });
});

it('shares copper break timing with the resource planner and rolls geodes on each expected hit', () => {
  const rock = skillCalculators.Mining.actions.find(({ id }) => id === 'CopperOre')!;
  const result = calculateActionPlan({
    action: { ...rock, outputs: [...rock.outputs, ...expectedExtraProducts(rock)] },
    currentXp: xpAtLevel(5),
    targetXp: xpAtLevel(5) + 60,
    inventory: { CopperOre: 3 },
    outputDoublingChance: 0.1,
  });
  expect(result.actions).toBe(10);
  expect(result.trainingSeconds).toBeCloseTo(37.995, 5);
  expect(result.products[0].projected).toBe(14);
  expect(result.products[1].produced).toBeCloseTo(10 * 2.533 * 0.0025 * 1.1, 8);
  expect(miningResourceRecipes.find(({ id }) => id === 'mining-CopperOre')?.intervalSeconds).toBe(rock.intervalSeconds);
});
