import type { ItemAmount, SkillAction } from '../calculator';

type Catch = [name: string, probability: number, quantity?: number];

export interface FishingAction extends SkillAction {
  source: string;
  prerequisiteNote?: string;
  minSeconds: number;
  maxSeconds: number;
  chances: Readonly<Record<string, number>>;
  specials: ItemAmount[];
}

// The game-data table gives unconditional catch probabilities, including the chance of junk.
const spots: [name: string, level: number, xp: number, min: number, max: number, fish: Catch[], specials?: Catch[]][] = [
  ['Shallow Pools', 1, 8, 4, 8, [['Raw Shrimp', 0.8]], [['Bait Box', 0.01]]],
  ['Calm Shallows', 6, 13, 5, 11, [['Raw Sardine', 0.4], ['Raw Shrimp', 0.4]], [['Pearl Clam', 0.005]]],
  ['Quiet Bend', 12, 17, 6, 12, [['Raw Herring', 0.8]], [['Rope', 0.03, 3]]],
  ['Dock Waters', 18, 25, 5, 17, [['Raw Perch', 0.8]], [['Seaweed Clump', 0.007], ['Bait Box', 0.02, 3]]],
  ['Pebble Bank', 23, 35, 8, 16, [['Raw Herring', 0.4], ['Raw Trout', 0.5]], [['Rusty Ancient Dagger', 0.005]]],
  ['Windswept Shores', 27, 16, 2, 10, [['Raw Mackerel', 0.9]], [['Steadfast Net', 0.002]]],
  ['Pier Walk', 32, 42, 6, 18, [['Raw Perch', 0.4], ['Raw Pike', 0.4]], [['Lemon Chest', 0.005]]],
  ['Moonlit Stream', 35, 22, 6, 12, [['Raw Moonlight Minnow', 0.9]], [['Moonlight Charm', 0.001]]],
  ['Rapid Runs', 39, 54, 9, 17, [['Raw Trout', 0.36], ['Raw Salmon', 0.54]], [['Shrapnel Repellent Gloves', 0.002]]],
  ['Rocky Shores', 44, 68, 6, 22, [['Raw Sardine', 0.4], ['Raw Lobster', 0.5]], [['Seashell Necklace', 0.001]]],
  ['Shimmering Depths', 49, 34, 4, 10, [['Raw Glowfin', 1]], [['Glowstone Ring', 0.0002], ['Glow Spore', 1, 2]]],
  ['Sea Edge', 55, 96, 9, 19, [['Raw Sea Bream', 0.9]], [['Seaweed Clump', 0.03]]],
  ['Windy Bay', 62, 77, 5, 15, [['Raw Mackerel', 0.4], ['Raw Cod', 0.5]]],
  ['Gusty Cliffside', 67, 134, 10, 18, [['Raw Mackerel', 0.2], ['Raw Cod', 0.3], ['Raw Sea Bass', 0.4]], [['Torn Ancient Sailcloth', 0.0005]]],
  ['Lifebinder Pool', 69, 129, 20, 60, [['Raw Soulfin', 1]]],
  ['Vibrant Shallows', 73, 152, 11, 19, [['Raw Lionfish', 0.9]], [['Bait Box', 0.02, 4]]],
  ['Midnight Cove', 75, 129, 10, 17, [['Raw Striped Mullet', 0.8]], [['Rope', 0.015, 25]]],
  ['Glowing Rift', 78, 207, 13, 23, [['Raw Glowfin', 0.4], ['Raw Glowing Jellyfish', 0.6]], [['Deep Sea Glowstone', 0.0001], ['Glow Spore', 1, 10]]],
  ['Tuna Run', 82, 209, 12, 22, [['Raw Tuna', 0.8]], [['Seaweed Clump', 0.02]]],
  ['Shark Cove', 88, 282, 17, 25, [['Raw Shark', 0.9]], [['Shark Tooth Necklace', 0.0001]]],
  ['Luminous Abyss', 93, 285, 14, 26, [['Raw Glowing Jellyfish', 0.2], ['Raw Glowing Squid', 0.8]], [['Lost Fishing Ring', 0.00006], ['Glow Spore', 1, 15]]],
  ['Bountiful Corals', 95, 315, 18, 26, [['Raw Lionfish', 0.2], ['Raw Shark', 0.3], ['Raw Giant Eel', 0.4]], [['Rainbow Coral', 0.00007]]],
  ['Sunlit Stretch', 96, 358, 19, 29, [['Raw Tuna', 0.2], ['Raw Manta Ray', 0.7]], [['Shimmering Scale Ring', 0.00006]]],
  ['Deep Blue', 98, 409, 22, 30, [['Raw Manta Ray', 0.9], ['Raw Whale', 0.1]], [['Barnacle Covered Chest', 0.0015]]],
];

function expectedCatch([itemName, probability, quantity = 1]: Catch): ItemAmount {
  return { itemId: itemName.replaceAll(' ', ''), itemName, quantity: probability * quantity };
}

export const fishingActions: FishingAction[] = spots.map(([name, requiredLevel, baseXp, minSeconds, maxSeconds, fish, specials = []]) => {
  const id = name.replaceAll(' ', '');
  const junk = Math.max(0, 1 - fish.reduce((sum, [, chance]) => sum + chance, 0));
  const catches: Catch[] = junk > 1e-10 ? [...fish, ['Junk', junk]] : fish;
  const chances = Object.fromEntries(catches.map((entry) => [expectedCatch(entry).itemId, entry[1]]));
  let noEarlierSpecial = 1;
  const expectedSpecials = [...specials].sort((a, b) => a[1] - b[1]).map(([item, chance, quantity]) => {
    const output = expectedCatch([item, chance * noEarlierSpecial, quantity]);
    noEarlierSpecial *= 1 - chance;
    return output;
  });

  return {
    id, name, requiredLevel, baseXp, minSeconds, maxSeconds, chances,
    intervalSeconds: (minSeconds + maxSeconds) / 2,
    inputs: [], outputs: catches.map(expectedCatch), specials: expectedSpecials,
    source: `https://db.melvor.aevv.net/fishing-recipe/${id}`,
    prerequisiteNote: id === 'LifebinderPool' ? 'Requires The Sunken Tower quest at step 2.' : undefined,
  };
});
