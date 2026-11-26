import { expect, it } from 'vitest';
import { calculateActionPlan } from '../calculator';
import { runecraftingActions } from './runecrafting';
import { expectedExtraProducts } from './skill-calculators';

it('budgets a full Rune Essence per Air Rune batch', () => {
  const action = runecraftingActions.find(({ id }) => id === 'AirRune')!;
  const plan = calculateActionPlan({
    action, currentXp: 0, targetXp: 83,
    inventory: { RuneEssence: 30, AirRune: 6 },
  });
  expect(plan.actions).toBe(42);
  expect(plan.trainingSeconds).toBe(84);
  expect(plan.resources[0]).toMatchObject({ itemId: 'RuneEssence', required: 42, missing: 12 });
  expect(plan.products[0]).toMatchObject({ itemId: 'AirRune', produced: 42, projected: 48 });
});

it('awards XP on every pack batch and budgets each element by its own roll', () => {
  const action = runecraftingActions.find(({ id }) => id === 'DustRunePack')!;
  expect(action.hasLevelRequirement).toBe(false);
  expect(action.prerequisiteNote).toContain('Skilled Runecrafter');
  const plan = calculateActionPlan({
    action: { ...action, outputs: expectedExtraProducts(action) },
    currentXp: 0, targetXp: 150, outputDoublingChance: 0.2,
    inventory: { PureEssence: 10, AirRune: 2 },
  });
  expect(plan.actions).toBe(10);
  expect(plan.xpGained).toBe(150);
  expect(plan.resources[0]).toMatchObject({ itemId: 'PureEssence', required: 10, missing: 0 });
  expect(plan.products).toMatchObject([
    { itemId: 'AirRune', produced: 9, projected: 11 },
    { itemId: 'EarthRune', produced: 9, projected: 9 },
  ]);

  const elemental = runecraftingActions.find(({ id }) => id === 'ElementalRunePack')!;
  expect(elemental.prerequisiteNote).toContain('Veteran Runecrafter');
  expect(expectedExtraProducts(elemental).map(({ quantity }) => quantity)).toEqual([1, 1, 1, 1]);
});
