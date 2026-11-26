import { describe, expect, it } from 'vitest';
import { calculateActionPlan, type SkillAction } from './calculator';
import { woodcuttingActions } from './data/woodcutting';
import { levelForXp, xpAtLevel, xpAtLevelTable } from './data/xp-table';

const normalTree: SkillAction = {
  id: 'normal-tree',
  name: 'Normal Tree',
  requiredLevel: 1,
  baseXp: 3,
  intervalSeconds: 3,
  inputs: [],
  outputs: [{ itemId: 'NormalLog', itemName: 'Normal Log', quantity: 1 }],
};

describe('calculateActionPlan', () => {
  it('calculates the published level 1 to 2 baseline', () => {
    const result = calculateActionPlan({ action: normalTree, currentXp: 0, targetXp: 83 });

    expect(result.actions).toBe(28);
    expect(result.trainingSeconds).toBe(84);
    expect(result.xpGained).toBe(84);
    expect(result.xpOvershoot).toBe(1);
    expect(result.products).toEqual([{
      itemId: 'NormalLog', itemName: 'Normal Log', quantity: 1,
      produced: 28, owned: 0, projected: 28,
    }]);
    expect(result.resources).toEqual([]);
  });

  it('applies flat and percentage bonuses without rounding intermediate XP', () => {
    const result = calculateActionPlan({
      action: normalTree,
      currentXp: 0,
      targetXp: 10,
      flatXpBonus: 0.5,
      percentageXpBonus: 0.1,
    });

    expect(result.effectiveXpPerAction).toBeCloseTo(3.85);
    expect(result.actions).toBe(3);
    expect(result.xpGained).toBeCloseTo(11.55);
  });

  it('returns zero actions when the target is already reached', () => {
    const result = calculateActionPlan({ action: normalTree, currentXp: 100, targetXp: 83 });

    expect(result.actions).toBe(0);
    expect(result.trainingSeconds).toBe(0);
  });

  it('rejects actions or modifiers that cannot produce positive XP', () => {
    expect(() => calculateActionPlan({
      action: { ...normalTree, baseXp: 0 },
      currentXp: 0,
      targetXp: 83,
    })).toThrow(RangeError);

    expect(() => calculateActionPlan({
      action: normalTree,
      currentXp: 0,
      targetXp: 83,
      flatXpBonus: -3,
    })).toThrow(RangeError);
  });

  it('calculates multiple resource costs against available inventory', () => {
    const result = calculateActionPlan({
      action: {
        ...normalTree,
        inputs: [
          { itemId: 'OakLog', itemName: 'Oak Log', quantity: 2 },
          { itemId: 'IronBar', itemName: 'Iron Bar', quantity: 1 },
        ],
        outputs: [{ itemId: 'Shield', itemName: 'Shield', quantity: 1 }],
      },
      currentXp: 0,
      targetXp: 10,
      inventory: { OakLog: 5, IronBar: 10, Shield: 2 },
    });

    expect(result.actions).toBe(4);
    expect(result.resources).toEqual([
      { itemId: 'OakLog', itemName: 'Oak Log', quantity: 2, required: 8, owned: 5, missing: 3, remaining: 0 },
      { itemId: 'IronBar', itemName: 'Iron Bar', quantity: 1, required: 4, owned: 10, missing: 0, remaining: 6 },
    ]);
    expect(result.products[0]).toMatchObject({ produced: 4, owned: 2, projected: 6 });
  });

  it('rejects invalid item and inventory quantities', () => {
    expect(() => calculateActionPlan({
      action: { ...normalTree, outputs: [{ itemId: 'NormalLog', itemName: 'Normal Log', quantity: 0 }] },
      currentXp: 0,
      targetXp: 83,
    })).toThrow(RangeError);
    expect(() => calculateActionPlan({
      action: normalTree,
      currentXp: 0,
      targetXp: 83,
      inventory: { NormalLog: -1 },
    })).toThrow(RangeError);
  });
});

describe('Early Access build 26724394 Woodcutting references', () => {
  // Base cycle and yield: https://db.melvor.aevv.net/entity/Woodcutting
  it.each([
    { id: 'normal-tree', level: 1, targetXp: 83, actions: 28, seconds: 84, gained: 84, product: 'NormalLog', quantity: 28 },
    { id: 'oak-tree', level: 10, targetXp: 1_358, actions: 26, seconds: 104, gained: 208, product: 'OakLog', quantity: 26 },
    { id: 'wood-debris', level: 10, targetXp: 1_237, actions: 2, seconds: 60, gained: 100, product: 'OakLog', quantity: 20 },
    { id: 'fort-gate', level: 39, targetXp: 33_729, actions: 2, seconds: 200, gained: 118, product: 'TeakLog', quantity: 60 },
    { id: 'redwood-tree', level: 92, targetXp: 6_517_418, actions: 1, seconds: 26, gained: 168, product: 'RedwoodLog', quantity: 1 },
  ])('matches the baseline for $id', ({ id, level, targetXp, actions, seconds, gained, product, quantity }) => {
    const action = woodcuttingActions.find((entry) => entry.id === id)!;
    expect(action.requiredLevel).toBe(level);
    const result = calculateActionPlan({
      action,
      currentXp: xpAtLevel(level),
      targetXp,
      inventory: { [product]: 7 },
    });

    expect(result).toMatchObject({
      actions,
      trainingSeconds: seconds,
      xpGained: gained,
      resources: [],
      products: [{ itemId: product, produced: quantity, owned: 7, projected: quantity + 7 }],
    });
  });
});

describe('XP thresholds', () => {
  it('matches exact early-access reference thresholds', () => {
    expect(xpAtLevel(1)).toBe(0);
    expect(xpAtLevel(2)).toBe(83);
    expect(xpAtLevel(99)).toBe(13_034_427);
    expect(xpAtLevel(120)).toBe(104_273_162);
    expect(xpAtLevelTable).toHaveLength(120);
  });

  it('maps partial progress to the level already reached', () => {
    expect(levelForXp(82)).toBe(1);
    expect(levelForXp(83)).toBe(2);
    expect(levelForXp(100)).toBe(2);
    expect(levelForXp(174)).toBe(3);
  });

  it('respects the cap and rejects unsupported levels or XP', () => {
    expect(levelForXp(xpAtLevel(99) - 1)).toBe(98);
    expect(levelForXp(xpAtLevel(99))).toBe(99);
    expect(levelForXp(200_000_000)).toBe(99);
    expect(() => xpAtLevel(0)).toThrow(RangeError);
    expect(() => xpAtLevel(121)).toThrow(RangeError);
    expect(() => levelForXp(-1)).toThrow(RangeError);
  });
});
