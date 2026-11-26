import { ChevronDown } from 'lucide-react';
import { huntingTraps, type HuntingAction, type HuntingTrap } from '../data/hunting-animals';
import { traplessId, type HuntingSettings } from '../data/hunting';

const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

export function HuntingEquipment({ action, trap, settings, inventory, onUpdate }: {
  action: HuntingAction;
  trap: HuntingTrap | null;
  settings: HuntingSettings;
  inventory: Readonly<Record<string, number>>;
  onUpdate: (patch: HuntingSettings) => void;
}) {
  const { trapType, bait, trapless } = action.hunt;
  return <div className="field-grid progression-fields">
    <label>
      <span className="field-label">TRAP</span>
      <span className="select-wrap">
        <select value={trap?.itemId ?? traplessId} onChange={(event) => onUpdate({
          trapsByType: { ...settings.trapsByType, [trapType]: event.target.value },
        })}>
          {huntingTraps.filter(({ type }) => type === trapType).map(({ itemId, itemName }) =>
            <option key={itemId} value={itemId}>{itemName} ({number.format(inventory[itemId] ?? 0)} owned)</option>)}
          {trapless && <option value={traplessId}>Trapless · Lv. {trapless.level}</option>}
        </select>
        <ChevronDown size={16} aria-hidden="true" />
      </span>
      {trap && <span className="field-note">{number.format(trap.preservation * 100)}% preservation{trap.successPerFailure > 0
        ? ` · +${number.format(trap.successPerFailure * 100)} points to catch chance per miss` : ''}</span>}
      {!trap && trapless && <span className="field-note">Hunting level {trapless.level}{trapless.requirement && ` · ${trapless.requirement}`}</span>}
    </label>
    <label>
      <span className="field-label">BAIT</span>
      <span className="select-wrap">
        <select value={settings.useBait && bait ? 'bait' : 'none'} disabled={!bait}
          onChange={(event) => onUpdate({ useBait: event.target.value === 'bait' })}>
          <option value="none">No bait</option>
          {bait && <option value="bait">{bait.itemName} ({number.format(inventory[bait.itemId] ?? 0)} owned)</option>}
        </select>
        <ChevronDown size={16} aria-hidden="true" />
      </span>
      <span className="field-note">{bait ? 'Optional · 10% shorter trap interval' : 'This target has no preferred bait.'}</span>
    </label>
    <label>
      <span className="field-label">ANIMAL JOURNAL LEVEL</span>
      <span className="number-input-wrap"><input type="number" min="1" step="1" value={settings.journalLevels?.[action.id] ?? 1} onChange={(event) => {
        const level = Number(event.target.value);
        if (Number.isSafeInteger(level) && level >= 1) onUpdate({ journalLevels: { ...settings.journalLevels, [action.id]: level } });
      }} /><span>LEVEL</span></span>
      <span className="field-note">Journal level affects catch XP and yields.</span>
    </label>
  </div>;
}
