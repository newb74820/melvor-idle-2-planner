import { expect, it } from 'vitest';
import { calculateActionPlan } from '../calculator';
import { woodcuttingActions } from './woodcutting';
import { bushyAxeBonus, expectedWoodcuttingInterval, ironsteelHealthReduction, resolveDeedreeBonuses, resolveWoodcuttingEquipment, resolveWoodcuttingShopBonuses, resolveWoodcuttingXpBonuses } from './woodcutting-modifiers';

const release = { version: 32, demo: false };
const boots = 'MelvorBase:TreesproutBoots';
const equipped = { ...release, woodcuttingToolbelt: { 'MelvorBase:WoodcuttingBoots': boots } };

it('applies late purchases to timing and scopes the coating to the specified trees', () => {
  const save = { ...release, shopPurchases: {
    'MelvorBase:DragonAxeHead': 1,
    'MelvorBase:RedwoodAxeHandle': 1,
    'MelvorBase:FortifiedAxeBinding': 1,
    'MelvorBase:IronsteelAxeHeadCoating': 1,
  } };
  expect(resolveWoodcuttingShopBonuses(save)).toMatchObject([
    { effect: 'double damage chance', percentage: 3 },
    { effect: 'output doubling chance', percentage: 2 },
    { effect: 'instant cut chance', percentage: 3 },
    { effect: 'Bird Nest chance', percentage: 0.1 },
    { effect: 'Eagle Nest chance', percentage: 0.05 },
  ]);
  const teak = woodcuttingActions.find((action) => action.id === 'teak-tree')!;
  const debris = woodcuttingActions.find((action) => action.id === 'wood-debris')!;
  const reduction = ironsteelHealthReduction(save, teak.id);
  expect(reduction).toBe(1);
  expect(ironsteelHealthReduction(save, 'normal-tree')).toBe(0);
  expect(expectedWoodcuttingInterval(teak, 0, 0, 0, reduction)).toBe(5);
  expect(expectedWoodcuttingInterval(woodcuttingActions[0], 0, 0, 0.2)).toBeCloseTo(2.44);
  expect(expectedWoodcuttingInterval(debris, 0, 0, 0.2)).toBe(30);
});

it('applies equipment only in matching slots and requires three elite pieces for instant cuts', () => {
  const twoPieces = {
    'MelvorBase:WoodcuttingHelmet': 'MelvorBase:EliteWoodcuttingHat',
    'MelvorBase:WoodcuttingTorso': 'MelvorBase:EliteWoodcuttingBody',
    'MelvorBase:WoodcuttingGloves': 'MelvorBase:WoodcuttersGloves',
    'MelvorBase:WoodcuttingUtility2': 'MelvorBase:FeathersFlaxBasket',
    'MelvorBase:WoodcuttingCape': 'MelvorBase:EliteWoodcuttingBoots',
  };
  const treeEffects = resolveWoodcuttingEquipment({ ...release, woodcuttingToolbelt: twoPieces }, 'normal-tree');
  expect(treeEffects.filter(({ effect }) => effect === 'output doubling chance' || effect === 'double damage chance').map((effect) => [effect.effect, effect.percentage])).toEqual([
    ['double damage chance', 2], ['double damage chance', 2],
    ['double damage chance', 3], ['output doubling chance', 3],
  ]);
  const flaxEffects = resolveWoodcuttingEquipment({
    ...release,
    woodcuttingToolbelt: { ...twoPieces, 'MelvorBase:WoodcuttingBoots': 'MelvorBase:EliteWoodcuttingBoots' },
  }, 'flax-bush');
  expect(flaxEffects).toEqual(expect.arrayContaining([
    expect.objectContaining({ effect: 'instant cut chance', percentage: 2 }),
    expect.objectContaining({ name: 'Feathers Flax Basket', effect: 'output doubling chance', percentage: 15 }),
  ]));
});

it('recognizes the remaining novice slots and scopes Bushy Axe to bushes', () => {
  const save = { ...release, woodcuttingToolbelt: {
    'MelvorBase:WoodcuttingLegs': 'MelvorBase:NoviceWoodcuttingPants',
    'MelvorBase:WoodcuttingBoots': 'MelvorBase:NoviceWoodcuttingBoots',
    'MelvorBase:WoodcuttingTool': 'MelvorBase:BushyAxe',
  } };
  expect(resolveWoodcuttingEquipment(save, 'normal-tree')).toMatchObject([
    { effect: 'double damage chance', percentage: 1 },
    { effect: 'double damage chance', percentage: 1 },
  ]);
  expect(bushyAxeBonus(save, woodcuttingActions[0])).toBe(0);
  expect(bushyAxeBonus(save, woodcuttingActions.find(({ id }) => id === 'flax-bush')!)).toBe(1);
});

it('applies the intermediate on-cut bonus once at three pieces', () => {
  const save = { ...release, woodcuttingToolbelt: {
    'MelvorBase:WoodcuttingHelmet': 'MelvorBase:IntermediateWoodcuttingHat',
    'MelvorBase:WoodcuttingTorso': 'MelvorBase:IntermediateWoodcuttingBody',
    'MelvorBase:WoodcuttingLegs': 'MelvorBase:IntermediateWoodcuttingPants',
  } };
  const effects = resolveWoodcuttingEquipment(save, 'oak-tree');
  expect(effects.filter(({ effect }) => effect === 'Bird Nest chance')).toHaveLength(3);
  expect(effects.filter(({ effect }) => effect === 'on-cut item chance')).toMatchObject([{ percentage: 0.025 }]);
});

it('counts supported permanent shop upgrades once and combines them with Deedree', () => {
  const shopPurchases = Object.fromEntries([
    'CopperAxeHead', 'IronAxeHead', 'SteelAxeHead', 'WoodenAxeHandle', 'OakAxeHandle', 'WillowAxeHandle',
    'WrappedAxeBinding',
  ].map((id) => [`MelvorBase:${id}`, 1]));
  shopPurchases['MelvorBase:CopperAxeHead'] = 2;
  const bonuses = resolveWoodcuttingShopBonuses({ ...release, shopPurchases })!;
  const total = (effect: typeof bonuses[number]['effect']) =>
    bonuses.filter((bonus) => bonus.effect === effect).reduce((sum, bonus) => sum + bonus.percentage, 0);
  expect(bonuses).toHaveLength(7);
  expect(total('Bird Nest chance')).toBe(0.025);
  expect(total('double damage chance')).toBe(7);
  expect(total('output doubling chance')).toBe(5);
  expect(resolveWoodcuttingShopBonuses(release)).toBeNull();
  expect(resolveWoodcuttingShopBonuses({ ...release, shopPurchases: { 'MelvorBase:CopperAxeHead': 0 } })).toEqual([]);

  const action = woodcuttingActions[0];
  const result = calculateActionPlan({
    action,
    currentXp: 0,
    targetXp: 333,
    percentageXpBonus: 0.02,
    outputDoublingChance: (total('output doubling chance') + 1) / 100,
    effectiveIntervalSeconds: expectedWoodcuttingInterval(action, total('double damage chance') / 100, 0.04),
  });
  expect(result.actions).toBe(109);
  expect(result.trainingSeconds).toBeCloseTo(300.523);
  expect(result.products[0].produced).toBeCloseTo(115.54);
});

it('scopes weak spots to trees and double damage to trees and bushes', () => {
  const normal = woodcuttingActions[0];
  const flax = woodcuttingActions.find((action) => action.id === 'flax-bush')!;
  const debris = woodcuttingActions.find((action) => action.id === 'wood-debris')!;
  expect(expectedWoodcuttingInterval(normal, 0, 0)).toBe(3);
  expect(expectedWoodcuttingInterval(flax, 0.07, 0.04)).toBeCloseTo(1.93);
  expect(expectedWoodcuttingInterval(debris, 0.07, 0.04)).toBe(30);
});

it('uses the saved Deedree A1 and B1 bonuses for the Normal Tree projection', () => {
  const bonuses = resolveDeedreeBonuses({
    ...release,
    deedreeNodes: ['A1', 'B1', 'C1', 'D1', 'Major2'].map((node) => `MelvorBase:Deedree${node}`),
  });
  expect(bonuses).toMatchObject({ xpPercentage: 2, doublingPercentage: 1, hasWeakSpotBonus: true });
  const result = calculateActionPlan({
    action: woodcuttingActions[0],
    currentXp: 0,
    targetXp: 83,
    percentageXpBonus: bonuses!.xpPercentage / 100,
    outputDoublingChance: bonuses!.doublingPercentage / 100,
    inventory: { NormalLog: 150 },
  });
  expect(result.effectiveXpPerAction).toBeCloseTo(3.06);
  expect(result.actions).toBe(28);
  expect(result.products[0].produced).toBeCloseTo(28.28);
  expect(result.products[0].projected).toBeCloseTo(178.28);
});

it('adds distinct unlocked Deedree node bonuses and handles older profiles', () => {
  expect(resolveDeedreeBonuses({
    ...release,
    deedreeNodes: ['MelvorBase:DeedreeA1', 'MelvorBase:DeedreeA1', 'MelvorBase:DeedreeA2', 'MelvorBase:DeedreeB2'],
  })).toMatchObject({ xpPercentage: 4, doublingPercentage: 1 });
  expect(resolveDeedreeBonuses(release)).toBeNull();
  expect(resolveDeedreeBonuses({ ...release, deedreeNodes: [] })).toMatchObject({ xpPercentage: 0, doublingPercentage: 0 });
});

it('applies the equipped boots to a Normal Tree XP projection', () => {
  const bonuses = resolveWoodcuttingXpBonuses(equipped);
  expect(bonuses).toMatchObject([{ name: 'Treesprout Boots', percentage: 3 }]);
  const result = calculateActionPlan({
    action: woodcuttingActions[0],
    currentXp: 0,
    targetXp: 85,
    percentageXpBonus: bonuses![0].percentage / 100,
  });
  expect(result.effectiveXpPerAction).toBeCloseTo(3.09);
  expect(result.actions).toBe(28);
});

it('requires the correct slot and distinguishes empty and unavailable toolbelts', () => {
  expect(resolveWoodcuttingXpBonuses({ ...release, woodcuttingToolbelt: {} })).toEqual([]);
  expect(resolveWoodcuttingXpBonuses({ ...release, woodcuttingToolbelt: { 'MelvorBase:WoodcuttingTool': boots } })).toEqual([]);
  expect(resolveWoodcuttingXpBonuses(release)).toBeNull();
  expect(resolveWoodcuttingXpBonuses({ ...equipped, version: 33 })).toBeNull();
  expect(resolveWoodcuttingXpBonuses({ ...equipped, demo: true })).toBeNull();
});
