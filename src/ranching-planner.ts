import { calculateResourceCosts, type ItemAmount } from './calculator';
import { ranchLandLevels, type RanchAnimal, type RanchEnclosure } from './data/ranching';

export const ranchPlanningLimitHours = 100 * 365 * 24;

export interface RanchCohort {
  animal: RanchAnimal;
  count: number;
  ageHours: number | null;
  happinessPercent: number;
}

export interface RanchPen {
  enclosure: RanchEnclosure;
  cohorts: readonly RanchCohort[];
}

interface RanchingInput {
  pens: readonly RanchPen[];
  currentXp: number;
  goal: { targetXp: number } | { hours: number };
  replace: boolean;
  inventory?: Readonly<Record<string, number>>;
}

function addItem(items: Map<string, ItemAmount>, item: ItemAmount, quantity: number) {
  if (quantity <= 0) return;
  items.set(item.itemId, { ...item, quantity: (items.get(item.itemId)?.quantity ?? 0) + quantity });
}

export function calculateRanchingPlan({ pens, currentXp, goal, replace, inventory = {} }: RanchingInput) {
  if (!Number.isFinite(currentXp) || currentXp < 0) throw new RangeError('Enter non-negative current XP.');
  if (!pens.length || pens.length > ranchLandLevels.length) throw new RangeError('Assign between 1 and 15 enclosures.');
  const cohorts = pens.flatMap(({ enclosure, cohorts }) => {
    if (!cohorts.length) throw new RangeError(`Assign animals to ${enclosure.name}.`);
    const count = cohorts.reduce((sum, row) => sum + row.count, 0);
    if (count > enclosure.capacity) throw new RangeError(`${enclosure.name} holds up to ${enclosure.capacity} animals.`);
    return cohorts.map((row) => {
      const { animal, count, ageHours, happinessPercent } = row;
      if (!enclosure.animalIds.includes(animal.id)) throw new RangeError(`${animal.name} cannot live in ${enclosure.name}.`);
      if (!Number.isSafeInteger(count) || count <= 0 || !Number.isFinite(happinessPercent) || happinessPercent < 0) {
        throw new RangeError('Enter a positive whole animal count and non-negative happiness.');
      }
      const age = Math.floor((ageHours ?? 0) * 60);
      if (!Number.isSafeInteger(age) || age < 0 || age >= animal.lifespanMinutes) {
        throw new RangeError(`${animal.name} age must be less than its lifespan of ${animal.lifespanMinutes / 60} hours.`);
      }
      const young = age < animal.maturityMinutes;
      return {
        ...row, young, purchased: ageHours === null ? count : 0,
        nextChange: (young ? animal.maturityMinutes : animal.lifespanMinutes) - age,
      };
    });
  });

  const timeBudget = 'hours' in goal ? goal.hours : undefined;
  const targetXp = 'targetXp' in goal ? goal.targetXp : undefined;
  if (targetXp !== undefined && (!Number.isFinite(targetXp) || targetXp < 0)) throw new RangeError('Enter non-negative target XP.');
  if (timeBudget !== undefined && (!Number.isFinite(timeBudget) || timeBudget < 0 || timeBudget > ranchPlanningLimitHours)) {
    throw new RangeError(`Enter a time budget from 0 to ${ranchPlanningLimitHours.toLocaleString('en-US')} hours.`);
  }
  const needed = targetXp === undefined ? undefined : Math.max(0, targetXp - currentXp);
  const horizon = Math.floor((timeBudget ?? ranchPlanningLimitHours) * 60);
  const feed = new Map<string, ItemAmount>();
  const products = new Map<string, ItemAmount>();
  let elapsed = 0;
  let lastTick = 0;
  let xpGained = cohorts.reduce((total, row) => total + row.purchased * row.animal.xp, 0);
  if (needed === 0) {
    xpGained = 0;
    for (const row of cohorts) row.purchased = 0;
  }
  const reachesTarget = () => needed !== undefined && xpGained >= needed - needed * Number.EPSILON;

  // Between age changes the same animals produce at every hourly tick. Evaluate each block together.
  while (!reachesTarget()) {
    const active = cohorts.filter(({ nextChange }) => Number.isFinite(nextChange));
    if (!active.length) break;
    const transition = Math.min(...active.map(({ nextChange }) => nextChange));
    const stableEnd = Math.min(horizon, transition - 1);
    const availableTicks = Math.floor(stableEnd / 60) - lastTick;
    if (availableTicks > 0) {
      const production = new Map<string, ItemAmount>();
      let xpPerTick = 0;
      for (const { animal, count, happinessPercent, young } of active) {
        const factor = count * (young ? 0.5 : 1) * (happinessPercent / 100);
        xpPerTick += animal.xp * factor;
        for (const item of animal.products) addItem(production, item, item.quantity * factor);
      }
      if (!Number.isFinite(xpPerTick)) throw new RangeError('The production estimate is outside the supported range.');
      const remaining = needed === undefined ? undefined : needed - xpGained;
      const targetTicks = remaining !== undefined && xpPerTick > 0
        ? Math.max(1, Math.ceil((remaining - needed! * Number.EPSILON) / xpPerTick)) : availableTicks;
      const ticks = Math.min(availableTicks, targetTicks);
      for (const item of production.values()) {
        // Round once per hour after combining the same product across all enclosures.
        addItem(products, item, Math.floor(item.quantity + item.quantity * Number.EPSILON * 2) * ticks);
      }
      for (const { animal, count } of active) {
        for (const item of animal.feed) addItem(feed, item, item.quantity * count * ticks);
      }
      xpGained += xpPerTick * ticks;
      lastTick += ticks;
      elapsed = lastTick * 60;
      if (reachesTarget()) break;
    }
    if (transition > horizon) {
      elapsed = horizon;
      break;
    }
    elapsed = transition;
    for (const row of active) {
      if (row.nextChange !== transition) continue;
      if (row.young) {
        row.young = false;
        row.nextChange = transition + row.animal.lifespanMinutes - row.animal.maturityMinutes;
      } else if (replace) {
        row.young = true;
        row.purchased += row.count;
        xpGained += row.count * row.animal.xp;
        row.nextChange = transition + row.animal.maturityMinutes;
      } else {
        row.nextChange = Infinity;
      }
    }
  }

  const goalReached = targetXp === undefined ? undefined : reachesTarget();
  const projectedXp = Math.max(currentXp + xpGained, goalReached ? targetXp! : 0);
  if (!Number.isFinite(projectedXp)) throw new RangeError('Projected XP is outside the supported range.');
  return {
    elapsedSeconds: timeBudget === undefined ? elapsed * 60 : timeBudget * 3600,
    goalReached, xpGained, projectedXp,
    animalsPurchased: cohorts.reduce((total, row) => total + row.purchased, 0),
    gold: cohorts.reduce((total, row) => total + row.purchased * row.animal.gold, 0),
    resources: calculateResourceCosts([...feed.values()], 1, inventory),
    products: [...products.values()],
  };
}
