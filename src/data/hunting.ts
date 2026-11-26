import { calculateActionPlan, calculateResourceCosts, type CalculationInput } from '../calculator';
import { huntingTraps, type HuntingAction, type HuntingTrap } from './hunting-animals';

export const traplessId = 'trapless';

export interface HuntingSettings {
  trapsByType?: Record<string, string>;
  useBait?: boolean;
  journalLevels?: Record<string, number>;
}

export function selectedHuntingTrap(
  action: HuntingAction,
  settings: HuntingSettings,
  inventory: Readonly<Record<string, number>>,
): HuntingTrap | null {
  const compatible = huntingTraps.filter((trap) => trap.type === action.hunt.trapType);
  const id = settings.trapsByType?.[action.hunt.trapType];
  if (id === traplessId && action.hunt.trapless) return null;
  return compatible.find((trap) => trap.itemId === id)
    ?? compatible.find((trap) => (inventory[trap.itemId] ?? 0) > 0)
    ?? compatible[0];
}

const clampChance = (value: number) => Math.min(1, Math.max(0, value));
const midpoint = ([min, max]: [number, number]) => (min + max) / 2;

function trappingRates(trap: HuntingTrap | null, traplessBonus: number, manualDoubling: number) {
  const firstCatchChance = 0.4 + (trap?.success ?? traplessBonus);
  const retryBonus = trap?.successPerFailure ?? 0;
  const initialDoubling = manualDoubling + (trap?.doubling ?? 0);
  if (retryBonus === 0) {
    return { firstCatchChance, attempts: 1 / firstCatchChance, doubling: clampChance(initialDoubling) };
  }

  let remaining = 1;
  let attempts = 0;
  let doubling = 0;
  for (let failures = 0; remaining > 0; failures++) {
    const chance = clampChance(firstCatchChance + failures * retryBonus);
    attempts += remaining;
    doubling += remaining * chance * clampChance(initialDoubling + failures * (trap?.doublingPerFailure ?? 0));
    remaining *= 1 - chance;
  }
  return { firstCatchChance, attempts, doubling };
}

// The mean of the catch's independent size and weight rolls has a triangular distribution.
function meanDrop(quantity: number, journalLevel: number, multiplier: number): number {
  const min = 0.5 + journalLevel / 100;
  const width = 0.8;
  const guaranteed = Math.max(multiplier, Math.floor(quantity * multiplier * min));
  const uncertain = Math.floor(quantity * multiplier * (min + width)) - guaranteed;
  let expected = guaranteed;
  for (let offset = 1; offset <= uncertain; offset++) {
    const relative = clampChance(((guaranteed + offset) / (quantity * multiplier) - min) / width);
    expected += relative < 0.5 ? 1 - 2 * relative ** 2 : 2 * (1 - relative) ** 2;
  }
  return expected;
}

export function calculateHuntingPlan(
  input: CalculationInput & { action: HuntingAction },
  trap: HuntingTrap | null,
  useBait = false,
  journalLevel = 1,
) {
  const { action, flatXpBonus = 0, outputDoublingChance = 0, inventory = {} } = input;
  const { hunt } = action;
  if ((trap && trap.type !== hunt.trapType) || (!trap && !hunt.trapless)) throw new RangeError('Select a compatible trap.');
  if (!Number.isSafeInteger(journalLevel) || journalLevel < 1 || !(outputDoublingChance >= 0 && outputDoublingChance <= 1)) {
    throw new RangeError('Hunting requires a positive journal level and a doubling chance between 0 and 1.');
  }
  const bait = useBait ? hunt.bait : undefined;
  const rates = trappingRates(trap, hunt.trapless?.chanceBonus ?? 0, outputDoublingChance);
  const trappingTime = midpoint(hunt.trappingSeconds) * (bait ? 0.9 : 1);
  const trackingStepTime = midpoint(hunt.trackingSeconds);
  const surveyingTime = (1 + 0.5 + 0.25) * hunt.surveySeconds;
  const trackingTime = (midpoint(hunt.trackingSteps) + (rates.attempts - 1) * hunt.trackingSteps[0]) * trackingStepTime;
  const secondsPerCatch = surveyingTime + trackingTime + rates.attempts * trappingTime;
  const averageStat = 0.9 + journalLevel / 100;
  const normalChance = (1 - rates.doubling) * (1 - hunt.rareChance);
  const doubleChance = rates.doubling * (1 - hunt.rareChance) + (1 - rates.doubling) * hunt.rareChance;
  const quadrupleChance = rates.doubling * hunt.rareChance;
  const plan = calculateActionPlan({
    ...input,
    action: {
      ...action, baseXp: action.baseXp * averageStat,
      outputs: hunt.catchDrops.map(({ chance, ...item }) => ({
        ...item,
        quantity: chance * (
          normalChance * meanDrop(item.quantity, journalLevel, 1) +
          doubleChance * meanDrop(item.quantity, journalLevel, 2) +
          quadrupleChance * meanDrop(item.quantity, journalLevel, 4)
        ),
      })),
    },
    flatXpBonus: flatXpBonus * averageStat,
    outputDoublingChance: 0,
    effectiveIntervalSeconds: secondsPerCatch,
  });
  const trappingAttempts = plan.actions * rates.attempts;
  const budget = [
    ...(trap ? [{ ...trap, attempts: Math.max(plan.actions > 0 ? 1 : 0, Math.ceil(trappingAttempts * (1 - trap.preservation))) }] : []),
    ...(bait ? [{ ...bait, attempts: Math.ceil(trappingAttempts) }] : []),
  ];
  return {
    ...plan,
    trappingAttempts, secondsPerCatch, averageStat, firstCatchChance: rates.firstCatchChance,
    resources: budget.flatMap(({ itemId, itemName, quantity, attempts }) =>
      calculateResourceCosts([{ itemId, itemName, quantity }], attempts, inventory),
    ),
  };
}
