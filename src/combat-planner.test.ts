import { describe, expect, it } from 'vitest';
import { calculateCombatPlan } from './combat-planner';
import { combatAreas, combatEnemies } from './data/combat-enemies';
import { combatStances } from './data/combat-stances';

const fight = { enemyHealth: 100, baseArmour: 0, baseWard: 0, onSlayerTask: false };
const stance = (name: string) => combatStances.find((entry) => entry.name === name)!;

describe('combat training', () => {
  it('indexes each enemy once and resolves all area and dungeon memberships', () => {
    const ids = new Set(combatEnemies.map(({ id }) => id));
    expect(ids.size).toBe(combatEnemies.length);
    expect(new Set(combatAreas.flatMap(({ enemies }) => enemies))).toEqual(ids);
    expect(combatAreas.find(({ id }) => id === 'GolbinForest')?.enemies).toContain('Golbin');
    expect(combatAreas.find(({ id }) => id === 'HobgolbinCamp')).toMatchObject({
      isDungeon: true, enemies: expect.arrayContaining(['Golbin']),
    });
  });

  it('uses base armour and ward from a selected enemy in the XP estimate', () => {
    const enemy = combatEnemies.find(({ id }) => id === 'EraxitheBlightedScar')!;
    expect(enemy).toMatchObject({ enemyHealth: 3600, baseArmour: 60, baseWard: 16 });
    const plan = calculateCombatPlan(stance('Stab'), { ...fight, ...enemy }, {});
    expect(plan.skills[0].xpPerCompletion).toBeCloseTo(1856);
    expect(plan.skills[1].xpPerCompletion).toBeCloseTo(617.12);
  });

  it('plans whole Hobgolbin Camp clears using every fight in order', () => {
    const camp = combatAreas.find((area) => area.isDungeon && area.id === 'HobgolbinCamp');
    if (!camp?.isDungeon) throw new Error('Missing Hobgolbin Camp.');
    expect(camp.lineup.map(({ id, count }) => [id, count])).toEqual([
      ['Golbin', 2], ['MindGolbin', 1], ['Hobgolbin', 1], ['GhelbaktheHobChief', 1],
    ]);
    expect(camp.rewards).toEqual([{ name: 'Hobgolbin Chest', min: 1, max: 1 }]);

    const plan = calculateCombatPlan(stance('Slash'), {
      lineup: camp.lineup, secondsPerClear: 120, prayer: { baseCost: 1, damagingHitsPerClear: 10 },
    }, { Attack: { currentXp: 0, targetXp: 83 }, Strength: { currentXp: 0, targetXp: 83 } });
    expect(plan.completions).toBe(3);
    expect(plan.seconds).toBe(360);
    expect(plan.skills.map(({ completionsToTarget }) => completionsToTarget)).toEqual([3, 2, undefined, undefined]);
    expect(plan.skills[0].xpPerCompletion).toBeCloseTo(34.8);
    expect(plan.skills[0].xpPerHour).toBeCloseTo(1044);
    expect(plan.skills[1].xpPerCompletion).toBeCloseTo(81.2);
    expect(plan.skills[2].xpGained).toBeCloseTo(115.71);
    expect(plan.skills[3].xpPerCompletion).toBeCloseTo(10 * Math.sqrt(8.8));
  });

  it('adds armour and ward XP for all repeated dungeon enemies', () => {
    const scar = combatAreas.find((area) => area.isDungeon && area.id === 'BlightedScar');
    if (!scar?.isDungeon) throw new Error('Missing Blighted Scar.');
    const plan = calculateCombatPlan(stance('Stab'), scar, {});
    expect(plan.skills[0].xpPerCompletion).toBeCloseTo(3208);
    expect(plan.skills[1].xpPerCompletion).toBeCloseTo(1066.66);
  });

  it('uses the longest goal and awards all skills XP for those same kills', () => {
    const plan = calculateCombatPlan(stance('Slash'), { ...fight, secondsPerKill: 30 }, {
      Attack: { currentXp: 0, targetXp: 60 },
      Strength: { currentXp: 15, targetXp: 65 },
    });
    expect(plan.completions).toBe(5);
    expect(plan.seconds).toBe(150);
    expect(plan.skills).toMatchObject([
      { skill: 'Attack', completionsToTarget: 5, xpGained: 60, setsDuration: true },
      { skill: 'Strength', completionsToTarget: 2, setsDuration: false },
      { skill: 'Hitpoints', setsDuration: false },
    ]);
    expect(plan.skills[1].xpGained).toBeCloseTo(140);
    expect(plan.skills[2].xpGained).toBeCloseTo(66.5);
  });

  it.each(combatStances)('awards Hitpoints XP in $name', (style) => {
    const plan = calculateCombatPlan(style, fight, { Hitpoints: { currentXp: 0, targetXp: 14 } });
    expect(plan.completions).toBe(2);
    expect(plan.skills.find((row) => row.skill === 'Hitpoints')?.xpGained).toBeCloseTo(26.6);
  });

  it.each([['Powerful', 'Strength'], ['Long-Range', 'Defence'], ['Focused', 'Defence']])(
    'awards side-skill XP in %s',
    (name, skill) => {
      const plan = calculateCombatPlan(stance(name), fight, {});
      expect(plan.skills.find((row) => row.skill === skill)?.xpPerCompletion).toBe(12);
    },
  );

  it('adds kill bonuses to stance XP and estimates Prayer and Slayer independently', () => {
    const plan = calculateCombatPlan(stance('Stab'), {
      ...fight, baseArmour: 5, baseWard: 2, prayer: { baseCost: 3, damagingHitsPerKill: 2 }, onSlayerTask: true,
    }, { Attack: { currentXp: 0, xpBonusPercent: 10 } });
    expect(plan.completions).toBeUndefined();
    expect(plan.skills[0].xpPerCompletion).toBeCloseTo(96.8);
    expect(plan.skills[1].xpPerCompletion).toBeCloseTo(29.26);
    expect(plan.skills[2].xpPerCompletion).toBeCloseTo(2 * Math.sqrt(33));
    expect(plan.skills[3].xpPerCompletion).toBeCloseTo(16.5);
  });

  it('distinguishes reached goals and rejects incompatible goals', () => {
    expect(calculateCombatPlan(stance('Stab'), fight, {
      Attack: { currentXp: 100, targetXp: 83 },
    }).completions).toBe(0);
    expect(() => calculateCombatPlan(stance('Stab'), fight, {
      Magic: { currentXp: 0, targetXp: 83 },
    })).toThrow('Magic cannot be planned');
  });

  it('does not add an extra kill when a fractional rate lands exactly on the target', () => {
    const plan = calculateCombatPlan(stance('Slash'), { ...fight, enemyHealth: 11 }, {
      Attack: { currentXp: 0, targetXp: 1320 },
    });
    expect(plan.completions).toBe(1000);
    expect(plan.skills[0].projectedXp).toBe(1320);
  });
});
