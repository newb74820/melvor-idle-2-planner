import type { ItemAmount } from '../calculator';

// FarmingCategory, FarmingPlot, and FarmingRecipe from Steam build 26886380.
export const farmingSource = 'https://db.melvor.aevv.net/entity/Farming';
export const farmingMechanics = 'https://melvoridle.wiki/melvor-idle-2/mechanics/farming';

const plotCategories = [
  ["Allotments", "Allotments", [1, 1, 1, 25, 35, 45, 55, 65, 75, 85]],
  ["Herbs", "Herbs", [5, 10, 20, 30, 40, 50, 60, 70, 80, 92]],
  ["CompostBins", "Compost Bins", [5, 20, 35, 50, 65, 80]],
  ["Trees", "Trees", [15, 30, 45, 60, 75, 90]],
  ["Flowers", "Flowers", [30, 50, 65, 90]],
  ["Orchard", "Orchard", [35, 45, 55, 65, 75, 85]],
  ["MillFarm", "Mill Farm", [10, 25, 40, 60, 80]],
] as const;

export type FarmingCategory = typeof plotCategories[number][0];
export const farmingCategories = plotCategories.map(([id, name, plotLevels]) => ({ id, name, plotLevels }));

type ItemRow = readonly [id: string, name: string, quantity: number];
type CropRow = readonly [id: string, name: string, category: FarmingCategory, requiredLevel: number, xp: number,
  growSeconds: number, inputs: readonly ItemRow[], output: ItemRow, regrows?: number, regrowSeconds?: number];

const rows: readonly CropRow[] = [
  ["Potato", "Potato", "Allotments", 1, 34, 5400, [["PotatoSeed", "Potato Seed", 3]], ["Potato", "Potato", 50]],
  ["Onion", "Onion", "Allotments", 5, 49, 7200, [["OnionSeed", "Onion Seed", 3]], ["Onion", "Onion", 50]],
  ["PenrilHerb", "Penril Herb", "Herbs", 5, 47, 7200, [["PenrilHerbSeed", "Penril Herb Seed", 2]], ["PenrilHerb", "Penril Herb", 100]],
  ["Compost", "Compost", "CompostBins", 5, 5, 86400, [["Onion", "Onion", 200]], ["Compost", "Compost", 15]],
  ["Wheat", "Wheat", "MillFarm", 10, 30, 14400, [["WheatSeed", "Wheat Seed", 2]], ["Wheat", "Wheat", 500]],
  ["Lettuce", "Lettuce", "Allotments", 15, 75, 9000, [["LettuceSeed", "Lettuce Seed", 3]], ["Lettuce", "Lettuce", 50]],
  ["SourweedHerb", "Sourweed Herb", "Herbs", 15, 86, 10800, [["SourweedHerbSeed", "Sourweed Herb Seed", 2]], ["SourweedHerb", "Sourweed Herb", 100]],
  ["OakTree", "Oak Tree", "Trees", 15, 799, 28800, [["OakTreeSeed", "Oak Tree Seed", 1]], ["OakLog", "Oak Log", 250]],
  ["Sugarcane", "Sugarcane", "MillFarm", 20, 23, 7200, [["SugarcaneStalk", "Sugarcane Stalk", 1]], ["Sugarcane", "Sugarcane", 250]],
  ["Strawberry", "Strawberry", "Allotments", 21, 95, 10800, [["StrawberrySeed", "Strawberry Seed", 3]], ["Strawberry", "Strawberry", 50]],
  ["MantalymeHerb", "Mantalyme Herb", "Herbs", 25, 133, 14400, [["MantalymeHerbSeed", "Mantalyme Herb Seed", 2]], ["MantalymeHerb", "Mantalyme Herb", 100]],
  ["WillowTree", "Willow Tree", "Trees", 30, 1391, 43200, [["WillowTreeSeed", "Willow Tree Seed", 1]], ["WillowLog", "Willow Log", 250]],
  ["Garlic", "Garlic", "Allotments", 33, 146, 14400, [["GarlicSeed", "Garlic Seed", 3]], ["Garlic", "Garlic", 60]],
  ["NomelHerb", "Nomel Herb", "Herbs", 35, 185, 18000, [["NomelHerbSeed", "Nomel Herb Seed", 2]], ["NomelHerb", "Nomel Herb", 100]],
  ["BananaTree", "Banana Tree", "Orchard", 35, 691, 172800, [["BananaTreeSeed", "Banana Tree Seed", 1]], ["Banana", "Banana", 200], 15, 28800],
  ["Corn", "Corn", "Allotments", 40, 219, 16200, [["CornSeed", "Corn Seed", 3]], ["Corn", "Corn", 40]],
  ["SuperCompost", "Super Compost", "CompostBins", 40, 9, 86400, [["Corn", "Corn", 100], ["Charcoal", "Charcoal", 20]], ["SuperCompost", "Super Compost", 15]],
  ["TeakTree", "Teak Tree", "Trees", 45, 2949, 57600, [["TeakTreeSeed", "Teak Tree Seed", 1]], ["TeakLog", "Teak Log", 250]],
  ["Nightreed", "Nightreed", "Allotments", 45, 477, 16200, [["NightreedSeed", "Nightreed Seed", 3]], ["Nightreed", "Nightreed", 200]],
  ["Watermelon", "Watermelon", "Allotments", 48, 297, 18000, [["WatermelonSeed", "Watermelon Seed", 3]], ["Watermelon", "Watermelon", 20]],
  ["OxilymeHerb", "Oxilyme Herb", "Herbs", 50, 392, 21600, [["OxilymeHerbSeed", "Oxilyme Herb Seed", 2]], ["OxilymeHerb", "Oxilyme Herb", 100]],
  ["AppleTree", "Apple Tree", "Orchard", 50, 1218, 172800, [["AppleTreeSeed", "Apple Tree Seed", 1]], ["Apple", "Apple", 200], 15, 28800],
  ["SnapeGrass", "Snape Grass", "Allotments", 54, 383, 19800, [["SnapeGrassSeed", "Snape Grass Seed", 3]], ["SnapeGrass", "Snape Grass", 40]],
  ["MahoganyTree", "Mahogany Tree", "Trees", 55, 5973, 86400, [["MahoganyTreeSeed", "Mahogany Tree Seed", 1]], ["MahoganyLog", "Mahogany Log", 250]],
  ["YewTree", "Yew Tree", "Trees", 60, 10641, 129600, [["YewTreeSeed", "Yew Tree Seed", 1]], ["YewLog", "Yew Log", 250]],
  ["CherryTree", "Cherry Tree", "Orchard", 60, 1591, 172800, [["CherryTreeSeed", "Cherry Tree Seed", 1]], ["Cherry", "Cherry", 200], 15, 28800],
  ["Tomato", "Tomato", "Allotments", 63, 547, 21600, [["TomatoSeed", "Tomato Seed", 3]], ["Tomato", "Tomato", 50]],
  ["SporlyleHerb", "Sporlyle Herb", "Herbs", 65, 686, 25200, [["SporlyleHerbSeed", "Sporlyle Herb Seed", 2]], ["SporlyleHerb", "Sporlyle Herb", 100]],
  ["Carrot", "Carrot", "Allotments", 69, 677, 23400, [["CarrotSeed", "Carrot Seed", 3]], ["Carrot", "Carrot", 50]],
  ["Coalmpost", "Coalmpost", "CompostBins", 69, 56, 86400, [["Carrot", "Carrot", 100], ["Coal", "Coal", 420]], ["Coalmpost", "Coalmpost", 15]],
  ["PeachTree", "Peach Tree", "Orchard", 70, 1914, 172800, [["PeachTreeSeed", "Peach Tree Seed", 1]], ["Peach", "Peach", 200], 15, 28800],
  ["Pumpkin", "Pumpkin", "Allotments", 75, 794, 25200, [["PumpkinSeed", "Pumpkin Seed", 3]], ["Pumpkin", "Pumpkin", 12]],
  ["LarxHerb", "Larx Herb", "Herbs", 75, 882, 28800, [["LarxHerbSeed", "Larx Herb Seed", 2]], ["LarxHerb", "Larx Herb", 100]],
  ["MagicTree", "Magic Tree", "Trees", 75, 18353, 172800, [["MagicTreeSeed", "Magic Tree Seed", 1]], ["MagicLog", "Magic Log", 250]],
  ["Cabbage", "Cabbage", "Allotments", 80, 964, 28800, [["CabbageSeed", "Cabbage Seed", 3]], ["Cabbage", "Cabbage", 50]],
  ["HardOakTree", "Hard Oak Tree", "Trees", 80, 24493, 216000, [["HardOakTreeSeed", "Hard Oak Tree Seed", 1]], ["HardOakLog", "Hard Oak Log", 250]],
  ["OrangeTree", "Orange Tree", "Orchard", 80, 2204, 172800, [["OrangeTreeSeed", "Orange Tree Seed", 1]], ["Orange", "Orange", 200], 15, 28800],
  ["UltraCompost", "Ultra Compost", "CompostBins", 80, 12, 86400, [["Cabbage", "Cabbage", 40], ["Charcoal", "Charcoal", 50], ["Duskleaf", "Duskleaf", 100]], ["UltraCompost", "Ultra Compost", 15]],
  ["AshenTree", "Ashen Tree", "Trees", 80, 28500, 194400, [["AshenTreeSeed", "Ashen Tree Seed", 1]], ["AshenLog", "Ashen Log", 250]],
  ["Cauliflower", "Cauliflower", "Allotments", 90, 1154, 30600, [["CauliflowerSeed", "Cauliflower Seed", 3]], ["Cauliflower", "Cauliflower", 12]],
  ["BarrentoeHerb", "Barrentoe Herb", "Herbs", 90, 1180, 32400, [["BarrentoeHerbSeed", "Barrentoe Herb Seed", 2]], ["BarrentoeHerb", "Barrentoe Herb", 100]],
  ["RedwoodTree", "Redwood Tree", "Trees", 90, 32676, 259200, [["RedwoodTreeSeed", "Redwood Tree Seed", 1]], ["RedwoodLog", "Redwood Log", 250]],
  ["MangoTree", "Mango Tree", "Orchard", 95, 2569, 172800, [["MangoTreeSeed", "Mango Tree Seed", 1]], ["Mango", "Mango", 200], 15, 28800],
];

export interface FarmingCrop {
  id: string;
  name: string;
  category: FarmingCategory;
  requiredLevel: number;
  xp: number;
  growSeconds: number;
  inputs: ItemAmount[];
  output: ItemAmount;
  regrows: number;
  regrowSeconds: number;
}

const item = ([itemId, itemName, quantity]: ItemRow): ItemAmount => ({ itemId, itemName, quantity });
export const farmingCrops: readonly FarmingCrop[] = rows.map(([id, name, category, requiredLevel, xp, growSeconds, inputs, output, regrows = 0, regrowSeconds = 0]) => ({
  id, name, category, requiredLevel, xp, growSeconds, inputs: inputs.map(item), output: item(output), regrows, regrowSeconds,
}));

// Flowers are grown for ongoing bonuses and have no harvest.
export const farmingFlowers = [
  ["Sunflower", "Sunflower", 30, 86400, "Sunflower Seed", "+20 disease protection"],
  ["Marigold", "Marigold", 45, 86400, "Marigold Seed", "+10% Farming XP"],
  ["Nasturtium", "Nasturtium", 55, 86400, "Nasturtium Seed", "+15% harvest quantity"],
  ["Rosemary", "Rosemary", 65, 86400, "Rosemary Seed", "+20 pest protection"],
  ["WhiteLily", "White Lily", 75, 86400, "White Lily Seed", "+20% compost preservation chance"],
  ["Chamomile", "Chamomile", 85, 86400, "Chamomile Seed", "-10% automation cost"],
] as const;
