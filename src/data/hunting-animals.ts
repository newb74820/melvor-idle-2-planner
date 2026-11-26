import type { ItemAmount, SkillAction } from '../calculator';
import { recipeItemId } from './recipe-items';

export const huntingSource = 'https://db.melvor.aevv.net/entity/Hunting';

type Range = [minimum: number, maximum: number];
type NamedItem = string | [name: string, id: string];
type CatchDrop = [item: NamedItem, quantity: number, chance?: number];

interface TraplessRequirements {
  level: number;
  chanceBonus: number;
  requirement?: string;
}

type Animal = [
  id: string, name: string, level: number, xp: number, trapType: string,
  trackingSteps: Range, trackingSeconds: Range, trappingSeconds: Range, drops: CatchDrop[],
  options?: { bait?: NamedItem; trapless?: TraplessRequirements; surveySeconds?: number; quest?: true },
];

// Recipe values for build 26724394. All targets use 50% survey and 40% initial trapping chance.
const animals = {
  'Bushlands': [
    ['WildChicken', 'Wild Chicken', 1, 80, 'Snare', [3, 6], [4, 6], [7, 11],
      [['Raw Chicken', 9], ['Feathers', 15], ['Bone', 1]], { bait: 'Seed Bait', trapless: { level: 40, chanceBonus: 0.15, requirement: 'Strength level 30' } }],
    ['WildCow', 'Wild Cow', 5, 108, 'Snare', [3, 6], [5, 9], [7, 11],
      [['Cowhide', 6], ['Raw Beef', 13], ['Bone', 1]], { bait: 'Seed Bait', trapless: { level: 45, chanceBonus: 0.15, requirement: 'Strength level 35' } }],
    ['GreentailBird', 'Greentail Bird', 10, 118, 'Small Bird Catcher', [3, 6], [6, 10], [7, 11],
      [['Feathers', 16], ['Penril Herb Seed', 1, 0.2], ['Sourweed Herb Seed', 1, 0.2]], { bait: 'Seed Bait' }],
    ['BushlandRabbit', 'Bushland Rabbit', 15, 194, 'Snare', [3, 6], [7, 13], [7, 11],
      [['Rabbit Fur', 5], ['Rabbit Meat', 2], ['Rabbit Foot', 2, 0.25], ['Bone', 1]], { bait: ['Veggie Bait', 'VegeBait'], trapless: { level: 55, chanceBonus: 0.15, requirement: 'Strength level 45' } }],
  ],
  'Woodlands': [
    ['GreenButterfly', 'Green Butterfly', 20, 175, 'Butterfly Kit', [3, 7], [5, 10], [8, 12],
      [['Green Butterfly in a Jar', 1]], { bait: 'Honey Bark Bait', trapless: { level: 30, chanceBonus: 0.15, requirement: '2 Agility techniques at level 10' } }],
    ['ThornbackLizard', 'Thornback Lizard', 23, 231, 'Net', [4, 7], [6, 8], [8, 12],
      [['Thornback Lizard Spike', 10], ['Bone', 2]], { bait: ['Veggie Bait', 'VegeBait'], trapless: { level: 53, chanceBonus: 0.15, requirement: 'Strength level 43' } }],
    ['BluetailBird', 'Bluetail Bird', 25, 211, 'Small Bird Catcher', [4, 7], [6, 11], [8, 12],
      [['Feathers', 23], ['Mantalyme Herb Seed', 1, 0.2]], { bait: 'Seed Bait' }],
    ['WildBoar', 'Wild Boar', 33, 395, 'Snare', [4, 7], [10, 17], [8, 12],
      [['Raw Meat', 5], ['Bone', 2]], { bait: ['Veggie Bait', 'VegeBait'], trapless: { level: 68, chanceBonus: 0.15, requirement: 'Strength level 63' } }],
  ],
  'Swamps': [
    ['ScampToad', 'Scamp Toad', 27, 162, 'Net', [4, 7], [3, 6], [8, 12],
      [['Scamp Toadskin', 3]], { bait: 'Basic Bait', trapless: { level: 57, chanceBonus: 0.15, requirement: 'Strength level 47' } }],
    ['SwampSnake', 'Swamp Snake', 36, 333, 'Net', [4, 7], [7, 13], [9, 13],
      [['Swamp Snakeskin', 5], ['Snake Fang', 12, 0.5]], { bait: 'Basic Bait', trapless: { level: 66, chanceBonus: 0.15, requirement: 'Strength level 56' } }],
    ['YellowtailBird', 'Yellowtail Bird', 40, 445, 'Small Bird Catcher', [4, 8], [10, 13], [9, 13],
      [['Feathers', 45], ['Nomel Herb Seed', 1, 0.2]], { bait: 'Seed Bait' }],
    ['GreenToad', 'Green Toad', 45, 605, 'Net', [5, 8], [11, 16], [9, 13],
      [['Green Toadskin', 10]], { bait: 'Basic Bait', trapless: { level: 75, chanceBonus: 0.15, requirement: 'Strength level 65' } }],
  ],
  'Steppes': [
    ['SteppesRabbit', 'Steppes Rabbit', 42, 453, 'Snare', [5, 8], [8, 13], [9, 13],
      [['Rabbit Fur', 4], ['Rabbit Meat', 2], ['Rabbit Foot', 2, 0.5], ['Bone', 1]], { bait: ['Veggie Bait', 'VegeBait'], trapless: { level: 77, chanceBonus: 0.15, requirement: 'Strength level 72' } }],
    ['WildElk', 'Wild Elk', 47, 438, 'Snare', [5, 8], [7, 10], [9, 13],
      [['Elk Antler', 9], ['Elk Hide', 4], ['Bone', 2]], { bait: ['Veggie Bait', 'VegeBait'], trapless: { level: 82, chanceBonus: 0.15, requirement: 'Strength level 77' } }],
    ['WildWolf', 'Wild Wolf', 51, 610, 'Snare', [5, 8], [8, 16], [9, 13],
      [['Wolf Fang', 18, 0.5], ['Wolf Fur', 13], ['Bone', 3]], { bait: 'Meat Bait', trapless: { level: 86, chanceBonus: 0.15, requirement: 'Strength level 81' } }],
    ['Harpy', 'Harpy', 53, 798, 'Large Bird Net', [5, 8], [12, 20], [10, 14],
      [['Harpy Feather', 58], ['Big Bone', 1], ['Sporlyle Herb Seed', 1, 0.2]], { bait: 'Meat Bait' }],
  ],
  'Thicket': [
    ['GiantSpider', 'Giant Spider', 46, 295, 'Pitfall Trap', [5, 8], [4, 6], [10, 14],
      [['Spider Silk', 6], ['Broodling Egg', 19, 0.3]], { bait: 'Meat Bait' }],
    ['SkullButterfly', 'Skull Butterfly', 55, 661, 'Butterfly Kit', [5, 9], [8, 14], [10, 14],
      [['Skull Butterfly in a Jar', 1]], { bait: 'Honey Bark Bait', trapless: { level: 65, chanceBonus: 0.15, requirement: '3 Agility techniques at level 20' } }],
    ['BlacktailBird', 'Blacktail Bird', 57, 694, 'Small Bird Catcher', [5, 9], [9, 13], [10, 14],
      [['Feathers', 50], ['Oxilyme Herb Seed', 1, 0.2]], { bait: 'Seed Bait' }],
    ['BlackFangSpider', 'Black Fang Spider', 59, 866, 'Pitfall Trap', [5, 9], [10, 17], [11, 15],
      [['Spider Silk', 19], ['Black Fang', 21, 0.5]], { bait: 'Meat Bait' }],
  ],
  'Plains': [
    ['Vulture', 'Vulture', 62, 681, 'Large Bird Net', [6, 9], [7, 12], [10, 14],
      [['Vulture Feather', 38], ['Bone', 2]], { bait: 'Meat Bait' }],
    ['StripedHyena', 'Striped Hyena', 65, 821, 'Pitfall Trap', [6, 9], [8, 13], [10, 14],
      [['Striped Hyena Hide', 8], ['Bone', 3]], { bait: 'Meat Bait' }],
    ['Wildebeast', 'Wildebeast', 71, 938, 'Pitfall Trap', [6, 9], [10, 15], [11, 15],
      [['Wildebeast Horn', 15], ['Big Bone', 1]], { bait: 'Meat Bait' }],
    ['WildCaribou', 'Wild Caribou', 80, 1168, 'Snare', [6, 10], [11, 20], [11, 15],
      [['Caribou Hide', 9], ['Big Bone', 2], ['Caribou Antler', 8]], { bait: ['Veggie Bait', 'VegeBait'], trapless: { level: 95, chanceBonus: 0.15, requirement: 'Strength level 92' } }],
    ['ScabjawBeast', 'Scabjaw Beast', 83, 1502, 'Pitfall Trap', [7, 10], [15, 23], [11, 15],
      [['Scabjaw Beast Horn', 15], ['Large Bone', 1]], { bait: 'Meat Bait' }],
  ],
  'Mire': [
    ['GhostlyButterfly', 'Ghostly Butterfly', 67, 1076, 'Butterfly Kit', [6, 9], [10, 18], [11, 15],
      [['Ghostly Butterfly in a Jar', 1]], { bait: 'Honey Bark Bait', trapless: { level: 77, chanceBonus: 0.15, requirement: '4 Agility techniques at level 25' } }],
    ['Phantom', 'Phantom', 73, 805, 'Spirit Box', [6, 10], [7, 12], [11, 15],
      [['Phantom Veil', 9], ['Magic Dust', 2]], { bait: 'Bonemeal Bait' }],
    ['Spirit', 'Spirit', 80, 975, 'Spirit Box', [6, 10], [11, 14], [11, 15],
      [['Spirit Strand', 9], ['Magic Dust', 2]], { bait: 'Bonemeal Bait' }],
    ['Spectre', 'Spectre', 85, 1359, 'Spirit Box', [7, 10], [13, 19], [12, 16],
      [['Spectre Ectoplasm', 8], ['Magic Dust', 2]], { bait: 'Bonemeal Bait' }],
  ],
  'Highlands': [
    ['Raptor', 'Raptor', 75, 615, 'Large Bird Net', [6, 10], [5, 10], [11, 15],
      [['Raptor Talon', 19, 0.75], ['Larx Herb Seed', 1, 0.2], ['Bone', 2]], { bait: 'Meat Bait' }],
    ['BloodHawk', 'Blood Hawk', 78, 843, 'Large Bird Net', [6, 10], [7, 15], [11, 15],
      [[['Blood Hawk Talon', 'BloodhawkTalon'], 19, 0.75], [['Blood Hawk Spike', 'BloodhawkSpike'], 27, 0.75], ['Larx Herb Seed', 1, 0.2], ['Bone', 2]], { bait: 'Meat Bait' }],
    ['GiantEagle', 'Giant Eagle', 81, 1244, 'Large Bird Net', [7, 10], [11, 20], [11, 15],
      [['Giant Eagle Feather', 60], ['Large Bone', 1]], { bait: 'Meat Bait' }],
    ['Griffin', 'Griffin', 87, 1749, 'Large Bird Net', [7, 10], [14, 28], [12, 16],
      [['Griffin Feather', 65], ['Griffin Talon', 33, 0.75], ['Raw Griffin Steak', 2], ['Large Bone', 2]], { bait: 'Meat Bait' }],
  ],
  'Moonlit Hills': [
    ['CrescentButterfly', 'Crescent Butterfly', 83, 1175, 'Butterfly Kit', [7, 10], [11, 19], [7, 10],
      [['Crescent Butterfly in a Jar', 1]], { bait: 'Honey Bark Bait', trapless: { level: 91, chanceBonus: 0.15, requirement: '4 Agility techniques at level 34' } }],
    ['NightRaven', 'Night Raven', 86, 1013, 'Small Bird Catcher', [7, 10], [8, 16], [11, 15],
      [['Nightreed Seed', 2, 0.5], ['Barrentoe Herb Seed', 1, 0.5]], { bait: 'Seed Bait' }],
    ['MoonscaleGecko', 'Moonscale Gecko', 92, 958, 'Net', [7, 11], [9, 14], [12, 16],
      [['Moonscale', 10]], { bait: ['Veggie Bait', 'VegeBait'] }],
    ['ShadowFox', 'Shadow Fox', 96, 1456, 'Snare', [7, 11], [12, 23], [12, 16],
      [['Shadow Fox Fur', 8], ['Bone', 2]], { bait: 'Meat Bait' }],
  ],
  'Torag Grounds': [
    ['BelraTorag', 'Belra Torag', 90, 990, 'Torag Trap', [7, 10], [9, 15], [12, 16],
      [['Torag Hide', 8], ['Belra Crystal', 1, 0.003], ['Large Bone', 2], ['Barrentoe Herb Seed', 1, 0.2]], { bait: 'Sparkling Bait' }],
    ['GarTorag', 'Gar Torag', 92, 1262, 'Torag Trap', [7, 11], [10, 20], [12, 16],
      [['Torag Hide', 10], ['Gar Torag Core', 1, 0.001], ['Large Bone', 2], ['Barrentoe Herb Seed', 1, 0.2]], { bait: 'Sparkling Bait' }],
    ['FinTorag', 'Fin Torag', 94, 1272, 'Torag Trap', [7, 11], [10, 20], [12, 16],
      [['Torag Hide', 10], ['Fin Torag Core', 1, 0.001], ['Large Bone', 2], ['Barrentoe Herb Seed', 1, 0.2]], { bait: 'Sparkling Bait' }],
    ['CulTorag', 'Cul Torag', 97, 1351, 'Torag Trap', [7, 11], [10, 20], [12, 16],
      [['Torag Hide', 10], ['Cul Torag Core', 1, 0.001], ['Large Bone', 2], ['Barrentoe Herb Seed', 1, 0.2]], { bait: 'Sparkling Bait' }],
  ],
  'Quests': [
    ['StonehopperWhelp', 'Stonehopper Whelp', 42, 500, 'Weighted Rock Net', [8, 18], [5, 12], [8, 18],
      [['Normal Log', 1]], { quest: true }],
    ['ToxicButterfly', 'Toxic Butterfly', 45, 500, 'Butterfly Kit', [5, 9], [8, 14], [10, 14],
      [['Toxic Butterfly in a Jar', 1]], { quest: true }],
  ],
  'Quest - Sand in the Wind': [
    ['PrisonerWagon', 'Prisoner Wagon', 35, 500, 'Snare', [5, 10], [5, 20], [7, 24],
      [['Normal Log', 1]], { trapless: { level: 35, chanceBonus: 0 }, surveySeconds: 10, quest: true }],
  ],
} satisfies Record<string, Animal[]>;

const prerequisites: Readonly<Partial<Record<string, string>>> = {
  StonehopperWhelp: 'Requires The Path to Melvor at step 2 and equipped Stonehopper Gloves.',
  ToxicButterfly: 'Requires The Big City at step 2.',
  PrisonerWagon: 'Requires Sand in the Wind at step 0.',
  'Moonlit Hills': 'Requires observing Moonlit Hills of Ceedyr in Astrology.',
  'Torag Grounds': 'Requires 50 Torag Grounds Trail completions in Agility.',
};

interface HuntingDrop extends ItemAmount {
  chance: number;
}

export interface HuntingAction extends SkillAction {
  recipeGroup: string;
  source: string;
  prerequisiteNote?: string;
  hunt: {
    trapType: string;
    trackingSteps: Range;
    trackingSeconds: Range;
    trappingSeconds: Range;
    surveySeconds: number;
    rareChance: number;
    bait?: ItemAmount;
    trapless?: TraplessRequirements;
    catchDrops: HuntingDrop[];
  };
}

function toItem(item: NamedItem, quantity = 1): ItemAmount {
  const [itemName, itemId] = typeof item === 'string' ? [item, recipeItemId(item)] : item;
  return { itemId, itemName, quantity };
}

export const huntingActions: HuntingAction[] = Object.entries<Animal[]>(animals).flatMap(([recipeGroup, rows]) =>
  rows.map(([id, name, requiredLevel, baseXp, trapType, trackingSteps, trackingSeconds, trappingSeconds, drops, options]) => ({
    id, name, requiredLevel, baseXp, recipeGroup,
    intervalSeconds: (trappingSeconds[0] + trappingSeconds[1]) / 2,
    inputs: [], outputs: [],
    source: `https://db.melvor.aevv.net/hunting-animal/${id}`,
    prerequisiteNote: prerequisites[id] ?? prerequisites[recipeGroup],
    hunt: {
      trapType, trackingSteps, trackingSeconds, trappingSeconds,
      surveySeconds: options?.surveySeconds ?? 4,
      rareChance: options?.quest ? 0 : 0.01,
      bait: options?.bait ? toItem(options.bait) : undefined,
      trapless: options?.trapless,
      catchDrops: drops.map(([item, quantity, chance = 1]) => ({ ...toItem(item, quantity), chance })),
    },
  })),
);

type TrapRow = [
  id: string, name: string, type: string, success?: number, successPerFailure?: number,
  preservation?: number, doubling?: number, doublingPerFailure?: number,
];

const trapRows: TrapRow[] = [
  ['BasicSnare', 'Basic Snare', 'Snare'],
  ['BasicSmallBirdCatcher', 'Basic Small Bird Catcher', 'Small Bird Catcher'],
  ['BasicButterflyKit', 'Basic Butterfly Kit', 'Butterfly Kit'],
  ['BasicNet', 'Basic Net', 'Net'],
  ['ReinforcedSnare', 'Reinforced Snare', 'Snare', 0.05, 0.05, 0.2],
  ['BasicPitfallTrap', 'Basic Pitfall Trap', 'Pitfall Trap'],
  ['ReinforcedSmallBirdCatcher', 'Reinforced Small Bird Catcher', 'Small Bird Catcher', 0.05, 0.05, 0.2],
  ['ReinforcedNet', 'Reinforced Net', 'Net', 0.05, 0.05, 0.2],
  ['BasicLargeBirdNet', 'Basic Large Bird Net', 'Large Bird Net'],
  ['IronsteelPitfallTrap', 'Ironsteel Pitfall Trap', 'Pitfall Trap', 0.07, 0.03, 0.2],
  ['ReinforcedButterflyKit', 'Reinforced Butterfly Kit', 'Butterfly Kit', 0.05, 0.05, 0.2],
  ['ReinforcedPitfallTrap', 'Reinforced Pitfall Trap', 'Pitfall Trap', 0.05, 0.05, 0.2],
  ['ReinforcedLargeBirdNet', 'Reinforced Large Bird Net', 'Large Bird Net', 0.05, 0.05, 0.2],
  ['BasicSpiritBox', 'Basic Spirit Box', 'Spirit Box'],
  ['FortifiedSnare', 'Fortified Snare', 'Snare', 0.1, 0.1, 0.4],
  ['ReinforcedSpiritBox', 'Reinforced Spirit Box', 'Spirit Box', 0.05, 0.05, 0.2],
  ['FortifiedSmallBirdCatcher', 'Fortified Small Bird Catcher', 'Small Bird Catcher', 0.1, 0.1, 0.4],
  ['BlackSpiritBox', 'Black Spirit Box', 'Spirit Box', 0.08, 0.03, 0.2, 0.06, -0.01],
  ['FortifiedNet', 'Fortified Net', 'Net', 0.1, 0.1, 0.4],
  ['FortifiedButterflyKit', 'Fortified Butterfly Kit', 'Butterfly Kit', 0.1, 0.1, 0.4],
  ['FortifiedLargeBirdNet', 'Fortified Large Bird Net', 'Large Bird Net', 0.1, 0.1, 0.4],
  ['FortifiedPitfallTrap', 'Fortified Pitfall Trap', 'Pitfall Trap', 0.1, 0.1, 0.4],
  ['FortifiedSpiritBox', 'Fortified Spirit Box', 'Spirit Box', 0.1, 0.1, 0.4],
  ['BasicToragTrap', 'Basic Torag Trap', 'Torag Trap'],
  ['DragonruneSnare', 'Dragonrune Snare', 'Snare', 0.13, 0.08, 0.42],
  ['ReinforcedToragTrap', 'Reinforced Torag Trap', 'Torag Trap', 0.05, 0.05, 0.2],
  ['FortifiedToragTrap', 'Fortified Torag Trap', 'Torag Trap', 0.1, 0.1, 0.4],
  ['WeightedRockNet', 'Weighted Rock Net', 'Weighted Rock Net', 0.05, 0.05, 0.2],
];

export const huntingTraps = trapRows.map(([itemId, itemName, type, success = 0, successPerFailure = 0, preservation = 0, doubling = 0, doublingPerFailure = 0]) => ({
  itemId, itemName, type, success, successPerFailure, preservation, doubling, doublingPerFailure, quantity: 1,
}));

export type HuntingTrap = typeof huntingTraps[number];
