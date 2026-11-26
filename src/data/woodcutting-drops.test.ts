import { expect, it } from 'vitest';
import { estimateWoodcuttingDrops } from './woodcutting-drops';
import { woodcuttingActions } from './woodcutting';

const action = (id: string) => woodcuttingActions.find((entry) => entry.id === id)!;

it('rolls nests per hit and seeds per cut', () => {
  const oak = action('oak-tree');
  const [baseBird, baseSeed] = estimateWoodcuttingDrops(oak, 1000, 4);
  expect(baseBird.expectedQuantity).toBe(10);
  expect(baseSeed.expectedQuantity).toBe(1);
  const [fasterBird, fasterSeed] = estimateWoodcuttingDrops(oak, 1000, 2);
  expect(fasterBird.expectedQuantity).toBe(5);
  expect(fasterSeed.expectedQuantity).toBe(1);
});

it('applies Skilled rank quantity to Bird and Eagle Nests and applies bonuses to the proper rolls', () => {
  const [bird, eagle, seed] = estimateWoodcuttingDrops(action('ashen-tree'), 100, 10, {
    nestQuantityBonus: 1,
    birdNestChancePercent: 0.1,
    eagleNestChancePercent: 0.05,
    onCutChancePercent: 0.025,
    outputDoublingPercent: 10,
  });
  expect(bird.expectedQuantity).toBeCloseTo(3.96);
  expect(eagle.expectedQuantity).toBeCloseTo(2.86);
  expect(seed.expectedQuantity).toBeCloseTo(0.195);
  const [, drake] = estimateWoodcuttingDrops(action('redwood-tree'), 100, 26, { nestQuantityBonus: 1 });
  expect(drake).toMatchObject({ itemId: 'DrakeNest', expectedQuantity: 0.52 });
});

it('preserves two-stick rolls and never introduces drops for quest actions', () => {
  const [sticks] = estimateWoodcuttingDrops(action('duskleaf-bush'), 10, 2, { outputDoublingPercent: 10 });
  expect(sticks.expectedQuantity).toBeCloseTo(33);
  expect(estimateWoodcuttingDrops(action('wood-debris'), 100, 30, { onCutChancePercent: 0.05 })).toEqual([]);
  expect(estimateWoodcuttingDrops(action('oak-tree'), 0, 4).every(({ expectedQuantity }) => expectedQuantity === 0)).toBe(true);
});
