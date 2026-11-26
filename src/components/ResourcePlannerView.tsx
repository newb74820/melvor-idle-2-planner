import { Boxes, ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import { resourceRecipesForCharacter } from '../data/resource-recipes';
import { levelForXp } from '../data/xp-table';
import { mergePlanningInventory, planResources, type Inventory, type PlanNode } from '../resource-planner';
import type { DecodedSave } from '../schemas/save';

const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

type PlannerProps = {
  save: DecodedSave | null;
  inventoryOverrides: Inventory;
  onInventoryOverride: (itemId: string, quantity: number | undefined) => void;
  formatDuration: (seconds: number) => string;
  refreshError: string | null;
};

function DependencyNode({ node, formatDuration, root = false }: { node: PlanNode; formatDuration: PlannerProps['formatDuration']; root?: boolean }) {
  const label = <>{number.format(node.quantity)} × {node.itemName}</>;
  const allocated = [
    ...(node.fromInventory ? [`${number.format(node.fromInventory)} from inventory`] : []),
    ...(node.fromProduction ? [`${number.format(node.fromProduction)} from earlier batches`] : []),
  ];
  if (!node.recipe || node.batches === undefined) {
    return <li>{label}{allocated.length > 0 && <small>{allocated.join(' · ')}</small>}
      {node.external > 0 && <small className="planner-warning">
        {number.format(node.external)} to source separately
        {node.reason === 'circular dependency' ? ' · circular dependency'
          : node.reason === 'chance-based source excluded' ? ' · enable estimated yields to include this source' : ' · no supported recipe'}
      </small>}
    </li>;
  }

  return <li><details open={root}>
    <summary>{label} <small>{node.recipe.kind === 'purchase' ? `${number.format(node.batches)} purchases · ${node.recipe.name}`
      : node.recipe.outputChance !== undefined ? `${number.format(node.batches)} estimated attempts · ${node.recipe.name}`
        : `${number.format(node.batches)} × ${node.recipe.name}`}</small></summary>
    <div className="planner-node-detail">
      <small>{node.recipe.skill} · {formatDuration(node.batches * node.recipe.intervalSeconds)}
        {allocated.length > 0 && ` · ${allocated.join(' · ')}`}
        {' · '}<a href={node.recipe.source} target="_blank" rel="noreferrer">Recipe data</a>
      </small>
      {node.recipe.hitTiming && <small>Base timing · {number.format(node.recipe.hitTiming.expectedHits)} expected hits per break, up to {node.recipe.hitTiming.maximumHits}.</small>}
      {node.recipe.outputChance !== undefined && <small>{number.format(node.recipe.outputChance * 100)}% yield chance per attempt.</small>}
      {node.recipe.currencyCosts?.map((cost) => <small key={cost.id}>{number.format(BigInt(cost.quantity) * BigInt(node.batches!))} {cost.name}</small>)}
      {node.children.length > 0 && <ul className="planner-tree">{node.children.map((child, index) => (
        <DependencyNode key={`${child.itemId}-${index}`} node={child} formatDuration={formatDuration} />
      ))}</ul>}
    </div>
  </details></li>;
}

export default function ResourcePlannerView({ save, inventoryOverrides, onInventoryOverride, formatDuration, refreshError }: PlannerProps) {
  const [targetId, setTargetId] = useState('NormalBow');
  const [quantity, setQuantity] = useState('10');
  const [useBank, setUseBank] = useState(true);
  const [useBonuses, setUseBonuses] = useState(true);
  const [allowEstimatedYields, setAllowEstimatedYields] = useState(false);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const recipes = useMemo(() => resourceRecipesForCharacter(save, useBonuses), [save, useBonuses]);
  const items = useMemo(() => [...new Map(recipes.flatMap(({ outputs }) => outputs.map((item) => [item.itemId, item] as const))).values()]
    .sort((a, b) => a.itemName.localeCompare(b.itemName)), [recipes]);
  const bank = save?.bank.items;
  const inventory = useMemo(() => mergePlanningInventory(bank, inventoryOverrides, useBank), [bank, inventoryOverrides, useBank]);
  const skillLevels = useMemo(() => Object.fromEntries((save?.skills ?? [])
    .map((skill) => [skill.name, skill.level ?? levelForXp(skill.xp)])), [save]);
  const currencyBalances = useMemo(() => {
    if (!useBank || !save) return undefined;
    return Object.fromEntries(Object.entries({ ...save.wallet, GoldPieces: save.gp })
      .filter(([, quantity]) => /^-?\d+$/.test(quantity))
      .map(([id, quantity]) => [id, quantity.startsWith('-') ? 0n : BigInt(quantity)]));
  }, [save, useBank]);
  const { plan, error } = useMemo(() => {
    const target = items.find(({ itemId }) => itemId === targetId);
    if (!target) return { error: 'Select an item to plan.' };
    try {
      return { plan: planResources({
        target: { ...target, quantity: Number(quantity) }, recipes, inventory, skillLevels, recipeChoices: choices,
        allowEstimatedYields, currencyBalances,
      }) };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'This plan could not be calculated.' };
    }
  }, [items, targetId, quantity, recipes, inventory, skillLevels, choices, allowEstimatedYields, currencyBalances]);

  const alternatives = plan?.items.flatMap((item) => {
    const sources = recipes.filter(({ outputs }) => outputs.some(({ itemId }) => itemId === item.itemId));
    return item.quantity > 0 && sources.length > 1 ? [{ item, sources }] : [];
  }) ?? [];

  return <div className="content-wrap">
    <section className="page-heading">
      <div className="heading-icon"><Boxes size={21} /></div>
      <div><h1>Resource planner</h1><p className="heading-subtitle">Set an item goal and see what to gather, craft, buy, or source separately.</p></div>
    </section>
    {refreshError && <p className="refresh-error" role="alert">{refreshError}</p>}
    <section className="calculator-grid" aria-label="Resource plan">
      <div className="input-panel planner-setup">
        <h2>Item goal</h2>
        <label>
          <span className="field-label">ITEM</span>
          <span className="select-wrap target-select"><select value={targetId} onChange={(event) => setTargetId(event.target.value)}>
            {items.map((item) => <option key={item.itemId} value={item.itemId}>{item.itemName}</option>)}
          </select><ChevronDown size={16} aria-hidden="true" /></span>
        </label>
        <label>
          <span className="field-label">TARGET TOTAL</span>
          <span className="number-input-wrap"><input type="number" value={quantity} min="1" step="1" onChange={(event) => setQuantity(event.target.value)} /><span>ITEMS</span></span>
        </label>
        <label className="planner-toggle"><input type="checkbox" checked={useBank} onChange={(event) => setUseBank(event.target.checked)} /> Use imported bank and wallet</label>
        <label className="planner-toggle"><input type="checkbox" checked={useBonuses} onChange={(event) => setUseBonuses(event.target.checked)} /> Apply supported character bonuses</label>
        <label className="planner-toggle"><input type="checkbox" checked={allowEstimatedYields} onChange={(event) => setAllowEstimatedYields(event.target.checked)} /> Allow estimated random yields</label>
        <p className="planner-note">{save ? `Bank source: ${save.name}` : 'No character imported. Enter stock in the resource checklist to use it in the plan.'}</p>
        {alternatives.map(({ item, sources }) => <label key={item.itemId}>
          <span className="field-label">SOURCE FOR {item.itemName.toUpperCase()}</span>
          <span className="select-wrap target-select"><select value={choices[item.itemId] ?? ''} onChange={(event) => setChoices((current) => ({ ...current, [item.itemId]: event.target.value }))}>
            <option value="">Automatic · prefer available sources</option>
            {sources.map((source) => <option key={source.id} value={source.id} disabled={source.outputChance !== undefined && !allowEstimatedYields}>
              {source.name} · {source.kind === 'purchase' ? 'Shop' : `${source.skill} level ${source.requiredLevel}`}{source.prerequisiteNote ? ' · check prerequisites' : ''}
            </option>)}
          </select><ChevronDown size={16} aria-hidden="true" /></span>
        </label>)}
      </div>
      <div className="results-panel planner-results">
        <h2>Dependency chain</h2>
        {error && <p className="planner-warning" role="alert">{error}</p>}
        {plan && <>
          <div className="primary-result">
            <div className="result-label">PROJECTED ACTIVE TIME</div>
            <strong>{formatDuration(plan.activeSeconds)}</strong>
            <p className="planner-note">Time covers modeled actions. Mining uses base rates. Unlocks, shopping time, and outside supplies are separate.</p>
          </div>
          {plan.hasEstimatedYields && <p className="planner-warning">Random yields use average odds. You may need more attempts or ingredients to reach the goal.</p>}
          {plan.currencies.length > 0 && <ul className="planner-skill-totals" aria-label="Purchase costs">{plan.currencies.map((cost) => <li key={cost.id}>
            {number.format(cost.amount)} {cost.name} required
            {cost.available === null ? ' · wallet balance unavailable' : ` · ${number.format(cost.available)} available`}
            {cost.shortage > 0n && <span className="planner-warning"> · {number.format(cost.shortage)} short</span>}
          </li>)}</ul>}
          {plan.external.length > 0 && <p className="planner-warning">Source separately: {plan.external.map((item) => `${number.format(item.external)} ${item.itemName}`).join(', ')}.</p>}
          {plan.prerequisites.length > 0 && <ul className="planner-warning">{plan.prerequisites.map((note) => <li key={note}>{note}</li>)}</ul>}
          {plan.steps.length === 0 && plan.external.length === 0 && <p className="planner-note">Available inventory covers this goal.</p>}
          <ul className="planner-tree"><DependencyNode key={targetId} node={plan.tree} formatDuration={formatDuration} root /></ul>
          {plan.skills.length > 0 && <details className="planner-skill-totals"><summary>Totals by skill</summary>
            <ul>{plan.skills.map((row) => <li key={row.skill}>{row.skill} · {number.format(row.batches)} actions · {number.format(row.xp)} XP · {formatDuration(row.seconds)}</li>)}</ul>
          </details>}
        </>}
      </div>
    </section>
    {plan && <section className="planner-checklist">
      <h2>Resource checklist</h2>
      <p className="planner-note">A blank override uses the bank quantity when enabled. Unallocated stock includes production surplus.</p>
      <div className="planner-table-wrap"><table className="planner-table">
        <thead><tr><th scope="col">Item</th><th scope="col">Needed</th><th scope="col">Available / override</th><th scope="col">Allocated</th><th scope="col">Produced</th><th scope="col">Source separately</th><th scope="col">Unallocated</th></tr></thead>
        <tbody>{plan.items.map((item) => <tr key={item.itemId}>
          <th scope="row">{item.itemName}</th>
          <td>{number.format(item.quantity)}</td>
          <td><input type="number" min="0" step="1" aria-label={`Available ${item.itemName} override`} placeholder={String(item.owned)}
            value={inventoryOverrides[item.itemId] ?? ''}
            onChange={(event) => {
              const value = event.target.valueAsNumber;
              if (event.target.value === '') onInventoryOverride(item.itemId, undefined);
              else if (Number.isSafeInteger(value) && value >= 0) onInventoryOverride(item.itemId, value);
            }} /></td>
          <td>{number.format(item.allocated)}</td><td>{item.expectedProduced > 0
            ? `${item.produced ? `${number.format(item.produced)} + ` : ''}${number.format(item.expectedProduced)} expected`
            : number.format(item.produced)}</td>
          <td className={item.external ? 'planner-warning' : undefined}>{number.format(item.external)}</td>
          <td>{number.format(item.remaining)}</td>
        </tr>)}</tbody>
      </table></div>
    </section>}
  </div>;
}
