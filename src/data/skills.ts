import type { DecodedSkill } from '../schemas/save';
import { levelForXp, xpAtLevel, xpTableSource } from './xp-table';

// Early Access build 26724394: https://melvor2wiki.github.io/
const nonCombat = [
  'Woodcutting', 'Fishing', 'Mining', 'Firemaking', 'Cooking', 'Smithing', 'Fletching',
  'Crafting', 'Runecrafting', 'Herblore', 'Thieving', 'Farming', 'Ranching', 'Hunting',
  'Beastcrafting', 'Agility', 'Astrology',
] as const;
const combat = ['Attack', 'Strength', 'Defence', 'Hitpoints', 'Ranged', 'Magic', 'Prayer', 'Slayer'] as const;

export type SkillId = typeof nonCombat[number] | typeof combat[number];

export const skillGroups = [
  { name: 'Non-combat', skills: nonCombat },
  { name: 'Combat', skills: combat },
] as const;

export const skillCatalog = [...nonCombat, ...combat];
export const passiveSkills: ReadonlySet<SkillId> = new Set(['Farming', 'Ranching']);

const normalize = (name: string) => name.split(':').at(-1)?.toLowerCase().replace(/[^a-z]/g, '');

export function findSkillId(name: string | null): SkillId | undefined {
  return name === null ? undefined : skillCatalog.find((id) => normalize(id) === normalize(name));
}

export function skillProgress(skills: readonly DecodedSkill[], id: SkillId) {
  const skill = skills.find(({ name }) => normalize(name) === normalize(id));
  if (!skill) return null;
  const level = skill.level ?? levelForXp(skill.xp);
  if (level >= xpTableSource.levelCap) {
    return { level, xp: skill.xp, progressPercent: 100, xpToNext: null };
  }
  const floor = xpAtLevel(level);
  const next = xpAtLevel(level + 1);
  return {
    level, xp: skill.xp,
    progressPercent: Math.min(100, Math.max(0, (skill.xp - floor) / (next - floor) * 100)),
    xpToNext: Math.max(0, next - skill.xp),
  };
}
