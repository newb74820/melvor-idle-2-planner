import type { DecodedSave } from '../schemas/save';
import type { WoodcuttingAction } from './woodcutting';
import { resolveWoodcuttingMastery } from './woodcutting-mastery';

const toolbeltXpBonuses = [
  {
    slot: 'MelvorBase:WoodcuttingBoots',
    item: 'MelvorBase:TreesproutBoots',
    name: 'Treesprout Boots',
    percentage: 3,
    source: 'https://db.melvor.aevv.net/item/TreesproutBoots',
  },
];

export function resolveWoodcuttingXpBonuses(save: Pick<DecodedSave, 'version' | 'demo' | 'woodcuttingToolbelt'> | null) {
  if (save?.version !== 32 || save.demo || !save.woodcuttingToolbelt) return null;
  return toolbeltXpBonuses.filter(({ slot, item }) => save.woodcuttingToolbelt?.[slot] === item);
}

export function resolveDeedreeBonuses(save: Pick<DecodedSave, 'version' | 'demo' | 'deedreeNodes'> | null) {
  if (save?.version !== 32 || save.demo || !save.deedreeNodes) return null;
  const unlocked = new Set(save.deedreeNodes);
  const nodeBonuses = [
    ...['A1', 'A2', 'A3', 'A4'].map((node) => ({ node, percentage: 2, effect: 'XP' as const })),
    ...['B1', 'B2', 'B3', 'B4'].map((node) => ({ node, percentage: 1, effect: 'output doubling chance' as const })),
  ].filter(({ node }) => unlocked.has(`MelvorBase:Deedree${node}`));

  return {
    nodeBonuses,
    xpPercentage: nodeBonuses.reduce((total, bonus) => total + (bonus.effect === 'XP' ? bonus.percentage : 0), 0),
    doublingPercentage: nodeBonuses.reduce((total, bonus) => total + (bonus.effect === 'output doubling chance' ? bonus.percentage : 0), 0),
    hasWeakSpotBonus: unlocked.has('MelvorBase:DeedreeMajor2'),
  };
}

const shopBonuses = [
  { id: 'CopperAxeHead', name: 'Copper Axe Head', effect: 'double damage chance', percentage: 2 },
  { id: 'IronAxeHead', name: 'Iron Axe Head', effect: 'double damage chance', percentage: 3 },
  { id: 'SteelAxeHead', name: 'Steel Axe Head', effect: 'double damage chance', percentage: 2 },
  { id: 'MithrilAxeHead', name: 'Mithril Axe Head', effect: 'double damage chance', percentage: 3 },
  { id: 'AdamantAxeHead', name: 'Adamant Axe Head', effect: 'double damage chance', percentage: 2 },
  { id: 'RuneAxeHead', name: 'Rune Axe Head', effect: 'double damage chance', percentage: 3 },
  { id: 'DawnsteelAxeHead', name: 'Dawnsteel Axe Head', effect: 'double damage chance', percentage: 2 },
  { id: 'DragonAxeHead', name: 'Dragon Axe Head', effect: 'double damage chance', percentage: 3 },
  { id: 'WoodenAxeHandle', name: 'Wooden Axe Handle', effect: 'output doubling chance', percentage: 1 },
  { id: 'OakAxeHandle', name: 'Oak Axe Handle', effect: 'output doubling chance', percentage: 2 },
  { id: 'WillowAxeHandle', name: 'Willow Axe Handle', effect: 'output doubling chance', percentage: 2 },
  { id: 'MapleAxeHandle', name: 'Maple Axe Handle', effect: 'output doubling chance', percentage: 2 },
  { id: 'YewAxeHandle', name: 'Yew Axe Handle', effect: 'output doubling chance', percentage: 2 },
  { id: 'MagicAxeHandle', name: 'Magic Axe Handle', effect: 'output doubling chance', percentage: 2 },
  { id: 'HardOakAxeHandle', name: 'Hard Oak Axe Handle', effect: 'output doubling chance', percentage: 2 },
  { id: 'RedwoodAxeHandle', name: 'Redwood Axe Handle', effect: 'output doubling chance', percentage: 2 },
  { id: 'ReinforcedAxeBinding', name: 'Reinforced Axe Binding', effect: 'instant cut chance', percentage: 1.5 },
  { id: 'BolsteredAxeBinding', name: 'Bolstered Axe Binding', effect: 'instant cut chance', percentage: 1.5 },
  { id: 'FortifiedAxeBinding', name: 'Fortified Axe Binding', effect: 'instant cut chance', percentage: 3 },
  { id: 'BasicAxeBinding', name: 'Basic Axe Binding', effect: 'Bird Nest chance', percentage: 0.025 },
  { id: 'WrappedAxeBinding', name: 'Wrapped Axe Binding', effect: 'Bird Nest chance', percentage: 0.025 },
  { id: 'LoopedAxeBinding', name: 'Looped Axe Binding', effect: 'Bird Nest chance', percentage: 0.05 },
  { id: 'ReinforcedAxeBinding', name: 'Reinforced Axe Binding', effect: 'Bird Nest chance', percentage: 0.05 },
  { id: 'BolsteredAxeBinding', name: 'Bolstered Axe Binding', effect: 'Eagle Nest chance', percentage: 0.05 },
  { id: 'FortifiedAxeBinding', name: 'Fortified Axe Binding', effect: 'Bird Nest chance', percentage: 0.1 },
  { id: 'FortifiedAxeBinding', name: 'Fortified Axe Binding', effect: 'Eagle Nest chance', percentage: 0.05 },
] as const;

export function resolveWoodcuttingShopBonuses(save: Pick<DecodedSave, 'version' | 'demo' | 'shopPurchases'> | null) {
  if (save?.version !== 32 || save.demo || !save.shopPurchases) return null;
  return shopBonuses.filter(({ id }) => (save.shopPurchases?.[`MelvorBase:${id}`] ?? 0) > 0);
}

export function ironsteelHealthReduction(save: Pick<DecodedSave, 'version' | 'demo' | 'shopPurchases'> | null, actionId: string) {
  const purchased = save?.version === 32 && !save.demo && (save.shopPurchases?.['MelvorBase:IronsteelAxeHeadCoating'] ?? 0) > 0;
  return purchased && ['teak-tree', 'maple-tree', 'mahogany-tree'].includes(actionId) ? 1 : 0;
}

const clothingSlots = { Hat: 'Helmet', Body: 'Torso', Pants: 'Legs', Boots: 'Boots' } as const;
const clothingTiers = { Novice: 1, Intermediate: 1.5, Elite: 2 } as const;
type EquipmentEffect = 'double damage chance' | 'output doubling chance' | 'instant cut chance'
  | 'Bird Nest chance' | 'Eagle Nest chance' | 'on-cut item chance';

export function resolveWoodcuttingEquipment(save: Pick<DecodedSave, 'version' | 'demo' | 'woodcuttingToolbelt'> | null, actionId: string) {
  if (save?.version !== 32 || save.demo || !save.woodcuttingToolbelt) return [];
  const slots = save.woodcuttingToolbelt;
  const equipped = (slot: string, item: string) => slots[`MelvorBase:Woodcutting${slot}`] === `MelvorBase:${item}`;
  const effects: { name: string; source: string; effect: EquipmentEffect; percentage: number }[] = [];
  let elitePieces = 0;
  let intermediatePieces = 0;
  for (const [tier, percentage] of Object.entries(clothingTiers)) {
    for (const [piece, slot] of Object.entries(clothingSlots)) {
      const id = `${tier}Woodcutting${piece}`;
      if (!equipped(slot, id)) continue;
      const item = { name: `${tier} Woodcutting ${piece}`, source: `https://db.melvor.aevv.net/item/${id}` };
      effects.push({ ...item, effect: 'double damage chance', percentage });
      if (tier !== 'Novice') {
        const nestChance = tier === 'Elite' ? 0.1 : 0.05;
        effects.push(
          { ...item, effect: 'Bird Nest chance', percentage: nestChance },
          { ...item, effect: 'Eagle Nest chance', percentage: nestChance },
        );
      }
      if (tier === 'Elite') elitePieces += 1;
      if (tier === 'Intermediate') intermediatePieces += 1;
      if (tier === 'Elite') effects.push({ ...item, effect: 'on-cut item chance', percentage: 0.01 });
    }
  }
  if (elitePieces >= 3) {
    effects.push({ name: 'Elite Woodcutting set', source: 'https://db.melvor.aevv.net/equipment-set-bonus/EliteWoodcuttingGear', effect: 'instant cut chance', percentage: 2 });
  }
  if (intermediatePieces >= 3) {
    effects.push({ name: 'Intermediate Woodcutting set', source: 'https://db.melvor.aevv.net/equipment-set-bonus/IntermediateWoodcuttingGear', effect: 'on-cut item chance', percentage: 0.025 });
  }
  if (equipped('Boots', 'TreesproutBoots')) {
    effects.push({ name: 'Treesprout Boots', source: toolbeltXpBonuses[0].source, effect: 'on-cut item chance', percentage: 0.005 });
  }
  if (['Utility1', 'Utility2'].some((slot) => equipped(slot, 'TaintedTreantLeaf'))) {
    effects.push({ name: 'Tainted Treant Leaf', source: 'https://db.melvor.aevv.net/item/TaintedTreantLeaf', effect: 'on-cut item chance', percentage: 0.05 });
  }
  if (equipped('Gloves', 'WoodcuttersGloves')) {
    const source = 'https://db.melvor.aevv.net/item/WoodcuttersGloves';
    effects.push(
      { name: 'Woodcutters Gloves', source, effect: 'double damage chance', percentage: 3 },
      { name: 'Woodcutters Gloves', source, effect: 'output doubling chance', percentage: 3 },
    );
  }
  if (actionId === 'flax-bush' && ['Utility1', 'Utility2'].some((slot) => equipped(slot, 'FeathersFlaxBasket'))) {
    effects.push({ name: 'Feathers Flax Basket', source: 'https://db.melvor.aevv.net/item/FeathersFlaxBasket', effect: 'output doubling chance', percentage: 15 });
  }
  return effects;
}

export function bushyAxeBonus(save: Pick<DecodedSave, 'version' | 'demo' | 'woodcuttingToolbelt'> | null, action: WoodcuttingAction) {
  return action.category === 'bush' && save?.version === 32 && !save.demo
    && save.woodcuttingToolbelt?.['MelvorBase:WoodcuttingTool'] === 'MelvorBase:BushyAxe' ? 1 : 0;
}

export function expectedWoodcuttingInterval(
  action: WoodcuttingAction,
  doubleDamageChance: number,
  weakSpotChance: number,
  instantCutChance = 0,
  healthReduction = 0,
  healthReductionPercentage = 0,
): number {
  if (action.category === 'quest') return action.intervalSeconds;
  const weakSpot = action.category === 'tree' ? weakSpotChance : 0;
  if (doubleDamageChance === 0 && weakSpot === 0 && instantCutChance === 0 && healthReduction === 0 && healthReductionPercentage === 0) return action.intervalSeconds;

  const health = Math.max(1, Math.ceil((action.health - healthReduction) * (100 - healthReductionPercentage) / 100));
  const weakDamage = 3 + Math.floor(health / 10);
  const expectedHits = [0];
  for (let remaining = 1; remaining <= health; remaining += 1) {
    const afterHit = (damage: number) =>
      (1 - doubleDamageChance) * expectedHits[Math.max(0, remaining - damage)]
      + doubleDamageChance * expectedHits[Math.max(0, remaining - damage * 2)];
    const continuation = (1 - weakSpot) * afterHit(1) + weakSpot * afterHit(weakDamage);
    const instantCut = remaining > 1 ? instantCutChance : 0;
    expectedHits.push(1 + (1 - instantCut) * continuation);
  }
  return expectedHits[health] * action.hitIntervalSeconds;
}

export function resolveWoodcuttingRates(action: WoodcuttingAction, save: DecodedSave | null, enabled: boolean) {
  const importedBonuses = resolveWoodcuttingXpBonuses(save);
  const deedree = resolveDeedreeBonuses(save);
  const shopBonuses = resolveWoodcuttingShopBonuses(save);
  const mastery = resolveWoodcuttingMastery(save);
  const equipment = resolveWoodcuttingEquipment(save, action.id);
  const healthReduction = ironsteelHealthReduction(save, action.id);
  const bushOutputBonus = bushyAxeBonus(save, action);
  const activeEffects = [...(shopBonuses ?? []), ...equipment];
  const effectPercentage = (effect: typeof activeEffects[number]['effect']) =>
    enabled ? activeEffects.reduce((total, bonus) => total + (bonus.effect === effect ? bonus.percentage : 0), 0) : 0;
  const xpPercentage = enabled
    ? (importedBonuses?.reduce((total, bonus) => total + bonus.percentage, 0) ?? 0) + (deedree?.xpPercentage ?? 0) + (mastery?.xpPercentage ?? 0)
    : 0;
  const doublingPercentage = effectPercentage('output doubling chance') + (enabled ? deedree?.doublingPercentage ?? 0 : 0);
  const intervalSeconds = expectedWoodcuttingInterval(
    action,
    (effectPercentage('double damage chance') + (enabled ? mastery?.doubleDamagePercentage ?? 0 : 0)) / 100,
    enabled && deedree?.hasWeakSpotBonus ? 0.04 : 0,
    effectPercentage('instant cut chance') / 100,
    enabled ? healthReduction : 0,
    enabled ? mastery?.healthReductionPercentage ?? 0 : 0,
  );
  return {
    importedBonuses, deedree, shopBonuses, mastery, healthReduction, activeEffects, bushOutputBonus,
    xpPercentage, doublingPercentage, intervalSeconds,
    birdNestChancePercent: effectPercentage('Bird Nest chance'),
    eagleNestChancePercent: effectPercentage('Eagle Nest chance'),
    onCutChancePercent: effectPercentage('on-cut item chance'),
    nestQuantityBonus: enabled ? mastery?.nestQuantityBonus ?? 0 : 0,
    primaryQuantityBonus: enabled ? bushOutputBonus : 0,
  };
}
