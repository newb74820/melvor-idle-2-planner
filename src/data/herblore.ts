import type { SkillAction } from '../calculator';
import { recipeItemAmount, recipeItemId, type RecipeItem } from './recipe-items';

export const herbloreSource = 'https://db.melvor.aevv.net/entity/Herblore';
export const bottlingsPerBrew = 10;
const bottlingSeconds = 0.5;

type HerbloreRecipe = [
  name: string, level: number, xp: number, fullBrewSeconds: number, yieldPerBottling: number,
  ingredients: RecipeItem[], priorPotionCount?: number, id?: string,
];

// Build 26724394. Full brew times include all ten half-second bottlings.
const recipes = {
  'Skilling Potions': [
    ['Woodcutting Potion P1-A', 1, 3, 30, 15, [['Pack of Vials', 1, 'EmptyVial'], 'Penril Herb', 'Stick']],
    ['Fishing Potion P1-A', 1, 7, 70, 3, [['Pack of Vials', 1, 'EmptyVial'], 'Penril Herb', 'Seaweed']],
    ['Mining Potion P1-A', 1, 3, 30, 10, [['Pack of Vials', 1, 'EmptyVial'], 'Penril Herb', 'Clay']],
    ['Firemaking Potion P1-A', 15, 13, 90, 2, [['Pack of Vials', 1, 'EmptyVial'], 'Penril Herb', ['Ash', 2]]],
    ['Cooking Potion P1-A', 15, 7, 50, 12, [['Pack of Vials', 1, 'EmptyVial'], 'Penril Herb', 'Beef']],
    ['Smithing Potion P1-A', 15, 6, 40, 10, [['Pack of Vials', 1, 'EmptyVial'], 'Sourweed Herb', 'Coal']],
    ['Crafting Potion P1-A', 15, 5, 40, 10, [['Pack of Vials', 1, 'EmptyVial'], 'Sourweed Herb', 'String']],
    ['Fletching Potion P1-A', 15, 5, 40, 10, [['Pack of Vials', 1, 'EmptyVial'], 'Sourweed Herb', 'Iron Arrows']],
    ['Runecrafting Potion P1-A', 15, 7, 40, 10, [['Pack of Vials', 1, 'EmptyVial'], 'Sourweed Herb', 'Mind Rune']],
    ['Hunting Potion P1-A', 15, 17, 120, 1, [['Pack of Vials', 1, 'EmptyVial'], 'Sourweed Herb', 'Rabbit Fur']],
    ['Farming Potion P1-A', 15, 16, 150, 1, [['Pack of Vials', 1, 'EmptyVial'], 'Sourweed Herb', ['Lettuce', 2]]],
    ['Ranching Potion P1-A', 15, 8, 55, 6, [['Pack of Vials', 1, 'EmptyVial'], 'Sourweed Herb', ['Beeswax', 4]]],
    ['Herblore Potion P1-A', 15, 7, 50, 5, [['Pack of Vials', 1, 'EmptyVial'], 'Sourweed Herb', 'Penril Herb']],
    ['Astrology Potion P1-A', 15, 7, 50, 8, [['Pack of Vials', 1, 'EmptyVial'], 'Nomel Herb', 'Stardust']],
    ['Woodcutting Potion P2-A', 30, 9, 30, 20, [['Pack of Vials', 1, 'EmptyVial'], 'Penril Herb', ['Stick', 2], 'Attuned Essence'], 1000],
    ['Woodcutting Potion P2-B', 30, 9, 30, 20, [['Pack of Vials', 1, 'EmptyVial'], 'Mantalyme Herb', ['Ambervine Leaf', 2], 'Attuned Essence'], 1000],
    ['Fishing Potion P2-A', 30, 30, 70, 4, [['Pack of Vials', 1, 'EmptyVial'], 'Penril Herb', ['Seaweed', 2], 'Attuned Essence'], 250],
    ['Fishing Potion P2-B', 30, 30, 70, 4, [['Pack of Vials', 1, 'EmptyVial'], 'Mantalyme Herb', ['Raw Mackerel', 3], 'Attuned Essence'], 250],
    ['Mining Potion P2-A', 30, 10, 30, 12, [['Pack of Vials', 1, 'EmptyVial'], 'Penril Herb', ['Clay', 2], 'Attuned Essence'], 750],
    ['Mining Potion P2-B', 30, 10, 30, 12, [['Pack of Vials', 1, 'EmptyVial'], 'Mantalyme Herb', ['Silver Ore', 2], 'Attuned Essence'], 750],
    ['Beastcrafting Potion P1-A', 30, 13, 35, 10, [['Pack of Vials', 1, 'EmptyVial'], 'Mantalyme Herb', 'Thornback Lizard Spike']],
    ['Agility Potion P1-A', 30, 11, 60, 8, [['Pack of Vials', 1, 'EmptyVial'], 'Mantalyme Herb']],
    ['Thieving Potion P1-A', 30, 13, 45, 8, [['Pack of Vials', 1, 'EmptyVial'], 'Mantalyme Herb', 'Topaz']],
    ['Firemaking Potion P2-A', 45, 41, 90, 3, [['Pack of Vials', 1, 'EmptyVial'], 'Penril Herb', ['Ash', 4], 'Attuned Essence'], 125],
    ['Firemaking Potion P2-B', 45, 41, 90, 3, [['Pack of Vials', 1, 'EmptyVial'], 'Mantalyme Herb', ['Charcoal', 2], 'Attuned Essence'], 125],
    ['Cooking Potion P2-A', 45, 25, 50, 15, [['Pack of Vials', 1, 'EmptyVial'], 'Penril Herb', ['Beef', 2], 'Attuned Essence'], 700],
    ['Cooking Potion P2-B', 45, 25, 50, 15, [['Pack of Vials', 1, 'EmptyVial'], 'Mantalyme Herb', ['Chicken', 2], 'Attuned Essence'], 700],
    ['Smithing Potion P2-A', 45, 18, 40, 12, [['Pack of Vials', 1, 'EmptyVial'], 'Sourweed Herb', ['Coal', 3], 'Attuned Essence'], 1000],
    ['Smithing Potion P2-B', 45, 18, 40, 12, [['Pack of Vials', 1, 'EmptyVial'], 'Nomel Herb', 'Gold Bar', 'Attuned Essence'], 1000],
    ['Crafting Potion P2-A', 45, 16, 40, 12, [['Pack of Vials', 1, 'EmptyVial'], 'Sourweed Herb', ['String', 3], 'Attuned Essence'], 1000],
    ['Crafting Potion P2-B', 45, 16, 40, 12, [['Pack of Vials', 1, 'EmptyVial'], 'Nomel Herb', ['Rope', 2], 'Attuned Essence'], 1000],
    ['Fletching Potion P2-A', 45, 15, 40, 12, [['Pack of Vials', 1, 'EmptyVial'], 'Sourweed Herb', ['Iron Arrows', 3], 'Attuned Essence'], 1000],
    ['Fletching Potion P2-B', 45, 15, 40, 12, [['Pack of Vials', 1, 'EmptyVial'], 'Nomel Herb', ['Willow Boomerang', 2], 'Attuned Essence'], 1000],
    ['Runecrafting Potion P2-A', 45, 14, 40, 12, [['Pack of Vials', 1, 'EmptyVial'], 'Sourweed Herb', ['Mind Rune', 2], 'Attuned Essence'], 1000],
    ['Runecrafting Potion P2-B', 45, 14, 40, 12, [['Pack of Vials', 1, 'EmptyVial'], 'Nomel Herb', ['Chaos Rune', 2], 'Attuned Essence'], 1000],
    ['Hunting Potion P2-A', 45, 56, 120, 2, [['Pack of Vials', 1, 'EmptyVial'], 'Sourweed Herb', ['Rabbit Fur', 2], 'Attuned Essence'], 50],
    ['Hunting Potion P2-B', 45, 56, 120, 2, [['Pack of Vials', 1, 'EmptyVial'], 'Nomel Herb', ['Elk Antler', 2], 'Attuned Essence'], 50],
    ['Farming Potion P2-A', 45, 43, 150, 2, [['Pack of Vials', 1, 'EmptyVial'], 'Sourweed Herb', ['Lettuce', 4], 'Attuned Essence'], 20],
    ['Farming Potion P2-B', 45, 43, 150, 2, [['Pack of Vials', 1, 'EmptyVial'], 'Nomel Herb', ['Banana', 2], 'Attuned Essence'], 20],
    ['Ranching Potion P2-A', 45, 25, 55, 10, [['Pack of Vials', 1, 'EmptyVial'], 'Sourweed Herb', ['Beeswax', 8], 'Attuned Essence'], 750],
    ['Ranching Potion P2-B', 45, 25, 55, 10, [['Pack of Vials', 1, 'EmptyVial'], 'Nomel Herb', ['Mealworm', 3], 'Attuned Essence'], 750],
    ['Herblore Potion P2-A', 45, 18, 50, 8, [['Pack of Vials', 1, 'EmptyVial'], 'Sourweed Herb', ['Penril Herb', 2], 'Attuned Essence'], 300],
    ['Herblore Potion P2-B', 45, 18, 50, 8, [['Pack of Vials', 1, 'EmptyVial'], 'Nomel Herb', 'Sourweed Herb', 'Attuned Essence'], 300],
    ['Astrology Potion P2-A', 45, 21, 50, 12, [['Pack of Vials', 1, 'EmptyVial'], 'Oxilyme Herb', ['Stardust', 2], 'Attuned Essence'], 750],
    ['Astrology Potion P2-B', 45, 21, 50, 12, [['Pack of Vials', 1, 'EmptyVial'], 'Oxilyme Herb', ['Pure Essence', 2], 'Attuned Essence'], 750],
    ['Beastcrafting Potion P2-A', 60, 40, 35, 12, [['Pack of Vials', 1, 'EmptyVial'], 'Mantalyme Herb', ['Thornback Lizard Spike', 2], 'Attuned Essence'], 1000],
    ['Beastcrafting Potion P2-B', 60, 40, 35, 12, [['Pack of Vials', 1, 'EmptyVial'], 'Oxilyme Herb', 'Snake Fang', 'Attuned Essence'], 1000],
    ['Agility Potion P2-A', 60, 28, 60, 10, [['Pack of Vials', 1, 'EmptyVial'], 'Mantalyme Herb', 'Attuned Essence'], 1000],
    ['Agility Potion P2-B', 60, 28, 60, 10, [['Pack of Vials', 1, 'EmptyVial'], 'Oxilyme Herb', 'Attuned Essence'], 1000],
    ['Thieving Potion P2-A', 60, 45, 45, 10, [['Pack of Vials', 1, 'EmptyVial'], 'Mantalyme Herb', ['Topaz', 2], 'Attuned Essence'], 750],
    ['Thieving Potion P2-B', 60, 45, 45, 10, [['Pack of Vials', 1, 'EmptyVial'], 'Oxilyme Herb', ['Sapphire', 2], 'Attuned Essence'], 750],
  ],
  'Combat Potions': [
    ['Melee Potion P1-A', 15, 8, 50, 15, [['Pack of Vials', 1, 'EmptyVial'], 'Sourweed Herb', 'Copper Bar']],
    ['Ranged Potion P1-A', 15, 6, 50, 15, [['Pack of Vials', 1, 'EmptyVial'], 'Sourweed Herb', ['Mithril Arrows', 2]]],
    ['Magic Potion P1-A', 15, 6, 50, 15, [['Pack of Vials', 1, 'EmptyVial'], 'Sourweed Herb', 'Earth Rune']],
    ['Slow Potion P1-A', 25, 11, 30, 20, [['Pack of Vials', 1, 'EmptyVial'], 'Mantalyme Herb', 'Slime']],
    ['Resilience Potion P1-A', 25, 11, 30, 10, [['Pack of Vials', 1, 'EmptyVial'], 'Mantalyme Herb', ['Poisonous Stem', 2]]],
    ['Slayer Potion P1-A', 35, 11, 30, 10, [['Pack of Vials', 1, 'EmptyVial'], 'Mantalyme Herb', 'Wolf Fang']],
    ['Prayer Potion P1-A', 35, 18, 30, 10, [['Pack of Vials', 1, 'EmptyVial'], 'Mantalyme Herb', 'Bone']],
    ['Melee Potion P2-A', 45, 29, 50, 20, [['Pack of Vials', 1, 'EmptyVial'], 'Sourweed Herb', ['Copper Bar', 2], 'Crushed Bone'], 1000],
    ['Melee Potion P2-B', 45, 29, 50, 20, [['Pack of Vials', 1, 'EmptyVial'], 'Nomel Herb', ['Bug Dust', 3], 'Crushed Bone'], 1000],
    ['Ranged Potion P2-A', 45, 32, 50, 20, [['Pack of Vials', 1, 'EmptyVial'], 'Sourweed Herb', ['Mithril Arrows', 4], 'Crushed Bone'], 1000],
    ['Ranged Potion P2-B', 45, 32, 50, 20, [['Pack of Vials', 1, 'EmptyVial'], 'Nomel Herb', 'Oak Bow', 'Crushed Bone'], 1000],
    ['Magic Potion P2-A', 45, 23, 50, 20, [['Pack of Vials', 1, 'EmptyVial'], 'Sourweed Herb', ['Earth Rune', 2], 'Crushed Bone'], 1000],
    ['Magic Potion P2-B', 45, 23, 50, 20, [['Pack of Vials', 1, 'EmptyVial'], 'Nomel Herb', ['Fire Rune', 2], 'Crushed Bone'], 1000],
    ['Ward Breaker Potion P1-A', 45, 21, 70, 10, [['Pack of Vials', 1, 'EmptyVial'], 'Nomel Herb', 'Nightreed']],
    ['Slow Potion P2-A', 55, 34, 30, 25, [['Pack of Vials', 1, 'EmptyVial'], 'Mantalyme Herb', ['Slime', 2], 'Crushed Bone'], 2500],
    ['Slow Potion P2-B', 55, 34, 30, 25, [['Pack of Vials', 1, 'EmptyVial'], 'Oxilyme Herb', 'Spider Silk', 'Crushed Bone'], 2500],
    ['Resilience Potion P2-A', 55, 33, 30, 15, [['Pack of Vials', 1, 'EmptyVial'], 'Mantalyme Herb', ['Poisonous Stem', 4], 'Crushed Bone'], 800],
    ['Resilience Potion P2-B', 55, 33, 30, 15, [['Pack of Vials', 1, 'EmptyVial'], 'Oxilyme Herb', 'Poisonous Gland', 'Crushed Bone'], 800],
    ['Slayer Potion P2-A', 60, 39, 30, 15, [['Pack of Vials', 1, 'EmptyVial'], 'Mantalyme Herb', ['Wolf Fang', 2], 'Crushed Bone'], 750],
    ['Slayer Potion P2-B', 60, 39, 30, 15, [['Pack of Vials', 1, 'EmptyVial'], 'Oxilyme Herb', ['Blackstone Powder', 2], 'Crushed Bone'], 750],
    ['Prayer Potion P2-A', 60, 62, 30, 15, [['Pack of Vials', 1, 'EmptyVial'], 'Mantalyme Herb', ['Bone', 2], 'Crushed Bone'], 1000],
    ['Prayer Potion P2-B', 60, 62, 30, 15, [['Pack of Vials', 1, 'EmptyVial'], 'Oxilyme Herb', ['Wyvern Horn', 4], 'Crushed Bone'], 1000],
    ['Ward Breaker Potion P2-A', 65, 49, 70, 15, [['Pack of Vials', 1, 'EmptyVial'], 'Oxilyme Herb', ['Nightreed', 2], 'Crushed Bone'], 1000],
    ['Ward Breaker Potion P2-B', 65, 49, 70, 15, [['Pack of Vials', 1, 'EmptyVial'], 'Oxilyme Herb', 'Raw Moonlight Minnow', 'Crushed Bone'], 1000],
  ],
  'Miscellaneous Potions': [
    ['Illness Cure Potion P1-A', 15, 8, 30, 10, [['Pack of Vials', 1, 'EmptyVial'], 'Sourweed Herb', ['Honey', 2]]],
    ['Poison Fish Potion P1-A', 20, 4, 30, 10, [['Pack of Vials', 1, 'EmptyVial'], 'Sourweed Herb', ['Honey', 2]]],
  ],
  'Super Skilling Potions': [
    ['Super Woodcutting Potion P1-A', 70, 25, 30, 25, [['Pack of Vials', 1, 'EmptyVial'], 'Oxilyme Herb', ['Duskleaf', 2]]],
    ['Super Fishing Potion P1-A', 70, 74, 70, 5, [['Pack of Vials', 1, 'EmptyVial'], 'Oxilyme Herb', 'Raw Cod']],
    ['Super Mining Potion P1-A', 70, 41, 30, 15, [['Pack of Vials', 1, 'EmptyVial'], 'Oxilyme Herb', 'Uncut Emerald']],
    ['Super Firemaking Potion P1-A', 80, 67, 90, 3, [['Pack of Vials', 1, 'EmptyVial'], 'Sporlyle Herb', 'Soot']],
    ['Super Cooking Potion P1-A', 80, 89, 50, 35, [['Pack of Vials', 1, 'EmptyVial'], 'Sporlyle Herb', 'Carrot Cake']],
    ['Super Smithing Potion P1-A', 80, 34, 40, 15, [['Pack of Vials', 1, 'EmptyVial'], 'Sporlyle Herb', ['Dawnsteel Arrowtips', 2]]],
    ['Super Crafting Potion P1-A', 80, 51, 40, 15, [['Pack of Vials', 1, 'EmptyVial'], 'Sporlyle Herb', 'Emerald']],
    ['Super Fletching Potion P1-A', 80, 33, 40, 15, [['Pack of Vials', 1, 'EmptyVial'], 'Sporlyle Herb', 'Emerald Bolts']],
    ['Super Runecrafting Potion P1-A', 80, 31, 40, 15, [['Pack of Vials', 1, 'EmptyVial'], 'Sporlyle Herb', 'Decay Rune']],
    ['Super Hunting Potion P1-A', 80, 94, 120, 3, [['Pack of Vials', 1, 'EmptyVial'], 'Sporlyle Herb', ['Blood Hawk Talon', 1, 'BloodhawkTalon']]],
    ['Super Farming Potion P1-A', 80, 122, 150, 2, [['Pack of Vials', 1, 'EmptyVial'], 'Sporlyle Herb', ['Cabbage', 4]]],
    ['Super Ranching Potion P1-A', 80, 58, 55, 12, [['Pack of Vials', 1, 'EmptyVial'], 'Sporlyle Herb', ['Red Dragonhide', 2]]],
    ['Super Herblore Potion P1-A', 80, 41, 50, 12, [['Pack of Vials', 1, 'EmptyVial'], 'Sporlyle Herb', 'Oxilyme Herb']],
    ['Super Astrology Potion P1-A', 80, 38, 45, 15, [['Pack of Vials', 1, 'EmptyVial'], 'Sporlyle Herb', ['Astral Rune', 3]]],
    ['Super Woodcutting Potion P2-A', 85, 45, 30, 30, [['Pack of Vials', 1, 'EmptyVial'], 'Oxilyme Herb', ['Duskleaf', 4], 'Glow Spore'], 40000],
    ['Super Woodcutting Potion P2-B', 85, 45, 30, 30, [['Pack of Vials', 1, 'EmptyVial'], 'Larx Herb', 'Yew Log', 'Glow Spore'], 40000],
    ['Super Fishing Potion P2-A', 85, 137, 70, 6, [['Pack of Vials', 1, 'EmptyVial'], 'Oxilyme Herb', ['Raw Cod', 2], 'Glow Spore'], 4000],
    ['Super Fishing Potion P2-B', 85, 137, 70, 6, [['Pack of Vials', 1, 'EmptyVial'], 'Larx Herb', 'Raw Glowing Jellyfish', 'Glow Spore'], 4000],
    ['Super Mining Potion P2-A', 85, 77, 30, 20, [['Pack of Vials', 1, 'EmptyVial'], 'Oxilyme Herb', ['Uncut Emerald', 2], 'Glow Spore'], 15000],
    ['Super Mining Potion P2-B', 85, 77, 30, 20, [['Pack of Vials', 1, 'EmptyVial'], 'Larx Herb', 'Uncut Diamond', 'Glow Spore'], 15000],
    ['Super Beastcrafting Potion P1-A', 90, 37, 35, 15, [['Pack of Vials', 1, 'EmptyVial'], 'Larx Herb', ['Spectre Arrows', 2, 'SpectreArrow']]],
    ['Super Agility Potion P1-A', 90, 42, 60, 12, [['Pack of Vials', 1, 'EmptyVial'], 'Larx Herb']],
    ['Super Thieving Potion P1-A', 90, 61, 45, 12, [['Pack of Vials', 1, 'EmptyVial'], 'Larx Herb', 'Emerald']],
    ['Super Firemaking Potion P2-A', 92, 88, 90, 4, [['Pack of Vials', 1, 'EmptyVial'], 'Sporlyle Herb', ['Soot', 2], 'Glow Spore'], 2500],
    ['Super Firemaking Potion P2-B', 92, 88, 90, 4, [['Pack of Vials', 1, 'EmptyVial'], 'Barrentoe Herb', 'Cinder', 'Glow Spore'], 2500],
    ['Super Cooking Potion P2-A', 92, 160, 50, 45, [['Pack of Vials', 1, 'EmptyVial'], 'Sporlyle Herb', ['Carrot Cake', 2], 'Glow Spore'], 10000],
    ['Super Cooking Potion P2-B', 92, 160, 50, 45, [['Pack of Vials', 1, 'EmptyVial'], 'Barrentoe Herb', ['Tuna Shark Sushi', 4], 'Glow Spore'], 10000],
    ['Super Smithing Potion P2-A', 92, 44, 40, 20, [['Pack of Vials', 1, 'EmptyVial'], 'Sporlyle Herb', ['Dawnsteel Arrowtips', 4], 'Glow Spore'], 20000],
    ['Super Smithing Potion P2-B', 92, 44, 40, 20, [['Pack of Vials', 1, 'EmptyVial'], 'Barrentoe Herb', ['Dragon Arrowtips', 3], 'Glow Spore'], 20000],
    ['Super Crafting Potion P2-A', 92, 88, 40, 20, [['Pack of Vials', 1, 'EmptyVial'], 'Sporlyle Herb', ['Emerald', 2], 'Glow Spore'], 20000],
    ['Super Crafting Potion P2-B', 92, 88, 40, 20, [['Pack of Vials', 1, 'EmptyVial'], 'Barrentoe Herb', 'Silver Diamond Ring', 'Glow Spore'], 20000],
    ['Super Fletching Potion P2-A', 92, 42, 40, 20, [['Pack of Vials', 1, 'EmptyVial'], 'Sporlyle Herb', ['Emerald Bolts', 2], 'Glow Spore'], 20000],
    ['Super Fletching Potion P2-B', 92, 42, 40, 20, [['Pack of Vials', 1, 'EmptyVial'], 'Barrentoe Herb', ['Dragon Arrows', 3], 'Glow Spore'], 20000],
    ['Super Runecrafting Potion P2-A', 92, 40, 40, 20, [['Pack of Vials', 1, 'EmptyVial'], 'Sporlyle Herb', ['Decay Rune', 2], 'Glow Spore'], 20000],
    ['Super Runecrafting Potion P2-B', 92, 40, 40, 20, [['Pack of Vials', 1, 'EmptyVial'], 'Barrentoe Herb', ['Blood Rune', 2], 'Glow Spore'], 11000],
    ['Super Hunting Potion P2-A', 92, 132, 120, 4, [['Pack of Vials', 1, 'EmptyVial'], 'Sporlyle Herb', ['Blood Hawk Talon', 2, 'BloodhawkTalon'], 'Glow Spore'], 1800],
    ['Super Hunting Potion P2-B', 92, 132, 120, 4, [['Pack of Vials', 1, 'EmptyVial'], 'Barrentoe Herb', ['Griffin Talon', 2], 'Glow Spore'], 1800],
    ['Super Farming Potion P2-A', 92, 176, 150, 3, [['Pack of Vials', 1, 'EmptyVial'], 'Sporlyle Herb', ['Cabbage', 8], 'Glow Spore'], 1000],
    ['Super Farming Potion P2-B', 92, 176, 150, 3, [['Pack of Vials', 1, 'EmptyVial'], 'Barrentoe Herb', ['Orange', 4], 'Glow Spore'], 1000],
    ['Super Ranching Potion P2-A', 92, 120, 55, 15, [['Pack of Vials', 1, 'EmptyVial'], 'Sporlyle Herb', ['Red Dragonhide', 4], 'Glow Spore'], 5500],
    ['Super Ranching Potion P2-B', 92, 120, 55, 15, [['Pack of Vials', 1, 'EmptyVial'], 'Barrentoe Herb', ['Black Dragonhide', 4], 'Glow Spore'], 5500],
    ['Super Herblore Potion P2-A', 92, 53, 50, 15, [['Pack of Vials', 1, 'EmptyVial'], 'Sporlyle Herb', ['Oxilyme Herb', 2], 'Glow Spore'], 20000],
    ['Super Herblore Potion P2-B', 92, 53, 50, 15, [['Pack of Vials', 1, 'EmptyVial'], 'Barrentoe Herb', 'Larx Herb', 'Glow Spore'], 20000],
    ['Super Astrology Potion P2-A', 92, 77, 45, 20, [['Pack of Vials', 1, 'EmptyVial'], 'Barrentoe Herb', ['Astral Rune', 6], 'Glow Spore'], 15000],
    ['Super Astrology Potion P2-B', 92, 77, 45, 20, [['Pack of Vials', 1, 'EmptyVial'], 'Barrentoe Herb', 'Mullet Stew', 'Glow Spore'], 15000],
    ['Super Beastcrafting Potion P2-A', 96, 50, 35, 20, [['Pack of Vials', 1, 'EmptyVial'], 'Larx Herb', ['Spectre Arrows', 4, 'SpectreArrow'], 'Glow Spore'], 22000],
    ['Super Beastcrafting Potion P2-B', 96, 50, 35, 20, [['Pack of Vials', 1, 'EmptyVial'], 'Barrentoe Herb', ['Caribou Antler Carver', 3], 'Glow Spore'], 22000],
    ['Super Agility Potion P2-A', 96, 50, 60, 16, [['Pack of Vials', 1, 'EmptyVial'], 'Larx Herb', 'Glow Spore'], 20000],
    ['Super Agility Potion P2-B', 96, 50, 60, 16, [['Pack of Vials', 1, 'EmptyVial'], 'Barrentoe Herb', 'Glow Spore'], 20000],
    ['Super Thieving Potion P2-A', 96, 99, 45, 15, [['Pack of Vials', 1, 'EmptyVial'], 'Larx Herb', ['Emerald', 2], 'Glow Spore'], 10000],
    ['Super Thieving Potion P2-B', 96, 99, 45, 15, [['Pack of Vials', 1, 'EmptyVial'], 'Barrentoe Herb', ['Diamond', 2], 'Glow Spore'], 10000],
  ],
  'Super Combat Potions': [
    ['Super Melee Potion P1-A', 80, 60, 50, 25, [['Pack of Vials', 1, 'EmptyVial'], 'Sporlyle Herb', 'Dawnsteel Bar']],
    ['Super Ranged Potion P1-A', 80, 38, 50, 25, [['Pack of Vials', 1, 'EmptyVial'], 'Sporlyle Herb', ['Dawnsteel Arrows', 2]]],
    ['Super Magic Potion P1-A', 80, 38, 50, 35, [['Pack of Vials', 1, 'EmptyVial'], 'Sporlyle Herb', ['Blood Rune', 2]]],
    ['Super Ward Breaker Potion P1-A', 82, 49, 50, 25, [['Pack of Vials', 1, 'EmptyVial'], 'Sporlyle Herb', ['Starblight Powder Sack', 2]]],
    ['Super Slow Potion P1-A', 85, 60, 60, 45, [['Pack of Vials', 1, 'EmptyVial'], 'Sporlyle Herb', 'Sandstone']],
    ['Super Resilience Potion P1-A', 85, 40, 55, 20, [['Pack of Vials', 1, 'EmptyVial'], 'Sporlyle Herb', ['Poisonous Sack', 2]]],
    ['Super Slayer Potion P1-A', 90, 37, 40, 20, [['Pack of Vials', 1, 'EmptyVial'], 'Sporlyle Herb', 'Glitter Dust']],
    ['Super Prayer Potion P1-A', 90, 92, 70, 35, [['Pack of Vials', 1, 'EmptyVial'], 'Sporlyle Herb', 'Big Bone']],
    ['Super Melee Potion P2-A', 92, 97, 50, 35, [['Pack of Vials', 1, 'EmptyVial'], 'Sporlyle Herb', ['Dawnsteel Bar', 2], 'Blood Essence'], 25000],
    ['Super Melee Potion P2-B', 92, 97, 50, 35, [['Pack of Vials', 1, 'EmptyVial'], 'Barrentoe Herb', 'Scabjaw Beast Horn', 'Blood Essence'], 25000],
    ['Super Ranged Potion P2-A', 92, 50, 50, 35, [['Pack of Vials', 1, 'EmptyVial'], 'Sporlyle Herb', ['Dawnsteel Arrows', 4], 'Blood Essence'], 25000],
    ['Super Ranged Potion P2-B', 92, 50, 50, 35, [['Pack of Vials', 1, 'EmptyVial'], 'Barrentoe Herb', ['Diamond Bolts', 2], 'Blood Essence'], 25000],
    ['Super Magic Potion P2-A', 92, 50, 50, 25, [['Pack of Vials', 1, 'EmptyVial'], 'Sporlyle Herb', ['Blood Rune', 4], 'Blood Essence'], 25000],
    ['Super Magic Potion P2-B', 92, 50, 50, 35, [['Pack of Vials', 1, 'EmptyVial'], 'Barrentoe Herb', ['Soul Rune', 4], 'Blood Essence'], 25000],
    ['Super Slow Potion P2-A', 94, 90, 60, 60, [['Pack of Vials', 1, 'EmptyVial'], 'Sporlyle Herb', ['Sandstone', 2], 'Blood Essence'], 25000],
    ['Super Slow Potion P2-B', 94, 90, 60, 60, [['Pack of Vials', 1, 'EmptyVial'], 'Barrentoe Herb', 'Large Black Wing', 'Blood Essence'], 25000],
    ['Super Resilience Potion P2-A', 94, 58, 55, 25, [['Pack of Vials', 1, 'EmptyVial'], 'Sporlyle Herb', ['Poisonous Sack', 4], 'Blood Essence'], 12500],
    ['Super Resilience Potion P2-B', 94, 58, 55, 25, [['Pack of Vials', 1, 'EmptyVial'], 'Barrentoe Herb', 'Storm Essence', 'Blood Essence'], 12500],
    ['Super Ward Breaker Potion P2-A', 94, 74, 50, 30, [['Pack of Vials', 1, 'EmptyVial'], 'Barrentoe Herb', ['Starblight Powder Sack', 4], 'Blood Essence'], 10000],
    ['Super Ward Breaker Potion P2-B', 94, 74, 50, 30, [['Pack of Vials', 1, 'EmptyVial'], 'Barrentoe Herb', 'Moonscale', 'Blood Essence'], 10000],
    ['Super Slayer Potion P2-A', 96, 54, 40, 25, [['Pack of Vials', 1, 'EmptyVial'], 'Sporlyle Herb', ['Glitter Dust', 2], 'Blood Essence'], 20000],
    ['Super Slayer Potion P2-B', 96, 54, 40, 25, [['Pack of Vials', 1, 'EmptyVial'], 'Barrentoe Herb', ['Vampire Fang', 6], 'Blood Essence'], 20000],
    ['Super Prayer Potion P2-A', 96, 140, 70, 50, [['Pack of Vials', 1, 'EmptyVial'], 'Sporlyle Herb', ['Big Bone', 2], 'Blood Essence'], 20000],
    ['Super Prayer Potion P2-B', 96, 140, 70, 50, [['Pack of Vials', 1, 'EmptyVial'], 'Barrentoe Herb', ['Magic Dust', 2], 'Blood Essence'], 20000],
  ],
  'Quests': [
    ['True-Shot Potion', 45, 4, 30, 1, [['Pack of Vials', 1, 'EmptyVial'], 'Nomel Herb', ['Spikemoss Leaf', 4], ['Toxic Butterfly in a Jar', 4]]],
    ['Seer\'s Incense', 45, 4, 30, 1, [['Pack of Vials', 1, 'EmptyVial'], 'Oxilyme Herb', ['Ground Dreamleaf', 3]]],
    ['Potion of Rebirth', 69, 4, 30, 1, [['Pack of Vials', 1, 'EmptyVial'], 'Sporlyle Herb', ['Amalgamation Ashes', 50], ['Soulroot', 10], ['Raw Soulfin', 10]], undefined, 'PotionOfRebirth'],
  ],
} satisfies Record<string, HerbloreRecipe[]>;

interface BrewTiming {
  preparation: number;
  bottling: number;
}

export interface HerbloreAction extends SkillAction {
  recipeGroup: string;
  source: string;
  prerequisiteNote?: string;
  brewTiming: BrewTiming;
}

const questRequirements: Readonly<Partial<Record<string, string>>> = {
  TrueShotPotion: 'Requires The Big City at step 2.',
  SeersIncense: 'Requires Unfortunate Teller at step 0.',
  PotionOfRebirth: 'Requires The Sunken Tower at step 2.',
};

const wholeNumber = new Intl.NumberFormat('en-US');

export function brewingSeconds(timing: BrewTiming, bottlings: number): number {
  const brews = Math.ceil(bottlings / bottlingsPerBrew);
  return brews * timing.preparation + bottlings * timing.bottling;
}

export const herbloreActions: HerbloreAction[] = Object.entries<HerbloreRecipe[]>(recipes).flatMap(([recipeGroup, rows]) =>
  rows.map(([name, requiredLevel, baseXp, fullBrewSeconds, outputQuantity, inputs, priorPotionCount, id = recipeItemId(name)]) => {
    let prerequisiteNote = questRequirements[id];
    if (priorPotionCount !== undefined) {
      const priorPotion = name.replace(/P2-[AB]$/, 'P1-A');
      prerequisiteNote = `Requires brewing ${wholeNumber.format(priorPotionCount)} × ${priorPotion}.`;
    } else if (recipeGroup.startsWith('Super ') && name.endsWith(' P1-A')) {
      prerequisiteNote = 'Requires the Super Potion Research shop purchase.';
    }
    return {
      id, name, requiredLevel, baseXp, recipeGroup, prerequisiteNote,
      intervalSeconds: fullBrewSeconds / bottlingsPerBrew,
      brewTiming: { preparation: fullBrewSeconds - bottlingsPerBrew * bottlingSeconds, bottling: bottlingSeconds },
      inputs: inputs.map(recipeItemAmount),
      outputs: [recipeItemAmount([name, outputQuantity, id])],
      source: `https://db.melvor.aevv.net/herblore-recipe/${id}`,
    };
  }),
);
