import { invoke, isTauri } from '@tauri-apps/api/core';
import { Activity, BookOpen, Boxes, ChartNoAxesCombined, ChevronDown, CircleHelp, Cog, FolderOpen, Leaf, ListChecks, RefreshCw, Search, ShieldCheck, Sparkles, TreePine, UserRound } from 'lucide-react';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { version as plannerVersion } from '../package.json';
import { calculateActionPlan, type CalculationResult, type SkillAction } from './calculator';
import { AgilityModifierFields, AgilityObstacleSummary, AgilityTechniqueFields, startingAgilityXp, type AgilitySettings } from './components/AgilityFields';
import CombatCalculator from './components/CombatCalculator';
import { HuntingEquipment } from './components/HuntingEquipment';
import SaveImportDialog from './components/SaveImportDialog';
import SkillDashboard, { skillIcons } from './components/SkillDashboard';
import { TrainingDamageSummary, TrainingFoodFields, type TrainingFoodSettings } from './components/TrainingFood';
import { calculateAgilityPlan } from './data/agility';
import { astrologyObservationSeconds, availableAstrologyNodes, calculateAstrologyPlan, nextAstrologyThreshold, resolveAstrologyProgress, resolveAstrologyTelescopes } from './data/astrology';
import { expectedArtisanSteps } from './data/artisan';
import { resolveBeastcraftingStations } from './data/beastcrafting';
import { calculateCookingPlan } from './data/cooking';
import { bottlingsPerBrew, brewingSeconds } from './data/herblore';
import { calculateHuntingPlan, selectedHuntingTrap, type HuntingSettings } from './data/hunting';
import { expectedExtraProducts, skillCalculators, type CalculatorSkill } from './data/skill-calculators';
import { baseStunSeconds, calculateThievingPlan, resolveThievingPerceptionDistractions, resolveThievingStealthEquipment } from './data/thieving';
import { resolveWoodcuttingRates } from './data/woodcutting-modifiers';
import { estimateWoodcuttingDrops } from './data/woodcutting-drops';
import { equippedWoodcuttingPotion, estimateOvergrowth } from './data/woodcutting-temporary';
import { woodcuttingMasterySource } from './data/woodcutting-mastery';
import { mergePlanningInventory } from './resource-planner';
import { findSkillId, isCombatSkill, passiveSkills, skillGroups, skillProgress, type SkillId } from './data/skills';
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
  targetMode?: 'level' | 'xp' | 'knowledge';
  targetLevel?: number;
  targetXp?: number;
  flatBonus?: number;
  xpBonus?: number;
  doublingBonus?: number;
  cookingProficiencyBonus?: number;
  stepSkippingChance?: number;
  thieving?: TrainingFoodSettings & { bonusStealth?: number };
  hunting?: HuntingSettings;
  agility?: AgilitySettings;
  astrology?: {
    knowledgeByConstellation?: Partial<Record<string, number>>;
    targetByConstellation?: Partial<Record<string, number>>;
    knowledgeBonus?: number;
    intervalReduction?: number;
  };
};

function hasCalculator(skill: SkillId): skill is CalculatorSkill {
  return Object.hasOwn(skillCalculators, skill);
}

function formatExpectedQuantity(quantity: number) {
  return quantity > 0 && quantity < 0.01 ? '<0.01' : numberFormat.format(quantity);
}

function actionOption(item: SkillAction, inventory?: Readonly<Record<string, number>>) {
  const level = 'hasLevelRequirement' in item && item.hasLevelRequirement === false ? '' : `Lv. ${item.requiredLevel} · `;
  if ('perception' in item) {
    return <option key={item.id} value={item.id}>{level}{item.name} — {item.baseXp} XP per completion</option>;
  }
  if ('hunt' in item) {
    return <option key={item.id} value={item.id}>{level}{item.name} — {item.baseXp} base XP per catch</option>;
  }
  if (inventory && item.inputs.length > 0) {
    const owned = item.outputs[0] ? `${numberFormat.format(inventory[item.outputs[0].itemId] ?? 0)} owned · ` : '';
    const batches = Math.min(...item.inputs.map(({ itemId, quantity }) => Math.floor((inventory[itemId] ?? 0) / quantity)));
    const isCooking = 'difficulty' in item;
    const [unit, plural] = isCooking ? ['attempt', 'attempts']
      : 'brewTiming' in item ? ['bottling', 'bottlings'] : ['batch', 'batches'];
    return <option key={item.id} value={item.id}>
      {level}{item.name} ({owned}ingredients for {numberFormat.format(batches)} {batches === 1 ? unit : plural}) — {item.baseXp} XP{isCooking ? ' per success' : ''}
    </option>;
  }
  const average = 'hitTiming' in item || 'minSeconds' in item ? ' avg' : '';
  return <option key={item.id} value={item.id}>{level}{item.name} — {item.baseXp} XP / {numberFormat.format(item.intervalSeconds)}s{average}</option>;
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
  const cooking = 'difficulty' in action ? action : null;
  const herblore = 'brewTiming' in action ? action : null;
  const artisan = 'secondsPerStep' in action ? action : null;
  const beastcrafting = calculatorSkill === 'Beastcrafting';
  const beastcraftingStations = beastcrafting && useImportedBonuses ? resolveBeastcraftingStations(importedSave) : null;
  const thieving = 'perception' in action ? action : null;
  const agility = 'obstacles' in action ? action : null;
  const agilitySettings = setup.agility;
  const importedTechniqueXp = importedSave?.agilityTechniqueXp;
  const astrology = 'baseKnowledge' in action ? action : null;
  const astrologySettings = setup.astrology;
  const constellationProgress = astrology ? resolveAstrologyProgress(astrology, importedSave) : null;
  const telescopeBonuses = astrology && useImportedBonuses ? resolveAstrologyTelescopes(importedSave) : null;
  const minorNodes = constellationProgress?.minorNodes.length ?? 0;
  const majorNodes = constellationProgress?.majorNodes.length ?? 0;
  const knowledgeOverride = astrologySettings?.knowledgeByConstellation?.[action.id];
  const currentKnowledge = knowledgeOverride ?? constellationProgress?.knowledge ?? 0;
  const nextKnowledgeThreshold = astrology ? nextAstrologyThreshold(currentKnowledge) : undefined;
  const targetKnowledge = astrologySettings?.targetByConstellation?.[action.id] ?? nextKnowledgeThreshold ?? currentKnowledge;
  const knowledgeBonus = (astrologySettings?.knowledgeBonus ?? 0) + (telescopeBonuses?.knowledge ?? 0)
    + (useImportedBonuses ? minorNodes * 2 : 0);
  const knowledgeTarget = astrology && setup.targetMode === 'knowledge' ? targetKnowledge : undefined;
  const hunting = 'hunt' in action ? action : null;
  const huntingSettings = setup.hunting ?? {};
  const useHuntingBait = huntingSettings.useBait ?? false;
  const journalLevel = huntingSettings.journalLevels?.[action.id] ?? 1;
  const thievingSettings = setup.thieving ?? {};
  const { bonusStealth = 0, damageAvoidance = 0 } = thievingSettings;
  const perceptionDistractions = thieving && useImportedBonuses
    ? resolveThievingPerceptionDistractions(thieving, importedSave)
    : [];
  const perceptionBonusPercentage = perceptionDistractions.reduce((total, { percentage }) => total + percentage, 0);
  const stealthEquipment = thieving && useImportedBonuses ? resolveThievingStealthEquipment(importedSave) : [];
  const totalBonusStealth = stealthEquipment.reduce((total, { stealth }) => total + stealth, bonusStealth);
  const ActionIcon = woodcutting ? TreePine : skillIcons[calculatorSkill];
  const productRolls = firemaking?.drops ?? artisan?.productRolls;
  const rates = woodcutting ? resolveWoodcuttingRates(woodcutting, importedSave, useImportedBonuses) : null;
  const { importedBonuses, deedree, shopBonuses, mastery, healthReduction = 0, activeEffects = [], bushOutputBonus = 0 } = rates ?? {};
  const currentXp = setup.xpOverride ?? selectedProgress?.xp ?? 0;
  const targetMode = setup.targetMode ?? 'level';
  const flatBonus = Math.max(-action.baseXp + 0.1, setup.flatBonus ?? 0);
  const percentageBonus = setup.xpBonus ?? 0;
  const totalPercentageBonus = (rates?.xpPercentage ?? telescopeBonuses?.xp ?? 0) + percentageBonus;
  const manualDoubling = setup.doublingBonus ?? 0;
  const doublingPercentage = rates?.doublingPercentage ?? Math.min(100, manualDoubling + (beastcraftingStations?.doubling ?? 0));
  const manualStepSkipping = setup.stepSkippingChance ?? 0;
  const stepSkippingChance = Math.min(100, manualStepSkipping + (beastcraftingStations?.stepSkipping ?? 0));
  const artisanSteps = artisan ? expectedArtisanSteps(artisan.steps, stepSkippingChance / 100) : null;
  const effectiveInterval = artisan && artisanSteps !== null
    ? artisanSteps * artisan.secondsPerStep
    : astrology ? astrologyObservationSeconds(action.intervalSeconds, Math.min(99, (telescopeBonuses?.intervalReduction ?? 0) + (astrologySettings?.intervalReduction ?? 0)))
      : rates?.intervalSeconds ?? action.intervalSeconds;
  const primaryQuantityBonus = rates?.primaryQuantityBonus ?? 0;
  const cookingProficiencyBonus = setup.cookingProficiencyBonus ?? 0;
  const primaryProduct = action.outputs[0];
  const planningInventory = useMemo(() => mergePlanningInventory(importedSave?.bank.items, inventoryOverrides), [importedSave, inventoryOverrides]);
  const huntingTrap = hunting ? selectedHuntingTrap(hunting, huntingSettings, planningInventory) : null;
  const huntingBait = useHuntingBait ? hunting?.hunt.bait : undefined;
  const actionInputs = hunting ? [huntingTrap, huntingBait].filter((item) => item != null) : action.inputs;
  const traplessRequirements = hunting && !huntingTrap ? hunting.hunt.trapless : undefined;
  const requiredActionLevel = Math.max(action.requiredLevel, traplessRequirements?.level ?? 1);
  const groupedRecipes = useMemo(() => {
    const groups = new Map<string, SkillAction[]>();
    for (const recipe of calculator.actions) {
      if (!('recipeGroup' in recipe)) continue;
      const group = groups.get(recipe.recipeGroup);
      if (group) group.push(recipe);
      else groups.set(recipe.recipeGroup, [recipe]);
    }
    return groups;
  }, [calculator]);
  const currentLevel = levelForXp(currentXp);
  const atLevelCap = currentLevel === xpTableSource.levelCap;
  const nextLevel = Math.min(currentLevel + 1, xpTableSource.levelCap);
  const targetLevel = Math.max(nextLevel, setup.targetLevel ?? nextLevel);
  const targetXpInput = setup.targetXp ?? xpAtLevel(nextLevel);
  const targetXp = targetMode === 'level' ? Math.max(currentXp, xpAtLevel(targetLevel)) : targetMode === 'xp' ? targetXpInput : currentXp;
  const actionLocked = currentLevel < requiredActionLevel;
  const prerequisiteNote = astrology?.requirements.some(([skill, level]) => (skillProgress(importedSave?.skills ?? [], skill)?.level ?? 0) >= level)
    ? undefined : action.prerequisiteNote;
  const progressTarget = knowledgeTarget ?? targetXp;
  const progressCurrent = knowledgeTarget === undefined ? currentXp : currentKnowledge;
  const progressPercent = progressTarget === 0 ? 100 : Math.min(100, (progressCurrent / progressTarget) * 100);
  const extraProducts = useMemo(() => expectedExtraProducts(action), [action]);
  const randomProducts = !!(fishing || thieving || hunting) || doublingPercentage > 0;
  const plan = useMemo<CalculationResult | ReturnType<typeof calculateCookingPlan> | ReturnType<typeof calculateThievingPlan> | ReturnType<typeof calculateHuntingPlan> | ReturnType<typeof calculateAgilityPlan> | ReturnType<typeof calculateAstrologyPlan>>(() => {
    const input = {
      currentXp,
      targetXp,
      flatXpBonus: flatBonus,
      percentageXpBonus: totalPercentageBonus / 100,
      outputDoublingChance: doublingPercentage / 100,
      effectiveIntervalSeconds: effectiveInterval,
      inventory: planningInventory,
    };
    if (cooking) return calculateCookingPlan({ ...input, action: cooking }, cookingProficiencyBonus);
    if (thieving) return calculateThievingPlan({ ...input, action: thieving }, totalBonusStealth, damageAvoidance / 100, perceptionBonusPercentage);
    if (agility) return calculateAgilityPlan({ ...input, action: agility }, startingAgilityXp(agilitySettings ?? {}, importedTechniqueXp), {
      ...agilitySettings?.modifiers, damageAvoidance: (agilitySettings?.damageAvoidance ?? 0) / 100,
    });
    if (hunting) return calculateHuntingPlan({ ...input, action: hunting }, huntingTrap, useHuntingBait, journalLevel);
    if (astrology) return calculateAstrologyPlan({ ...input, action: astrology }, currentKnowledge, knowledgeBonus, knowledgeTarget);
    const actionPlan = calculateActionPlan({
      ...input,
      action: {
        ...action,
        outputs: [
          ...action.outputs.map((product, index) => ({
            ...product, quantity: product.quantity + (index === 0 ? primaryQuantityBonus : 0),
          })),
          ...extraProducts,
        ],
      },
    });
    return herblore ? { ...actionPlan, trainingSeconds: brewingSeconds(herblore.brewTiming, actionPlan.actions) } : actionPlan;
  }, [action, agility, agilitySettings, importedTechniqueXp, astrology, currentKnowledge, knowledgeBonus, knowledgeTarget, cooking, herblore, thieving, hunting, huntingTrap, useHuntingBait, journalLevel, totalBonusStealth, damageAvoidance, perceptionBonusPercentage, cookingProficiencyBonus, currentXp, flatBonus, totalPercentageBonus, doublingPercentage, effectiveInterval, planningInventory, primaryQuantityBonus, extraProducts, targetXp]);
  const cookingPlan = 'budgetedAttempts' in plan ? plan : null;
  const thievingPlan = 'startingStealth' in plan ? plan : null;
  const agilityPlan = 'expectedStarts' in plan ? plan : null;
  const astrologyPlan = 'knowledgePerObservation' in plan ? plan : null;
  const availableNodes = astrologyPlan ? availableAstrologyNodes(currentKnowledge, minorNodes, majorNodes) : null;
  const projectedNodes = astrologyPlan ? availableAstrologyNodes(astrologyPlan.projectedKnowledge, minorNodes, majorNodes) : null;
  const agilitySecondsPerCompletion = agilityPlan
    ? plan.actions > 0 ? plan.trainingSeconds / plan.actions : agilityPlan.starting.seconds / agilityPlan.starting.chance
    : null;
  const huntingPlan = 'trappingAttempts' in plan ? plan : null;
  const timingEstimated = !!(fishing || mining || hunting || agility || effectiveInterval !== action.intervalSeconds
    || (cookingPlan && cookingPlan.startingSuccessChance < 1) || (thievingPlan && thievingPlan.startingSuccessChance < 1));
  const intervalUnit = cooking || thieving ? 'attempt' : calculator.actionUnit;
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
          <span className="build-label">PLANNER BUILD {plannerVersion}</span>
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
                    {skills.map((skill) => <option key={skill} value={skill}>{skill}{hasCalculator(skill) || isCombatSkill(skill) ? '' : passiveSkills.has(skill) ? ' (passive)' : ' (planned)'}</option>)}
                  </optgroup>)}
                </select>
                <ChevronDown size={16} aria-hidden="true" />
              </span>
            </label>
          </section>
          {refreshError && <p className="refresh-error" role="alert">{refreshError}</p>}

          {isCombatSkill(selectedSkill) ? <CombatCalculator skill={selectedSkill} save={importedSave} formatDuration={formatDuration} />
          : hasCalculator(selectedSkill) ? <>
          <section className="calculator-grid" aria-label={`${selectedSkill} calculator`}>
            <div className="input-panel">
              <div className="section-title-row">
                <div><span className="section-kicker">01 / TRAINING SETUP</span><h2>Choose your route</h2></div>
                <button className="text-icon-button" type="button" title="Calculation assumptions" aria-label="Calculation assumptions"><CircleHelp size={17} /></button>
              </div>

              <label className="field-label" htmlFor="action-select">{calculator.actionLabel.toUpperCase()}</label>
              <div className="select-wrap">
                <select id="action-select" value={action.id} onChange={(event) => updateTraining(calculatorSkill, { actionId: event.target.value })}>
                  {groupedRecipes.size > 0 ? [...groupedRecipes].map(([group, recipes]) => (
                    <optgroup key={group} label={group}>{recipes.map((recipe) => actionOption(recipe, planningInventory))}</optgroup>
                  )) : calculator.actions.map((recipe) => actionOption(recipe))}
                </select>
                <ChevronDown size={16} aria-hidden="true" />
              </div>
              <div className="action-summary">
                <div className="action-emblem"><ActionIcon size={20} /></div>
                <div className="action-copy"><strong>{action.name}</strong><span>{action.inputs.length > 0
                  ? `Uses ${action.inputs.map(({ itemName, quantity }) => `${quantity}× ${itemName}`).join(', ')} per ${intervalUnit}`
                  : hunting ? `${hunting.hunt.trapType} · ${hunting.hunt.trappingSeconds.join('–')}s base trap interval`
                  : thieving ? `${thieving.stages} ${thieving.stages === 1 ? 'successful stage' : 'successful stages'} per completion`
                  : agility ? `${agility.obstacles.length} obstacles per completion`
                  : astrologyPlan ? `${numberFormat.format(astrologyPlan.knowledgePerObservation)} Knowledge per observation`
                  : fishing ? `${fishing.minSeconds}–${fishing.maxSeconds}s per cast. Every cast awards XP.`
                    : `Produces ${primaryProduct.quantity}× ${primaryProduct.itemName} per ${calculator.actionUnit}`}</span></div>
                <span className={`level-chip${actionLocked || prerequisiteNote || traplessRequirements?.requirement ? ' locked' : ''}`}>{actionLocked ? 'LOCKED' : prerequisiteNote || traplessRequirements?.requirement ? 'CHECK REQUIREMENTS' : 'UNLOCKED'}{artisan?.hasLevelRequirement !== false && ` · LV ${requiredActionLevel}`}</span>
              </div>
              {actionLocked && <p className="unlock-warning">This action requires level {requiredActionLevel}. The estimate assumes you unlock it first.</p>}
              {prerequisiteNote && <p className="unlock-warning">{prerequisiteNote} Check your progress in-game before using this estimate.</p>}
              {beastcrafting && currentXp === 0 && <p className="field-note">Unlocks at Hunting level 15 after trapping a Bushland Rabbit.</p>}
              {mining && <p className="field-note">{chanceFormat.format(mining.breakChance * 100)}% break chance per {mining.hitTiming.secondsPerHit}s hit · {mining.hitTiming.maximumHits} hits maximum</p>}
              {artisan && <p className="field-note">{artisan.steps} {artisan.steps === 1 ? 'step' : 'steps'} per batch · {artisan.secondsPerStep}s per step</p>}
              {herblore && <p className="field-note">{formatDuration(herblore.brewTiming.preparation)} setup per fresh brew · {herblore.brewTiming.bottling}s per bottling</p>}
              {cookingPlan && <p className="field-note">{chanceFormat.format(cookingPlan.startingSuccessChance * 100)}% starting success chance{actionLocked ? ' at unlock level' : ''} · XP and output on success</p>}
              {thievingPlan && <p className="field-note">{chanceFormat.format(thievingPlan.startingSuccessChance * 100)}% starting success chance per stage{actionLocked ? ' at unlock level' : ''} · {thievingPlan.startingStealth} Stealth · {thievingPlan.perception} target Perception</p>}
              {agilityPlan && <p className="field-note">{agilityPlan.starting.chance < 1 && agilityPlan.starting.chance >= 0.999995
                ? '<100%' : `${chanceFormat.format(agilityPlan.starting.chance * 100)}%`} starting chance to complete per course start
                {agilityPlan.starting.failures === 0 && ' · No obstacle failures'}</p>}

              <div className={`target-mode${astrology ? ' with-knowledge' : ''}`} role="group" aria-label="Target mode">
                <button type="button" className={targetMode === 'level' ? 'selected' : ''} aria-pressed={targetMode === 'level'} onClick={() => updateTraining(calculatorSkill, { targetMode: 'level' })}>Target level</button>
                <button type="button" className={targetMode === 'xp' ? 'selected' : ''} aria-pressed={targetMode === 'xp'} onClick={() => updateTraining(calculatorSkill, { targetMode: 'xp' })}>Exact target XP</button>
                {astrology && <button type="button" className={targetMode === 'knowledge' ? 'selected' : ''} aria-pressed={targetMode === 'knowledge'} onClick={() => updateTraining(calculatorSkill, { targetMode: 'knowledge' })}>Target Knowledge</button>}
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
                  </> : knowledgeTarget !== undefined ? <>
                    <span className="field-label">TARGET KNOWLEDGE</span>
                    <span className="number-input-wrap"><input type="number" min="0" step="any"
                      value={astrologySettings?.targetByConstellation?.[action.id] ?? ''}
                      placeholder={String(targetKnowledge)}
                      onChange={(event) => {
                        const value = event.target.valueAsNumber;
                        if (event.target.value !== '' && (!Number.isFinite(value) || value < 0)) return;
                        updateTraining(calculatorSkill, { astrology: { ...astrologySettings,
                          targetByConstellation: { ...astrologySettings?.targetByConstellation, [action.id]: event.target.value === '' ? undefined : value },
                        } });
                      }} /></span>
                  </> : <>
                    <span className="field-label">TARGET TOTAL XP</span>
                    <span className="number-input-wrap"><input type="number" min="0" step="1" value={targetXpInput} onChange={(event) => {
                      const xp = Number(event.target.value);
                      if (Number.isFinite(xp) && xp >= 0) updateTraining(calculatorSkill, { targetXp: xp });
                    }} /><span>XP</span></span>
                  </>}
                  <span className="field-note">{knowledgeTarget === undefined ? `${numberFormat.format(targetXp)} XP total`
                    : `${numberFormat.format(knowledgeTarget)} Knowledge total`}</span>
                </label>
              </div>

              {astrology && <label className="inventory-field">
                <span className="field-label">CURRENT KNOWLEDGE</span>
                <span className="number-input-wrap"><input type="number" min="0" step="any" value={knowledgeOverride ?? ''} placeholder={String(currentKnowledge)}
                  onChange={(event) => {
                    const value = event.target.valueAsNumber;
                    if (event.target.value !== '' && (!Number.isFinite(value) || value < 0)) return;
                    updateTraining(calculatorSkill, { astrology: { ...astrologySettings,
                      knowledgeByConstellation: { ...astrologySettings?.knowledgeByConstellation, [action.id]: event.target.value === '' ? undefined : value },
                    } });
                  }} /></span>
                <span className="field-note">{knowledgeOverride !== undefined ? 'MANUAL STARTING KNOWLEDGE'
                  : constellationProgress?.knowledge != null ? 'IMPORTED CONSTELLATION KNOWLEDGE' : 'DEFAULT STARTING KNOWLEDGE'}</span>
              </label>}
              {hunting && <HuntingEquipment action={hunting} trap={huntingTrap} settings={huntingSettings} inventory={planningInventory}
                onUpdate={(patch) => updateTraining(calculatorSkill, { hunting: { ...huntingSettings, ...patch } })} />}
              {[...actionInputs, ...action.outputs, ...extraProducts].map((product) => <label className="inventory-field" key={product.itemId}>
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

              {agility && <AgilityTechniqueFields action={agility} settings={agilitySettings ?? {}}
                importedXp={importedTechniqueXp}
                onUpdate={(patch) => updateTraining(calculatorSkill, { agility: { ...agilitySettings, ...patch } })} />}
              {(thieving || agility) && <TrainingFoodFields
                settings={agility ? agilitySettings ?? {} : thievingSettings} inventory={planningInventory}
                onUpdate={(patch) => updateTraining(calculatorSkill, agility
                  ? { agility: { ...agilitySettings, ...patch } }
                  : { thieving: { ...thievingSettings, ...patch } })}
                onInventoryChange={updateInventoryOverride}
              />}
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
                {thieving && importedSave && <div className="modifier-disclaimer">
                  <label><input type="checkbox" checked={useImportedBonuses} onChange={(event) => setUseImportedBonuses(event.target.checked)} /> Apply imported bonuses</label>
                  {useImportedBonuses && <>
                    {perceptionDistractions.length > 0 || stealthEquipment.length > 0 ? <ul>
                      {perceptionDistractions.map(({ id, name, percentage }) => <li key={id}><a href={`https://db.melvor.aevv.net/shop-purchase/${id}`} target="_blank" rel="noreferrer">{name}</a> {percentage}% target Perception in {thieving.recipeGroup}</li>)}
                      {stealthEquipment.map(({ id, name, stealth }) => <li key={id}><a href={`https://db.melvor.aevv.net/item/${id}`} target="_blank" rel="noreferrer">{name}</a> +{stealth} Stealth</li>)}
                    </ul> : <p>No supported Stealth or Perception bonuses found.</p>}
                    {(importedSave.shopPurchases == null || importedSave.thievingToolbelt == null) && <p>Some bonus data is unavailable. Reread the original save with the current desktop app.</p>}
                  </>}
                </div>}
                {beastcrafting && importedSave && <div className="modifier-disclaimer">
                  <label><input type="checkbox" checked={useImportedBonuses} onChange={(event) => setUseImportedBonuses(event.target.checked)} /> Apply imported bonuses</label>
                  {beastcraftingStations && (beastcraftingStations.purchased.length > 0 ? <ul>
                    {beastcraftingStations.purchased.map(({ id, name, stepSkipping, doubling, preservation }) => <li key={id}>
                      <a href={`https://db.melvor.aevv.net/shop-purchase/${id}`} target="_blank" rel="noreferrer">{name}</a>
                      {' · '}{[
                        stepSkipping > 0 && `+${stepSkipping}% step skipping`,
                        doubling > 0 && `+${doubling}% output doubling`,
                        preservation > 0 && `+${preservation}% input preservation`,
                      ].filter(Boolean).join(' · ')}
                    </li>)}
                  </ul> : <p>{importedSave.shopPurchases == null
                    ? 'Shop purchase data is unavailable. Reread the original save with the current desktop app.'
                    : 'No Beastcrafting Station purchases found.'}</p>)}
                </div>}
                {astrology && importedSave && <div className="modifier-disclaimer">
                  <label><input type="checkbox" checked={useImportedBonuses} onChange={(event) => setUseImportedBonuses(event.target.checked)} /> Apply imported bonuses</label>
                  {telescopeBonuses && <>
                    <ul>
                      {minorNodes > 0 && <li>{minorNodes} unlocked minor nodes · +{minorNodes * 2}% Knowledge in {astrology.name}</li>}
                      {telescopeBonuses.purchased.map(({ id, name, intervalReduction, xp, knowledge }) => <li key={id}>
                        <a href={`https://db.melvor.aevv.net/shop-purchase/${id}`} target="_blank" rel="noreferrer">{name}</a>
                        {' · '}{intervalReduction > 0 && `−${intervalReduction}% interval`}
                        {intervalReduction > 0 && xp > 0 && ' · '}{xp > 0 && `+${xp}% XP · +${knowledge}% Knowledge`}
                      </li>)}
                    </ul>
                    {(constellationProgress?.knowledge == null || importedSave.shopPurchases == null) &&
                      <p>Some Astrology data is unavailable. Reread the original save with the current desktop app.</p>}
                  </>}
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
                  {!woodcutting && !agility && !astrology && <label>
                    <span className="field-label">{thieving ? 'STAGE LOOT DOUBLING CHANCE' : beastcrafting ? 'ADDITIONAL OUTPUT DOUBLING CHANCE' : 'OUTPUT DOUBLING CHANCE'}</span>
                    <span className="number-input-wrap"><input type="number" min="0" max="100" step="0.1" value={manualDoubling} onChange={(event) => {
                      const bonus = Number(event.target.value);
                      if (Number.isFinite(bonus)) updateTraining(calculatorSkill, { doublingBonus: Math.min(100, Math.max(0, bonus)) });
                    }} /><span>%</span></span>
                  </label>}
                  {cooking && <label>
                    <span className="field-label">ADDITIONAL COOKING PROFICIENCY</span>
                    <span className="number-input-wrap"><input type="number" min="0" step="1" value={cookingProficiencyBonus} onChange={(event) => {
                      const bonus = Number(event.target.value);
                      if (Number.isSafeInteger(bonus) && bonus >= 0) updateTraining(calculatorSkill, { cookingProficiencyBonus: bonus });
                    }} /><span>POINTS</span></span>
                  </label>}
                  {thieving && <label>
                    <span className="field-label">ADDITIONAL STEALTH</span>
                    <span className="number-input-wrap"><input type="number" step="1" value={bonusStealth} onChange={(event) => {
                      const bonus = Number(event.target.value);
                      if (Number.isSafeInteger(bonus)) updateTraining(calculatorSkill, { thieving: { ...thievingSettings, bonusStealth: bonus } });
                    }} /><span>POINTS</span></span>
                  </label>}
                  {astrology && <>
                    <label>
                      <span className="field-label">ADDITIONAL KNOWLEDGE BONUS</span>
                      <span className="number-input-wrap"><input type="number" min="0" step="0.1" value={astrologySettings?.knowledgeBonus ?? 0} onChange={(event) => {
                        const value = Number(event.target.value);
                        if (Number.isFinite(value) && value >= 0) updateTraining(calculatorSkill, { astrology: { ...astrologySettings, knowledgeBonus: value } });
                      }} /><span>%</span></span>
                    </label>
                    <label>
                      <span className="field-label">ADDITIONAL INTERVAL REDUCTION</span>
                      <span className="number-input-wrap"><input type="number" min="0" max="99" step="0.1" value={astrologySettings?.intervalReduction ?? 0} onChange={(event) => {
                        const value = Number(event.target.value);
                        if (Number.isFinite(value)) updateTraining(calculatorSkill, { astrology: { ...astrologySettings, intervalReduction: Math.min(99, Math.max(0, value)) } });
                      }} /><span>%</span></span>
                    </label>
                  </>}
                  {artisan && artisan.steps > 1 && <label>
                    <span className="field-label">{beastcrafting ? 'ADDITIONAL STEP SKIPPING CHANCE' : 'STEP SKIPPING CHANCE'}</span>
                    <span className="number-input-wrap"><input type="number" min="0" max="100" step="0.1" value={manualStepSkipping} onChange={(event) => {
                      const chance = Number(event.target.value);
                      if (Number.isFinite(chance)) updateTraining(calculatorSkill, { stepSkippingChance: Math.min(100, Math.max(0, chance)) });
                    }} /><span>%</span></span>
                  </label>}
                </div>
                {agility && <AgilityModifierFields action={agility} modifiers={agilitySettings?.modifiers}
                  onChange={(modifiers) => updateTraining(calculatorSkill, { agility: { ...agilitySettings, modifiers } })} />}
                <p className="modifier-disclaimer">{woodcutting
                  ? 'Manual XP bonuses add to enabled imported XP bonuses.'
                  : thieving ? 'Stealth starts at your Thieving level. Manual bonuses add to any imported Stealth shown above. Failures retain your stage and use a two-second base stun.'
                    : cooking ? 'Proficiency starts at your Cooking level and increases as you level. Add any other proficiency bonuses above.'
                    : agility ? 'Enter effective bonuses from your in-game Agility modifiers. Technique levels improve obstacle success as you train.'
                      : astrology ? 'Manual bonuses add to imported telescope and node bonuses. Knowledge rates use the minor nodes already unlocked.'
                        : beastcrafting ? 'Manual bonuses add to enabled station bonuses. Material shortages use full recipe costs.'
                      : artisan ? 'XP, output doubling, and step skipping use manual bonuses.'
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
                <span className="estimate-pill">{hunting ? 'AVERAGE CATCH XP' : thieving || agility ? 'XP ON COMPLETION' : cooking ? 'XP ON SUCCESS' : 'DETERMINISTIC XP'}</span>
              </div>
              <div className="primary-result">
                <div className="result-label">{calculator.actionPlural.toUpperCase()} TO TARGET</div>
                <div className="action-count">{numberFormat.format(plan.actions)}<span>{plan.actions === 1 ? calculator.actionUnit : calculator.actionPlural}</span></div>
                <div className="progress-track" role="img" aria-label={`${numberFormat.format(progressPercent)} percent of target XP reached`}><span style={{ width: `${progressPercent}%` }} /></div>
                <div className="progress-caption">{knowledgeTarget !== undefined && astrologyPlan
                  ? <><span>{numberFormat.format(astrologyPlan.remainingKnowledge)} Knowledge remaining</span><span>+{numberFormat.format(plan.xpGained)} XP</span></>
                  : <><span>{numberFormat.format(plan.remainingXp)} XP remaining</span><span>{numberFormat.format(plan.xpOvershoot)} XP overflow</span></>}</div>
              </div>
              <div className="result-metrics">
                <div className="metric"><span className="metric-icon time"><Activity size={16} /></span><span className="metric-label">{timingEstimated ? 'EXPECTED ACTIVE TIME' : 'BASE ACTIVE TIME'}</span><strong>{formatDuration(plan.trainingSeconds)}</strong><small>{herblore
                  ? `${formatDuration(herblore.intervalSeconds * bottlingsPerBrew)} per full brew`
                  : `${numberFormat.format(agilitySecondsPerCompletion ?? huntingPlan?.secondsPerCatch ?? effectiveInterval)}s per ${intervalUnit}${thieving ? ' before stuns' : timingEstimated && !cooking ? ' on average' : ''}`}</small></div>
                <div className="metric"><span className="metric-icon xp"><Sparkles size={16} /></span><span className="metric-label">EFFECTIVE XP</span><strong>{numberFormat.format(plan.effectiveXpPerAction)} <em>/ {calculator.actionUnit}</em></strong><small>{numberFormat.format(plan.xpPerHour)} {cooking || thieving || hunting || agility ? 'expected ' : ''}XP per hour{herblore ? ' over full brews' : ''}</small></div>
                {!fishing && primaryResult && <div className="metric product-metric"><span className="metric-icon product"><Leaf size={16} /></span><span className="metric-label">{randomProducts || overgrowth?.boostedCuts ? 'EXPECTED PRIMARY OUTPUT' : 'PRIMARY OUTPUT'}</span><strong>{numberFormat.format(primaryOutput)}</strong><small>{primaryResult.itemName} · {numberFormat.format(primaryResult.owned + primaryOutput)} projected total</small></div>}
              </div>
              {thievingPlan && <TrainingDamageSummary skill="Thieving" plan={thievingPlan} settings={thievingSettings} inventory={planningInventory} />}
              {agilityPlan && <TrainingDamageSummary skill="Agility" plan={agilityPlan} settings={agilitySettings ?? {}} inventory={planningInventory} />}
              {agilityPlan && <AgilityObstacleSummary plan={agilityPlan} />}
              {astrologyPlan && availableNodes && projectedNodes && <section className="resource-summary" aria-label="Constellation Knowledge and nodes">
                <div className="resource-summary-heading"><span>CONSTELLATION PROGRESS</span><strong>KNOWLEDGE</strong></div>
                <div className="resource-row">
                  <span>Knowledge</span><span>{numberFormat.format(currentKnowledge)} current · +{numberFormat.format(astrologyPlan.knowledgeGained)} earned</span>
                  <strong>{numberFormat.format(astrologyPlan.projectedKnowledge)} projected</strong>
                </div>
                <div className="resource-row">
                  <span>Minor nodes</span><span>{minorNodes} unlocked · {availableNodes.minor} available now</span>
                  <strong>{projectedNodes.minor} available at target</strong>
                </div>
                <div className="resource-row">
                  <span>Major nodes</span><span>{majorNodes} unlocked · {availableNodes.major} available now</span>
                  <strong>One slot per 4 unlocked minor nodes</strong>
                </div>
                {nextKnowledgeThreshold !== undefined && <p>Next minor node at {numberFormat.format(nextKnowledgeThreshold)} Knowledge.</p>}
              </section>}
              {!astrology && (!agility || actionInputs.length > 0 || plan.products.length > 0) && <div className="resource-summary" aria-label={thieving ? 'Expected loot' : 'Resource and inventory summary'}>
                <div className="resource-summary-heading"><span>{thieving ? 'LOOT TO TARGET' : 'RESOURCE SUMMARY'}</span><strong>{thieving || hunting ? 'EXPECTED' : actionInputs.length === 0 ? 'NO INPUT COST' : 'MATERIAL COST'}</strong></div>
                {huntingPlan && <p>{numberFormat.format(huntingPlan.trappingAttempts)} expected attempts · {chanceFormat.format(huntingPlan.firstCatchChance * 100)}% success on the first attempt.{huntingTrap ? ' Trap costs account for preservation.' : ''}{huntingBait ? ' Timing assumes bait is stocked for each attempt.' : ''}</p>}
                {(firemaking || artisan || herblore) && <p>Training time and yields assume enough materials for the full plan. Input costs use the full recipe quantities.</p>}
                {cookingPlan && <p>{numberFormat.format(cookingPlan.expectedAttempts)} expected attempts. Ingredient costs round up to {numberFormat.format(cookingPlan.budgetedAttempts)} whole attempts before preservation.</p>}
                {agilityPlan && <p>{numberFormat.format(agilityPlan.expectedStarts)} expected course starts. The ticket budget rounds up expected paid entries.</p>}
                {!thieving && plan.resources.length === 0 && <p>This gathering action consumes no items. Current inventory is not spent.</p>}
                {plan.resources.map((resource) => (
                  <div className="resource-row" key={resource.itemId}>
                    <span>{resource.itemName}</span>
                    <span>{numberFormat.format(resource.required)} required · {numberFormat.format(resource.owned)} owned
                      {!!beastcraftingStations?.preservation && ` · ${numberFormat.format(resource.required * (1 - beastcraftingStations.preservation / 100))} expected use`}
                    </span>
                    <strong>{resource.missing > 0 ? `${numberFormat.format(resource.missing)} missing` : `${numberFormat.format(resource.remaining)} left`}</strong>
                  </div>
                ))}
                {thievingPlan && thievingPlan.expectedGp > 0 && <div className="resource-row product-row">
                  <span>Gold Pieces</span><span /><strong>{numberFormat.format(thievingPlan.expectedGp)} GP</strong>
                </div>}
                {plan.products.map((product, index) => {
                  const produced = index === 0 && primaryResult ? primaryOutput : product.produced;
                  const catchChance = fishing?.chances[product.itemId];
                  const roll = productRolls?.find((drop) => drop.itemId === product.itemId);
                  const expected = randomProducts || index >= action.outputs.length || (index === 0 && !!overgrowth?.boostedCuts);
                  return <div className="resource-row product-row" key={product.itemId}>
                    <span>{product.itemName}{catchChance !== undefined && ` · ${chanceFormat.format(catchChance * 100)}% per cast`}
                      {product.itemId === mining?.onHitDrop?.item.itemId && ` · ${chanceFormat.format(mining.onHitDrop.chance * 100)}% per hit`}
                      {roll && ` · ${chanceFormat.format(roll.chance * 100)}% per ${calculator.actionUnit}`}
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
              </div>}
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
                <div className="formula-row"><span>XP per {calculator.actionUnit}</span><code>({action.baseXp} + {flatBonus}) × (1 + {numberFormat.format(totalPercentageBonus)}%){huntingPlan && ` × ${numberFormat.format(huntingPlan.averageStat)}`}</code><strong>{numberFormat.format(plan.effectiveXpPerAction)}</strong></div>
                <div className="formula-row"><span>Required {calculator.actionPlural}</span><code>{knowledgeTarget !== undefined && astrologyPlan
                  ? `ceil(${numberFormat.format(astrologyPlan.remainingKnowledge)} Knowledge ÷ ${numberFormat.format(astrologyPlan.knowledgePerObservation)})`
                  : `ceil(${numberFormat.format(plan.remainingXp)} ÷ ${numberFormat.format(plan.effectiveXpPerAction)})`}</code><strong>{numberFormat.format(plan.actions)}</strong></div>
                {fishing && <div className="formula-row"><span>Average cast</span><code>({fishing.minSeconds}s + {fishing.maxSeconds}s) ÷ 2</code><strong>{numberFormat.format(effectiveInterval)}s</strong></div>}
                {mining && <div className="formula-row"><span>Average rock break</span><code>{numberFormat.format(mining.hitTiming.expectedHits)} hits × {mining.hitTiming.secondsPerHit}s</code><strong>{numberFormat.format(effectiveInterval)}s</strong></div>}
                {artisan && artisanSteps !== null && <div className="formula-row"><span>Time per batch</span><code>{numberFormat.format(artisanSteps)} steps × {artisan.secondsPerStep}s</code><strong>{formatDuration(effectiveInterval)}</strong></div>}
                <div className="formula-row"><span>{timingEstimated ? 'Expected active time' : 'Base active time'}</span><code>{herblore
                  ? `${numberFormat.format(Math.ceil(plan.actions / bottlingsPerBrew))} × ${herblore.brewTiming.preparation}s + ${numberFormat.format(plan.actions)} × ${herblore.brewTiming.bottling}s`
                  : thievingPlan ? `${numberFormat.format(thievingPlan.expectedAttempts)} × ${effectiveInterval}s + ${numberFormat.format(thievingPlan.expectedFailures)} × ${baseStunSeconds}s`
                    : agilityPlan ? `${numberFormat.format(plan.actions)} × ${numberFormat.format(agilitySecondsPerCompletion ?? 0)}s average per completion`
                    : `${numberFormat.format(cookingPlan?.expectedAttempts ?? plan.actions)} × ${numberFormat.format(huntingPlan?.secondsPerCatch ?? effectiveInterval)}s`}</code><strong>{formatDuration(plan.trainingSeconds)}</strong></div>
                {!fishing && primaryResult && <div className="formula-row"><span>Primary output</span><code>{numberFormat.format(plan.actions)} × {primaryResult.quantity}{doublingPercentage > 0 && ` × (1 + ${doublingPercentage}%)`}</code><strong>{numberFormat.format(primaryResult.produced)}</strong></div>}
                {!!overgrowth && overgrowth.boostedCuts > 0 && <div className="formula-row"><span>Overgrowth output</span><code>{numberFormat.format(overgrowth.boostedCuts)} boosted cuts · {numberFormat.format(overgrowth.remainingStacks)} stacks left</code><strong>+{numberFormat.format(overgrowth.expectedExtraPrimary)}</strong></div>}
              </details>
            </div>
          </section>

          <section className="source-strip">
            <div className="source-icon"><BookOpen size={16} /></div>
            <div className="source-copy"><strong>Source and confidence</strong><span>{woodcutting
              ? 'Drop estimates use published recipe rates and supported permanent bonuses.'
              : hunting ? 'Estimates assume an already-discovered animal at the entered journal level. XP comes from catches. Yields cover standard catch items, including their rare-species multiplier.'
                : agility ? 'Estimates use technique progression and entered modifiers. Loot projections cover fixed completion rewards.'
                  : astrology ? 'Estimates cover XP and Knowledge from observations. Random sightings and temporary event effects are outside the estimate.'
                    : beastcrafting ? 'Estimates use release recipe data, supported station purchases, and manual bonuses. Quest recipes require their active quest step.'
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
            <p>{passiveSkills.has(selectedSkill) ? 'Passive skill progress is shown below when a save is imported.' : 'This calculator is planned. Select an available skill to make a training estimate.'}</p>
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
