import {
  Activity, Anvil, ArrowUpRight, Axe, ChefHat, Circle, Crosshair, Dumbbell, Fish, Flame, Footprints,
  Hammer, Heart, Leaf, PawPrint, Pickaxe, Shield, Skull, Sparkles, Sprout, Sword, Trees, WandSparkles,
  type LucideIcon,
} from 'lucide-react';
import { findSkillId, passiveSkills, skillGroups, skillProgress, type SkillId } from '../data/skills';
import { skillCalculators } from '../data/skill-calculators';
import { woodcuttingActions } from '../data/woodcutting';
import { resolveWoodcuttingRates } from '../data/woodcutting-modifiers';
import type { DecodedSave } from '../schemas/save';

export const skillIcons: Record<SkillId, LucideIcon> = {
  Woodcutting: Axe, Fishing: Fish, Mining: Pickaxe, Firemaking: Flame, Cooking: ChefHat,
  Smithing: Anvil, Fletching: ArrowUpRight, Crafting: Hammer, Runecrafting: Circle, Herblore: Leaf,
  Thieving: Crosshair, Farming: Sprout, Ranching: Trees, Hunting: PawPrint, Beastcrafting: PawPrint,
  Agility: Footprints, Astrology: Sparkles, Attack: Sword, Strength: Dumbbell, Defence: Shield,
  Hitpoints: Heart, Ranged: Crosshair, Magic: WandSparkles, Prayer: Sparkles, Slayer: Skull,
};
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

export default function SkillDashboard({ save, onImport, onSelect, refreshError }: {
  save: DecodedSave | null;
  onImport: () => void;
  onSelect: (id: SkillId) => void;
  refreshError: string | null;
}) {
  const activeSkill = findSkillId(save?.activity.kind ?? null);
  const woodcutting = save ? resolveWoodcuttingRates(woodcuttingActions[0], save, true) : null;
  const woodcuttingBonuses = woodcutting ? [
    ...(woodcutting.xpPercentage > 0 ? [`+${number.format(woodcutting.xpPercentage)}% XP`] : []),
    ...(woodcutting.doublingPercentage > 0 ? [`${number.format(woodcutting.doublingPercentage)}% doubling`] : []),
  ] : [];

  return <div className="content-wrap dashboard">
    <section className="page-heading dashboard-heading">
      <div className="heading-icon"><Activity size={21} /></div>
      <div>
        <h1>Dashboard</h1>
        <p className="heading-subtitle">{save
          ? `${save.name} · ${save.mode} · Total level ${number.format(save.totalLevel)}`
          : 'Import a character to see skill levels, XP, and supported bonuses.'}</p>
      </div>
      <button className="secondary-button dashboard-import" type="button" onClick={onImport}>
        {save ? 'Change character' : 'Import character'}
      </button>
    </section>
    {refreshError && <p className="refresh-error" role="alert">{refreshError}</p>}
    {skillGroups.map(({ name, skills }) => (
      <section className="dashboard-group" aria-label={`${name} skills`} key={name}>
        <h2>{name} skills</h2>
        <div className="skill-card-grid">
          {skills.map((skill) => {
            const Icon = skillIcons[skill];
            const progress = skillProgress(save?.skills ?? [], skill);
            const ready = Object.hasOwn(skillCalculators, skill);
            const activity = activeSkill === skill ? save?.activity.target : null;

            return <button
              className={`skill-card${ready ? ' skill-card-ready' : ''}${activeSkill === skill ? ' skill-card-active' : ''}`}
              type="button"
              key={skill}
              onClick={() => onSelect(skill)}
            >
              <span className="skill-card-top">
                <span className="skill-card-icon"><Icon size={18} aria-hidden="true" /></span>
                <span className="skill-card-level">{progress ? `Lv. ${progress.level}` : '—'}</span>
              </span>
              <span className="skill-card-name">{skill}</span>
              {progress ? <>
                <span className="skill-card-xp">{number.format(progress.xp)} XP</span>
                <span className="skill-card-progress" role="img" aria-label={progress.xpToNext === null
                  ? 'Maximum level'
                  : `${number.format(progress.xpToNext)} XP to level ${progress.level + 1}`}>
                  <span style={{ width: `${progress.progressPercent}%` }} />
                </span>
              </> : <span className="skill-card-xp">XP unavailable</span>}
              {activity && <span className="skill-card-context" title={activity}>Saved action · {activity}</span>}
              {skill === 'Woodcutting' && woodcuttingBonuses.length > 0 &&
                <span className="skill-card-bonuses" title="Known bonuses for Normal Tree">{woodcuttingBonuses.join(' · ')}</span>}
              <span className="skill-card-status">{ready ? 'Open calculator' : passiveSkills.has(skill) ? 'Passive skill' : 'Calculator planned'}</span>
            </button>;
          })}
        </div>
      </section>
    ))}
  </div>;
}
