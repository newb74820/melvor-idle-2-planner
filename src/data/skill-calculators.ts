import type { ItemAmount } from '../calculator';
import { firemakingActions, firemakingSource, type FiremakingAction } from './firemaking';
import { fishingActions, type FishingAction } from './fishing';
import { miningActions, type MiningAction } from './mining';
import { woodcuttingActions, woodcuttingSource, type WoodcuttingAction } from './woodcutting';

export const skillCalculators = {
  Woodcutting: {
    actions: woodcuttingActions,
    dataUrl: woodcuttingSource.url,
    recipeUrl: woodcuttingSource.recipeUrl,
    actionLabel: 'Woodcutting action',
    actionUnit: 'cut',
    actionPlural: 'cuts',
  },
  Fishing: {
    actions: fishingActions,
    dataUrl: 'https://db.melvor.aevv.net/entity/Fishing',
    actionLabel: 'Fishing spot',
    actionUnit: 'cast',
    actionPlural: 'casts',
  },
  Mining: {
    actions: miningActions,
    dataUrl: 'https://db.melvor.aevv.net/entity/Mining',
    actionLabel: 'Mining rock',
    actionUnit: 'rock break',
    actionPlural: 'rock breaks',
  },
  Firemaking: {
    actions: firemakingActions,
    dataUrl: firemakingSource,
    actionLabel: 'Firemaking recipe',
    actionUnit: 'burn',
    actionPlural: 'burns',
  },
};

export type CalculatorSkill = keyof typeof skillCalculators;

export function expectedExtraProducts(action: WoodcuttingAction | FishingAction | MiningAction | FiremakingAction): ItemAmount[] {
  if ('specials' in action) return action.specials;
  if ('drops' in action) return action.drops.map(({ chance, ...item }) => ({ ...item, quantity: item.quantity * chance }));
  if ('hitTiming' in action && action.onHitDrop) {
    const { item, chance } = action.onHitDrop;
    return [{ ...item, quantity: item.quantity * chance * action.hitTiming.expectedHits }];
  }
  return [];
}
