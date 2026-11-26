import { calculateActionPlan, calculateResourceCosts, type CalculationInput } from '../calculator';
import type { AgilityAction, AgilityTechniqueProgress } from './agility-courses';

export const techniqueLevelCap = 40;

export function techniqueXpAtLevel(level: number): number {
  const base = 2 ** (1 / 3.25);
  return Math.max(0, Math.floor((level * (level - 1) + 600 * (base ** level - base) / (base - 1)) / 6));
}

export function agilityTechniqueLevel(xp: number): number {
  let level = 1;
  while (level < techniqueLevelCap && techniqueXpAtLevel(level + 1) <= xp) level++;
  return level;
}

export interface AgilityModifiers {
  damageAvoidance?: number;
  damageReduction?: number;
  difficultyReduction?: number;
  trapSuccessBonus?: number;
  skipChance?: number;
  retryChance?: number;
  entryPreservation?: number;
  intervalReduction?: number;
}

export function evaluateAgilityPath(
  action: AgilityAction,
  levels: AgilityTechniqueProgress,
  {
    damageAvoidance = 0, damageReduction = 0, difficultyReduction = 0, trapSuccessBonus = 0,
    skipChance = 0, retryChance = 0, intervalReduction = 0,
  }: AgilityModifiers = {},
) {
  const obstacles = action.obstacles.map(([technique, difficulty, seconds, baseDamage]) => {
    const adjustedDifficulty = Math.max(0, difficulty - difficultyReduction);
    const guaranteedLevel = technique ? adjustedDifficulty + 1 : null;
    const successChance = guaranteedLevel === null || !technique
      ? Math.min(0.95, 0.8 + trapSuccessBonus)
      : 0.95 ** (Math.max(0, guaranteedLevel - (levels[technique] ?? 1)) / 2);
    const damageForRoll = (roll: number) => Math.max(1, Math.round(roll * (1 - damageReduction)));
    const maxDamage = successChance < 1 && baseDamage > 0 && damageAvoidance < 1 ? damageForRoll(baseDamage) : 0;
    let averageDamage = 0;
    if (maxDamage > 0) {
      for (let roll = 1; roll <= baseDamage; roll++) averageDamage += damageForRoll(roll);
      averageDamage = averageDamage * (1 - damageAvoidance) / baseDamage;
    }
    const interval = Math.floor(Math.round(seconds * 1000) * (1 - intervalReduction)) / 1000;
    return { technique, difficulty: adjustedDifficulty, guaranteedLevel, successChance, seconds: interval, maxDamage, averageDamage };
  });

  // Each start ends in completion or a restart. A retry loops on the same obstacle.
  const end = { chance: 1, seconds: 0, attempts: 0, failures: 0, damage: 0, maxHit: 0 };
  let next = end;
  let afterNext = end;
  for (const obstacle of [...obstacles].reverse()) {
    const success = obstacle.successChance;
    const failure = 1 - success;
    const advance = success * (1 - skipChance);
    const skip = success * skipChance;
    const exit = 1 - failure * retryChance;
    const current = {
      chance: retryChance === 1 ? 1 : success * (next.chance + skipChance * (afterNext.chance - next.chance)) / exit,
      seconds: (obstacle.seconds + advance * next.seconds + skip * afterNext.seconds) / exit,
      attempts: (1 + advance * next.attempts + skip * afterNext.attempts) / exit,
      failures: (failure + advance * next.failures + skip * afterNext.failures) / exit,
      damage: (failure * obstacle.averageDamage + advance * next.damage + skip * afterNext.damage) / exit,
      maxHit: Math.max(obstacle.maxDamage, advance > 0 ? next.maxHit : 0, skip > 0 ? afterNext.maxHit : 0),
    };
    afterNext = next;
    next = current;
  }
  return { ...next, obstacles };
}

export function calculateAgilityPlan(
  input: CalculationInput & { action: AgilityAction },
  initialTechniqueXp: AgilityTechniqueProgress,
  modifiers: AgilityModifiers = {},
) {
  const { action, inventory = {} } = input;
  const plan = calculateActionPlan({ ...input, action: { ...action, inputs: [] }, outputDoublingChance: 0 });
  const techniques = [...new Set(action.obstacles.flatMap(([technique]) => technique ? [technique] : []))];
  const progress = techniques.map((technique) => ({
    technique,
    startXp: initialTechniqueXp[technique] ?? 0,
    xpPerRun: action.primaryTechnique === null ? 0
      : technique === action.primaryTechnique ? action.techniqueXp : Math.max(1, action.techniqueXp / 4),
  }));

  const levelsAt = (completed: number): AgilityTechniqueProgress => Object.fromEntries(progress.map(
    ({ technique, startXp, xpPerRun }) => [technique, agilityTechniqueLevel(startXp + completed * xpPerRun)],
  ));
  const starting = evaluateAgilityPath(action, levelsAt(0), modifiers);
  let expectedStarts = 0;
  let expectedFailures = 0;
  let expectedAttempts = 0;
  let expectedDamage = 0;
  let trainingSeconds = 0;
  for (let completed = 0; completed < plan.actions;) {
    const levels = levelsAt(completed);
    const nextLevelAt = progress.reduce((next, { technique, startXp, xpPerRun }) => {
      const level = levels[technique] ?? 1;
      if (xpPerRun === 0 || level >= techniqueLevelCap) return next;
      return Math.min(next, Math.ceil((techniqueXpAtLevel(level + 1) - startXp) / xpPerRun));
    }, plan.actions);
    const phase = completed === 0 ? starting : evaluateAgilityPath(action, levels, modifiers);
    const phaseEnd = Math.max(completed + 1, nextLevelAt);
    const runs = (phaseEnd - completed) / phase.chance;
    expectedStarts += runs;
    expectedFailures += phase.failures * runs;
    expectedAttempts += phase.attempts * runs;
    expectedDamage += phase.damage * runs;
    trainingSeconds += phase.seconds * runs;
    completed = phaseEnd;
  }

  return {
    ...plan,
    starting,
    endingLevels: levelsAt(plan.actions),
    expectedStarts, expectedAttempts, expectedFailures, expectedDamage, trainingSeconds,
    maxFailureHit: plan.actions > 0 ? starting.maxHit : 0,
    resources: calculateResourceCosts(action.inputs, Math.ceil(expectedStarts * (1 - (modifiers.entryPreservation ?? 0))), inventory),
    xpPerHour: 3600 * (trainingSeconds > 0 ? plan.xpGained / trainingSeconds : plan.effectiveXpPerAction * starting.chance / starting.seconds),
  };
}
