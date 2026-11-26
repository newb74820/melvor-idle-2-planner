import { invoke, isTauri } from '@tauri-apps/api/core';
import { Activity, BookOpen, Boxes, ChartNoAxesCombined, ChevronDown, CircleHelp, Cog, Fish, Flame, FolderOpen, Leaf, ListChecks, Pickaxe, RefreshCw, Search, ShieldCheck, Sparkles, TreePine, UserRound } from 'lucide-react';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { calculateActionPlan } from './calculator';
import SaveImportDialog from './components/SaveImportDialog';
import SkillDashboard from './components/SkillDashboard';
import { expectedExtraProducts, skillCalculators, type CalculatorSkill } from './data/skill-calculators';
import { resolveWoodcuttingRates } from './data/woodcutting-modifiers';
import { estimateWoodcuttingDrops } from './data/woodcutting-drops';
import { equippedWoodcuttingPotion, estimateOvergrowth } from './data/woodcutting-temporary';
import { woodcuttingMasterySource } from './data/woodcutting-mastery';
import { mergePlanningInventory } from './resource-planner';
import { findSkillId, skillGroups, skillProgress, type SkillId } from './data/skills';
import { levelForXp, xpAtLevel, xpAtLevelTable, xpTableSource } from './data/xp-table';
import type { DecodedSave, LoadedSave, SaveDirectoryPreference } from './schemas/save';

const ResourcePlannerView = lazy(() => import('./components/ResourcePlannerView'));

const navigation = [
  { label: 'Dashboard', icon: Activity, active: true },
  { label: 'Skill calculator', icon: ChartNoAxesCombined, active: true },
  { label: 'Action comparison', icon: ListChecks, disabled: true },
  { label: 'Resource planner', icon: Boxes, active: true },
  { label: 'Progression plans', icon: BookOpen, disabled: true },
  { label: 'Character profiles', icon: UserRound, disabled: true },
  { label: 'Game database', icon: Search, disabled: true },
  { label: 'Settings', icon: Cog },
];

const numberFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const chanceFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 });
const saveLocationKey = 'melvor-idle-2-planner.save-location';
const autoRefreshKey = 'melvor-idle-2-planner.auto-refresh';
const autoRefreshIntervalMs = 5 * 60 * 1000;

function readSaveLocation(): SaveDirectoryPreference | null {
  try {
    const stored = localStorage.getItem(saveLocationKey);
    if (!stored) return null;
    const value = JSON.parse(stored) as Partial<SaveDirectoryPreference>;
    if (typeof value.directory !== 'string' || typeof value.fileName !== 'string') return null;
    return { directory: value.directory, fileName: value.fileName };
  } catch {
    return null;
  }
}

function errorText(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  return 'The selected save could not be refreshed.';
}

function readAutoRefreshPreference(): boolean {
  try {
    return localStorage.getItem(autoRefreshKey) === 'true';
  } catch {
    return false;
  }
}

function formatDuration(totalSeconds: number): string {
  if (totalSeconds === 0) return '0 seconds';
  const units = [
    ['d', 86400],
    ['h', 3600],
    ['m', 60],
  ] as const;
  let remainder = Math.round(totalSeconds * 100) / 100;
  const parts: string[] = [];

  for (const [label, unitSeconds] of units) {
    const amount = Math.floor(remainder / unitSeconds);
    if (amount > 0) parts.push(`${amount}${label}`);
    remainder %= unitSeconds;
  }
  if (remainder > 0 || parts.length === 0) parts.push(`${numberFormat.format(remainder)}s`);
  return parts.join(' ');
}

type TrainingSetup = {
  actionId?: string;
  xpOverride?: number;
  targetMode?: 'level' | 'xp';
  targetLevel?: number;
  targetXp?: number;
  flatBonus?: number;
  xpBonus?: number;
  doublingBonus?: number;
};

function hasCalculator(skill: SkillId): skill is CalculatorSkill {
  return Object.hasOwn(skillCalculators, skill);
}

function formatExpectedQuantity(quantity: number) {
  return quantity > 0 && quantity < 0.01 ? '<0.01' : numberFormat.format(quantity);
}

function App() {
  const [training, setTraining] = useState<Partial<Record<CalculatorSkill, TrainingSetup>>>({});
  const [useImportedBonuses, setUseImportedBonuses] = useState(true);
  const [inventoryOverrides, setInventoryOverrides] = useState<Record<string, number>>({});
  const [overgrowthByBush, setOvergrowthByBush] = useState<Record<string, number>>({});
  const [saveImportOpen, setSaveImportOpen] = useState(false);
  const [saveLocation, setSaveLocation] = useState<SaveDirectoryPreference | null>(readSaveLocation);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(readAutoRefreshPreference);
  const [activeView, setActiveView] = useState<'dashboard' | 'calculator' | 'resources' | 'settings'>('dashboard');
  const [selectedSkill, setSelectedSkill] = useState<SkillId>('Woodcutting');
  const [importedSave, setImportedSave] = useState<DecodedSave | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [refreshingSave, setRefreshingSave] = useState(false);
  const refreshInProgress = useRef(false);
  const selectedProgress = skillProgress(importedSave?.skills ?? [], selectedSkill);
  const calculatorSkill = hasCalculator(selectedSkill) ? selectedSkill : 'Woodcutting';
  const calculator = skillCalculators[calculatorSkill];
  const setup = training[calculatorSkill] ?? {};
  const action = calculator.actions.find((item) => item.id === setup.actionId) ?? calculator.actions[0];
  const woodcutting = 'category' in action ? action : null;
  const fishing = 'minSeconds' in action ? action : null;
  const mining = 'hitTiming' in action ? action : null;
  const firemaking = 'drops' in action ? action : null;
  const ActionIcon = firemaking ? Flame : fishing ? Fish : mining ? Pickaxe : TreePine;
  const rates = woodcutting ? resolveWoodcuttingRates(woodcutting, importedSave, useImportedBonuses) : null;
  const { importedBonuses, deedree, shopBonuses, mastery, healthReduction = 0, activeEffects = [], bushOutputBonus = 0 } = rates ?? {};
  const currentXp = setup.xpOverride ?? selectedProgress?.xp ?? 0;
  const targetMode = setup.targetMode ?? 'level';
  const flatBonus = Math.max(-action.baseXp + 0.1, setup.flatBonus ?? 0);
  const percentageBonus = setup.xpBonus ?? 0;
  const totalPercentageBonus = (rates?.xpPercentage ?? 0) + percentageBonus;
  const doublingPercentage = rates?.doublingPercentage ?? setup.doublingBonus ?? 0;
  const effectiveInterval = rates?.intervalSeconds ?? action.intervalSeconds;
  const primaryQuantityBonus = rates?.primaryQuantityBonus ?? 0;
  const timingEstimated = !!(fishing || mining || effectiveInterval !== action.intervalSeconds);
  const primaryProduct = action.outputs[0];
  const planningInventory = useMemo(() => mergePlanningInventory(importedSave?.bank.items, inventoryOverrides), [importedSave, inventoryOverrides]);
  const currentLevel = levelForXp(currentXp);
  const atLevelCap = currentLevel === xpTableSource.levelCap;
  const nextLevel = Math.min(currentLevel + 1, xpTableSource.levelCap);
  const targetLevel = Math.max(nextLevel, setup.targetLevel ?? nextLevel);
  const targetXpInput = setup.targetXp ?? xpAtLevel(nextLevel);
  const targetXp = targetMode === 'level' ? Math.max(currentXp, xpAtLevel(targetLevel)) : targetXpInput;
  const actionLocked = currentLevel < action.requiredLevel;
  const progressPercent = targetXp === 0 ? 100 : Math.min(100, Math.max(0, (currentXp / targetXp) * 100));
  const extraProducts = useMemo(() => expectedExtraProducts(action), [action]);
  const randomProducts = !!fishing || doublingPercentage > 0;
  const plan = useMemo(() => calculateActionPlan({
    action: {
      ...action,
      outputs: [
        ...action.outputs.map((product, index) => ({
          ...product, quantity: product.quantity + (index === 0 ? primaryQuantityBonus : 0),
        })),
        ...extraProducts,
      ],
    },
    currentXp,
    targetXp,
    flatXpBonus: flatBonus,
    percentageXpBonus: totalPercentageBonus / 100,
    outputDoublingChance: doublingPercentage / 100,
    effectiveIntervalSeconds: effectiveInterval,
    inventory: planningInventory,
  }), [action, currentXp, flatBonus, totalPercentageBonus, doublingPercentage, effectiveInterval, planningInventory, primaryQuantityBonus, extraProducts, targetXp]);
  const potion = woodcutting ? equippedWoodcuttingPotion(importedSave) : null;
  const overgrowthStacks = overgrowthByBush[action.id] ?? 0;
  const overgrowth = woodcutting ? estimateOvergrowth(woodcutting, plan.actions, overgrowthStacks, doublingPercentage) : null;
  const primaryResult = primaryProduct ? plan.products[0] : undefined;
  const prayerPointsPerBurn = firemaking?.prayerPoints ?? 0;
  const prayerPointsEarned = plan.actions * prayerPointsPerBurn * (1 + doublingPercentage / 100);
  const prayerPointsOwned = importedSave ? BigInt(importedSave.wallet.PrayerPoints ?? '0') : null;
  const primaryOutput = (primaryResult?.produced ?? 0) + (overgrowth?.expectedExtraPrimary ?? 0);
  const secondaryDrops = woodcutting && rates ? estimateWoodcuttingDrops(woodcutting, plan.actions, effectiveInterval, {
    birdNestChancePercent: rates.birdNestChancePercent,
    eagleNestChancePercent: rates.eagleNestChancePercent,
    onCutChancePercent: rates.onCutChancePercent,
    outputDoublingPercent: doublingPercentage,
    nestQuantityBonus: rates.nestQuantityBonus,
    overgrowthCuts: overgrowth?.boostedCuts,
  }) : [];

  function updateInventoryOverride(itemId: string, quantity: number | undefined) {
    setInventoryOverrides((current) => {
      const next = { ...current };
      if (quantity === undefined) delete next[itemId];
      else next[itemId] = quantity;
      return next;
    });
  }

  function updateCurrentXp(xp: number) {
    if (!Number.isFinite(xp) || xp < 0) return;
    updateTraining(calculatorSkill, {
      xpOverride: xp,
      targetLevel: setup.targetLevel && setup.targetLevel > levelForXp(xp) ? setup.targetLevel : undefined,
    });
  }

  function updateTraining(skill: CalculatorSkill, values: TrainingSetup) {
    setTraining((current) => ({ ...current, [skill]: { ...current[skill], ...values } }));
  }

  function loadCharacter(save: DecodedSave) {
    setImportedSave(save);
    setTraining((current) => {
      const next = { ...current };
      for (const skill of Object.keys(next) as CalculatorSkill[]) {
        const progress = skillProgress(save.skills, skill);
        const setup = current[skill];
        if (progress) next[skill] = {
          ...setup,
          xpOverride: undefined,
          targetLevel: setup?.targetLevel && setup.targetLevel > levelForXp(progress.xp) ? setup.targetLevel : undefined,
        };
      }
      return next;
    });
  }

  function openSkill(id: SkillId) {
    if (hasCalculator(id) && skillProgress(importedSave?.skills ?? [], id)) {
      updateTraining(id, { xpOverride: undefined });
    }
    setSelectedSkill(id);
    setActiveView('calculator');
  }

  function updateSaveLocation(location: SaveDirectoryPreference) {
    setSaveLocation(location);
    try {
      localStorage.setItem(saveLocationKey, JSON.stringify(location));
    } catch {
      setRefreshError('The save directory could not be stored on this device.');
    }
  }

  async function refreshSelectedSave(automatic = false) {
    if (!saveLocation?.directory || !saveLocation.fileName || !isTauri() || refreshInProgress.current) return;
    refreshInProgress.current = true;
    setRefreshingSave(true);
    if (!automatic) setRefreshError(null);
    try {
      const loaded = await invoke<LoadedSave>('load_save_from_directory', {
        directory: saveLocation.directory,
        fileName: saveLocation.fileName,
      });
      loadCharacter(loaded.save);
      setRefreshError(null);
    } catch (error) {
      setRefreshError(errorText(error));
    } finally {
      refreshInProgress.current = false;
      setRefreshingSave(false);
    }
  }

  function updateAutoRefresh(enabled: boolean) {
    setAutoRefreshEnabled(enabled);
    setRefreshError(null);
    try {
      localStorage.setItem(autoRefreshKey, String(enabled));
    } catch {
      setRefreshError('The auto-refresh preference could not be stored on this device.');
    }
  }

  useEffect(() => {
    if (!autoRefreshEnabled || !saveLocation?.directory || !saveLocation.fileName || !isTauri()) return undefined;
    void refreshSelectedSave(true);
    const timerId = window.setInterval(() => {
      void refreshSelectedSave(true);
    }, autoRefreshIntervalMs);
    return () => window.clearInterval(timerId);
  }, [autoRefreshEnabled, saveLocation?.directory, saveLocation?.fileName]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#dashboard" aria-label="Melvor Idle 2 Planner home" onClick={(event) => {
          event.preventDefault();
          setActiveView('dashboard');
        }}>
          <span className="brand-mark"><TreePine size={20} strokeWidth={2.2} /></span>
          <span className="brand-copy"><strong>WOOD & WIT</strong><small>MELVOR II PLANNER</small></span>
        </a>
        <div className="sidebar-section-label">WORKSPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          {navigation.map(({ label, icon: Icon, active, disabled }) => {
            const view = label === 'Dashboard' ? 'dashboard' : label === 'Settings' ? 'settings' : label === 'Resource planner' ? 'resources' : 'calculator';
            const selected = activeView === view && (active || label === 'Settings');
            return (
            <a
              key={label}
              className={`nav-link${selected ? ' active' : ''}${disabled ? ' disabled' : ''}`}
              href={disabled ? undefined : `#${view}`}
              aria-current={selected ? 'page' : undefined}
              aria-disabled={disabled || undefined}
              aria-label={label}
              title={disabled ? `${label} is not implemented yet` : undefined}
              onClick={(event) => {
                if (disabled) return;
                event.preventDefault();
                setActiveView(view);
              }}
            >
              <Icon size={17} strokeWidth={1.8} />
              <span>{label}</span>
              {selected && <span className="nav-indicator" />}
            </a>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-badge"><ShieldCheck size={15} /><span>LOCAL ONLY</span></div>
          <p>Character saves stay on this device.</p>
          <span className="build-label">PLANNER BUILD 0.1.0</span>
        </div>
      </aside>

      <main className="main-area" id={activeView}>
        <header className="topbar">
          <div className="breadcrumbs"><span>PLANNER</span><span className="crumb-slash">/</span><strong>{activeView === 'dashboard' ? 'DASHBOARD' : activeView === 'settings' ? 'SETTINGS' : activeView === 'resources' ? 'RESOURCE PLANNER' : 'SKILL CALCULATOR'}</strong></div>
          <div className="topbar-actions">
            <span className="data-status"><span className="status-dot" /> DATASET BUILD 26724394</span>
            {importedSave && <span className="save-location-label" title={importedSave.name}>{importedSave.name}</span>}
            <button className="icon-button" type="button" title="Choose save directory or import a save" aria-label="Choose save directory or import a save" onClick={() => setSaveImportOpen(true)}><FolderOpen size={17} /></button>
            <button className="icon-button" type="button" title={saveLocation?.fileName ? `Refresh ${saveLocation.fileName}` : 'Choose a save directory and file first'} aria-label="Refresh selected save" disabled={!isTauri() || !saveLocation?.fileName || refreshingSave} onClick={() => void refreshSelectedSave()}>
              <RefreshCw className={refreshingSave ? 'spinning' : ''} size={16} />
            </button>
          </div>
        </header>

        {activeView === 'dashboard' ? <SkillDashboard
          save={importedSave}
          onImport={() => setSaveImportOpen(true)}
          onSelect={openSkill}
          refreshError={refreshError}
        /> : activeView === 'settings' ? <div className="content-wrap settings-view">
          <section className="page-heading">
            <div className="heading-icon"><Cog size={21} /></div>
            <div><p className="eyebrow">LOCAL PREFERENCES</p><h1>Settings</h1><p className="heading-subtitle">Control how this planner reads your character save.</p></div>
          </section>
          <section className="settings-section" aria-labelledby="save-refresh-title">
            <div className="settings-section-heading"><span className="section-kicker">SAVE SYNC</span><h2 id="save-refresh-title">Character save</h2></div>
            <label className="setting-row" htmlFor="auto-refresh-save">
              <span className="setting-copy"><strong>Automatically refresh selected save</strong><small>Re-read the selected file and update imported character data while the app is open.</small></span>
              <input id="auto-refresh-save" className="setting-checkbox" type="checkbox" checked={autoRefreshEnabled} onChange={(event) => updateAutoRefresh(event.target.checked)} />
            </label>
            <div className="setting-detail"><span>INTERVAL</span><strong>Every 5 minutes</strong></div>
            <div className="setting-detail"><span>SELECTED FILE</span><strong>{saveLocation?.fileName || 'No save selected'}</strong></div>
            <div className="setting-detail"><span>DIRECTORY</span><strong className="setting-path">{saveLocation?.directory || 'Choose a save directory from the import button'}</strong></div>
            {autoRefreshEnabled && (!saveLocation?.directory || !saveLocation.fileName) && <p className="setting-hint">Select a save file before automatic refresh can start.</p>}
          </section>
          <p className="settings-privacy">The preference and selected path are stored on this device. Save data is only reread locally and is never uploaded.</p>
        </div> : activeView === 'resources' ? <Suspense fallback={<p className="content-wrap" role="status">Loading resource planner…</p>}>
          <ResourcePlannerView
            save={importedSave}
            inventoryOverrides={inventoryOverrides}
            onInventoryOverride={updateInventoryOverride}
            formatDuration={formatDuration}
            refreshError={refreshError}
          />
        </Suspense> : <div className="content-wrap">
          <section className="page-heading">
            <div className="heading-icon"><ChartNoAxesCombined size={21} /></div>
            <div>
              <h1>Skill calculator</h1>
            </div>
            <label className="calculator-skill-picker">
              <span className="field-label">SKILL</span>
              <span className="select-wrap target-select">
                <select value={selectedSkill} onChange={(event) => {
                  const skill = findSkillId(event.target.value);
                  if (skill) setSelectedSkill(skill);
                }}>
                  {skillGroups.map(({ name, skills }) => <optgroup label={name} key={name}>
                    {skills.map((skill) => <option key={skill} value={skill}>{skill}{hasCalculator(skill) ? '' : ' (planned)'}</option>)}
                  </optgroup>)}
                </select>
                <ChevronDown size={16} aria-hidden="true" />
              </span>
            </label>
          </section>
          {refreshError && <p className="refresh-error" role="alert">{refreshError}</p>}

          {hasCalculator(selectedSkill) ? <>
          <section className="calculator-grid" aria-label={`${selectedSkill} calculator`}>
            <div className="input-panel">
              <div className="section-title-row">
                <div><span className="section-kicker">01 / TRAINING SETUP</span><h2>Choose your route</h2></div>
                <button className="text-icon-button" type="button" title="Calculation assumptions" aria-label="Calculation assumptions"><CircleHelp size={17} /></button>
              </div>

              <label className="field-label" htmlFor="action-select">{calculator.actionLabel.toUpperCase()}</label>
              <div className="select-wrap">
                <select id="action-select" value={action.id} onChange={(event) => updateTraining(calculatorSkill, { actionId: event.target.value })}>
                  {calculator.actions.map((item) => (
                    <option key={item.id} value={item.id}>Lv. {item.requiredLevel} · {item.name} — {item.baseXp} XP / {numberFormat.format(item.intervalSeconds)}s{'hitTiming' in item || 'minSeconds' in item ? ' avg' : ''}</option>
                  ))}
                </select>
                <ChevronDown size={16} aria-hidden="true" />
              </div>
              <div className="action-summary">
                <div className="action-emblem"><ActionIcon size={20} /></div>
                <div className="action-copy"><strong>{action.name}</strong><span>{firemaking
                  ? `Uses ${firemaking.inputs.map(({ itemName, quantity }) => `${quantity}× ${itemName}`).join(', ')} per burn`
                  : fishing ? `${fishing.minSeconds}–${fishing.maxSeconds}s per cast. Every cast awards XP.`
                    : `Produces ${primaryProduct.quantity}× ${primaryProduct.itemName} per ${calculator.actionUnit}`}</span></div>
                <span className={`level-chip${actionLocked || action.prerequisiteNote ? ' locked' : ''}`}>{actionLocked ? 'LOCKED' : action.prerequisiteNote ? 'CHECK REQUIREMENTS' : 'UNLOCKED'} · LV {action.requiredLevel}</span>
              </div>
              {actionLocked && <p className="unlock-warning">This action requires level {action.requiredLevel}. The estimate assumes you unlock it first.</p>}
              {action.prerequisiteNote && <p className="unlock-warning">{action.prerequisiteNote} Check your progress in-game before using this estimate.</p>}
              {mining && <p className="field-note">{chanceFormat.format(mining.breakChance * 100)}% break chance per {mining.hitTiming.secondsPerHit}s hit · {mining.hitTiming.maximumHits} hits maximum</p>}

              <div className="target-mode" role="group" aria-label="Target mode">
                <button type="button" className={targetMode === 'level' ? 'selected' : ''} aria-pressed={targetMode === 'level'} onClick={() => updateTraining(calculatorSkill, { targetMode: 'level' })}>Target level</button>
                <button type="button" className={targetMode === 'xp' ? 'selected' : ''} aria-pressed={targetMode === 'xp'} onClick={() => updateTraining(calculatorSkill, { targetMode: 'xp' })}>Exact target XP</button>
              </div>
              <div className="field-grid progression-fields">
                <label>
                  <span className="field-label">CURRENT XP</span>
                  <span className="number-input-wrap"><input type="number" min="0" step="any" value={currentXp} onChange={(event) => updateCurrentXp(Number(event.target.value))} /><span>XP</span></span>
                  <span className="field-note">LEVEL {currentLevel} · EXACT TOTAL</span>
                </label>
                <label>
                  {targetMode === 'level' ? <>
                    <span className="field-label">TARGET LEVEL</span>
                    <span className="select-wrap target-select">
                      <select value={targetLevel} disabled={atLevelCap} onChange={(event) => updateTraining(calculatorSkill, { targetLevel: Number(event.target.value) })}>
                        {atLevelCap ? <option value={targetLevel}>Level {targetLevel} (maximum)</option> : xpAtLevelTable.slice(currentLevel, xpTableSource.levelCap).map((_, index) => {
                          const level = nextLevel + index;
                          return <option key={level} value={level}>Level {level} · {numberFormat.format(xpAtLevel(level))} XP</option>;
                        })}
                      </select>
                      <ChevronDown size={16} aria-hidden="true" />
                    </span>
                  </> : <>
                    <span className="field-label">TARGET TOTAL XP</span>
                    <span className="number-input-wrap"><input type="number" min="0" step="1" value={targetXpInput} onChange={(event) => {
                      const xp = Number(event.target.value);
                      if (Number.isFinite(xp) && xp >= 0) updateTraining(calculatorSkill, { targetXp: xp });
                    }} /><span>XP</span></span>
                  </>}
                  <span className="field-note">{numberFormat.format(targetXp)} XP total</span>
                </label>
              </div>

              {[...action.inputs, ...action.outputs, ...extraProducts].map((product) => <label className="inventory-field" key={product.itemId}>
                <span className="field-label">{product.itemName.toUpperCase()} OWNED</span>
                <span className="number-input-wrap"><input
                  type="number"
                  min="0"
                  step="1"
                  value={planningInventory[product.itemId] ?? 0}
                  onChange={(event) => {
                    const quantity = event.target.valueAsNumber;
                    if (event.target.value === '') updateInventoryOverride(product.itemId, undefined);
                    else if (Number.isSafeInteger(quantity) && quantity >= 0) updateInventoryOverride(product.itemId, quantity);
                  }}
                /><span>ITEMS</span></span>
                <span className="field-note">{inventoryOverrides[product.itemId] === undefined && importedSave ? 'IMPORTED BANK QUANTITY' : 'MANUAL PLANNING QUANTITY'}</span>
              </label>)}

              <details className="modifier-details" open>
                <summary><Sparkles size={15} /><span>Modifiers</span></summary>
                {woodcutting && importedSave && <div className="modifier-disclaimer">
                  <label><input type="checkbox" checked={useImportedBonuses} onChange={(event) => setUseImportedBonuses(event.target.checked)} /> Apply imported bonuses</label>
                  {(importedBonuses?.length || deedree?.nodeBonuses.length || deedree?.hasWeakSpotBonus || activeEffects.length || healthReduction || bushOutputBonus) ? <ul>
                    {importedBonuses?.map((bonus) => <li key={bonus.item}><a href={bonus.source} target="_blank" rel="noreferrer">{bonus.name}</a> +{bonus.percentage}% XP</li>)}
                    {deedree?.nodeBonuses.map(({ node, percentage, effect }) => <li key={node}><a href={`https://db.melvor.aevv.net/astrology-node/Deedree${node}`} target="_blank" rel="noreferrer">Astrology · Deedree {node}</a> +{percentage}% {effect}</li>)}
                    {deedree?.hasWeakSpotBonus && <li><a href="https://db.melvor.aevv.net/astrology-node/DeedreeMajor2" target="_blank" rel="noreferrer">Astrology · Deedree Major 2</a> +4% weak-spot chance on trees</li>}
                    {activeEffects.map((bonus) => {
                      const source = 'id' in bonus ? `https://db.melvor.aevv.net/shop-purchase/${bonus.id}` : bonus.source;
                      const scope = bonus.effect === 'double damage chance' || bonus.effect === 'instant cut chance' ? ' on trees and bushes' : '';
                      return <li key={`${source}-${bonus.effect}`}><a href={source} target="_blank" rel="noreferrer">{'id' in bonus ? 'Shop' : 'Equipment'} · {bonus.name}</a> +{bonus.percentage}% {bonus.effect}{scope}</li>;
                    })}
                    {bushOutputBonus > 0 && <li><a href="https://db.melvor.aevv.net/item/BushyAxe" target="_blank" rel="noreferrer">Equipment · Bushy Axe</a> +{bushOutputBonus} base primary item from bushes</li>}
                    {healthReduction > 0 && <li><a href="https://db.melvor.aevv.net/shop-purchase/IronsteelAxeHeadCoating" target="_blank" rel="noreferrer">Shop · Ironsteel Axe Head Coating</a> −{healthReduction} maximum HP for this tree</li>}
                  </ul> : <p>No supported bonuses found in the decoded sources.</p>}
                  {(importedBonuses === null || deedree === null || shopBonuses === null) && <p>Some bonus data is unavailable. Reread the original save with the current desktop app.</p>}
                  {mastery ? <div>
                    <p><a href={woodcuttingMasterySource} target="_blank" rel="noreferrer">Mastery Guild · {mastery.rank.name}</a> · {mastery.confirmedPoints}{mastery.possiblePoints > mastery.confirmedPoints ? `–${mastery.possiblePoints}` : ''} / {mastery.totalPoints} points.</p>
                    {mastery.nextRank && <p>{mastery.nextRank.name} unlocks at {mastery.nextRank.threshold} points.</p>}
                    {mastery.possibleRank !== mastery.rank && <p>Incomplete save data permits a rank as high as {mastery.possibleRank.name}. Calculations use confirmed bonuses.</p>}
                    {mastery.xpPercentage > 0 && <p>+{mastery.xpPercentage}% Woodcutting XP</p>}
                    {mastery.doubleDamagePercentage > 0 && <p>+{mastery.doubleDamagePercentage}% double damage chance on trees and bushes</p>}
                    {mastery.healthReductionPercentage > 0 && <p>−{mastery.healthReductionPercentage}% maximum HP on trees and bushes</p>}
                    {mastery.nestQuantityBonus > 0 && <p>Bird Nest and Eagle Nest drops each grant {mastery.nestQuantityBonus} extra nest.</p>}
                  </div> : <p>Mastery Guild rank unavailable. Refresh or reimport a supported save.</p>}
                </div>}
                <div className="field-grid modifier-fields">
                  <label>
                    <span className="field-label">FLAT XP / ACTION</span>
                    <span className="number-input-wrap"><input type="number" min={-action.baseXp + 0.1} step="0.1" value={flatBonus} onChange={(event) => {
                      const bonus = Number(event.target.value);
                      if (Number.isFinite(bonus)) updateTraining(calculatorSkill, { flatBonus: Math.max(-action.baseXp + 0.1, bonus) });
                    }} /><span>XP</span></span>
                  </label>
                  <label>
                    <span className="field-label">ADDITIONAL XP BONUS</span>
                    <span className="number-input-wrap"><input type="number" min="-99.9" step="0.1" value={percentageBonus} onChange={(event) => {
                      const bonus = Number(event.target.value);
                      if (Number.isFinite(bonus)) updateTraining(calculatorSkill, { xpBonus: Math.max(-99.9, bonus) });
                    }} /><span>%</span></span>
                  </label>
                  {!woodcutting && <label>
                    <span className="field-label">OUTPUT DOUBLING CHANCE</span>
                    <span className="number-input-wrap"><input type="number" min="0" max="100" step="0.1" value={doublingPercentage} onChange={(event) => {
                      const bonus = Number(event.target.value);
                      if (Number.isFinite(bonus)) updateTraining(calculatorSkill, { doublingBonus: Math.min(100, Math.max(0, bonus)) });
                    }} /><span>%</span></span>
                  </label>}
                </div>
                <p className="modifier-disclaimer">{woodcutting
                  ? 'Manual XP bonuses add to enabled imported XP bonuses.'
                  : 'XP and output doubling use the manual bonuses above. Timing and drop chances use base recipe rates.'}</p>
                {potion && <p className="modifier-disclaimer"><a href={potion.source} target="_blank" rel="noreferrer">{potion.name}</a> is equipped. Potion effects are outside this estimate until remaining uses can be verified.</p>}
                {woodcutting?.category === 'bush' && <label className="inventory-field">
                  <span className="field-label">OVERGROWTH STACKS ON THIS BUSH</span>
                  <span className="number-input-wrap"><input
                    type="number"
                    value={overgrowthStacks}
                    min="0"
                    step="1"
                    onChange={(event) => {
                      const stacks = Number(event.target.value);
                      if (Number.isSafeInteger(stacks) && stacks >= 0) {
                        setOvergrowthByBush((current) => ({ ...current, [action.id]: stacks }));
                      }
                    }}
                  /><span>STACKS</span></span>
                  <span className="field-note">Enter the in-game count. Each cut spends one stack.</span>
                </label>}
              </details>
            </div>

            <div className="results-panel" aria-live="polite">
              <div className="section-title-row results-heading">
                <div><span className="section-kicker">02 / ESTIMATE</span><h2>Your training plan</h2></div>
                <span className="estimate-pill">DETERMINISTIC XP</span>
              </div>
              <div className="primary-result">
                <div className="result-label">{calculator.actionPlural.toUpperCase()} TO TARGET</div>
                <div className="action-count">{numberFormat.format(plan.actions)}<span>{plan.actions === 1 ? calculator.actionUnit : calculator.actionPlural}</span></div>
                <div className="progress-track" role="img" aria-label={`${numberFormat.format(progressPercent)} percent of target XP reached`}><span style={{ width: `${progressPercent}%` }} /></div>
                <div className="progress-caption"><span>{numberFormat.format(plan.remainingXp)} XP remaining</span><span>{numberFormat.format(plan.xpOvershoot)} XP overflow</span></div>
              </div>
              <div className="result-metrics">
                <div className="metric"><span className="metric-icon time"><Activity size={16} /></span><span className="metric-label">{timingEstimated ? 'EXPECTED ACTIVE TIME' : 'BASE ACTIVE TIME'}</span><strong>{formatDuration(plan.trainingSeconds)}</strong><small>{numberFormat.format(effectiveInterval)}s per {calculator.actionUnit}{timingEstimated ? ' on average' : ''}</small></div>
                <div className="metric"><span className="metric-icon xp"><Sparkles size={16} /></span><span className="metric-label">EFFECTIVE XP</span><strong>{numberFormat.format(plan.effectiveXpPerAction)} <em>/ {calculator.actionUnit}</em></strong><small>{numberFormat.format(plan.xpPerHour)} XP per hour</small></div>
                {!fishing && primaryResult && <div className="metric product-metric"><span className="metric-icon product"><Leaf size={16} /></span><span className="metric-label">{randomProducts || overgrowth?.boostedCuts ? 'EXPECTED PRIMARY OUTPUT' : 'PRIMARY OUTPUT'}</span><strong>{numberFormat.format(primaryOutput)}</strong><small>{primaryResult.itemName} · {numberFormat.format(primaryResult.owned + primaryOutput)} projected total</small></div>}
              </div>
              <div className="resource-summary" aria-label="Resource and inventory summary">
                <div className="resource-summary-heading"><span>RESOURCE SUMMARY</span><strong>{action.inputs.length === 0 ? 'NO INPUT COST' : 'MATERIAL COST'}</strong></div>
                {firemaking && <p>Burn time and yields assume enough materials for the full plan. Input costs use the full recipe quantities.</p>}
                {plan.resources.length === 0 ? <p>This gathering action consumes no items. Current inventory is not spent.</p> : plan.resources.map((resource) => (
                  <div className="resource-row" key={resource.itemId}>
                    <span>{resource.itemName}</span>
                    <span>{numberFormat.format(resource.required)} required · {numberFormat.format(resource.owned)} owned</span>
                    <strong>{resource.missing > 0 ? `${numberFormat.format(resource.missing)} missing` : `${numberFormat.format(resource.remaining)} left`}</strong>
                  </div>
                ))}
                {plan.products.map((product, index) => {
                  const produced = index === 0 && primaryResult ? primaryOutput : product.produced;
                  const catchChance = fishing?.chances[product.itemId];
                  const burnDrop = firemaking?.drops.find((drop) => drop.itemId === product.itemId);
                  const expected = randomProducts || index >= action.outputs.length || (index === 0 && !!overgrowth?.boostedCuts);
                  return <div className="resource-row product-row" key={product.itemId}>
                    <span>{product.itemName}{catchChance !== undefined && ` · ${chanceFormat.format(catchChance * 100)}% per cast`}
                      {product.itemId === mining?.onHitDrop?.item.itemId && ` · ${chanceFormat.format(mining.onHitDrop.chance * 100)}% per hit`}
                      {burnDrop && ` · ${chanceFormat.format(burnDrop.chance * 100)}% per burn`}
                    </span>
                    <span>{numberFormat.format(product.owned)} owned + {formatExpectedQuantity(produced)} {expected ? 'expected' : 'produced'}</span>
                    <strong>{formatExpectedQuantity(product.owned + produced)} total</strong>
                  </div>;
                })}
                {prayerPointsPerBurn > 0 && <div className="resource-row product-row">
                  <span>Prayer Points · {numberFormat.format(prayerPointsPerBurn)} per burn</span>
                  <span>{prayerPointsOwned !== null && `${numberFormat.format(prayerPointsOwned)} owned`}</span>
                  <strong>+{numberFormat.format(prayerPointsEarned)} {doublingPercentage > 0 ? 'expected' : 'earned'}</strong>
                </div>}
              </div>
              {secondaryDrops.length > 0 && <section className="resource-summary" aria-label="Expected secondary drops">
                <div className="resource-summary-heading"><span>SECONDARY DROPS</span><strong>EXPECTED</strong></div>
                {secondaryDrops.map((drop) => <div className="resource-row product-row" key={drop.itemId}>
                  <span>{drop.name}</span>
                  <span>{chanceFormat.format(drop.chancePercent)}% per {drop.roll}</span>
                  <strong>{formatExpectedQuantity(drop.expectedQuantity)}</strong>
                </div>)}
              </section>}
              <details className="calculation-details">
                <summary><span>Calculation details</span><ChevronDown size={16} /></summary>
                <div className="formula-row"><span>XP per action</span><code>({action.baseXp} + {flatBonus}) × (1 + {numberFormat.format(totalPercentageBonus)}%)</code><strong>{numberFormat.format(plan.effectiveXpPerAction)}</strong></div>
                <div className="formula-row"><span>Required {calculator.actionPlural}</span><code>ceil({numberFormat.format(plan.remainingXp)} ÷ {numberFormat.format(plan.effectiveXpPerAction)})</code><strong>{numberFormat.format(plan.actions)}</strong></div>
                {fishing && <div className="formula-row"><span>Average cast</span><code>({fishing.minSeconds}s + {fishing.maxSeconds}s) ÷ 2</code><strong>{numberFormat.format(effectiveInterval)}s</strong></div>}
                {mining && <div className="formula-row"><span>Average rock break</span><code>{numberFormat.format(mining.hitTiming.expectedHits)} hits × {mining.hitTiming.secondsPerHit}s</code><strong>{numberFormat.format(effectiveInterval)}s</strong></div>}
                <div className="formula-row"><span>{timingEstimated ? 'Expected active time' : 'Base active time'}</span><code>{numberFormat.format(plan.actions)} × {numberFormat.format(effectiveInterval)}s</code><strong>{formatDuration(plan.trainingSeconds)}</strong></div>
                {!fishing && primaryResult && <div className="formula-row"><span>Primary output</span><code>{numberFormat.format(plan.actions)} × {primaryResult.quantity}{doublingPercentage > 0 && ` × (1 + ${doublingPercentage}%)`}</code><strong>{numberFormat.format(primaryResult.produced)}</strong></div>}
                {!!overgrowth && overgrowth.boostedCuts > 0 && <div className="formula-row"><span>Overgrowth output</span><code>{numberFormat.format(overgrowth.boostedCuts)} boosted cuts · {numberFormat.format(overgrowth.remainingStacks)} stacks left</code><strong>+{numberFormat.format(overgrowth.expectedExtraPrimary)}</strong></div>}
              </details>
            </div>
          </section>

          <section className="source-strip">
            <div className="source-icon"><BookOpen size={16} /></div>
            <div className="source-copy"><strong>Source and confidence</strong><span>{woodcutting
              ? 'Drop estimates use published recipe rates and supported permanent bonuses.'
              : 'Estimates use base recipe data and manual bonuses. Quest objectives may limit how long an action is available.'}</span></div>
            <div className="source-links">
              <a href={calculator.dataUrl} target="_blank" rel="noreferrer">ACTION DATA <span aria-hidden="true">↗</span></a>
              <a href={'source' in action ? action.source : skillCalculators.Woodcutting.recipeUrl} target="_blank" rel="noreferrer">RECIPE DATA <span aria-hidden="true">↗</span></a>
              <a href={xpTableSource.url} target="_blank" rel="noreferrer">XP TABLE <span aria-hidden="true">↗</span></a>
            </div>
          </section>
          <footer className="page-footer"><span>Unofficial planning tool · Not affiliated with Jagex or Games by Malcs</span><span>Imports are read-only and session-only</span></footer>
          </> : <section className="skill-calculator-placeholder" aria-labelledby="planned-calculator">
            <h2 id="planned-calculator">{selectedSkill}</h2>
            <p>This calculator is planned. Select an available skill to make a training estimate.</p>
            {selectedProgress && <p>Imported progress · Level {selectedProgress.level} · {numberFormat.format(selectedProgress.xp)} XP</p>}
          </section>}
        </div>}
      </main>
      {saveImportOpen && <SaveImportDialog
        initialLocation={saveLocation}
        onClose={() => setSaveImportOpen(false)}
        onLocationChange={updateSaveLocation}
        onLoaded={loadCharacter}
        onUseWoodcuttingXp={(xp) => {
          updateTraining('Woodcutting', { xpOverride: xp });
          setSelectedSkill('Woodcutting');
          setActiveView('calculator');
          setSaveImportOpen(false);
        }}
      />}
    </div>
  );
}

export default App;
