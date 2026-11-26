import type { ItemAmount, SkillAction } from '../calculator';
import { recipeItemAmount, recipeItemId, type RecipeItem } from './recipe-items';

type ArtisanProductRolls = { rolls: [item: RecipeItem, chance: number][] };
export type ArtisanRecipe = [
  name: string, level: number | null, xp: number, steps: number, inputs: RecipeItem[],
  output?: number | RecipeItem | ArtisanProductRolls | null, id?: string,
];

export interface ArtisanAction extends SkillAction {
  recipeGroup: string;
  steps: number;
  secondsPerStep: number;
  source: string;
  prerequisiteNote?: string;
  hasLevelRequirement: boolean;
  productRolls?: (ItemAmount & { chance: number })[];
}

export function buildArtisanActions(
  recipes: Record<string, ArtisanRecipe[]>,
  prerequisites: Readonly<Record<string, string>>,
  groupIntervals: Readonly<Record<string, number>> = {},
): ArtisanAction[] {
  return Object.entries(recipes).flatMap(([recipeGroup, rows]) => {
    const secondsPerStep = groupIntervals[recipeGroup] ?? 2;
    return rows.map(([name, level, baseXp, steps, inputs, output = 1, id = recipeItemId(name)]) => {
      const products = output !== null && typeof output === 'object' && 'rolls' in output
        ? { outputs: [], productRolls: output.rolls.map(([item, chance]) => ({ ...recipeItemAmount(item), chance })) }
        : { outputs: output === null ? [] : [recipeItemAmount(typeof output === 'number' ? [name, output, id] : output)] };
      return {
        id, name, requiredLevel: level ?? 1, hasLevelRequirement: level !== null,
        baseXp, recipeGroup, steps, secondsPerStep,
        intervalSeconds: steps * secondsPerStep,
        inputs: inputs.map(recipeItemAmount), ...products,
        source: `https://db.melvor.aevv.net/artisan-recipe/${id}`,
        prerequisiteNote: prerequisites[id],
      };
    });
  });
}

export function expectedArtisanSteps(steps: number, skipChance: number): number {
  if (!Number.isInteger(steps) || steps < 1 || !(skipChance >= 0 && skipChance <= 1)) {
    throw new RangeError('Crafting needs a positive whole step count and a skip chance between 0 and 1.');
  }
  let twoFewer = 0;
  let oneFewer = 1;
  for (let remaining = 2; remaining <= steps; remaining++) {
    const expected = 1 + (1 - skipChance) * oneFewer + skipChance * twoFewer;
    twoFewer = oneFewer;
    oneFewer = expected;
  }
  return oneFewer;
}
