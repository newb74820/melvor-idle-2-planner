import { calculateResourceCosts, type ItemAmount } from './calculator';
import { farmingCategories, type FarmingCrop } from './data/farming';

export interface FarmingPlanting {
  crop: FarmingCrop;
  plots: number;
}

interface FarmingPlanInput {
  plantings: readonly FarmingPlanting[];
  currentXp: number;
  goal: { targetXp: number } | { seconds: number };
  xpBonusPercent?: number;
  growthTimePercent?: number;
  inventory?: Readonly<Record<string, number>>;
}

export function calculateFarmingPlan({
  plantings, currentXp, goal, xpBonusPercent = 0, growthTimePercent = 0, inventory = {},
}: FarmingPlanInput) {
  if (!Number.isFinite(currentXp) || currentXp < 0 ||
    ![xpBonusPercent, growthTimePercent].every((percent) => Number.isFinite(percent) && percent > -100)) {
    throw new RangeError('Enter non-negative current XP and percentage modifiers greater than −100%.');
  }
  if (!plantings.length || plantings.some(({ plots }) => !Number.isSafeInteger(plots) || plots <= 0)) {
    throw new RangeError('Assign at least one plot to each crop in the plan.');
  }
  for (const { id, name, plotLevels } of farmingCategories) {
    const plots = plantings.reduce((sum, planting) => sum + (planting.crop.category === id ? planting.plots : 0), 0);
    if (plots > plotLevels.length) throw new RangeError(`${name} has at most ${plotLevels.length} plots across all crops.`);
  }

  const growthMultiplier = 1 + growthTimePercent / 100;
  const intervalMs = (seconds: number) => Math.max(1, Math.floor(seconds * 1000 * growthMultiplier));
  const schedules = plantings.map(({ crop, plots }) => {
    const first = intervalMs(crop.growSeconds);
    const regrow = intervalMs(crop.regrowSeconds);
    const harvestsPerPlanting = 1 + crop.regrows;
    const cycle = first + crop.regrows * regrow;
    const xpPerHarvest = crop.xp * (1 + xpBonusPercent / 100);
    if (!Number.isSafeInteger(cycle) || !Number.isFinite(xpPerHarvest) || xpPerHarvest <= 0) {
      throw new RangeError('The growth or XP modifier is outside the supported range.');
    }

    function harvestsAt(elapsedMs: number) {
      const fullCycles = Math.floor(elapsedMs / cycle);
      const remainingMs = elapsedMs % cycle;
      const partial = remainingMs < first ? 0 : 1 + Math.floor((remainingMs - first) / regrow);
      return fullCycles * harvestsPerPlanting + partial;
    }

    function timeForHarvests(harvests: number) {
      if (harvests <= 0) return 0;
      const index = harvests - 1;
      return Math.floor(index / harvestsPerPlanting) * cycle + first + (index % harvestsPerPlanting) * regrow;
    }

    return { crop, plots, xpPerHarvest, first, regrow, harvestsPerPlanting, harvestsAt, timeForHarvests };
  });

  let elapsedMs;
  if ('seconds' in goal) {
    elapsedMs = Math.floor(goal.seconds * 1000);
    if (!Number.isSafeInteger(elapsedMs) || elapsedMs < 0) throw new RangeError('Enter a valid non-negative time budget.');
  } else {
    if (!Number.isFinite(goal.targetXp) || goal.targetXp < 0) throw new RangeError('Enter non-negative target XP.');
    const needed = Math.max(0, goal.targetXp - currentXp);
    const xpAt = (ms: number) => schedules.reduce((sum, row) => sum + row.harvestsAt(ms) * row.plots * row.xpPerHarvest, 0);
    const reachesTarget = (ms: number) => xpAt(ms) >= needed - needed * Number.EPSILON;
    // Any single crop can bound the search. XP increases only at a whole harvest.
    let high = Math.min(...schedules.map((row) => row.timeForHarvests(Math.ceil(needed / (row.plots * row.xpPerHarvest)))));
    if (!Number.isSafeInteger(high) || !reachesTarget(high)) {
      throw new RangeError('The target time is outside the supported range.');
    }
    let low = 0;
    while (low < high) {
      const middle = low + Math.floor((high - low) / 2);
      if (reachesTarget(middle)) high = middle;
      else low = middle + 1;
    }
    elapsedMs = low;
  }

  const inputs = new Map<string, ItemAmount>();
  const crops = schedules.map((row) => {
    const perPlot = row.harvestsAt(elapsedMs);
    const harvests = perPlot * row.plots;
    const plantings = Math.ceil(perPlot / row.harvestsPerPlanting) * row.plots;
    for (const item of row.crop.inputs) {
      const quantity = item.quantity * plantings;
      if (!quantity) continue;
      const previous = inputs.get(item.itemId)?.quantity ?? 0;
      inputs.set(item.itemId, { ...item, quantity: previous + quantity });
    }
    return {
      crop: row.crop,
      plots: row.plots,
      harvests,
      plantings,
      firstHarvestSeconds: row.first / 1000,
      xpGained: harvests * row.xpPerHarvest,
      produced: harvests * row.crop.output.quantity,
    };
  });
  const xpGained = crops.reduce((sum, row) => sum + row.xpGained, 0);
  const projectedXp = Math.max(currentXp + xpGained, 'targetXp' in goal ? goal.targetXp : 0);
  if (!Number.isFinite(projectedXp)) throw new RangeError('Projected XP is outside the supported range.');
  return {
    elapsedSeconds: elapsedMs / 1000,
    xpGained,
    projectedXp,
    crops,
    resources: calculateResourceCosts([...inputs.values()], 1, inventory),
  };
}
