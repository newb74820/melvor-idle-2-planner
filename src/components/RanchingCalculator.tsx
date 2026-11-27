import { ChevronDown } from 'lucide-react';
import { useRef, useState } from 'react';
import { ranchAnimals, ranchEnclosures, ranchingMechanics, ranchingSource, ranchLandLevels } from '../data/ranching';
import { levelForXp, xpAtLevel, xpTableSource } from '../data/xp-table';
import { calculateRanchingPlan } from '../ranching-planner';
import PassiveNumberField from './PassiveNumberField';

type AnimalRow = { key: number; animalId: string; count: string; age: string; happiness: string };
type PenRow = { key: number; enclosureId: string; animals: AnimalRow[] };
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const levels = Array.from({ length: xpTableSource.levelCap }, (_, index) => index + 1);
const enclosures = new Map(ranchEnclosures.map((enclosure) => [enclosure.id, enclosure]));
const animals = new Map(ranchAnimals.map((animal) => [animal.id, animal]));
const pasture = 'CowSheepEnclosureI';
const newAnimal = (key: number, animalId: string): AnimalRow => ({ key, animalId, count: '1', age: '', happiness: '96' });

export default function RanchingCalculator({ savedXp, inventory, gold, formatDuration }: {
  savedXp?: number;
  inventory: Readonly<Record<string, number>>;
  gold?: string;
  formatDuration: (seconds: number) => string;
}) {
  const [rows, setRows] = useState<PenRow[]>([{ key: 0, enclosureId: pasture, animals: [newAnimal(1, 'Sheep')] }]);
  const nextKey = useRef(2);
  const [xp, setXp] = useState<string>();
  const [mode, setMode] = useState<'level' | 'time'>('level');
  const [level, setLevel] = useState<number>();
  const [hours, setHours] = useState('24');
  const [replace, setReplace] = useState(false);
  const currentXp = Number(xp ?? savedXp ?? 0);
  const currentLevel = Number.isFinite(currentXp) && currentXp >= 0 ? levelForXp(currentXp) : 1;
  const targetLevel = level ?? Math.min(xpTableSource.levelCap, currentLevel + 1);
  const availableLand = ranchLandLevels.filter((required) => required <= currentLevel).length;
  const pens = rows.map((pen) => ({
    enclosure: enclosures.get(pen.enclosureId)!,
    cohorts: pen.animals.map((row) => ({
      animal: animals.get(row.animalId)!,
      count: Number(row.count),
      ageHours: row.age === '' ? null : Number(row.age),
      happinessPercent: Number(row.happiness),
    })),
  }));

  let plan: ReturnType<typeof calculateRanchingPlan> | undefined;
  let error: string | undefined;
  try {
    plan = calculateRanchingPlan({
      pens, currentXp, inventory, replace,
      goal: mode === 'level' ? { targetXp: xpAtLevel(targetLevel) } : { hours: Number(hours) },
    });
  } catch (caught) {
    if (!(caught instanceof RangeError)) throw caught;
    error = caught.message;
  }
  const goldMissing = plan && gold !== undefined && BigInt(plan.gold) > BigInt(gold)
    ? BigInt(plan.gold) - BigInt(gold) : 0n;

  function updatePen(key: number, update: (pen: PenRow) => PenRow) {
    setRows((current) => current.map((pen) => pen.key === key ? update(pen) : pen));
  }

  function updateAnimal(penKey: number, key: number, patch: Partial<Omit<AnimalRow, 'key'>>) {
    updatePen(penKey, (pen) => ({ ...pen, animals: pen.animals.map((row) => row.key === key ? { ...row, ...patch } : row) }));
  }

  function changeEnclosure(penKey: number, enclosureId: string) {
    const entry = enclosures.get(enclosureId)!;
    const fallback = newAnimal(nextKey.current++, entry.animalIds[0]);
    updatePen(penKey, (pen) => {
      const compatible = pen.animals.filter(({ animalId }) => entry.animalIds.includes(animalId));
      return { ...pen, enclosureId, animals: compatible.length ? compatible : [fallback] };
    });
  }

  function addEnclosure() {
    const row = { key: nextKey.current++, enclosureId: pasture, animals: [newAnimal(nextKey.current++, 'Sheep')] };
    setRows((current) => [...current, row]);
  }

  return <section className="calculator-grid" aria-label="Ranching calculator">
    <div className="input-panel ranching-setup">
      <div className="section-title-row"><h2>Ranch setup</h2></div>
      <div className="target-mode">
        <button type="button" className={mode === 'level' ? 'selected' : ''} aria-pressed={mode === 'level'}
          onClick={() => setMode('level')}>Target level</button>
        <button type="button" className={mode === 'time' ? 'selected' : ''} aria-pressed={mode === 'time'}
          onClick={() => setMode('time')}>Time budget</button>
      </div>
      <div className="field-grid">
        <div>
          <PassiveNumberField label="Current Ranching XP" value={xp ?? savedXp ?? 0} onChange={setXp} />
          <span className="field-note">Level {currentLevel}{xp === undefined && savedXp !== undefined ? ' · from save' : ''}</span>
        </div>
        {mode === 'level' ? <label>
          <span className="field-label">Target Ranching level</span>
          <span className="select-wrap ranching-select target-select">
            <select value={targetLevel} onChange={(event) => setLevel(Number(event.target.value))}>
              {levels.map((value) => <option key={value} value={value}>Level {value}</option>)}
            </select><ChevronDown size={15} aria-hidden="true" />
          </span>
        </label> : <PassiveNumberField label="Elapsed hours" value={hours} onChange={setHours} />}
      </div>
      <label className="planner-toggle">
        <input type="checkbox" checked={replace} onChange={(event) => setReplace(event.target.checked)} />
        Buy replacements when animals reach their lifespan
      </label>
      {rows.map((pen, index) => <fieldset key={pen.key} className="ranching-pen">
        <legend>Enclosure {index + 1}</legend>
        <label>
          <span className="field-label">Enclosure type</span>
          <span className="select-wrap ranching-select target-select">
            <select value={pen.enclosureId} onChange={(event) => changeEnclosure(pen.key, event.target.value)}>
              {ranchEnclosures.map(({ id, name, capacity, level }) => <option key={id} value={id}>
                {name} · {capacity} slots · Lv. {level}
              </option>)}
            </select><ChevronDown size={15} aria-hidden="true" />
          </span>
        </label>
        {pens[index].enclosure.requirement && <p className="field-note">{pens[index].enclosure.requirement}</p>}
        {pen.animals.map((row, animalIndex) => {
          const { enclosure, cohorts } = pens[index];
          const animal = cohorts[animalIndex].animal;
          return <div className="ranching-cohort" key={row.key}>
            <div className="field-grid">
              <label>
                <span className="field-label">Animal</span>
                <span className="select-wrap ranching-select target-select">
                  <select value={row.animalId} onChange={(event) => updateAnimal(pen.key, row.key, { animalId: event.target.value, age: '' })}>
                    {enclosure.animalIds.map((id) => <option key={id} value={id}>{animals.get(id)!.name}</option>)}
                  </select><ChevronDown size={15} aria-hidden="true" />
                </span>
              </label>
              <PassiveNumberField label="Animals" value={row.count} min={1} step={1}
                onChange={(count) => updateAnimal(pen.key, row.key, { count })} />
              <PassiveNumberField label="Age in hours (blank buys new)" value={row.age}
                onChange={(age) => updateAnimal(pen.key, row.key, { age })} />
              <PassiveNumberField label="Happiness (%)" value={row.happiness}
                onChange={(happiness) => updateAnimal(pen.key, row.key, { happiness })} />
            </div>
            <p className="field-note">Matures at {formatDuration(animal.maturityMinutes * 60)} · Lives {formatDuration(animal.lifespanMinutes * 60)}
              {animal.requirement && ` · ${animal.requirement}`}</p>
            {pen.animals.length > 1 && <button className="secondary-button" type="button"
              onClick={() => updatePen(pen.key, (entry) => ({ ...entry, animals: entry.animals.filter(({ key }) => key !== row.key) }))}>
              Remove animal group
            </button>}
          </div>;
        })}
        <div className="ranching-buttons">
          <button type="button" className="secondary-button" disabled={pen.animals.length >= pens[index].enclosure.capacity} onClick={() => {
            const row = newAnimal(nextKey.current++, pens[index].enclosure.animalIds[0]);
            updatePen(pen.key, (entry) => ({ ...entry, animals: [...entry.animals, row] }));
          }}>Add animal group</button>
          {rows.length > 1 && <button type="button" className="secondary-button"
            onClick={() => setRows((current) => current.filter(({ key }) => key !== pen.key))}>Remove enclosure</button>}
        </div>
      </fieldset>)}
      <button className="secondary-button farming-add" type="button" disabled={rows.length >= ranchLandLevels.length}
        onClick={addEnclosure}>Add enclosure</button>
    </div>
    <div className="results-panel ranching-results">
      <div className="section-title-row"><h2>Passive Ranching estimate</h2></div>
      {error && <p className="ranching-warning" role="alert">{error}</p>}
      {rows.length > availableLand && <p className="ranching-warning">Level {currentLevel} qualifies for {availableLand} land plots. This plan uses {rows.length}.</p>}
      {pens.some(({ enclosure, cohorts }) => enclosure.level > currentLevel || cohorts.some(({ animal }) => animal.level > currentLevel)) &&
        <p className="ranching-warning">Some animals or enclosures require a higher Ranching level. This estimate assumes they’re unlocked.</p>}
      {plan && <>
        <div className="primary-result" aria-live="polite">
          <div className="result-label">{mode === 'time' ? 'ELAPSED TIME BUDGET' : plan.goalReached ? 'ELAPSED TIME TO TARGET' : 'TIME MODELED'}</div>
          <div className="action-count">{formatDuration(plan.elapsedSeconds)}</div>
          <p>{number.format(plan.xpGained)} Ranching XP · Projected level {levelForXp(plan.projectedXp)}</p>
          {plan.goalReached === false && <p>This setup falls short of the target within the modeled time.</p>}
          {plan.animalsPurchased > 0 && <p>{number.format(plan.animalsPurchased)} animal purchases · {number.format(plan.gold)} GP
            {goldMissing > 0n && ` · ${number.format(goldMissing)} GP missing`}</p>}
        </div>
        {plan.products.length > 0 && <div className="ranching-table">
          <table aria-label="Ranch products">
            <thead><tr><th scope="col">Product</th><th scope="col">Produced</th></tr></thead>
            <tbody>{plan.products.map((item) => <tr key={item.itemId}><th scope="row">{item.itemName}</th>
              <td>{number.format(item.quantity)}</td></tr>)}</tbody>
          </table>
        </div>}
        {plan.resources.length > 0 && <div className="ranching-table">
          <table aria-label="Feed budget">
            <thead><tr><th scope="col">Feed</th><th scope="col">Required</th><th scope="col">Owned</th><th scope="col">Missing</th></tr></thead>
            <tbody>{plan.resources.map((item) => <tr key={item.itemId}><th scope="row">{item.itemName}</th>
              <td>{number.format(item.required)}</td><td>{number.format(item.owned)}</td><td>{number.format(item.missing)}</td></tr>)}</tbody>
          </table>
        </div>}
      </>}
      <details className="calculation-details" open>
        <summary>Estimate assumptions</summary>
        <p>Enclosures run in parallel while you train other skills. The first production and feeding tick is one hour into the plan. Animal purchases award XP immediately.</p>
        <p>The estimate uses standard variants and constant happiness. The default 96% assumes full hunger and safety before treats, pets, or pack bonuses. Keep enough feed on hand to sustain your settings.</p>
        <p>Land and enclosure construction, repairs, breeding, petting XP, and equipment or mastery modifiers are outside the budget.</p>
        <p className="combat-sources">
          <a href={ranchingSource} target="_blank" rel="noreferrer">Animal data</a>
          <a href={ranchingMechanics} target="_blank" rel="noreferrer">Ranching mechanics</a>
        </p>
      </details>
    </div>
  </section>;
}
