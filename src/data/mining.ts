import type { ResourceRecipe } from '../resource-planner';
import type { ItemAmount, SkillAction } from '../calculator';

export function rockBreakTiming(breakChance: number, secondsPerHit: number) {
  if (!(breakChance > 0 && breakChance <= 1) || !Number.isFinite(secondsPerHit) || secondsPerHit <= 0) {
    throw new RangeError('Rock break chance and hit interval must be positive.');
  }
  // Failed hits fill the rock's progress bar by the same chance used for early breaks.
  const maximumHits = Math.ceil(0.9999 / breakChance);
  if (!Number.isSafeInteger(maximumHits)) throw new RangeError('Rock break timing exceeds the supported hit range.');
  const expectedHits = -Math.expm1(maximumHits * Math.log1p(-breakChance)) / breakChance;
  return { expectedHits, maximumHits, secondsPerHit };
}

export interface MiningAction extends SkillAction {
  source: string;
  prerequisiteNote?: string;
  breakChance: number;
  hitTiming: ReturnType<typeof rockBreakTiming>;
  onHitDrop?: { item: ItemAmount; chance: number };
}

// Base rock recipes from build 26724394. All listed rocks use a 1.5s base hit interval.
const rocks: [name: string, level: number, xp: number, breakChance: number, product?: string, quantity?: number, geode?: string, requirement?: string][] = [
  ['Stone', 1, 3, 0.4],
  ['Clay', 3, 4, 0.3333],
  ['Copper Ore', 5, 6, 0.3, 'Copper Ore', 1, 'Geode'],
  ['Rune Essence', 8, 5, 0.3333, 'Rune Essence', 2],
  ['Iron Ore', 10, 10, 0.24, 'Iron Ore', 1, 'Geode'],
  ['Stone Debris', 10, 25, 0.02, 'Stone', 20, undefined, 'Requires the active Stone Debris goal in Boarish Bonfire.'],
  ['Topaz Vein', 12, 29, 0.08, 'Uncut Topaz'],
  ['Silver Ore', 18, 12, 0.22, 'Silver Ore', 1, 'Geode'],
  ['Sulfur', 18, 13, 0.1, 'Sulfur', 1, undefined, 'Requires Rocky Rumble at step 0 and equipped Sulfur Protection Gloves.'],
  ['Coal', 25, 10, 0.33],
  ['Fallen Star', 30, 13, 0.25, 'Stardust', 1, undefined, 'Requires an equipped Starfall Sightings Log.'],
  ['Sapphire Vein', 32, 46, 0.07, 'Uncut Sapphire'],
  ['Mithril Ore', 35, 22, 0.15, 'Mithril Ore', 1, 'Geode'],
  ['Gold Ore', 38, 20, 0.18, 'Gold Ore', 1, 'Geode'],
  ['Attuned Essence', 42, 13, 0.2],
  ['Adamantite Ore', 45, 34, 0.125, 'Adamantite Ore', 1, 'Geode'],
  ['Ruby Vein', 47, 92, 0.05, 'Uncut Ruby'],
  ['Golden Fallen Star', 50, 24, 0.2, 'Golden Stardust', 1, undefined, 'Requires an equipped Golden Starfall Sightings Log.'],
  ['Runite Ore', 55, 50, 0.1, 'Runite Ore', 1, 'Geode'],
  ['Icy Doorway', 62, 200, 0.01, 'Stone', 1, undefined, 'Requires an active Icy Doorway task in Cold Plunge and all five warm clothing pieces equipped.'],
  ['Emerald Vein', 65, 153, 0.04, 'Uncut Emerald'],
  ['Dawnsteel Ore', 70, 62, 0.09, 'Dawnsteel Ore', 1, 'Geode'],
  ['Meteorite Ore', 75, 64, 0.08, 'Meteorite Ore', 1, 'Scorched Geode', 'Requires an equipped Meteorite Sightings Log.'],
  ['Dense Coal', 80, 49, 0.24, 'Coal', 3, undefined, 'Requires 50 Dense Cave Trail completions in Agility.'],
  ['Pure Essence', 80, 29, 0.2, 'Pure Essence', 2],
  ['Dragonite Ore', 85, 93, 0.07, 'Dragonite Ore', 1, 'Geode'],
  ['Diamond Vein', 90, 210, 0.03, 'Uncut Diamond'],
  ['Jadestone Vein', 97, 333, 0.02, 'Uncut Jadestone'],
];

export const miningActions: MiningAction[] = rocks.map(([name, requiredLevel, baseXp, breakChance, product = name, quantity = 1, geode, prerequisiteNote]) => {
  const id = name.replace(/ Vein$/, '').replaceAll(' ', '');
  const hitTiming = rockBreakTiming(breakChance, 1.5);
  return {
    id, name, requiredLevel, baseXp, breakChance, hitTiming, prerequisiteNote,
    intervalSeconds: hitTiming.expectedHits * hitTiming.secondsPerHit,
    inputs: [],
    outputs: [{ itemId: product.replaceAll(' ', ''), itemName: product, quantity }],
    onHitDrop: geode ? {
      item: { itemId: geode.replaceAll(' ', ''), itemName: geode, quantity: 1 },
      chance: 0.0025,
    } : undefined,
    source: `https://db.melvor.aevv.net/mining-recipe/${id}`,
  };
});

export const miningResourceRecipes: ResourceRecipe[] = miningActions
  .filter(({ id }) => id === 'CopperOre' || id === 'IronOre')
  .map(({ id, name, ...action }) => ({
    ...action,
    id: `mining-${id}`,
    name: `Mine ${name}`,
    skill: 'Mining',
    kind: 'gathering',
  }));
