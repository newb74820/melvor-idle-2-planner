import type { ItemAmount, SkillAction } from './calculator';

export type Inventory = Readonly<Record<string, number>>;

export function mergePlanningInventory(bank: Inventory = {}, overrides: Inventory = {}, useBank = true): Inventory {
  return { ...(useBank ? bank : {}), ...overrides };
}

export interface ResourceRecipe extends SkillAction {
  skill: string;
  source: string;
  prerequisiteNote?: string;
  kind?: 'gathering' | 'purchase';
  // One successful roll yields the listed batch. Random co-products are excluded.
  outputChance?: number;
  hitTiming?: { expectedHits: number; maximumHits: number; secondsPerHit: number };
  currencyCosts?: readonly { id: string; name: string; quantity: number }[];
}

interface PlanInput {
  target: ItemAmount;
  recipes: readonly ResourceRecipe[];
  inventory?: Inventory;
  skillLevels?: Inventory;
  recipeChoices?: Readonly<Record<string, string>>;
  allowEstimatedYields?: boolean;
  currencyBalances?: Readonly<Record<string, bigint>>;
}

export interface PlanNode extends ItemAmount {
  fromInventory: number;
  fromProduction: number;
  external: number;
  reason?: 'missing recipe' | 'circular dependency' | 'chance-based source excluded';
  recipe?: ResourceRecipe;
  batches?: number;
  children: PlanNode[];
}

interface ItemBalance extends ItemAmount {
  owned: number;
  allocated: number;
  produced: number;
  expectedProduced: number;
  external: number;
  remaining: number;
  surplus: number;
}

export function planResources({
  target, recipes, inventory = {}, skillLevels, recipeChoices = {}, allowEstimatedYields = false, currencyBalances,
}: PlanInput) {
  if (!Number.isSafeInteger(target.quantity) || target.quantity < 1) {
    throw new RangeError('Enter a positive whole item quantity.');
  }

  const recipesByOutput = new Map<string, ResourceRecipe[]>();
  const recipeIds = new Set<string>();
  for (const recipe of recipes) {
    const outputIds = new Set(recipe.outputs.map(({ itemId }) => itemId));
    if (recipeIds.has(recipe.id) || outputIds.size !== recipe.outputs.length ||
      !Number.isFinite(recipe.intervalSeconds) || recipe.intervalSeconds < 0 ||
      !Number.isFinite(recipe.baseXp) || recipe.baseXp < 0 ||
      [...recipe.inputs, ...recipe.outputs, ...(recipe.currencyCosts ?? [])].some(({ quantity }) => !Number.isSafeInteger(quantity) || quantity < 1) ||
      (recipe.outputChance !== undefined && (
        !(recipe.outputChance > 0 && recipe.outputChance < 1) || recipe.outputs.length !== 1 || recipe.kind === 'purchase'
      ))) {
      throw new RangeError(`Invalid resource recipe: ${recipe.name}.`);
    }
    recipeIds.add(recipe.id);
    for (const { itemId } of recipe.outputs) {
      const candidates = recipesByOutput.get(itemId) ?? [];
      candidates.push(recipe);
      recipesByOutput.set(itemId, candidates);
    }
  }

  const bank = new Map(Object.entries(inventory));
  const surplus = new Map<string, number>();
  const balances = new Map<string, ItemBalance>();
  const steps: { recipe: ResourceRecipe; batches: number; seconds: number; xp: number }[] = [];
  const prerequisites = new Set<string>();
  const currencyCosts = new Map<string, { id: string; name: string; amount: bigint }>();

  function balanceFor(item: ItemAmount) {
    const existing = balances.get(item.itemId);
    if (existing) return existing;
    const owned = bank.get(item.itemId) ?? 0;
    if (!Number.isSafeInteger(owned) || owned < 0) throw new RangeError(`Invalid inventory for ${item.itemName}.`);
    const row = { ...item, quantity: 0, owned, allocated: 0, produced: 0, expectedProduced: 0, external: 0, remaining: owned, surplus: 0 };
    balances.set(item.itemId, row);
    return row;
  }

  const skillLevel = (recipe: ResourceRecipe) => skillLevels?.[recipe.skill];
  const isAvailable = (recipe: ResourceRecipe) =>
    !recipe.prerequisiteNote && (skillLevel(recipe) ?? 1) >= recipe.requiredLevel;

  function chooseRecipe(itemId: string) {
    const candidates = recipesByOutput.get(itemId) ?? [];
    if (recipeChoices[itemId]) {
      const chosen = candidates.find((candidate) => candidate.id === recipeChoices[itemId]);
      if (!chosen) throw new RangeError('The selected source does not produce the requested item.');
      return chosen.outputChance === undefined || allowEstimatedYields ? chosen : undefined;
    }
    const secondsPerItem = (recipe: ResourceRecipe) =>
      recipe.intervalSeconds / (recipe.outputs.find((output) => output.itemId === itemId)!.quantity * (recipe.outputChance ?? 1));
    return candidates.filter((candidate) => candidate.outputChance === undefined || allowEstimatedYields).sort((a, b) =>
      Number(isAvailable(b)) - Number(isAvailable(a)) ||
      Number(a.kind === 'purchase') - Number(b.kind === 'purchase') ||
      Number(a.outputChance !== undefined) - Number(b.outputChance !== undefined) ||
      secondsPerItem(a) - secondsPerItem(b))[0];
  }

  function fulfill(request: ItemAmount, ancestry: ReadonlySet<string>): PlanNode {
    const { itemId, quantity } = request;
    const balance = balanceFor(request);
    balance.quantity += quantity;
    const owned = bank.get(itemId) ?? 0;
    const fromInventory = Math.min(quantity, owned);
    bank.set(itemId, owned - fromInventory);
    balance.allocated += fromInventory;
    const producedStock = surplus.get(itemId) ?? 0;
    const fromProduction = Math.min(quantity - fromInventory, producedStock);
    surplus.set(itemId, producedStock - fromProduction);
    const missing = quantity - fromInventory - fromProduction;
    const node: PlanNode = { ...request, fromInventory, fromProduction, external: 0, children: [] };
    if (missing === 0) return node;

    const circular = ancestry.has(itemId);
    const recipe = circular ? undefined : chooseRecipe(itemId);
    if (!recipe) {
      balance.external += missing;
      const randomSource = (recipesByOutput.get(itemId) ?? []).some((candidate) => candidate.outputChance !== undefined);
      return { ...node, external: missing, reason: circular ? 'circular dependency' :
        randomSource && !allowEstimatedYields ? 'chance-based source excluded' : 'missing recipe' };
    }

    const output = recipe.outputs.find((item) => item.itemId === itemId)!;
    const successfulBatches = Math.ceil(missing / output.quantity);
    const batches = Math.ceil(successfulBatches / (recipe.outputChance ?? 1));
    if (!Number.isSafeInteger(batches)) throw new RangeError('The plan exceeds the supported quantity range.');
    const path = new Set([...ancestry, itemId]);
    const children = recipe.inputs.map((ingredient) => {
      const required = ingredient.quantity * batches;
      if (!Number.isSafeInteger(required)) throw new RangeError('The plan exceeds the supported quantity range.');
      return fulfill({ ...ingredient, quantity: required }, path);
    });
    for (const product of recipe.outputs) {
      const produced = batches * product.quantity;
      if (!Number.isSafeInteger(produced)) throw new RangeError('The plan exceeds the supported quantity range.');
      if (recipe.outputChance !== undefined) {
        // An estimated yield can satisfy this branch for planning, but adds no reusable stock.
        balanceFor(product).expectedProduced += produced * recipe.outputChance;
        continue;
      }
      const remaining = (surplus.get(product.itemId) ?? 0) + produced - (product.itemId === itemId ? missing : 0);
      if (!Number.isSafeInteger(remaining)) {
        throw new RangeError('The plan exceeds the supported quantity range.');
      }
      balanceFor(product).produced += produced;
      surplus.set(product.itemId, remaining);
    }
    for (const cost of recipe.currencyCosts ?? []) {
      const total = currencyCosts.get(cost.id) ?? { id: cost.id, name: cost.name, amount: 0n };
      total.amount += BigInt(cost.quantity) * BigInt(batches);
      currencyCosts.set(cost.id, total);
    }
    const level = skillLevel(recipe);
    if (recipe.requiredLevel > (level ?? 1)) {
      prerequisites.add(level === undefined
        ? `Verify ${recipe.skill} level ${recipe.requiredLevel} for ${recipe.name}.`
        : `${recipe.name} requires ${recipe.skill} level ${recipe.requiredLevel} (current level ${level}).`);
    }
    if (recipe.prerequisiteNote) prerequisites.add(recipe.prerequisiteNote);
    steps.push({ recipe, batches, seconds: batches * recipe.intervalSeconds, xp: batches * recipe.baseXp });
    return { ...node, recipe, batches, children };
  }

  const tree = fulfill(target, new Set());
  const items = [...balances.values()].map((row) => {
    const leftover = surplus.get(row.itemId) ?? 0;
    return { ...row, surplus: leftover, remaining: (bank.get(row.itemId) ?? 0) + leftover };
  });
  const skills = new Map<string, { skill: string; batches: number; seconds: number; xp: number }>();
  for (const { recipe, batches, seconds, xp } of steps) {
    if (recipe.kind === 'purchase') continue;
    const totals = skills.get(recipe.skill) ?? { skill: recipe.skill, batches: 0, seconds: 0, xp: 0 };
    skills.set(recipe.skill, { skill: recipe.skill, batches: totals.batches + batches, seconds: totals.seconds + seconds, xp: totals.xp + xp });
  }
  return {
    tree, items, steps, skills: [...skills.values()], prerequisites: [...prerequisites],
    external: items.filter((row) => row.external > 0),
    currencies: [...currencyCosts.values()].map((cost) => {
      const available = currencyBalances?.[cost.id] ?? null;
      const shortage = available === null || available >= cost.amount ? 0n : cost.amount - available;
      return { ...cost, available, shortage };
    }),
    hasEstimatedYields: steps.some(({ recipe }) => recipe.outputChance !== undefined),
    activeSeconds: steps.reduce((total, step) => total + step.seconds, 0),
  };
}
