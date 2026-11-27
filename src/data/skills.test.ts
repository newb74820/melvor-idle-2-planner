import { describe, expect, it } from 'vitest';
import { findSkillId, isCombatSkill, skillProgress } from './skills';
import { xpAtLevel } from './xp-table';

describe('skill progress', () => {
  it('matches namespaced save data and derives the level when the save omits it', () => {
    const name = 'MelvorBase:Woodcutting';
    expect(findSkillId(name)).toBe('Woodcutting');
    expect(skillProgress([{ name, level: null, xp: 128.5 }], 'Woodcutting')).toEqual({
      level: 2, xp: 128.5, progressPercent: 50, xpToNext: 45.5,
    });
  });

  it('shows the saved level and XP for a combat skill', () => {
    expect(isCombatSkill('Attack')).toBe(true);
    expect(skillProgress([{ name: 'Attack', level: 2, xp: 174 }], 'Attack')).toEqual({
      level: 2, xp: 174, progressPercent: 100, xpToNext: 0,
    });
    expect(skillProgress([], 'Attack')).toBeNull();
  });

  it('has no next-level target at the supported level cap', () => {
    const xp = xpAtLevel(99);
    expect(skillProgress([{ name: 'Attack', level: 99, xp }], 'Attack')).toEqual({
      level: 99, xp, progressPercent: 100, xpToNext: null,
    });
  });
});
