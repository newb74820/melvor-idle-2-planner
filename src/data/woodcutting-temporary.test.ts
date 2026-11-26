import { expect, it } from 'vitest';
import { estimateWoodcuttingDrops } from './woodcutting-drops';
import { equippedWoodcuttingPotion, estimateOvergrowth } from './woodcutting-temporary';
import { woodcuttingActions } from './woodcutting';

const flax = woodcuttingActions.find(({ id }) => id === 'flax-bush')!;

it('spends one stack per cut and applies normal doubling to the extra items', () => {
  const overgrowth = estimateOvergrowth(flax, 10, 4, 15);
  expect(overgrowth.boostedCuts).toBe(4);
  expect(overgrowth.remainingStacks).toBe(0);
  expect(overgrowth.expectedExtraPrimary).toBeCloseTo(4.6);
  const [sticks] = estimateWoodcuttingDrops(flax, 10, 2, {
    outputDoublingPercent: 15,
    overgrowthCuts: overgrowth.boostedCuts,
  });
  expect(sticks.expectedQuantity).toBeCloseTo(8.05);
});

it('caps boosted cuts at the plan length and leaves trees unaffected', () => {
  expect(estimateOvergrowth(flax, 3, 5, 0)).toEqual({ boostedCuts: 3, remainingStacks: 2, expectedExtraPrimary: 3 });
  expect(estimateOvergrowth(flax, 0, 5, 0)).toEqual({ boostedCuts: 0, remainingStacks: 5, expectedExtraPrimary: 0 });
  expect(estimateOvergrowth(woodcuttingActions[0], 3, 5, 0)).toEqual({ boostedCuts: 0, remainingStacks: 5, expectedExtraPrimary: 0 });
});

it('identifies an equipped potion by its saved slot and rejects unsupported saves', () => {
  const save = { version: 32, demo: false, woodcuttingToolbelt: {
    'MelvorBase:WoodcuttingPotion': 'MelvorBase:SuperWoodcuttingPotionP2B',
  } };
  expect(equippedWoodcuttingPotion(save)).toMatchObject({ name: 'Super Woodcutting Potion P2-B' });
  expect(equippedWoodcuttingPotion({ ...save, version: 33 })).toBeNull();
  expect(equippedWoodcuttingPotion({ ...save, woodcuttingToolbelt: {} })).toBeNull();
});
