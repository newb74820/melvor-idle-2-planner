import type { ItemAmount } from '../calculator';

// Animal, variant, enclosure, and land data from Steam build 26886380.
export const ranchingSource = 'https://db.melvor.aevv.net/entity/Ranching';
export const ranchingMechanics = 'https://melvoridle.wiki/melvor-idle-2/mechanics/ranching';
export const ranchLandLevels = [1, 5, 10, 15, 20, 30, 40, 50, 60, 70, 75, 80, 85, 90, 95] as const;

type ItemRow = readonly [id: string, name: string, quantity: number];
type AnimalRow = readonly [id: string, name: string, level: number, xp: number, maturityMinutes: number,
  lifespanMinutes: number, gold: number, feed: readonly ItemRow[], products: readonly ItemRow[], requirement?: string];
const animals: readonly AnimalRow[] = [
  ["Sheep", "Sheep", 1, 34, 768, 7680, 13000, [], [["Wool", "Wool", 4], ["RawMeat", "Raw Meat", 2], ["Fertiliser", "Fertiliser", 2]]],
  ["Chicken", "Chicken", 5, 31, 576, 5760, 6000, [["Grain", "Grain", 10]], [["Egg", "Egg", 2], ["Feathers", "Feathers", 4], ["RawChicken", "Raw Chicken", 1], ["Fertiliser", "Fertiliser", 1]]],
  ["Cow", "Cow", 15, 37, 1152, 11520, 24000, [], [["Milk", "Milk", 3], ["Cowhide", "Cowhide", 2], ["RawBeef", "Raw Beef", 2], ["Fertiliser", "Fertiliser", 3]]],
  ["Bee", "Bee", 25, 6, 384, 3840, 2000, [["AmbervineLeaf", "Ambervine Leaf", 2]], [["Honey", "Honey", 1], ["Beeswax", "Beeswax", 2]]],
  ["Pig", "Pig", 35, 40, 768, 7680, 3000, [["Grain", "Grain", 30]], [["RawMeat", "Raw Meat", 6], ["Fertiliser", "Fertiliser", 2]]],
  ["Silkworm", "Silkworm", 45, 8, 384, 3840, 1000, [["AmbervineLeaf", "Ambervine Leaf", 2]], [["Silk", "Silk", 3]]],
  ["Elk", "Elk", 55, 52, 1728, 17280, 100000, [], [["ElkHide", "Elk Hide", 1], ["ElkAntler", "Elk Antler", 1], ["RawMeat", "Raw Meat", 2], ["Fertiliser", "Fertiliser", 3]], "Trap a Tame Elk"],
  ["Mealworm", "Mealworm", 60, 8, 384, 3840, 1000, [["SpikemossLeaf", "Spikemoss Leaf", 2]], [["Mealworm", "Mealworm", 2]]],
  ["Wolf", "Wolf", 70, 68, 1152, 11520, 63000, [["RawMeat", "Raw Meat", 4]], [["WolfFang", "Wolf Fang", 2], ["WolfFur", "Wolf Fur", 1]], "Complete a Wolf Slayer task"],
  ["GreenDragon", "Green Dragon", 75, 116, 2304, 23040, 255000, [["RawMeat", "Raw Meat", 10]], [["GreenDragonhide", "Green Dragonhide", 4], ["SmallGreenDragonscale", "Small Green Dragonscale", 2]], "Complete a Green Dragon Slayer task"],
  ["BlueDragon", "Blue Dragon", 78, 120, 2304, 23040, 420000, [["RawMeat", "Raw Meat", 10]], [["BlueDragonhide", "Blue Dragonhide", 4], ["SmallBlueDragonscale", "Small Blue Dragonscale", 2]], "Complete a Blue Dragon Slayer task"],
  ["Caribou", "Caribou", 80, 76, 1800, 18000, 460000, [], [["CaribouHide", "Caribou Hide", 1], ["CaribouAntler", "Caribou Antler", 2], ["RawMeat", "Raw Meat", 3], ["Fertiliser", "Fertiliser", 4]], "Trap a Tame Caribou"],
  ["RedDragon", "Red Dragon", 82, 124, 2304, 23040, 590000, [["RawMeat", "Raw Meat", 10]], [["RedDragonhide", "Red Dragonhide", 4], ["SmallRedDragonscale", "Small Red Dragonscale", 2]], "Complete a Red Dragon Slayer task"],
  ["BlackDragon", "Black Dragon", 86, 127, 2304, 23040, 1470000, [["RawMeat", "Raw Meat", 10]], [["BlackDragonhide", "Black Dragonhide", 4], ["SmallBlackDragonscale", "Small Black Dragonscale", 2]], "Complete a Black Dragon Slayer task"],
  ["TopazGolem", "Topaz Golem", 92, 138, 2880, 28800, 1000000, [["GeodeDust", "Geode Dust", 1]], [["UncutTopaz", "Uncut Topaz", 2], ["GemstoneFragment", "Gemstone Fragment", 4]], "Mining level 99"],
  ["SapphireGolem", "Sapphire Golem", 93, 146, 2880, 28800, 1100000, [["GeodeDust", "Geode Dust", 1]], [["UncutSapphire", "Uncut Sapphire", 2], ["GemstoneFragment", "Gemstone Fragment", 4]], "Mining level 99"],
  ["RubyGolem", "Ruby Golem", 94, 154, 2880, 28800, 1135000, [["GeodeDust", "Geode Dust", 1]], [["UncutRuby", "Uncut Ruby", 2], ["GemstoneFragment", "Gemstone Fragment", 4]], "Mining level 99"],
  ["EmeraldGolem", "Emerald Golem", 95, 162, 2880, 28800, 1225000, [["GeodeDust", "Geode Dust", 1]], [["UncutEmerald", "Uncut Emerald", 2], ["GemstoneFragment", "Gemstone Fragment", 4]], "Mining level 99"],
  ["DiamondGolem", "Diamond Golem", 96, 170, 2880, 28800, 1850000, [["GeodeDust", "Geode Dust", 1]], [["UncutDiamond", "Uncut Diamond", 2], ["GemstoneFragment", "Gemstone Fragment", 4]], "Mining level 99"],
  ["JadestoneGolem", "Jadestone Golem", 98, 178, 2880, 28800, 2160000, [["GeodeDust", "Geode Dust", 1]], [["UncutJadestone", "Uncut Jadestone", 2], ["GemstoneFragment", "Gemstone Fragment", 4]], "Mining level 99"],
];

type EnclosureRow = readonly [id: string, name: string, level: number, capacity: number,
  animalIds: readonly string[], requirement?: string];
const enclosures: readonly EnclosureRow[] = [
  ["ChickenCoopI", "Chicken Coop I", 5, 2, ["Chicken"], "Grain Mill purchase"],
  ["ChickenCoopII", "Chicken Coop II", 8, 3, ["Chicken"], "Grain Mill purchase"],
  ["ChickenCoopIII", "Chicken Coop III", 15, 4, ["Chicken"], "Grain Mill purchase"],
  ["ChickenCoopIV", "Chicken Coop IV", 25, 6, ["Chicken"], "Grain Mill purchase"],
  ["ChickenCoopV", "Chicken Coop V", 35, 8, ["Chicken"], "Grain Mill purchase"],
  ["ChickenCoopVI", "Chicken Coop VI", 45, 10, ["Chicken"], "Grain Mill purchase"],
  ["ChickenCoopVII", "Chicken Coop VII", 55, 12, ["Chicken"], "Grain Mill purchase"],
  ["ChickenCoopVIII", "Chicken Coop VIII", 65, 15, ["Chicken"], "Grain Mill purchase"],
  ["ChickenCoopIX", "Chicken Coop IX", 75, 18, ["Chicken"], "Grain Mill purchase"],
  ["ChickenCoopX", "Chicken Coop X", 85, 20, ["Chicken"], "Grain Mill purchase"],
  ["ChickenCoopXI", "Chicken Coop XI", 92, 22, ["Chicken"], "Grain Mill purchase"],
  ["CowSheepEnclosureI", "Cows & Sheep Pasture I", 1, 2, ["Sheep", "Cow"]],
  ["CowSheepEnclosureII", "Cows & Sheep Pasture II", 2, 3, ["Sheep", "Cow"]],
  ["CowSheepEnclosureIII", "Cows & Sheep Pasture III", 10, 4, ["Sheep", "Cow"]],
  ["CowSheepEnclosureIV", "Cows & Sheep Pasture IV", 25, 5, ["Sheep", "Cow"]],
  ["CowSheepEnclosureV", "Cows & Sheep Pasture V", 35, 6, ["Sheep", "Cow"]],
  ["CowSheepEnclosureVI", "Cows & Sheep Pasture VI", 45, 8, ["Sheep", "Cow"]],
  ["CowSheepEnclosureVII", "Cows & Sheep Pasture VII", 55, 10, ["Sheep", "Cow"]],
  ["CowSheepEnclosureVIII", "Cows & Sheep Pasture VIII", 65, 12, ["Sheep", "Cow"]],
  ["CowSheepEnclosureIX", "Cows & Sheep Pasture IX", 75, 14, ["Sheep", "Cow"]],
  ["CowSheepEnclosureX", "Cows & Sheep Pasture X", 85, 16, ["Sheep", "Cow"]],
  ["CowSheepEnclosureXI", "Cows & Sheep Pasture XI", 94, 18, ["Sheep", "Cow"]],
  ["PigEnclosureI", "Pig Pen I", 35, 3, ["Pig"], "Grain Mill purchase"],
  ["PigEnclosureII", "Pig Pen II", 40, 6, ["Pig"], "Grain Mill purchase"],
  ["PigEnclosureIII", "Pig Pen III", 50, 10, ["Pig"], "Grain Mill purchase"],
  ["PigEnclosureIV", "Pig Pen IV", 65, 12, ["Pig"], "Grain Mill purchase"],
  ["PigEnclosureV", "Pig Pen V", 80, 15, ["Pig"], "Grain Mill purchase"],
  ["PigEnclosureVI", "Pig Pen VI", 93, 18, ["Pig"], "Grain Mill purchase"],
  ["BeeEnclosureI", "Bee Box I", 25, 10, ["Bee"]],
  ["BeeEnclosureII", "Bee Box II", 50, 30, ["Bee"]],
  ["BeeEnclosureIII", "Bee Box III", 75, 50, ["Bee"]],
  ["BeeEnclosureIV", "Bee Box IV", 95, 70, ["Bee"]],
  ["WormEnclosureI", "Worm Cabinet I", 45, 5, ["Silkworm", "Mealworm"]],
  ["WormEnclosureII", "Worm Cabinet II", 66, 15, ["Silkworm", "Mealworm"]],
  ["WormEnclosureIII", "Worm Cabinet III", 75, 22, ["Silkworm", "Mealworm"]],
  ["WormEnclosureIV", "Worm Cabinet IV", 96, 30, ["Silkworm", "Mealworm"]],
  ["ElkEnclosureI", "Elk Enclosure I", 55, 2, ["Elk", "Caribou"], "Trap a Tame Elk"],
  ["ElkEnclosureII", "Elk Enclosure II", 65, 4, ["Elk", "Caribou"], "Trap a Tame Elk"],
  ["ElkEnclosureIII", "Elk Enclosure III", 75, 6, ["Elk", "Caribou"], "Trap a Tame Elk"],
  ["ElkEnclosureIV", "Elk Enclosure IV", 85, 8, ["Elk", "Caribou"], "Trap a Tame Elk"],
  ["ElkEnclosureV", "Elk Enclosure V", 95, 12, ["Elk", "Caribou"], "Trap a Tame Elk"],
  ["WolfEnclosureI", "Wolf Den I", 70, 3, ["Wolf"], "Complete a Wolf Slayer task"],
  ["WolfEnclosureII", "Wolf Den II", 77, 5, ["Wolf"], "Complete a Wolf Slayer task"],
  ["WolfEnclosureIII", "Wolf Den III", 85, 8, ["Wolf"], "Complete a Wolf Slayer task"],
  ["WolfEnclosureIV", "Wolf Den IV", 97, 12, ["Wolf"], "Complete a Wolf Slayer task"],
  ["DragonEnclosureI", "Dragon Lair I", 75, 2, ["GreenDragon", "BlueDragon", "RedDragon", "BlackDragon"], "Complete a Green Dragon Slayer task"],
  ["DragonEnclosureII", "Dragon Lair II", 82, 3, ["GreenDragon", "BlueDragon", "RedDragon", "BlackDragon"]],
  ["DragonEnclosureIII", "Dragon Lair III", 88, 4, ["GreenDragon", "BlueDragon", "RedDragon", "BlackDragon"], "Complete a Green Dragon Slayer task"],
  ["DragonEnclosureIV", "Dragon Lair IV", 96, 5, ["GreenDragon", "BlueDragon", "RedDragon", "BlackDragon"], "Complete a Green Dragon Slayer task"],
  ["GolemEnclosureI", "Golem Quarry I", 92, 2, ["TopazGolem", "SapphireGolem", "RubyGolem", "EmeraldGolem", "DiamondGolem", "JadestoneGolem"], "Mining level 99"],
  ["GolemEnclosureII", "Golem Quarry II", 94, 3, ["TopazGolem", "SapphireGolem", "RubyGolem", "EmeraldGolem", "DiamondGolem", "JadestoneGolem"], "Mining level 99"],
  ["GolemEnclosureIII", "Golem Quarry III", 96, 4, ["TopazGolem", "SapphireGolem", "RubyGolem", "EmeraldGolem", "DiamondGolem", "JadestoneGolem"], "Mining level 99"],
  ["GolemEnclosureIV", "Golem Quarry IV", 98, 6, ["TopazGolem", "SapphireGolem", "RubyGolem", "EmeraldGolem", "DiamondGolem", "JadestoneGolem"], "Mining level 99"],
];

const item = ([itemId, itemName, quantity]: ItemRow): ItemAmount => ({ itemId, itemName, quantity });
export const ranchAnimals = animals.map(([id, name, level, xp, maturityMinutes, lifespanMinutes, gold, feed, products, requirement]) => ({
  id, name, level, xp, maturityMinutes, lifespanMinutes, gold, feed: feed.map(item), products: products.map(item), requirement,
}));
export const ranchEnclosures = enclosures.map(([id, name, level, capacity, animalIds, requirement]) => ({
  id, name, level, capacity, animalIds, requirement,
}));

export type RanchAnimal = typeof ranchAnimals[number];
export type RanchEnclosure = typeof ranchEnclosures[number];
