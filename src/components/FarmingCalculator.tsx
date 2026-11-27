import { ChevronDown } from 'lucide-react';
import { useRef, useState } from 'react';
import FarmingNumber from './PassiveNumberField';
import { farmingCategories, farmingCrops, farmingFlowers, farmingMechanics, farmingSource } from '../data/farming';
import { levelForXp, xpAtLevel, xpTableSource } from '../data/xp-table';
import { calculateFarmingPlan } from '../farming-planner';

type PlotRow = { key: number; cropId: string; plots: string };
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const levels = Array.from({ length: xpTableSource.levelCap }, (_, index) => index + 1);
const cropsByCategory = farmingCategories.map((category) => ({
  ...category, crops: farmingCrops.filter((crop) => crop.category === category.id),
})).filter(({ crops }) => crops.length > 0);

export default function FarmingCalculator({ savedXp, inventory, formatDuration }: {
  savedXp?: number;
  inventory: Readonly<Record<string, number>>;
  formatDuration: (seconds: number) => string;
}) {
  const [rows, setRows] = useState<PlotRow[]>([{ key: 0, cropId: 'Potato', plots: '1' }]);
  const nextKey = useRef(1);
  const [xp, setXp] = useState<string>();
  const [mode, setMode] = useState<'level' | 'time'>('level');
  const [level, setLevel] = useState<number>();
  const [hours, setHours] = useState('24');
  const [bonus, setBonus] = useState('0');
  const [growth, setGrowth] = useState('0');
  const currentXp = Number(xp ?? savedXp ?? 0);
  const currentLevel = Number.isFinite(currentXp) && currentXp >= 0 ? levelForXp(currentXp) : 1;
  const targetLevel = level ?? Math.min(xpTableSource.levelCap, currentLevel + 1);
  const resolvedRows = rows.map((row) => ({ ...row, crop: farmingCrops.find(({ id }) => id === row.cropId) }));
  const plantings = resolvedRows.flatMap(({ crop, plots }) => crop ? [{ crop, plots: Number(plots) }] : []);
  const lockedCrops = plantings.filter(({ crop }) => crop.requiredLevel > currentLevel);
  const overLevelCapacity = cropsByCategory.flatMap(({ id, name, plotLevels }) => {
    const available = plotLevels.filter((required) => required <= currentLevel).length;
    const assigned = plantings.reduce((total, row) => total + (row.crop.category === id ? row.plots : 0), 0);
    return assigned > available && assigned <= plotLevels.length ? [{ name, available, assigned }] : [];
  });

  let plan: ReturnType<typeof calculateFarmingPlan> | undefined;
  let error: string | undefined;
  const pickingCrop = plantings.length !== rows.length;
  if (!pickingCrop) {
    try {
      plan = calculateFarmingPlan({
        plantings, currentXp, inventory,
        goal: mode === 'level' ? { targetXp: xpAtLevel(targetLevel) } : { seconds: Number(hours) * 3600 },
        xpBonusPercent: Number(bonus),
        growthTimePercent: Number(growth),
      });
    } catch (caught) {
      if (!(caught instanceof RangeError)) throw caught;
      error = caught.message;
    }
  }

  function updateRow(key: number, patch: Partial<Pick<PlotRow, 'cropId' | 'plots'>>) {
    setRows((current) => current.map((row) => row.key === key ? { ...row, ...patch } : row));
  }

  function addCrop() {
    const key = nextKey.current++;
    setRows((current) => [...current, { key, cropId: '', plots: '1' }]);
  }

  return <section className="calculator-grid" aria-label="Farming calculator">
    <div className="input-panel farming-setup">
      <div className="section-title-row"><h2>Farm setup</h2></div>
      <div className="target-mode">
        <button type="button" className={mode === 'level' ? 'selected' : ''} aria-pressed={mode === 'level'}
          onClick={() => setMode('level')}>Target level</button>
        <button type="button" className={mode === 'time' ? 'selected' : ''} aria-pressed={mode === 'time'}
          onClick={() => setMode('time')}>Time budget</button>
      </div>
      <div className="field-grid">
        <div>
          <FarmingNumber label="Current Farming XP" value={xp ?? savedXp ?? 0} onChange={setXp} />
          <span className="field-note">Level {currentLevel}{xp === undefined && savedXp !== undefined ? ' · from save' : ''}</span>
        </div>
        {mode === 'level' ? <label>
          <span className="field-label">Target Farming level</span>
          <span className="select-wrap farming-select target-select">
            <select value={targetLevel} onChange={(event) => setLevel(Number(event.target.value))}>
              {levels.map((value) => <option key={value} value={value}>Level {value}</option>)}
            </select>
            <ChevronDown size={15} aria-hidden="true" />
          </span>
        </label> : <FarmingNumber label="Elapsed hours" value={hours} onChange={setHours} />}
      </div>
      <div className="farming-crops">
        {resolvedRows.map(({ key, cropId, plots, crop }, index) => <fieldset key={key}>
          <legend>Crop {index + 1}</legend>
          <div className="farming-crop-fields">
            <label>
              <span className="field-label">Crop or compost</span>
              <span className="select-wrap farming-select target-select">
                <select value={cropId} onChange={(event) => updateRow(key, { cropId: event.target.value })}>
                  <option value="" disabled>Choose a crop</option>
                  {cropsByCategory.map(({ id, name, crops }) => <optgroup key={id} label={name}>
                    {crops.map(({ id, name, requiredLevel }) => <option key={id} value={id}>{name} · Lv. {requiredLevel}</option>)}
                  </optgroup>)}
                </select>
                <ChevronDown size={15} aria-hidden="true" />
              </span>
            </label>
            <FarmingNumber label="Parallel plots" value={plots} onChange={(value) => updateRow(key, { plots: value })} min={1} step={1} />
          </div>
          {crop && <p className="field-note">
            {crop.xp.toLocaleString('en-US')} base XP per harvest · {formatDuration(crop.growSeconds)} to grow
            {crop.regrows > 0 && ` · ${crop.regrows} regrowths at ${formatDuration(crop.regrowSeconds)} each`}
          </p>}
          {crop?.category === 'MillFarm' && <p className="field-note">Requires the Grain Mill purchase.</p>}
          {rows.length > 1 && <button type="button" className="secondary-button" aria-label={`Remove crop ${index + 1}`}
            onClick={() => setRows((current) => current.filter((row) => row.key !== key))}>Remove</button>}
        </fieldset>)}
      </div>
      <button type="button" className="secondary-button farming-add" onClick={addCrop}>Add crop</button>
      <details className="modifier-details">
        <summary>Manual growth and XP modifiers</summary>
        <div className="field-grid">
          <FarmingNumber label="Growth time change (%)" value={growth} onChange={setGrowth} min={-99.99} />
          <FarmingNumber label="Farming XP bonus (%)" value={bonus} onChange={setBonus} min={-99.99} />
        </div>
      </details>
      <details className="modifier-details">
        <summary>Flower bonuses</summary>
        <ul className="farming-flowers">
          {farmingFlowers.map(([id, name, required, seconds, seed, effect]) => <li key={id}>
            <strong>{name}</strong> · Lv. {required} · {formatDuration(seconds)} · 1× {seed} · {effect}
          </li>)}
        </ul>
      </details>
    </div>
    <div className="results-panel farming-results">
      <div className="section-title-row"><h2>Passive Farming estimate</h2></div>
      {error && <p className="farming-warning" role="alert">{error}</p>}
      {pickingCrop && <p>Choose a crop for each plot group.</p>}
      {lockedCrops.map(({ crop }, index) => <p key={`${crop.id}-${index}`} className="farming-warning">
        {crop.name} requires Farming level {crop.requiredLevel}. This estimate assumes it is unlocked.
      </p>)}
      {overLevelCapacity.map(({ name, available, assigned }) => <p key={name} className="farming-warning">
        {name} has {available} level-eligible plots at level {currentLevel}. This estimate uses {assigned}.
      </p>)}
      {plan && <>
        <div className="primary-result" aria-live="polite">
          <div className="result-label">{mode === 'level' ? 'ELAPSED TIME TO TARGET' : 'ELAPSED TIME BUDGET'}</div>
          <div className="action-count">{formatDuration(plan.elapsedSeconds)}</div>
          <p>{number.format(plan.xpGained)} Farming XP · Projected level {levelForXp(plan.projectedXp)}</p>
          {mode === 'level' && plan.elapsedSeconds === 0 && <p>Target level already reached.</p>}
        </div>
        <div className="farming-table">
          <table aria-label="Harvests during the plan">
            <thead><tr><th scope="col">Crop</th><th scope="col">First harvest</th><th scope="col">Harvests</th>
              <th scope="col">Base output</th><th scope="col">XP gained</th></tr></thead>
            <tbody>{plan.crops.map((row, index) => <tr key={rows[index].key}>
              <th scope="row">{row.crop.name}</th>
              <td>{formatDuration(row.firstHarvestSeconds)}</td>
              <td>{number.format(row.harvests)}</td>
              <td>{number.format(row.produced)} {row.crop.output.itemName}</td>
              <td>{number.format(row.xpGained)}</td>
            </tr>)}</tbody>
          </table>
        </div>
        {plan.resources.length > 0 && <div className="farming-table">
          <table aria-label="Planting supplies">
            <thead><tr><th scope="col">Planting supplies</th><th scope="col">Required</th>
              <th scope="col">Owned</th><th scope="col">Missing</th></tr></thead>
            <tbody>{plan.resources.map((resource) => <tr key={resource.itemId}>
              <th scope="row">{resource.itemName}</th>
              <td>{number.format(resource.required)}</td>
              <td>{number.format(resource.owned)}</td>
              <td>{number.format(resource.missing)}</td>
            </tr>)}</tbody>
          </table>
        </div>}
      </>}
      <details className="calculation-details" open>
        <summary>Estimate assumptions</summary>
        <p>Plots start empty and grow in parallel while you train other skills. The estimate assumes purchased plots and immediate harvesting and replanting. Actual elapsed time depends on when you harvest.</p>
        <p>Planting supplies cover crops harvested in this plan and compare against your starting bank. Harvest quantities use base yields at full protection.</p>
        <p>Active crop timers, Grain Mill processing, automation costs, and crop or equipment bonuses are outside this estimate. Enter known growth and XP bonuses manually.</p>
        <p className="combat-sources">
          <a href={farmingSource} target="_blank" rel="noreferrer">Crop data</a>
          <a href={farmingMechanics} target="_blank" rel="noreferrer">Farming mechanics</a>
        </p>
      </details>
    </div>
  </section>;
}
