import { calculateActionPlan, calculateResourceCosts, type CalculationInput, type SkillAction } from '../calculator';
import { completionsByLevel, levelForXp } from './xp-table';

export const cookingSource = 'https://db.melvor.aevv.net/entity/Cooking';

type Ingredient = string | [name: string, quantity: number];
type Recipe = [name: string, level: number, xp: number, difficulty: number | null, ingredients: Ingredient[], outputQuantity?: number, id?: string];

// Build 26724394. A null difficulty means the recipe already succeeds at its unlock level.
// Numeric difficulties match the listed unlock-level XP per hour under the base proficiency formula.
const recipes = {
  'Basic Food': [
    ['Shrimp', 1, 5, 31, ['Raw Shrimp']],
    ['Sardine', 6, 10, 38, ['Raw Sardine']],
    ['Beef', 10, 4, 72, ['Raw Beef']],
    ['Herring', 12, 10, 75, ['Raw Herring']],
    ['Chicken', 15, 5, 80, ['Raw Chicken']],
    ['Perch', 18, 14, 84, ['Raw Perch']],
    ['Trout', 23, 21, 112, ['Raw Trout']],
    ['Mackerel', 27, 11, 118, ['Raw Mackerel']],
    ['Pike', 32, 28, 147, ['Raw Pike']],
    ['Moonlight Minnow', 35, 14, 152, ['Raw Moonlight Minnow']],
    ['Salmon', 39, 29, 157, ['Raw Salmon']],
    ['Lobster', 44, 39, 185, ['Raw Lobster']],
    ['Glowfin', 49, 22, 192, ['Raw Glowfin']],
    ['Sea Bream', 55, 45, 222, ['Raw Sea Bream']],
    ['Cod', 62, 48, 254, ['Raw Cod']],
    ['Sea Bass', 67, 80, 261, ['Raw Sea Bass']],
    ['Griffin Steak', 70, 275, 270, ['Raw Griffin Steak']],
    ['Lionfish', 73, 69, 291, ['Raw Lionfish']],
    ['Striped Mullet', 75, 63, 288, ['Raw Striped Mullet']],
    ['Glowing Jellyfish', 78, 93, 298, ['Raw Glowing Jellyfish']],
    ['Tuna', 82, 92, 325, ['Raw Tuna']],
    ['Shark', 88, 116, 334, ['Raw Shark']],
    ['Glowing Squid', 93, 115, 377, ['Raw Glowing Squid']],
    ['Giant Eel', 95, 182, 395, ['Raw Giant Eel']],
    ['Manta Ray', 97, 153, 421, ['Raw Manta Ray']],
    ['Whale', 98, 700, 450, ['Raw Whale']],
  ],
  'Recipe Bases': [
    ['Cheese', 1, 1, null, ['Milk']],
    ['Basic Dough', 3, 4, null, ['Bucket of Water', 'Flour']],
    ['Bread', 5, 5, null, ['Bucket of Water', 'Flour', 'Milk']],
    ['Cake Base', 23, 20, null, ['Bucket of Water', ['Flour', 2], ['Egg', 2], ['Milk', 2], ['Sugar', 2]]],
    ['Sushi Base', 23, 5, null, ['Grain', 'Seaweed']],
    ['Sweet Dough', 36, 16, null, ['Bucket of Water', 'Flour', 'Egg', 'Milk', 'Sugar']],
    ['Soup Base', 39, 6, null, ['Bucket of Water', 'Onion', 'Garlic']],
  ],
  'Intermediate Food': [
    ['Beef Sandwich', 15, 28, 84, ['Bread', 'Raw Beef', 'Lettuce', 'Onion'], 2],
    ['Chicken Sandwich', 20, 38, 120, ['Bread', 'Raw Chicken', 'Lettuce', 'Onion'], 2],
    ['Strawberry Cake', 23, 52, 124, ['Cake Base', ['Strawberry', 8]]],
    ['Trout Sushi', 23, 41, 124, ['Sushi Base', 'Raw Trout'], 4],
    ['Banana Pancake', 36, 92, 170, ['Sweet Dough', 'Honey', ['Banana', 2]], 3],
    ['Minnow Pie', 39, 62, 190, ['Milk', 'Egg', 'Cheese', ['Raw Moonlight Minnow', 3]], 3],
    ['Salmon Soup', 39, 60, 175, ['Soup Base', 'Raw Salmon'], 6],
    ['Salmon Sushi', 39, 59, 175, ['Sushi Base', 'Raw Salmon'], 4],
    ['Lobster Sandwich', 49, 132, 217, ['Bread', 'Raw Lobster', 'Lettuce', 'Onion'], 2],
    ['Apple Pie', 50, 154, 248, ['Sweet Dough', ['Apple', 2]], 2],
    ['Apple Pancake', 51, 161, 252, ['Sweet Dough', 'Honey', ['Apple', 2]], 3],
    ['Sea Bream Soup', 58, 105, 262, ['Soup Base', 'Raw Sea Bream'], 6],
    ['Cherry Pie', 60, 203, 291, ['Sweet Dough', ['Cherry', 2]], 2],
    ['Cherry Pancake', 61, 212, 292, ['Sweet Dough', 'Honey', ['Cherry', 2]], 3],
    ['Cod Sushi', 62, 106, 295, ['Sushi Base', 'Raw Cod'], 4],
    ['Carrot Cake', 71, 198, 340, ['Cake Base', ['Carrot', 8]]],
    ['Pumpkin Pie', 75, 350, 344, ['Sweet Dough', ['Pumpkin', 4]], 2],
    ['Lionfish Soup', 76, 157, 347, ['Soup Base', 'Raw Lionfish'], 6],
    ['Glowing Sushi', 78, 182, 345, ['Sushi Base', 'Raw Glowing Jellyfish'], 4],
    ['Orange Cake', 82, 311, 385, ['Cake Base', ['Orange', 8]]],
    ['Tuna Sandwich', 87, 289, 388, ['Bread', 'Raw Tuna', 'Lettuce', 'Onion', 'Tomato'], 2],
    ['Tuna Shark Sushi', 88, 339, 388, ['Sushi Base', 'Raw Tuna', 'Raw Shark'], 4],
    ['Vegetable Sushi', 90, 99, 444, ['Sushi Base', ['Cabbage', 2], ['Carrot', 2]], 4],
    ['Shark Soup', 91, 237, 448, ['Soup Base', 'Raw Shark'], 6],
    ['Vegetable Soup', 93, 95, 450, ['Soup Base', ['Carrot', 3], ['Cabbage', 2], 'Cauliflower'], 6],
    ['Mango Pancake', 96, 335, 450, ['Sweet Dough', 'Honey', ['Mango', 2]], 3],
  ],
  'Advanced Food': [
    ['Cheeseburger', 63, 197, 321, ['Bread', 'Raw Beef', 'Cheese', 'Lettuce', 'Onion', 'Tomato']],
    ['Lasagna', 69, 266, 333, ['Flour', 'Egg', ['Raw Beef', 2], ['Cheese', 2], 'Wine', ['Garlic', 2]]],
    ['Mullet Stew', 79, 145, 444, ['Soup Base', 'Tomato', 'Potato', 'Raw Striped Mullet'], 8],
    ['Combination Pizza', 82, 350, 418, ['Basic Dough', 'Raw Tuna', 'Raw Beef', 'Cheese', 'Pumpkin', 'Cauliflower'], 8],
    ['Glowing Soup', 95, 486, 485, ['Soup Base', 'Raw Glowing Jellyfish', 'Raw Glowing Squid', 'Raw Glowfin', 'Cabbage'], 10],
  ],
  'Bait': [
    ['Seed Bait', 4, 3, null, [['Grain', 5]], 4],
    ['Basic Bait', 6, 5, null, ['Raw Shrimp', 'Raw Sardine'], 8],
    ['Veggie Bait', 15, 2, null, ['Lettuce', 'Penril Herb'], 4, 'VegeBait'],
    ['Honey Bark Bait', 21, 3, null, ['Oak Log', ['Honey', 2]], 4],
    ['Mackerel Bait', 27, 5, null, ['Raw Mackerel'], 20],
    ['Meat Bait', 45, 10, null, [['Raw Meat', 3]], 4],
    ['Glowfin Bait', 49, 9, null, ['Raw Glowfin'], 6],
    ['Bonemeal Bait', 75, 29, null, ['Bone', 'Big Bone'], 4],
    ['Giant Fish Bait', 82, 84, null, ['Raw Cod', 'Raw Sea Bass', 'Raw Tuna'], 6],
    ['Sparkling Bait', 91, 51, null, ['Diamond', 'Giant Fish Bait', ['Raw Meat', 2]], 6],
  ],
  'Quests': [
    ['Relief Rations (Meat)', 40, 180, null, [['Beef', 5], ['Chicken', 5], ['Beef Sandwich', 5], ['Chicken Sandwich', 5]], 1, 'ReliefRationsMeat'],
    ['Relief Rations (Seafood)', 40, 150, null, [['Pike', 5], ['Salmon Soup', 5], ['Trout Sushi', 10]], 1, 'ReliefRationsSeafood'],
    ['Relief Rations (Veggie)', 40, 80, null, [['Corn', 25], ['Potato', 25]], 1, 'ReliefRationsVeggie'],
  ],
} satisfies Record<string, Recipe[]>;

export interface CookingAction extends SkillAction {
  recipeGroup: string;
  difficulty: number | null;
  source: string;
  prerequisiteNote?: string;
}

export const cookingActions: CookingAction[] = Object.entries(recipes).flatMap(([recipeGroup, rows]) =>
  (rows as Recipe[]).map(([name, requiredLevel, baseXp, difficulty, ingredients, outputQuantity = 1, id = name.replaceAll(' ', '')]) => ({
    id, name, requiredLevel, baseXp, difficulty, recipeGroup,
    intervalSeconds: 3,
    inputs: ingredients.map((ingredient) => {
      const [itemName, quantity] = typeof ingredient === 'string' ? [ingredient, 1] : ingredient;
      return { itemId: itemName.replaceAll(' ', ''), itemName, quantity };
    }),
    outputs: [{ itemId: id, itemName: name, quantity: outputQuantity }],
    source: `https://db.melvor.aevv.net/cooking-recipe/${id}`,
    prerequisiteNote: recipeGroup === 'Quests' ? 'Requires Sand in the Wind at step 2.' : undefined,
  })),
);

function attemptsPerSuccess(action: CookingAction, level: number, proficiencyBonus: number): number {
  if (action.difficulty === null) return 1;
  const proficiency = Math.max(level, action.requiredLevel) + proficiencyBonus;
  return Math.max(1, (69 + action.difficulty) / (69 + proficiency));
}

export function calculateCookingPlan(input: CalculationInput & { action: CookingAction }, proficiencyBonus = 0) {
  if (!Number.isFinite(proficiencyBonus) || proficiencyBonus < 0) {
    throw new RangeError('Cooking proficiency bonus must be finite and non-negative.');
  }
  const { action, currentXp, inventory = {} } = input;
  const plan = calculateActionPlan(input);
  const startingLevel = levelForXp(currentXp);
  const startingAttemptsPerSuccess = attemptsPerSuccess(action, startingLevel, proficiencyBonus);
  let expectedAttempts = 0;
  for (const { level, count } of completionsByLevel(currentXp, plan.effectiveXpPerAction, plan.actions)) {
    expectedAttempts += count * attemptsPerSuccess(action, level, proficiencyBonus);
  }

  const interval = input.effectiveIntervalSeconds ?? action.intervalSeconds;
  const budgetedAttempts = Math.ceil(expectedAttempts);
  const attemptsPerBatch = plan.actions === 0 ? startingAttemptsPerSuccess : expectedAttempts / plan.actions;
  return {
    ...plan,
    startingSuccessChance: 1 / startingAttemptsPerSuccess,
    expectedAttempts,
    budgetedAttempts,
    trainingSeconds: expectedAttempts * interval,
    xpPerHour: plan.xpPerHour / attemptsPerBatch,
    resources: calculateResourceCosts(action.inputs, budgetedAttempts, inventory),
  };
}
