import { hitpointsXpPerDamage, type CombatStance } from './data/combat-stances';
import { combatSkills, type CombatSkill } from './data/skills';

interface EnemyStats {
  enemyHealth: number;
  baseArmour: number;
  baseWard: number;
}

export interface CombatFight extends EnemyStats {
  secondsPerKill?: number;
  prayer?: { baseCost: number; damagingHitsPerKill: number };
  onSlayerTask: boolean;
}

export interface CombatDungeon {
  lineup: readonly (EnemyStats & { count: number })[];
  secondsPerClear?: number;
  prayer?: { baseCost: number; damagingHitsPerClear: number };
}

export interface CombatGoal {
  currentXp: number;
  targetXp?: number;
  xpBonusPercent?: number;
}

export function calculateCombatPlan(
  stance: CombatStance,
  encounter: CombatFight | CombatDungeon,
  goals: Partial<Record<CombatSkill, CombatGoal>>,
) {
  const dungeon = 'lineup' in encounter;
  const lineup = dungeon ? encounter.lineup : [{ ...encounter, count: 1 }];
  const secondsPerCompletion = dungeon ? encounter.secondsPerClear : encounter.secondsPerKill;
  if (secondsPerCompletion !== undefined && (!Number.isFinite(secondsPerCompletion) || secondsPerCompletion <= 0)) {
    throw new RangeError(`Enter positive seconds per ${dungeon ? 'clear' : 'kill'} if known.`);
  }

  let totalHealth = 0;
  let damageEquivalent = 0;
  let enemiesPerCompletion = 0;
  for (const { enemyHealth, baseArmour, baseWard, count } of lineup) {
    if (![enemyHealth, baseArmour, baseWard, count].every(Number.isSafeInteger) ||
      enemyHealth <= 0 || baseArmour < 0 || baseWard < 0 || count <= 0) {
      throw new RangeError('Enter positive whole enemy HP and non-negative whole armour and ward.');
    }
    totalHealth += count * enemyHealth;
    damageEquivalent += count * (enemyHealth + 4 * baseArmour + 50 * baseWard);
    enemiesPerCompletion += count;
  }
  if (enemiesPerCompletion === 0) throw new RangeError('A dungeon needs at least one enemy.');

  const stanceRates: Partial<Record<CombatSkill, number>> = { ...stance.xpPerDamage, Hitpoints: hitpointsXpPerDamage };
  const baseXp: Partial<Record<CombatSkill, number>> = {};
  for (const skill of combatSkills) {
    const rate = stanceRates[skill];
    if (rate !== undefined) baseXp[skill] = rate * damageEquivalent;
  }
  const prayer = encounter.prayer;
  if (prayer) {
    const { baseCost } = prayer;
    const hits = 'damagingHitsPerClear' in prayer ? prayer.damagingHitsPerClear : prayer.damagingHitsPerKill;
    if (!Number.isSafeInteger(baseCost) || baseCost <= 0 ||
      !Number.isFinite(hits) || hits < enemiesPerCompletion || hits > totalHealth) {
      throw new RangeError(`Enter a positive whole prayer cost and an average damaging hit count between ${enemiesPerCompletion} and ${totalHealth}.`);
    }
    const averageDamage = totalHealth / hits;
    baseXp.Prayer = hits * Math.sqrt(3 + 0.2 * averageDamage * baseCost);
  }
  if (!dungeon && encounter.onSlayerTask) baseXp.Slayer = totalHealth / 8 + 4;

  const rates = combatSkills.flatMap((skill) => {
    const baseXpPerCompletion = baseXp[skill];
    const { currentXp = 0, targetXp, xpBonusPercent = 0 } = goals[skill] ?? {};
    if (baseXpPerCompletion === undefined) {
      if (targetXp !== undefined) throw new RangeError(`${skill} cannot be planned for this encounter.`);
      return [];
    }
    if (!Number.isFinite(currentXp) || currentXp < 0 ||
      (targetXp !== undefined && (!Number.isFinite(targetXp) || targetXp < 0)) ||
      !Number.isFinite(xpBonusPercent) || xpBonusPercent <= -100) {
      throw new RangeError(`Check the XP and bonus values for ${skill}.`);
    }
    const xpPerCompletion = baseXpPerCompletion * (1 + xpBonusPercent / 100);
    const remainingXp = targetXp === undefined ? undefined : Math.max(0, targetXp - currentXp);
    const exactCompletions = remainingXp === undefined ? undefined : remainingXp / xpPerCompletion;
    // Ignore floating-point noise at whole-completion boundaries without dropping a positive goal.
    const completionsToTarget = exactCompletions === undefined ? undefined : remainingXp === 0 ? 0
      : Math.max(1, Math.ceil(exactCompletions - exactCompletions * Number.EPSILON));
    if (!Number.isFinite(xpPerCompletion) || xpPerCompletion <= 0 ||
      (completionsToTarget !== undefined && !Number.isSafeInteger(completionsToTarget))) {
      throw new RangeError(`The values for ${skill} are outside the supported range.`);
    }
    return [{ skill, currentXp, targetXp, xpPerCompletion, completionsToTarget }];
  });

  const completions = rates.some(({ completionsToTarget }) => completionsToTarget !== undefined)
    ? Math.max(...rates.map(({ completionsToTarget }) => completionsToTarget ?? 0))
    : undefined;
  const seconds = completions !== undefined && secondsPerCompletion !== undefined ? completions * secondsPerCompletion : undefined;
  const skills = rates.map((row) => {
    const xpPerHour = secondsPerCompletion === undefined ? undefined : row.xpPerCompletion * (3600 / secondsPerCompletion);
    const xpGained = completions === undefined ? undefined : completions * row.xpPerCompletion;
    const projectedXp = xpGained === undefined ? undefined
      : Math.max(row.currentXp + xpGained, row.targetXp ?? 0);
    if ([xpPerHour, projectedXp].some((value) => value !== undefined && !Number.isFinite(value))) {
      throw new RangeError(`The projection for ${row.skill} is outside the supported range.`);
    }
    return {
      ...row,
      xpPerHour,
      xpGained,
      projectedXp,
      setsDuration: completions !== undefined && completions > 0 && row.completionsToTarget === completions,
    };
  });
  if (seconds !== undefined && !Number.isFinite(seconds)) throw new RangeError('The estimated duration is outside the supported range.');
  return { completions, seconds, skills };
}
