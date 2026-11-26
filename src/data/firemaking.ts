import type { ItemAmount, SkillAction } from '../calculator';

export interface FiremakingAction extends SkillAction {
  source: string;
  prerequisiteNote?: string;
  drops: (ItemAmount & { chance: number })[];
  prayerPoints?: number;
}

const item = (itemName: string, quantity = 1, itemId = itemName.replaceAll(' ', '')): ItemAmount => ({ itemId, itemName, quantity });
const sourceUrl = 'https://db.melvor.aevv.net/firemaking-recipe';
export const firemakingSource = 'https://db.melvor.aevv.net/entity/Firemaking';

// Base log recipes from build 26724394, with drop quantities conditional on each roll succeeding.
const logs = [
  ['Normal Log', 1, 6, 4, 2],
  ['Oak Log', 10, 15, 6, 2],
  ['Willow Log', 25, 33, 8, 3],
  ['Teak Log', 35, 47, 10, 4],
  ['Maple Log', 45, 82, 12, 5, { ...item('Soot', 12), chance: 0.05 }],
  ['Mahogany Log', 55, 130, 14, 6, { ...item('Soot', 14), chance: 0.1 }],
  ['Yew Log', 60, 177, 16, 7, { ...item('Cinder', 16), chance: 0.005 }],
  ['Magic Log', 75, 263, 18, 10, { ...item('Cinder', 18), chance: 0.01 }],
  ['Ashen Log', 80, 401, 17, 17],
  ['Hard Oak Log', 85, 340, 20, 10],
  ['Redwood Log', 92, 400, 22, 15, { ...item('Soot', 22), chance: 0.15 }],
] as const;

const logActions: FiremakingAction[] = logs.map(([name, requiredLevel, baseXp, intervalSeconds, dropQuantity, extraDrop]) => {
  const log = item(name);
  const ashen = log.itemId === 'AshenLog';
  return {
    id: log.itemId, name, requiredLevel, baseXp, intervalSeconds,
    inputs: [log], outputs: [],
    drops: [
      { ...item('Ash', dropQuantity), chance: ashen ? 0.8 : 0.25 },
      { ...item('Charcoal', dropQuantity), chance: ashen ? 0.6 : 0.1 },
      ...(extraDrop ? [extraDrop] : []),
    ],
    source: `${sourceUrl}/${log.itemId}`,
  };
});

const lanterns = [
  ['Steel', 30, 14], ['Mithril', 40, 19], ['Adamant', 50, 26], ['Rune', 60, 35],
  ['Dawnsteel', 75, 44], ['Dragon', 90, 53], ['Dragonrune', 95, 74],
] as const;

const lanternActions: FiremakingAction[] = lanterns.map(([metal, requiredLevel, baseXp]) => {
  const name = `${metal} Lantern (Lit)`;
  const id = `${metal}LanternLit`;
  return {
    id, name, requiredLevel, baseXp, intervalSeconds: 4,
    inputs: [item(`${metal} Lantern`, 10)], outputs: [item(name, 10, id)],
    drops: [], source: `${sourceUrl}/${id}`,
  };
});

const blessedLogs = [
  ['Blessed Log', 37, 27, 5, 0.1, 55],
  ['Blessed Oak Log', 50, 70, 8, 0.4, 125],
  ['Blessed Willow Log', 65, 158, 12, 0.75, 300],
] as const;

const prayerActions: FiremakingAction[] = blessedLogs.map(([name, requiredLevel, baseXp, intervalSeconds, chance, prayerPoints]) => {
  const log = item(name);
  return {
    id: log.itemId, name, requiredLevel, baseXp, intervalSeconds,
    inputs: [log], outputs: [], drops: [{ ...item('Blessed Fragments'), chance }],
    prayerPoints, source: `${sourceUrl}/${log.itemId}`,
  };
});

const questRecipes: [id: string, name: string, level: number, xp: number, seconds: number, inputs: ItemAmount[], output: ItemAmount, requirement: string][] = [
  ['TreantRemains', 'Treant Remains', 30, 86, 15, [item('Treant Remains')], item('Ash', 50), 'Requires the relevant objective in Tree Trimming.'],
  ['Brazier1', 'Brazier 1', 39, 174, 30, [item('Teak Log', 100), item('Ambervine Leaf', 100)], item('Ash', 50), 'Requires the relevant objective in In the Thick of It.'],
  ['Brazier2', 'Brazier 2', 39, 174, 30, [item('Bone', 30), item('Big Bone', 10), item('Blessed Log', 5)], item('Ash', 50), 'Requires the relevant objective in In the Thick of It.'],
  ['Brazier3', 'Brazier 3', 39, 174, 30, [item('Sourweed Herb', 200), item('Mantalyme Herb', 200)], item('Ash', 50), 'Requires the relevant objective in In the Thick of It.'],
  ['StonehopperSmokeOut', 'Stonehopper Smoke-Out', 42, 174, 20, [item('Teak Log', 5), item('Ambervine Leaf', 20), item('Nomel Herb', 20), item('Toxic Resin')], item('Ash', 10), 'Requires the relevant objective in The Path to Melvor.'],
  ['SeersIncense', "Seer's Incense", 55, 174, 20, [item("Seer's Incense", 1, 'SeersIncense')], item('Pack of Vials', 1, 'EmptyVial'), 'Requires the relevant objective in Unfortunate Teller.'],
];

const questActions: FiremakingAction[] = questRecipes.map(([id, name, requiredLevel, baseXp, intervalSeconds, inputs, output, prerequisiteNote]) => ({
  id, name, requiredLevel, baseXp, intervalSeconds, inputs, outputs: [output], prerequisiteNote,
  drops: [], source: `${sourceUrl}/${id}`,
}));

export const firemakingActions = [...logActions, ...lanternActions, ...prayerActions, ...questActions]
  .sort((a, b) => a.requiredLevel - b.requiredLevel);
