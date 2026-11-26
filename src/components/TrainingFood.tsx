import { ChevronDown } from 'lucide-react';
import { foodBudget, healingFoods } from '../data/food-budget';

export interface TrainingFoodSettings {
  foodId?: string;
  customFoodOwned?: number;
  healingOverride?: number;
  minimumHp?: number;
  damageAvoidance?: number;
}

type Inventory = Readonly<Record<string, number>>;
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const custom = 'custom';

function foodFromSettings(settings: TrainingFoodSettings, inventory: Inventory) {
  const id = settings.foodId ?? healingFoods[0].itemId;
  const item = healingFoods.find(({ itemId }) => itemId === id);
  return {
    id,
    owned: item ? inventory[item.itemId] ?? 0 : settings.customFoodOwned ?? 0,
    healing: settings.healingOverride ?? item?.healing ?? 0,
  };
}

export function TrainingFoodFields({ settings, inventory, onUpdate, onInventoryChange }: {
  settings: TrainingFoodSettings;
  inventory: Inventory;
  onUpdate: (patch: TrainingFoodSettings) => void;
  onInventoryChange: (id: string, quantity: number | undefined) => void;
}) {
  const food = foodFromSettings(settings, inventory);
  return <details className="modifier-details" open>
    <summary>Food and damage</summary>
    <label className="inventory-field">
      <span className="field-label">FOOD</span>
      <span className="select-wrap">
        <select value={food.id} onChange={(event) => onUpdate({ foodId: event.target.value, healingOverride: undefined })}>
          {healingFoods.map(({ itemId, name, healing }) => <option key={itemId} value={itemId}>
            {name} ({number.format(inventory[itemId] ?? 0)} owned · {number.format(healing)} HP)
          </option>)}
          <option value={custom}>Custom food</option>
        </select>
        <ChevronDown size={16} aria-hidden="true" />
      </span>
    </label>
    <div className="field-grid">
      <label>
        <span className="field-label">FOOD OWNED</span>
        <span className="number-input-wrap"><input type="number" min="0" step="1" value={food.owned} onChange={(event) => {
          const owned = Number(event.target.value);
          if (!Number.isSafeInteger(owned) || owned < 0) return;
          if (food.id === custom) onUpdate({ customFoodOwned: owned });
          else onInventoryChange(food.id, event.target.value === '' ? undefined : owned);
        }} /><span>ITEMS</span></span>
      </label>
      <label>
        <span className="field-label">HEALING PER FOOD</span>
        <span className="number-input-wrap"><input type="number" min="1" step="1" value={food.healing || ''} onChange={(event) => {
          const healing = Number(event.target.value);
          if (event.target.value === '') onUpdate({ healingOverride: undefined });
          else if (Number.isSafeInteger(healing) && healing > 0) onUpdate({ healingOverride: healing });
        }} /><span>HP</span></span>
      </label>
      <label>
        <span className="field-label">DAMAGE AVOIDANCE</span>
        <span className="number-input-wrap"><input type="number" min="0" max="100" step="0.1" value={settings.damageAvoidance ?? 0} onChange={(event) => {
          const chance = Number(event.target.value);
          if (Number.isFinite(chance)) onUpdate({ damageAvoidance: Math.min(100, Math.max(0, chance)) });
        }} /><span>%</span></span>
      </label>
      <label>
        <span className="field-label">MINIMUM HP BEFORE AN ATTEMPT</span>
        <span className="number-input-wrap"><input type="number" min="1" step="1" placeholder="Optional" value={settings.minimumHp ?? ''} onChange={(event) => {
          const hp = Number(event.target.value);
          if (event.target.value === '') onUpdate({ minimumHp: undefined });
          else if (Number.isSafeInteger(hp) && hp > 0) onUpdate({ minimumHp: hp });
        }} /><span>HP</span></span>
      </label>
    </div>
    <p className="modifier-disclaimer">Use the healing shown in game if your bonuses change it.</p>
  </details>;
}

export function TrainingDamageSummary({ plan, settings, inventory, skill }: {
  plan: { expectedAttempts: number; expectedFailures: number; expectedDamage: number; maxFailureHit: number };
  settings: TrainingFoodSettings;
  inventory: Inventory;
  skill: string;
}) {
  const food = foodFromSettings(settings, inventory);
  const budget = plan.expectedDamage === 0 ? { required: 0, missing: 0 }
    : food.healing > 0 ? foodBudget(plan.expectedDamage, food.healing, food.owned) : null;
  return <section className="resource-summary" aria-label={`${skill} damage and food budget`}>
    <div className="resource-summary-heading"><span>DAMAGE AND FOOD</span><strong>ESTIMATE</strong></div>
    <div className="resource-row">
      <span>Attempts to target</span>
      <span>{number.format(plan.expectedFailures)} expected failures</span>
      <strong>{number.format(plan.expectedAttempts)} expected</strong>
    </div>
    <div className="resource-row">
      <span>Damage</span>
      <span>{number.format(plan.maxFailureHit)} HP maximum hit</span>
      <strong>{number.format(plan.expectedDamage)} HP expected</strong>
    </div>
    {budget ? <div className="resource-row">
      <span>Food budget</span>
      <span>{number.format(budget.required)} estimated · {number.format(food.owned)} owned</span>
      <strong>{number.format(budget.missing)} missing</strong>
    </div> : <p>Enter the healing per food to estimate a quantity.</p>}
    {settings.minimumHp !== undefined && plan.maxFailureHit >= settings.minimumHp &&
      <p className="unlock-warning">A single failed attempt can deal at least the HP you entered.</p>}
    <p>Food costs use average damage and assume full healing per item. Actual use depends on damage rolls, regeneration, and overhealing.</p>
  </section>;
}
