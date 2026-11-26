export interface ItemAmount {
  itemId: string;
  itemName: string;
  quantity: number;
}

export interface SkillAction {
  id: string;
  name: string;
  requiredLevel: number;
  baseXp: number;
  intervalSeconds: number;
  inputs: ItemAmount[];
  outputs: ItemAmount[];
}

export interface CalculationInput {
  action: SkillAction;
  currentXp: number;
  targetXp: number;
  flatXpBonus?: number;
  percentageXpBonus?: number;
  outputDoublingChance?: number;
  effectiveIntervalSeconds?: number;
  inventory?: Readonly<Record<string, number>>;
}

export interface ResourceCalculation extends ItemAmount {
  required: number;
  owned: number;
  missing: number;
  remaining: number;
}

export interface ProductCalculation extends ItemAmount {
  produced: number;
  owned: number;
  projected: number;
}

export interface CalculationResult {
  remainingXp: number;
  effectiveXpPerAction: number;
  actions: number;
  xpGained: number;
  xpOvershoot: number;
  trainingSeconds: number;
  xpPerHour: number;
  resources: ResourceCalculation[];
  products: ProductCalculation[];
}

export function calculateActionPlan(input: CalculationInput): CalculationResult {
  const { action, currentXp, targetXp } = input;
  const flatXpBonus = input.flatXpBonus ?? 0;
  const percentageXpBonus = input.percentageXpBonus ?? 0;
  const outputDoublingChance = input.outputDoublingChance ?? 0;
  const intervalSeconds = input.effectiveIntervalSeconds ?? action.intervalSeconds;

  if (!Number.isFinite(action.baseXp) || action.baseXp <= 0) {
    throw new RangeError('Action XP must be a positive finite number.');
  }
  if (!Number.isFinite(intervalSeconds) || intervalSeconds <= 0) {
    throw new RangeError('Action interval must be a positive finite number.');
  }
  if (!Number.isFinite(currentXp) || currentXp < 0 || !Number.isFinite(targetXp) || targetXp < 0) {
    throw new RangeError('XP values must be finite and non-negative.');
  }
  if (!Number.isFinite(flatXpBonus) || !Number.isFinite(percentageXpBonus) || percentageXpBonus <= -1) {
    throw new RangeError('XP modifiers must be finite and leave a positive XP multiplier.');
  }
  if (!Number.isFinite(outputDoublingChance) || outputDoublingChance < 0 || outputDoublingChance > 1) {
    throw new RangeError('Output doubling chance must be between 0 and 1.');
  }
  for (const item of [...action.inputs, ...action.outputs]) {
    if (!item.itemId || !item.itemName || !Number.isFinite(item.quantity) || item.quantity <= 0) {
      throw new RangeError('Action item quantities must be positive finite numbers with identifiers.');
    }
  }

  const inventory = input.inventory ?? {};
  for (const quantity of Object.values(inventory)) {
    if (!Number.isFinite(quantity) || quantity < 0) {
      throw new RangeError('Inventory quantities must be finite and non-negative.');
    }
  }

  const effectiveXpPerAction = (action.baseXp + flatXpBonus) * (1 + percentageXpBonus);
  if (!Number.isFinite(effectiveXpPerAction) || effectiveXpPerAction <= 0) {
    throw new RangeError('The selected modifiers must result in positive XP per action.');
  }

  const remainingXp = Math.max(0, targetXp - currentXp);
  const actions = Math.ceil(remainingXp / effectiveXpPerAction);
  const xpGained = actions * effectiveXpPerAction;
  const resources = action.inputs.map((item) => {
    const required = actions * item.quantity;
    const owned = inventory[item.itemId] ?? 0;
    return {
      ...item,
      required,
      owned,
      missing: Math.max(0, required - owned),
      remaining: Math.max(0, owned - required),
    };
  });
  const products = action.outputs.map((item) => {
    const produced = actions * item.quantity * (1 + outputDoublingChance);
    const owned = inventory[item.itemId] ?? 0;
    return { ...item, produced, owned, projected: owned + produced };
  });

  return {
    remainingXp,
    effectiveXpPerAction,
    actions,
    xpGained,
    xpOvershoot: xpGained - remainingXp,
    trainingSeconds: actions * intervalSeconds,
    xpPerHour: effectiveXpPerAction * (3600 / intervalSeconds),
    resources,
    products,
  };
}
