import type { DecodedSave } from '../schemas/save';
import type { WoodcuttingAction } from './woodcutting';

const potions = {
  WoodcuttingPotionP1A: 'Woodcutting Potion P1-A',
  WoodcuttingPotionP2A: 'Woodcutting Potion P2-A',
  WoodcuttingPotionP2B: 'Woodcutting Potion P2-B',
  SuperWoodcuttingPotionP1A: 'Super Woodcutting Potion P1-A',
  SuperWoodcuttingPotionP2A: 'Super Woodcutting Potion P2-A',
  SuperWoodcuttingPotionP2B: 'Super Woodcutting Potion P2-B',
};

export function equippedWoodcuttingPotion(
  save: Pick<DecodedSave, 'version' | 'demo' | 'woodcuttingToolbelt'> | null,
) {
  if (save?.version !== 32 || save.demo) return null;
  const equipped = save.woodcuttingToolbelt?.['MelvorBase:WoodcuttingPotion'];
  const potion = Object.entries(potions).find(([id]) => equipped === `MelvorBase:${id}`);
  return potion ? { name: potion[1], source: `https://db.melvor.aevv.net/item/${potion[0]}` } : null;
}

export function estimateOvergrowth(action: WoodcuttingAction, cuts: number, stacks: number, doublingPercent: number) {
  // A stack extends the effect for one cut. Stacks do not multiply its strength.
  const boostedCuts = action.category === 'bush' ? Math.min(cuts, stacks) : 0;
  return {
    boostedCuts,
    remainingStacks: stacks - boostedCuts,
    expectedExtraPrimary: boostedCuts * (1 + doublingPercent / 100),
  };
}
