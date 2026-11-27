import type { CombatSkill } from './skills';

type StanceSkill = Exclude<CombatSkill, 'Hitpoints' | 'Prayer' | 'Slayer'>;

export interface CombatStance {
  name: string;
  style: 'Melee' | 'Ranged' | 'Magic';
  xpPerDamage: Partial<Record<StanceSkill, number>>;
}

// Early Access stance data: https://melvoridle2.th.gl/db/attacks
export const hitpointsXpPerDamage = 0.133;
export const combatStances: readonly CombatStance[] = [
  { name: 'Stab', style: 'Melee', xpPerDamage: { Attack: 0.4 } },
  { name: 'Slash', style: 'Melee', xpPerDamage: { Attack: 0.12, Strength: 0.28 } },
  { name: 'Crush', style: 'Melee', xpPerDamage: { Strength: 0.4 } },
  { name: 'Block', style: 'Melee', xpPerDamage: { Defence: 0.4 } },
  { name: 'Accurate', style: 'Ranged', xpPerDamage: { Ranged: 0.4 } },
  { name: 'Powerful', style: 'Ranged', xpPerDamage: { Ranged: 0.28, Strength: 0.12 } },
  { name: 'Long-Range', style: 'Ranged', xpPerDamage: { Ranged: 0.28, Defence: 0.12 } },
  { name: 'Empowered', style: 'Magic', xpPerDamage: { Magic: 0.4 } },
  { name: 'Focused', style: 'Magic', xpPerDamage: { Magic: 0.28, Defence: 0.12 } },
];

export function stanceTrains(skill: CombatSkill, stance: CombatStance) {
  if (skill === 'Hitpoints' || skill === 'Prayer' || skill === 'Slayer') return true;
  return stance.xpPerDamage[skill] !== undefined;
}
