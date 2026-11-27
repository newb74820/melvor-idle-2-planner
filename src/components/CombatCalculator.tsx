import { ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';
import { calculateCombatPlan, type CombatDungeon, type CombatFight } from '../combat-planner';
import { combatAreaCategories, combatAreas, combatEnemies, combatEnemySource } from '../data/combat-enemies';
import { combatStances, hitpointsXpPerDamage, stanceTrains } from '../data/combat-stances';
import { combatSkills, skillProgress, type CombatSkill } from '../data/skills';
import { levelForXp, xpAtLevel, xpAtLevelTable, xpTableSource } from '../data/xp-table';
import type { DecodedSave } from '../schemas/save';

type SkillSettings = { xp?: string; targetLevel?: number; bonus?: string };
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 });
const customEnemyId = 'custom';

function NumberField({ label, value, onChange, min = 0, step = 'any', note }: {
  label: string;
  value: number | string;
  onChange: (value: string) => void;
  min?: number;
  step?: number | 'any';
  note?: string;
}) {
  const noteId = useId();
  return <label>
    <span className="field-label">{label}</span>
    <span className="number-input-wrap">
      <input type="number" min={min} step={step} value={value}
        aria-describedby={note ? noteId : undefined} onChange={(event) => onChange(event.target.value)} />
    </span>
    {note && <span id={noteId} className="field-note">{note}</span>}
  </label>;
}

export default function CombatCalculator({ skill, save, formatDuration }: {
  skill: CombatSkill;
  save: DecodedSave | null;
  formatDuration: (seconds: number) => string;
}) {
  const [stanceName, setStanceName] = useState('');
  const [areaId, setAreaId] = useState('');
  const [enemyId, setEnemyId] = useState('');
  const [enemyHealth, setEnemyHealth] = useState('');
  const [baseArmour, setBaseArmour] = useState('0');
  const [baseWard, setBaseWard] = useState('0');
  const [secondsPerCompletion, setSecondsPerCompletion] = useState('');
  const [prayer, setPrayer] = useState<boolean>();
  const [prayerCost, setPrayerCost] = useState('1');
  const [damagingHits, setDamagingHits] = useState('');
  const [slayer, setSlayer] = useState<boolean>();
  const [settings, setSettings] = useState<Partial<Record<CombatSkill, SkillSettings>>>({});
  const selectedArea = combatAreas.find(({ id }) => id === areaId);
  const dungeon = selectedArea?.isDungeon ? selectedArea : undefined;
  const unit = dungeon ? 'clear' : 'kill';
  const units = dungeon ? 'clears' : 'kills';
  const enemies = selectedArea ? combatEnemies.filter(({ id }) => selectedArea.enemies.includes(id)) : combatEnemies;
  const enemy = enemies.find(({ id }) => id === enemyId);
  const customEnemy = enemyId === customEnemyId;
  const hasPrayer = prayer ?? skill === 'Prayer';
  const onSlayerTask = !dungeon && (slayer ?? skill === 'Slayer');
  const stances = combatStances.filter((stance) => stanceTrains(skill, stance));
  const stance = stances.find(({ name }) => name === stanceName) ?? stances[0];
  const rows = combatSkills.flatMap((id) => {
    const enabled = id === 'Prayer' ? hasPrayer : id === 'Slayer' ? onSlayerTask : stanceTrains(id, stance);
    if (!enabled) return [];
    const savedXp = skillProgress(save?.skills ?? [], id)?.xp;
    const currentXp = Number(settings[id]?.xp ?? savedXp ?? 0);
    const level = Number.isFinite(currentXp) && currentXp >= 0 ? levelForXp(currentXp) : 1;
    const defaultTarget = id === skill && level < xpTableSource.levelCap ? level + 1 : 0;
    return [{ id, savedXp, currentXp, level, targetLevel: settings[id]?.targetLevel ?? defaultTarget }];
  });
  const hasGoal = rows.some(({ targetLevel }) => targetLevel > 0);
  const missingInput = !dungeon && !enemy && !customEnemy ? 'Choose the enemy you’re farming.'
    : customEnemy && enemyHealth === '' ? 'Enter the enemy’s max HP to calculate XP per kill.'
    : hasPrayer && (damagingHits === '' || prayerCost === '') ? `Enter the prayer cost and average damaging hits per ${unit}.` : undefined;
  let plan: ReturnType<typeof calculateCombatPlan> | undefined;
  let error: string | undefined;
  if (!missingInput) {
    try {
      const duration = secondsPerCompletion === '' ? undefined : Number(secondsPerCompletion);
      const baseCost = Number(prayerCost);
      const hits = Number(damagingHits);
      const encounter: CombatFight | CombatDungeon = dungeon ? {
        lineup: dungeon.lineup,
        secondsPerClear: duration,
        prayer: hasPrayer ? { baseCost, damagingHitsPerClear: hits } : undefined,
      } : {
        enemyHealth: enemy?.enemyHealth ?? Number(enemyHealth),
        baseArmour: enemy?.baseArmour ?? Number(baseArmour),
        baseWard: enemy?.baseWard ?? Number(baseWard),
        secondsPerKill: duration,
        prayer: hasPrayer ? { baseCost, damagingHitsPerKill: hits } : undefined,
        onSlayerTask,
      };
      plan = calculateCombatPlan(stance, encounter, Object.fromEntries(rows.map(({ id, currentXp, targetLevel }) => [id, {
        currentXp,
        targetXp: targetLevel ? xpAtLevel(targetLevel) : undefined,
        xpBonusPercent: Number(settings[id]?.bonus ?? 0),
      }])));
    } catch (caught) {
      error = caught instanceof RangeError ? caught.message : 'The combat estimate could not be calculated.';
    }
  }

  function updateSkill(id: CombatSkill, patch: SkillSettings) {
    setSettings((previous) => ({ ...previous, [id]: { ...previous[id], ...patch } }));
  }

  function changeEnemy(id: string) {
    setEnemyId(id);
    setSecondsPerCompletion('');
    setDamagingHits('');
  }

  return <section className="calculator-grid" aria-label="Combat training calculator">
    <div className="input-panel combat-inputs">
      <div className="section-title-row"><h2>Combat setup</h2></div>
      <div className={dungeon ? undefined : 'field-grid'}>
        <label>
          <span className="field-label">AREA OR DUNGEON</span>
          <span className="select-wrap combat-select">
            <select value={areaId} onChange={(event) => {
              const id = event.target.value;
              setAreaId(id);
              const area = combatAreas.find((entry) => entry.id === id);
              if (dungeon || area?.isDungeon || (area && enemy && !area.enemies.includes(enemy.id))) changeEnemy('');
            }}>
              <option value="">All areas</option>
              {combatAreaCategories.map((category) => <optgroup key={category} label={category}>
                {combatAreas.filter((area) => area.category === category)
                  .map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
              </optgroup>)}
            </select>
            <ChevronDown size={15} aria-hidden="true" />
          </span>
        </label>
        {!dungeon && <label>
          <span className="field-label">ENEMY</span>
          <span className="select-wrap combat-select">
            <select value={enemyId} onChange={(event) => changeEnemy(event.target.value)}>
              <option value="" disabled>Choose an enemy</option>
              <option value={customEnemyId}>Custom enemy</option>
              {enemies.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
            </select>
            <ChevronDown size={15} aria-hidden="true" />
          </span>
        </label>}
      </div>
      {dungeon && <details className="modifier-details dungeon-lineup" open>
        <summary>{dungeon.lineup.reduce((total, enemy) => total + enemy.count, 0)} fights per clear</summary>
        <ol>{dungeon.lineup.map(({ id, name, count }, index) => <li key={`${id}-${index}`}>
          {count > 1 ? `${count}× ` : ''}{name}
        </li>)}</ol>
      </details>}
      {enemy && <dl className="combat-enemy-stats">
        <div><dt>Max HP</dt><dd>{number.format(enemy.enemyHealth)}</dd></div>
        <div><dt>Base armour</dt><dd>{number.format(enemy.baseArmour)}</dd></div>
        <div><dt>Base ward</dt><dd>{number.format(enemy.baseWard)}</dd></div>
      </dl>}
      {customEnemy && <div className="field-grid">
        <NumberField label="Enemy max HP" value={enemyHealth} onChange={setEnemyHealth} min={1} step={1} />
        <NumberField label="Enemy base armour" value={baseArmour} onChange={setBaseArmour} step={1} />
        <NumberField label="Enemy base ward" value={baseWard} onChange={setBaseWard} step={1} />
      </div>}
      <label>
        <span className="field-label">STANCE</span>
        <span className="select-wrap combat-select">
          <select value={stance.name} onChange={(event) => setStanceName(event.target.value)}>
            {stances.map(({ name, style, xpPerDamage }) => <option key={name} value={name}>
              {name} · {style} · {Object.keys(xpPerDamage).join(' + ')}
            </option>)}
          </select>
          <ChevronDown size={15} aria-hidden="true" />
        </span>
      </label>
      {(dungeon || enemy || customEnemy) && <div className="field-grid">
        <NumberField label={`Seconds per ${unit} (optional)`} value={secondsPerCompletion} onChange={setSecondsPerCompletion}
          note={dungeon ? 'Use the full clear time, including spawn waits.' : 'Use an average that includes respawn time.'} />
      </div>}
      <label className="planner-toggle">
        <input type="checkbox" checked={hasPrayer} onChange={(event) => setPrayer(event.target.checked)} />
        Train Prayer with active prayers
      </label>
      {hasPrayer && <div className="field-grid">
        <NumberField label="Total base prayer cost" value={prayerCost} onChange={setPrayerCost} min={1} step={1} />
        <NumberField label={`Average damaging hits per ${unit}`} value={damagingHits} onChange={setDamagingHits} min={1} />
      </div>}
      {!dungeon && <label className="planner-toggle">
        <input type="checkbox" checked={onSlayerTask} onChange={(event) => setSlayer(event.target.checked)} />
        Count kills toward an active Slayer task
      </label>}
      {dungeon && skill === 'Slayer' && <p className="field-note">Slayer task XP is estimated for individual enemy farms.</p>}
      <div className="combat-goals">
        <div className="section-title-row"><h2>Training goals</h2></div>
        {rows.map(({ id, level, savedXp, targetLevel }) => <fieldset key={id}>
          <legend>{id}</legend>
          <div className="field-grid">
            <NumberField label="Current XP" value={settings[id]?.xp ?? savedXp ?? 0}
              onChange={(xp) => updateSkill(id, { xp })}
              note={`Lv. ${level}${settings[id]?.xp === undefined && savedXp !== undefined ? ' · from save' : ''}`} />
            <label>
              <span className="field-label">TARGET LEVEL</span>
              <span className="select-wrap combat-select target-select">
                <select value={targetLevel} onChange={(event) => updateSkill(id, { targetLevel: Number(event.target.value) })}>
                  <option value={0}>No target</option>
                  {xpAtLevelTable.slice(0, xpTableSource.levelCap)
                    .map((_, index) => <option key={index + 1} value={index + 1}>Level {index + 1}</option>)}
                </select>
                <ChevronDown size={15} aria-hidden="true" />
              </span>
            </label>
          </div>
        </fieldset>)}
        <details className="modifier-details">
          <summary>Manual XP bonuses</summary>
          <div className="field-grid">
            {rows.map(({ id }) => <NumberField key={id} label={`${id} XP bonus (%)`}
              value={settings[id]?.bonus ?? 0} onChange={(bonus) => updateSkill(id, { bonus })} min={-99.999} />)}
          </div>
        </details>
      </div>
    </div>
    <div className="results-panel combat-results">
      <div className="section-title-row"><h2>Shared training estimate</h2></div>
      {dungeon && dungeon.rewards.length > 0 && <p>Base item rewards per clear · {dungeon.rewards.map(({ name, min, max }) =>
        `${min === max ? number.format(min) : `${number.format(min)}–${number.format(max)}`}× ${name}`).join(', ')}</p>}
      {error && <p className="unlock-warning" role="alert">{error}</p>}
      {missingInput && <p>{missingInput}</p>}
      {plan && <>
        <div className="primary-result" aria-live="polite">
          {plan.completions === undefined ? <p>Set a target level to estimate how many {units} you need.</p> : <>
            <div className="result-label">{units.toUpperCase()} TO REACH ALL SELECTED GOALS</div>
            <div className="action-count">{number.format(plan.completions)}<span>{plan.completions === 1 ? unit : units}</span></div>
            {plan.completions === 0 ? <p>All selected targets are already reached.</p>
              : plan.seconds !== undefined && <p>{formatDuration(plan.seconds)} estimated training time</p>}
            {plan.completions > 0 && <p>Longest goal{plan.skills.filter((row) => row.setsDuration).length > 1 ? 's' : ''} · {
              plan.skills.filter((row) => row.setsDuration).map((row) => row.skill).join(', ')}</p>}
          </>}
        </div>
        <div className="combat-table">
          <table aria-label={`XP earned per ${unit}`}>
            <thead><tr>
              <th scope="col">Skill</th><th scope="col">XP / {unit}</th>
              {secondsPerCompletion !== '' && <th scope="col">XP / hour</th>}
              {hasGoal && <><th scope="col">{dungeon ? 'Clears' : 'Kills'} to goal</th><th scope="col">XP gained</th><th scope="col">Final level</th></>}
            </tr></thead>
            <tbody>{plan.skills.map((row) => <tr key={row.skill}>
              <th scope="row">{row.skill}</th>
              <td>{number.format(row.xpPerCompletion)}</td>
              {row.xpPerHour !== undefined && <td>{number.format(row.xpPerHour)}</td>}
              {row.xpGained !== undefined && row.projectedXp !== undefined && <>
                <td>{row.completionsToTarget === undefined ? '—' : number.format(row.completionsToTarget)}</td>
                <td>{number.format(row.xpGained)}</td>
                <td>{levelForXp(row.projectedXp)}</td>
              </>}
            </tr>)}</tbody>
          </table>
        </div>
      </>}
      <details className="calculation-details" open>
        <summary>Estimate assumptions</summary>
        {dungeon && <p>XP per clear adds up every fight in the lineup. Completion items are awarded after the last fight.</p>}
        <p>Each kill assumes you deal the enemy’s full health in stance damage. Armour and ward add kill XP. Hitpoints earns {hitpointsXpPerDamage} base XP per point of stance damage before the kill bonus.</p>
        {hasPrayer && <p>Prayer assumes active prayers throughout and uses average damage per landed hit. Have enough Prayer Points to sustain them.</p>}
        {onSlayerTask && <p>Slayer assumes every kill qualifies for the active task. Check task length and renew or reassign as needed.</p>}
        <p>Rates stay fixed as you level. Timing uses the average you enter. Gear, food, ammo and survival are outside this estimate.</p>
        <p className="combat-sources">
          <a href={combatEnemySource} target="_blank" rel="noreferrer">Enemy data reference</a>
          {dungeon && <a href="https://melvoridle.wiki/melvor-idle-2/mechanics/combat-areas" target="_blank" rel="noreferrer">Dungeon mechanics</a>}
          <a href="https://melvoridle2.th.gl/db/attacks" target="_blank" rel="noreferrer">Stance data</a>
          <a href="https://melvoridle.wiki/melvor-idle-2/mechanics/combat-experience" target="_blank" rel="noreferrer">Combat XP</a>
          <a href="https://melvoridle2.th.gl/db/skill/legacyskillnavigationoption-legacyprayer" target="_blank" rel="noreferrer">Prayer XP</a>
          <a href="https://melvoridle.wiki/melvor-idle-2/skills/slayer" target="_blank" rel="noreferrer">Slayer XP</a>
        </p>
      </details>
    </div>
  </section>;
}
