import { buildArtisanActions, type ArtisanRecipe } from './artisan';

export const fletchingSource = 'https://db.melvor.aevv.net/entity/Fletching';

// Build 26724394. Each Fletching step takes two seconds at base speed.
const recipes = {
  'Bows': [
    ['Normal Bow', 1, 7, 3, [['Normal Log', 2], 'Bowstring']],
    ['Oak Bow', 15, 16, 4, [['Oak Log', 2], 'Bowstring']],
    ['Willow Bow', 30, 32, 5, [['Willow Log', 2], 'Bowstring']],
    ['Maple Bow', 45, 58, 6, [['Maple Log', 2], 'Bowstring']],
    ['Yew Bow', 60, 118, 7, [['Yew Log', 2], 'Bowstring']],
    ['Magic Bow', 75, 182, 8, [['Magic Log', 2], 'Bowstring']],
    ['Meteorite Bow', 84, 375, 10, [['Meteorite Bar', 3], ['Magic Log', 2], 'Bowstring']],
    ['Hard Oak Bow', 85, 234, 9, [['Hard Oak Log', 2], 'Bowstring']],
    ['Redwood Bow', 92, 281, 10, [['Redwood Log', 2], 'Bowstring']],
    ['Refined Meteorite Bow', 96, 549, 14, [['Refined Meteorite Bar', 3], ['Redwood Log', 2], 'Bowstring']],
  ],
  'Arrows': [
    ['Arrow Shaft', 1, 2, 1, ['Normal Log'], 20],
    ['Headless Arrows', 1, 3, 1, [['Arrow Shaft', 10], 'Feathers'], 10],
    ['Stone Arrows', 1, 4, 2, [['Stone Arrowtips', 4], ['Headless Arrows', 4]], 4],
    ['Copper Arrows', 5, 6, 2, [['Copper Arrowtips', 4], ['Headless Arrows', 4]], 4],
    ['Iron Arrows', 10, 7, 2, [['Iron Arrowtips', 4], ['Headless Arrows', 4]], 4],
    ['Steel Arrows', 25, 12, 2, [['Steel Arrowtips', 4], ['Headless Arrows', 4]], 4],
    ['Mithril Arrows', 35, 14, 2, [['Mithril Arrowtips', 4], ['Headless Arrows', 4]], 4],
    ['Adamant Arrows', 45, 21, 2, [['Adamant Arrowtips', 4], ['Headless Arrows', 4]], 4],
    ['Rune Arrows', 55, 30, 2, [['Rune Arrowtips', 4], ['Headless Arrows', 4]], 4],
    ['Dawnsteel Arrows', 65, 42, 2, [['Dawnsteel Arrowtips', 4], ['Headless Arrows', 4]], 4],
    ['Dragon Arrows', 85, 60, 2, [['Dragon Arrowtips', 4], ['Headless Arrows', 4]], 4],
  ],
  'Boomerangs': [
    ['Oak Boomerang', 18, 9, 2, [['Oak Log', 2]], 3],
    ['Willow Boomerang', 33, 14, 2, [['Willow Log', 2]], 3],
    ['Maple Boomerang', 48, 26, 2, [['Maple Log', 2]], 3],
    ['Yew Boomerang', 63, 54, 2, [['Yew Log', 2]], 3],
    ['Magic Boomerang', 78, 84, 2, [['Magic Log', 2]], 3],
    ['Hard Oak Boomerang', 88, 105, 2, [['Hard Oak Log', 2]], 3],
    ['Redwood Boomerang', 95, 131, 2, [['Redwood Log', 2]], 3],
  ],
  'Javelins': [
    ['Copper Javelin', 5, 5, 2, ['Normal Log', ['Copper Javelin Heads', 3]], 3],
    ['Iron Javelin', 10, 7, 2, ['Oak Log', ['Iron Javelin Heads', 3]], 3],
    ['Steel Javelin', 26, 13, 2, ['Willow Log', ['Steel Javelin Heads', 3]], 3],
    ['Mithril Javelin', 36, 16, 2, ['Teak Log', ['Mithril Javelin Heads', 3]], 3],
    ['Adamant Javelin', 46, 24, 2, ['Maple Log', ['Adamant Javelin Heads', 3]], 3],
    ['Rune Javelin', 58, 37, 2, ['Mahogany Log', ['Rune Javelin Heads', 3]], 3],
    ['Dawnsteel Javelin', 73, 59, 2, ['Yew Log', ['Dawnsteel Javelin Heads', 3]], 3],
    ['Meteorite Javelin', 78, 69, 3, ['Magic Log', ['Meteorite Javelin Head', 3]], 3],
    ['Dragon Javelin', 87, 90, 2, ['Hard Oak Log', ['Dragon Javelin Heads', 3]], 3],
    ['Refined Meteorite Javelin', 95, 98, 3, ['Redwood Log', ['Refined Meteorite Javelin Head', 3]], 3],
  ],
  'Crossbows': [
    ['Iron Crossbow', 13, 26, 4, [['Oak Log', 3], 'Iron Crossbow Head', 'Bowstring']],
    ['Iron 2H Crossbow', 20, 75, 7, [['Oak Log', 6], ['Iron Crossbow Head', 2], 'Bowstring']],
    ['Steel Crossbow', 29, 57, 5, [['Willow Log', 3], 'Steel Crossbow Head', 'Bowstring']],
    ['Steel 2H Crossbow', 35, 121, 8, [['Willow Log', 6], ['Steel Crossbow Head', 2], 'Bowstring']],
    ['Mithril Crossbow', 39, 85, 6, [['Teak Log', 3], 'Mithril Crossbow Head', 'Bowstring']],
    ['Mithril 2H Crossbow', 44, 193, 9, [['Teak Log', 6], ['Mithril Crossbow Head', 2], 'Bowstring']],
    ['Adamant Crossbow', 49, 145, 7, [['Maple Log', 3], 'Adamant Crossbow Head', 'Bowstring']],
    ['Adamant 2H Crossbow', 55, 345, 10, [['Mahogany Log', 6], ['Adamant Crossbow Head', 2], 'Bowstring']],
    ['Rune Crossbow', 62, 273, 8, [['Yew Log', 3], 'Rune Crossbow Head', 'Bowstring']],
    ['Rune 2H Crossbow', 70, 623, 11, [['Yew Log', 6], ['Rune Crossbow Head', 2], 'Bowstring']],
    ['Dawnsteel Crossbow', 77, 420, 9, [['Magic Log', 3], 'Dawnsteel Crossbow Head', 'Bowstring']],
    ['Dawnsteel 2H Crossbow', 87, 935, 12, [['Magic Log', 6], ['Dawnsteel Crossbow Head', 2], 'Bowstring']],
    ['Dragon Crossbow', 91, 593, 10, [['Hard Oak Log', 3], 'Dragon Crossbow Head', 'Bowstring']],
    ['Dragon 2H Crossbow', 93, 1164, 13, [['Hard Oak Log', 6], ['Dragon Crossbow Head', 2], 'Bowstring']],
  ],
  'Bolts': [
    ['Topaz Bolts', 13, 10, 2, ['Topaz', ['Headless Bolts', 3]], 3],
    ['Sapphire Bolts', 25, 17, 2, ['Sapphire', ['Headless Bolts', 3]], 3],
    ['Ruby Bolts', 45, 29, 2, ['Ruby', ['Headless Bolts', 3]], 3],
    ['Emerald Bolts', 65, 57, 2, ['Emerald', ['Headless Bolts', 3]], 3],
    ['Black Opal Bolts', 82, 160, 2, ['Black Opal', ['Headless Bolts', 3]], 3],
    ['Diamond Bolts', 85, 79, 2, ['Diamond', ['Headless Bolts', 3]], 3],
    ['Jadestone Bolts', 97, 91, 2, ['Jadestone', ['Headless Bolts', 3]], 3],
  ],
  'Spears': [
    ['Steel Spear', 31, 44, 4, ['Steel Spear Head', 'Willow Log']],
    ['Mithril Spear', 41, 75, 5, ['Mithril Spear Head', 'Teak Log']],
    ['Adamant Spear', 51, 128, 6, ['Adamant Spear Head', 'Maple Log']],
    ['Rune Spear', 64, 217, 7, ['Rune Spear Head', 'Yew Log']],
    ['Dawnsteel Spear', 79, 329, 8, ['Dawnsteel Spear Head', 'Magic Log']],
    ['Dragon Spear', 92, 478, 9, ['Dragon Spear Head', 'Redwood Log']],
  ],
  'Quests': [
    ['Sea Griffin Arrows', 45, 15, 2, [['Adamant Arrowtips', 4], ['Arrow Shaft', 4], ['Sea Griffin Feather', 4]], ['Sea Griffin Arrow', 4]],
  ],
} satisfies Record<string, ArtisanRecipe[]>;

export const fletchingActions = buildArtisanActions(recipes, {
  SeaGriffinArrows: 'Requires The Big City at step 1.',
});
