import { agilityTechniques, type AgilityAction, type AgilityTechniqueProgress } from '../data/agility-courses';
import { agilityTechniqueLevel, techniqueLevelCap, techniqueXpAtLevel, type AgilityModifiers, type calculateAgilityPlan } from '../data/agility';
import type { TrainingFoodSettings } from './TrainingFood';

export interface AgilitySettings extends TrainingFoodSettings {
  techniqueLevels?: AgilityTechniqueProgress;
  modifiers?: AgilityModifiers;
}

export function startingAgilityXp(settings: AgilitySettings, importedXp: AgilityTechniqueProgress | null | undefined) {
  const xp = { ...importedXp };
  for (const technique of agilityTechniques) {
    const level = settings.techniqueLevels?.[technique];
    if (level !== undefined) xp[technique] = techniqueXpAtLevel(level);
  }
  return xp;
}

export function AgilityTechniqueFields({ action, settings, importedXp, onUpdate }: {
  action: AgilityAction;
  settings: AgilitySettings;
  importedXp?: AgilityTechniqueProgress | null;
  onUpdate: (patch: AgilitySettings) => void;
}) {
  const techniques = agilityTechniques.filter((technique) => action.obstacles.some(([used]) => used === technique));
  if (techniques.length === 0) return null;
  return <details className="modifier-details" open>
    <summary>Starting technique levels</summary>
    <div className="field-grid">
      {techniques.map((technique) => <label key={technique}>
        <span className="field-label">{technique.toUpperCase()}</span>
        <span className="number-input-wrap"><input type="number" min="1" max={techniqueLevelCap} step="1"
          value={settings.techniqueLevels?.[technique] ?? ''}
          placeholder={String(agilityTechniqueLevel(importedXp?.[technique] ?? 0))}
          onChange={(event) => {
            const levels = { ...settings.techniqueLevels };
            if (event.target.value === '') delete levels[technique];
            else if (Number.isInteger(event.target.valueAsNumber) && event.target.valueAsNumber >= 1 && event.target.valueAsNumber <= techniqueLevelCap) {
              levels[technique] = event.target.valueAsNumber;
            }
            onUpdate({ techniqueLevels: levels });
          }} /><span>LEVEL</span></span>
        <span className="field-note">{importedXp?.[technique] !== undefined ? `IMPORTED LEVEL ${agilityTechniqueLevel(importedXp[technique])}` : 'DEFAULT LEVEL 1'}</span>
      </label>)}
    </div>
    <p className="modifier-disclaimer">A manual level starts at that level’s XP threshold. Leave it blank to use imported progress when available.</p>
  </details>;
}

const modifierFields = [
  ['difficultyReduction', 'OBSTACLE DIFFICULTY REDUCTION', 40, 1],
  ['trapSuccessBonus', 'ADDITIONAL TRAP SUCCESS', 15, 0.1],
  ['damageReduction', 'DAMAGE REDUCTION', 100, 0.1],
  ['intervalReduction', 'OBSTACLE INTERVAL REDUCTION', 99, 0.1],
  ['retryChance', 'RETRY FAILED OBSTACLE', 100, 0.1],
  ['skipChance', 'SKIP NEXT OBSTACLE', 100, 0.1],
  ['entryPreservation', 'ENTRY COST PRESERVATION', 100, 0.1],
] as const;

export function AgilityModifierFields({ action, modifiers, onChange }: {
  action: AgilityAction;
  modifiers?: AgilityModifiers;
  onChange: (modifiers: AgilityModifiers) => void;
}) {
  const fields = modifierFields.filter(([key]) =>
    (key !== 'entryPreservation' || action.inputs.length > 0) &&
    (key !== 'trapSuccessBonus' || action.obstacles.some(([technique]) => technique === null)));
  return <div className="field-grid modifier-fields">
    {fields.map(([key, label, max, step]) => {
      const scale = key === 'difficultyReduction' ? 1 : 100;
      const value = Number(((modifiers?.[key] ?? 0) * scale).toFixed(2));
      return <label key={key}>
        <span className="field-label">{label}</span>
        <span className="number-input-wrap"><input type="number" min="0" max={max} step={step} value={value} onChange={(event) => {
          const entered = Number(event.target.value);
          if (!Number.isFinite(entered) || (scale === 1 && !Number.isInteger(entered))) return;
          onChange({ ...modifiers, [key]: Math.max(0, Math.min(max, entered)) / scale });
        }} /><span>{scale === 1 ? 'LEVELS' : '%'}</span></span>
      </label>;
    })}
  </div>;
}

const percent = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 2 });

export function AgilityObstacleSummary({ plan }: { plan: ReturnType<typeof calculateAgilityPlan> }) {
  return <details className="modifier-details">
    <summary>Obstacle success and technique targets</summary>
    {plan.starting.obstacles.map(({ technique, difficulty, guaranteedLevel, successChance }, index) =>
      <div className="resource-row" key={index}>
        <span>{index + 1}. {technique ?? 'Trap'}</span>
        <span>{guaranteedLevel !== null ? `Difficulty ${difficulty} · ${guaranteedLevel > techniqueLevelCap
          ? 'Requires difficulty reduction for 100%'
          : `100% at level ${guaranteedLevel}`}` : 'Trap success caps at 95% when attempted'}</span>
        <strong>{percent.format(successChance)}</strong>
      </div>)}
    {Object.entries(plan.endingLevels).length > 0 && <p className="field-note">Projected technique levels · {Object.entries(plan.endingLevels)
      .map(([technique, level]) => `${technique} ${level}`).join(' · ')}</p>}
  </details>;
}
