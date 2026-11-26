import { calculateActionPlan, type CalculationInput, type ItemAmount, type SkillAction } from '../calculator';
import type { DecodedSave } from '../schemas/save';
import { recipeItemId } from './recipe-items';
import { thievingLoot, type ThievingDrop } from './thieving-loot';
import { completionsByLevel, levelForXp } from './xp-table';

export const thievingSource = 'https://db.melvor.aevv.net/entity/Thieving';
export const baseStunSeconds = 2;

type Target = [
  id: string, name: string, requiredLevel: number, xp: number, attemptSeconds: number,
  stages: number, maxDamage: number, perception: number, gpPerSuccess: number,
];

// Build 26724394. GP per successful stage includes the chance that currency is awarded.
const targets = {
  'Lowtown District': [
    ['Citizen', 'Citizen', 1, 7, 3, 1, 25, 32, 6.375],
    ['Thug', 'Thug', 5, 9, 3, 1, 32, 40, 6.4],
    ['LockedThugChest', 'Locked Thug Chest', 10, 38, 8, 1, 45, 203, 7],
    ['ThugChief', 'Thug Chief', 15, 13, 3, 1, 52, 120, 10.4],
  ],
  'Seashade Port': [
    ['CookingStall', 'Cooking Stall', 12, 10, 6, 1, 37, 60, 0],
    ['Craftsman', 'Craftsman', 17, 14, 3, 1, 57, 124, 10.5],
    ['Fisherman', 'Fisherman', 20, 17, 3, 1, 62, 177, 11.9],
    ['Chef', 'Chef', 30, 22, 3, 1, 82, 238, 19.95],
  ],
  'Farmers Market': [
    ['Farmer', 'Farmer', 25, 19, 3, 1, 72, 185, 15.75],
    ['LockedRanchersChest', 'Locked Ranchers Chest', 33, 74, 8, 1, 97, 480, 23.1],
    ['MarketSeedStall', 'Market Seed Stall', 35, 20, 6, 1, 67, 164, 0],
    ['Herbalist', 'Herbalist', 38, 25, 3, 1, 100, 251, 28.7],
  ],
  'Mage Tower': [
    ['WizardScholar', 'Wizard Scholar', 28, 20, 3, 1, 80, 189, 18.2],
    ['Astrologer', 'Astrologer', 36, 25, 3, 1, 95, 248, 26.6],
    ['Runecrafter', 'Runecrafter', 47, 35, 3, 1, 117, 357, 40.25],
    ['ForbiddenLibrary', 'Forbidden Library', 50, 1213, 4, 10, 177, 1420, 101],
    ['Wizard', 'Wizard', 53, 42, 3, 1, 156, 458, 49.7],
  ],
  'Bandit Encampment': [
    ['Bandit', 'Bandit', 33, 22, 3, 1, 90, 243, 23.1],
    ['BanditFletcher', 'Bandit Fletcher', 42, 30, 3, 1, 107, 349, 33.6],
    ['BanditWoodcutter', 'Bandit Woodcutter', 50, 41, 3, 1, 147, 454, 44.45],
    ['BanditLeader', 'Bandit Leader', 57, 47, 3, 1, 165, 465, 56],
    ['StolenGoods', 'Stolen Goods', 60, 2515, 4, 15, 207, 1870, 138],
  ],
  'Capital Marketplace': [
    ['Blacksmith', 'Blacksmith', 53, 42, 3, 1, 156, 458, 49.7],
    ['CraftingStall', 'Crafting Stall', 55, 39, 6, 1, 111, 339, 0],
    ['LockedBankChest', 'Locked Bank Chest', 63, 187, 8, 1, 198, 1247, 67.2],
    ['CapitalCitizen', 'Capital Citizen', 65, 61, 3, 1, 183, 600, 70.7],
    ['CapitalSeedStall', 'Capital Seed Stall', 70, 57, 6, 1, 132, 583, 0],
  ],
  'Keltesta Mining Town': [
    ['Miner', 'Miner', 61, 54, 3, 1, 174, 594, 63.35],
    ['StoneMason', 'Stone Mason', 66, 62, 3, 1, 186, 602, 73.15],
    ['DeepMine', 'Deep Mine', 70, 2364, 4, 15, 237, 2420, 180.5],
    ['Carpenter', 'Carpenter', 72, 47, 3, 1, 201, 765, 85.4],
    ['OreStall', 'Ore Stall', 85, 71, 6, 1, 182, 739, 0],
  ],
  'Desert Palace': [
    ['PalaceCitizen', 'Palace Citizen', 80, 53, 3, 1, 255, 946, 103.6],
    ['PalaceGuard', 'Palace Guard', 89, 83, 3, 1, 283, 960, 126.35],
    ['GemStall', 'Gem Stall', 92, 76, 6, 1, 192, 873, 0],
    ['PalaceBattlemage', 'Palace Battlemage', 92, 112, 3, 1, 290, 1118, 134.75],
    ['PalaceVault', 'Palace Vault', 92, 5152, 4, 25, 353, 3580, 297.5],
  ],
  'Gol Camp': [
    ['LockedBeastChest', 'Locked Beast Chest', 90, 379, 8, 1, 315, 2370, 129.15],
    ['Hunter', 'Hunter', 94, 87, 3, 1, 297, 1122, 140],
    ['Chieftain', 'Chieftain', 97, 94, 3, 1, 304, 1126, 148.75],
  ],
  'Ivory Athenaeum': [
    ['Archivist', 'Archivist', 50, 48, 3, 1, 140, 550, 48],
    ['LowerFloors', 'Lower Floors', 50, 4000, 3, 30, 177, 1420, 48],
    ['AbyssalVaultDoor', 'Abyssal Vault Door', 50, 137, 8, 1, 189, 1100, 48],
  ],
  'Quests': [
    ['CapitalGuard', 'Capital Guard', 32, 17, 3, 1, 100, 414, 48],
  ],
} satisfies Record<string, Target[]>;

const prerequisites: Readonly<Partial<Record<string, string>>> = {
  CapitalGuard: 'Requires The Path to Melvor at step 5.',
  Archivist: 'Requires the relevant objective in The Ivory Athenaeum at step 0.',
  LowerFloors: 'Requires The Ivory Athenaeum at step 0, Agility level 40, and an equipped Ivory Athenaeum Key.',
  AbyssalVaultDoor: 'Requires The Ivory Athenaeum at step 0 or 1 and an equipped Abyssal Vault Key.',
  StolenGoods: 'Requires Agility level 50.',
  DeepMine: 'Requires Agility level 60.',
  PalaceVault: 'Requires Agility level 80.',
};

export interface ThievingAction extends SkillAction {
  recipeGroup: string;
  source: string;
  prerequisiteNote?: string;
  stages: number;
  maxDamage: number;
  perception: number;
  gpPerSuccess: number;
}

export const thievingActions: ThievingAction[] = Object.entries<Target[]>(targets).flatMap(([recipeGroup, rows]) =>
  rows.map(([id, name, requiredLevel, baseXp, intervalSeconds, stages, maxDamage, perception, gpPerSuccess]) => ({
    id, name, recipeGroup, requiredLevel, baseXp, intervalSeconds, stages, maxDamage, perception, gpPerSuccess,
    inputs: [], outputs: [], prerequisiteNote: prerequisites[id],
    source: `https://db.melvor.aevv.net/thieving-recipe/${id}`,
  })),
);

const perceptionDistractions = [
  { area: 'Lowtown District', id: 'GoldRingsonStrings', name: 'Gold Rings on a String', percentage: -5 },
  { area: 'Bandit Encampment', id: 'TaintedWine', name: 'Tainted Wine', percentage: -5 },
  { area: 'Capital Marketplace', id: 'RareFind', name: 'Rare Find', percentage: -5 },
] as const;

export function resolveThievingPerceptionDistractions(
  action: ThievingAction,
  save: Pick<DecodedSave, 'version' | 'demo' | 'shopPurchases'> | null,
) {
  if (save?.version !== 32 || save.demo || !save.shopPurchases) return [];
  return perceptionDistractions.filter(({ area, id }) =>
    area === action.recipeGroup && (save.shopPurchases?.[`MelvorBase:${id}`] ?? 0) > 0,
  );
}

const stealthEquipment = [
  { id: 'Balaclava', name: 'Balaclava', stealth: 15 },
  { id: 'BanditGloves', name: 'Bandit Gloves', stealth: 30 },
  { id: 'ThugChiefRing', name: 'Thug Chief Ring', stealth: 25 },
] as const;

export function resolveThievingStealthEquipment(
  save: Pick<DecodedSave, 'version' | 'demo' | 'thievingToolbelt'> | null,
) {
  if (save?.version !== 32 || save.demo || !save.thievingToolbelt) return [];
  const equipped = new Set(Object.values(save.thievingToolbelt));
  return stealthEquipment.filter(({ id }) => equipped.has(`MelvorBase:${id}`));
}

function effectiveStealth(action: ThievingAction, level: number, bonusStealth: number): number {
  return Math.max(0, Math.floor(Math.max(level, action.requiredLevel) + bonusStealth));
}

function thievingSuccessChance(stealth: number, perception: number): number {
  return Math.min(1, (100 + stealth) / (100 + perception));
}

function expectedLoot(action: ThievingAction, stageDoublingChance: number): ItemAmount[] {
  const loot = thievingLoot[action.id];
  const byItem = new Map<string, ItemAmount>();

  function addDrops(drops: ThievingDrop[] = [], rolls: number) {
    for (const [itemName, meanQuantity, chance, itemId = recipeItemId(itemName)] of drops) {
      const quantity = (byItem.get(itemId)?.quantity ?? 0) + meanQuantity * chance * rolls;
      byItem.set(itemId, { itemId, itemName, quantity });
    }
  }

  addDrops(loot?.stage, action.stages * (1 + stageDoublingChance));
  addDrops(loot?.completion, 1);
  return [...byItem.values()];
}

export function calculateThievingPlan(
  input: CalculationInput & { action: ThievingAction },
  bonusStealth = 0,
  damageAvoidance = 0,
  perceptionBonusPercentage = 0,
) {
  const { action, currentXp, outputDoublingChance = 0 } = input;
  if (!Number.isFinite(bonusStealth) || !Number.isFinite(perceptionBonusPercentage) ||
      !(damageAvoidance >= 0 && damageAvoidance <= 1) ||
      !(outputDoublingChance >= 0 && outputDoublingChance <= 1)) {
    throw new RangeError('Thieving modifiers must be finite and probabilities must be between 0 and 1.');
  }
  const plan = calculateActionPlan({
    ...input,
    action: { ...action, outputs: expectedLoot(action, outputDoublingChance) },
    outputDoublingChance: 0,
  });
  const perception = Math.max(0, Math.floor(action.perception * (1 + perceptionBonusPercentage / 100)));
  const startingStealth = effectiveStealth(action, levelForXp(currentXp), bonusStealth);
  const startingSuccessChance = thievingSuccessChance(startingStealth, perception);
  let expectedFailures = 0;
  for (const { level, count } of completionsByLevel(currentXp, plan.effectiveXpPerAction, plan.actions)) {
    const chance = thievingSuccessChance(effectiveStealth(action, level, bonusStealth), perception);
    expectedFailures += count * action.stages * ((1 - chance) / chance);
  }
  const successes = plan.actions * action.stages;
  const expectedAttempts = successes + expectedFailures;
  const secondsPerAttempt = input.effectiveIntervalSeconds ?? action.intervalSeconds;
  const trainingSeconds = expectedAttempts * secondsPerAttempt + expectedFailures * baseStunSeconds;
  const startingSeconds = action.stages * (secondsPerAttempt + (1 - startingSuccessChance) * baseStunSeconds) / startingSuccessChance;
  const maxFailureHit = startingSuccessChance === 1 || damageAvoidance === 1 ? 0 : action.maxDamage;
  const expectedDamage = maxFailureHit === 0 ? 0 : expectedFailures * (1 - damageAvoidance) * (1 + maxFailureHit) / 2;
  return {
    ...plan,
    startingStealth, perception, startingSuccessChance, expectedAttempts, expectedFailures, trainingSeconds, maxFailureHit, expectedDamage,
    xpPerHour: 3600 * (trainingSeconds > 0 ? plan.xpGained / trainingSeconds : plan.effectiveXpPerAction / startingSeconds),
    expectedGp: successes * action.gpPerSuccess,
  };
}
