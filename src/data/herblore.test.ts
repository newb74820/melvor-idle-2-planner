import { expect, it } from 'vitest';
import { calculateActionPlan } from '../calculator';
import { brewingSeconds, herbloreActions } from './herblore';

const woodcuttingPotion = herbloreActions.find(({ id }) => id === 'WoodcuttingPotionP1A')!;

it('charges setup at the start of each brew and stops timing at the final bottling', () => {
  const timing = woodcuttingPotion.brewTiming;
  expect(brewingSeconds(timing, 0)).toBe(0);
  expect(brewingSeconds(timing, 1)).toBe(25.5);
  expect(brewingSeconds(timing, 10)).toBe(30);
  expect(brewingSeconds(timing, 11)).toBe(55.5);
});

it('consumes ingredients and yields potion items once per bottling', () => {
  const result = calculateActionPlan({
    action: woodcuttingPotion, currentXp: 0, targetXp: 9,
    inventory: { EmptyVial: 2, PenrilHerb: 3, Stick: 3, WoodcuttingPotionP1A: 5 },
  });
  expect(result.actions).toBe(3);
  expect(result.xpPerHour).toBe(3600);
  expect(brewingSeconds(woodcuttingPotion.brewTiming, result.actions)).toBe(26.5);
  expect(result.resources[0]).toMatchObject({ itemId: 'EmptyVial', required: 3, owned: 2, missing: 1 });
  expect(result.products[0]).toMatchObject({ itemId: 'WoodcuttingPotionP1A', produced: 45, projected: 50 });
});

it('keeps the counted tier unlock distinct from Super Potion Research', () => {
  const byId = new Map(herbloreActions.map((action) => [action.id, action]));
  expect(byId.get('WoodcuttingPotionP2B')?.prerequisiteNote).toContain('1,000 × Woodcutting Potion P1-A');
  expect(byId.get('SuperWoodcuttingPotionP1A')?.prerequisiteNote).toContain('Super Potion Research');
  expect(byId.get('SuperWoodcuttingPotionP2A')?.prerequisiteNote).toContain('40,000 × Super Woodcutting Potion P1-A');
});
