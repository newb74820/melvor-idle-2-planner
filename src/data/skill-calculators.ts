import type { ItemAmount } from '../calculator';
import { agilityActions, agilitySource } from './agility-courses';
import { astrologyActions, astrologySource } from './astrology';
import { beastcraftingActions, beastcraftingSource } from './beastcrafting';
import { cookingActions, cookingSource } from './cooking';
import { craftingActions, craftingSource } from './crafting';
import { firemakingActions, firemakingSource } from './firemaking';
import { fishingActions } from './fishing';
import { fletchingActions, fletchingSource } from './fletching';
import { herbloreActions, herbloreSource } from './herblore';
import { huntingActions, huntingSource } from './hunting-animals';
import { miningActions } from './mining';
import { runecraftingActions, runecraftingSource } from './runecrafting';
import { smithingActions, smithingSource } from './smithing';
import { thievingActions, thievingSource } from './thieving';
import { isCombatSkill, type SkillId } from './skills';
import { woodcuttingActions, woodcuttingSource } from './woodcutting';

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
  Cooking: {
    actions: cookingActions,
    dataUrl: cookingSource,
    actionLabel: 'Cooking recipe',
    actionUnit: 'successful batch',
    actionPlural: 'successful batches',
  },
  Smithing: {
    actions: smithingActions,
    dataUrl: smithingSource,
    actionLabel: 'Smithing recipe',
    actionUnit: 'batch',
    actionPlural: 'batches',
  },
  Fletching: {
    actions: fletchingActions,
    dataUrl: fletchingSource,
    actionLabel: 'Fletching recipe',
    actionUnit: 'batch',
    actionPlural: 'batches',
  },
  Crafting: {
    actions: craftingActions,
    dataUrl: craftingSource,
    actionLabel: 'Crafting recipe',
    actionUnit: 'batch',
    actionPlural: 'batches',
  },
  Runecrafting: {
    actions: runecraftingActions,
    dataUrl: runecraftingSource,
    actionLabel: 'Runecrafting recipe',
    actionUnit: 'batch',
    actionPlural: 'batches',
  },
  Herblore: {
    actions: herbloreActions,
    dataUrl: herbloreSource,
    actionLabel: 'Herblore recipe',
    actionUnit: 'bottling',
    actionPlural: 'bottlings',
  },
  Thieving: {
    actions: thievingActions,
    dataUrl: thievingSource,
    actionLabel: 'Thieving target',
    actionUnit: 'completion',
    actionPlural: 'completions',
  },
  Hunting: {
    actions: huntingActions,
    dataUrl: huntingSource,
    actionLabel: 'Hunting target',
    actionUnit: 'catch',
    actionPlural: 'catches',
  },
  Beastcrafting: {
    actions: beastcraftingActions,
    dataUrl: beastcraftingSource,
    actionLabel: 'Beastcrafting recipe',
    actionUnit: 'batch',
    actionPlural: 'batches',
  },
  Agility: {
    actions: agilityActions,
    dataUrl: agilitySource,
    actionLabel: 'Agility course path',
    actionUnit: 'completion',
    actionPlural: 'completions',
  },
  Astrology: {
    actions: astrologyActions,
    dataUrl: astrologySource,
    actionLabel: 'Constellation',
    actionUnit: 'observation',
    actionPlural: 'observations',
  },
};

export type CalculatorSkill = keyof typeof skillCalculators;
type CalculatorAction = (typeof skillCalculators)[CalculatorSkill]['actions'][number];

export function hasSkillCalculator(skill: SkillId) {
  return skill === 'Farming' || skill === 'Ranching' || isCombatSkill(skill) || Object.hasOwn(skillCalculators, skill);
}

export function expectedExtraProducts(action: CalculatorAction): ItemAmount[] {
  if ('specials' in action) return action.specials;
  const rolls = 'drops' in action ? action.drops : 'productRolls' in action ? action.productRolls : undefined;
  if (rolls) return rolls.map(({ chance, ...item }) => ({ ...item, quantity: item.quantity * chance }));
  if ('hitTiming' in action && action.onHitDrop) {
    const { item, chance } = action.onHitDrop;
    return [{ ...item, quantity: item.quantity * chance * action.hitTiming.expectedHits }];
  }
  return [];
}
