import type { SkillAction } from '../calculator';

export const woodcuttingSource = {
  name: 'Melvor2 Woodcutting Calculator',
  url: 'https://melvor2.com/calculators/woodcutting/',
  gameVersion: 'Early Access build 26724394',
  retrievedAt: '2026-11-26',
  verification: 'Community game-file reference; action labels, levels, XP, intervals, primary yields, and zero input costs',
  recipeUrl: 'https://db.melvor.aevv.net/entity/Woodcutting',
} as const;

const output = (itemId: string, itemName: string, quantity = 1) => [{ itemId, itemName, quantity }];

type WoodcuttingRecipe = Omit<SkillAction, 'intervalSeconds'> & {
  category: 'tree' | 'bush' | 'quest';
  health: number;
  prerequisiteNote?: string;
};

export type WoodcuttingAction = SkillAction & WoodcuttingRecipe & { hitIntervalSeconds: number };

const recipes: WoodcuttingRecipe[] = [
  { id: 'normal-tree', name: 'Normal Tree', requiredLevel: 1, baseXp: 3, category: 'tree', health: 3, inputs: [], outputs: output('NormalLog', 'Normal Log') },
  { id: 'flax-bush', name: 'Flax Bush', requiredLevel: 5, baseXp: 3, category: 'bush', health: 2, inputs: [], outputs: output('Flax', 'Flax') },
  { id: 'oak-tree', name: 'Oak Tree', requiredLevel: 10, baseXp: 8, category: 'tree', health: 4, inputs: [], outputs: output('OakLog', 'Oak Log') },
  { id: 'wood-debris', name: 'Wood Debris', requiredLevel: 10, baseXp: 50, category: 'quest', health: 30, inputs: [], outputs: output('OakLog', 'Oak Log', 10), prerequisiteNote: 'Requires the relevant objective in Boarish Bonfire.' },
  { id: 'ambervine-bush', name: 'Ambervine Bush', requiredLevel: 20, baseXp: 4, category: 'bush', health: 2, inputs: [], outputs: output('AmbervineLeaf', 'Ambervine Leaf') },
  { id: 'fortress-wall', name: 'Fortress Wall', requiredLevel: 25, baseXp: 42, category: 'quest', health: 50, inputs: [], outputs: output('WillowLog', 'Willow Log', 20), prerequisiteNote: 'Requires the relevant objective in Dungeon Breakout.' },
  { id: 'damaged-fortress-wall', name: 'Damaged Fortress Wall', requiredLevel: 25, baseXp: 42, category: 'quest', health: 50, inputs: [], outputs: output('WillowLog', 'Willow Log', 20), prerequisiteNote: "Requires the relevant objective in Dungeon Breakout and an equipped Reinforced Woodcutter’s Axe." },
  { id: 'willow-tree', name: 'Willow Tree', requiredLevel: 25, baseXp: 17, category: 'tree', health: 5, inputs: [], outputs: output('WillowLog', 'Willow Log') },
  { id: 'treant-remains', name: 'Treant Remains', requiredLevel: 30, baseXp: 50, category: 'quest', health: 12, inputs: [], outputs: output('TreantRemains', 'Treant Remains'), prerequisiteNote: 'Requires the relevant step in Tree Trimming.' },
  { id: 'teak-tree', name: 'Teak Tree', requiredLevel: 35, baseXp: 22, category: 'tree', health: 6, inputs: [], outputs: output('TeakLog', 'Teak Log') },
  { id: 'fort-gate', name: 'Fort Gate', requiredLevel: 39, baseXp: 59, category: 'quest', health: 100, inputs: [], outputs: output('TeakLog', 'Teak Log', 30), prerequisiteNote: 'Requires the relevant step in In the Thick of It.' },
  { id: 'warped-cacti', name: 'Warped Cacti', requiredLevel: 45, baseXp: 59, category: 'quest', health: 10, inputs: [], outputs: output('WarpedCactiWater', 'Warped Cacti Water'), prerequisiteNote: 'Requires the relevant step in The Path to Melvor and an equipped Filtered Vial.' },
  { id: 'maple-tree', name: 'Maple Tree', requiredLevel: 45, baseXp: 35, category: 'tree', health: 8, inputs: [], outputs: output('MapleLog', 'Maple Log') },
  { id: 'spikemoss-shrub', name: 'Spikemoss Shrub', requiredLevel: 50, baseXp: 8, category: 'bush', health: 2, inputs: [], outputs: output('SpikemossLeaf', 'Spikemoss Leaf') },
  { id: 'mahogany-tree', name: 'Mahogany Tree', requiredLevel: 55, baseXp: 51, category: 'tree', health: 10, inputs: [], outputs: output('MahoganyLog', 'Mahogany Log') },
  { id: 'yew-tree', name: 'Yew Tree', requiredLevel: 60, baseXp: 83, category: 'tree', health: 14, inputs: [], outputs: output('YewLog', 'Yew Log') },
  { id: 'soulroot', name: 'Soulroot', requiredLevel: 69, baseXp: 59, category: 'quest', health: 10, inputs: [], outputs: output('Soulroot', 'Soulroot'), prerequisiteNote: 'Requires the relevant step in The Sunken Tower.' },
  { id: 'magic-tree', name: 'Magic Tree', requiredLevel: 75, baseXp: 135, category: 'tree', health: 20, inputs: [], outputs: output('MagicLog', 'Magic Log') },
  { id: 'duskleaf-bush', name: 'Duskleaf Bush', requiredLevel: 80, baseXp: 12, category: 'bush', health: 2, inputs: [], outputs: output('Duskleaf', 'Duskleaf') },
  { id: 'ashen-tree', name: 'Ashen Tree', requiredLevel: 80, baseXp: 121, category: 'tree', health: 14, inputs: [], outputs: output('AshenLog', 'Ashen Log'), prerequisiteNote: 'Requires 50 completions of the Ashen Lands Trail Agility course.' },
  { id: 'hard-oak-tree', name: 'Hard Oak Tree', requiredLevel: 85, baseXp: 146, category: 'tree', health: 22, inputs: [], outputs: output('HardOakLog', 'Hard Oak Log') },
  { id: 'redwood-tree', name: 'Redwood Tree', requiredLevel: 92, baseXp: 168, category: 'tree', health: 26, inputs: [], outputs: output('RedwoodLog', 'Redwood Log') },
];

// All recipes in this build use a one-second hit interval and one base damage.
export const woodcuttingActions: WoodcuttingAction[] = recipes.map((recipe) => ({
  ...recipe,
  hitIntervalSeconds: 1,
  intervalSeconds: recipe.health,
}));
