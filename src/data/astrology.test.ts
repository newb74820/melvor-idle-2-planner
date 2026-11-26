import { expect, it } from 'vitest';
import {
  astrologyActions, astrologyObservationSeconds, availableAstrologyNodes, calculateAstrologyPlan,
  nextAstrologyThreshold, resolveAstrologyTelescopes,
} from './astrology';
import { skillCalculators } from './skill-calculators';

const deedree = astrologyActions[0];

it('registers the 12 constellations and projects both XP and Knowledge', () => {
  expect(skillCalculators.Astrology.actions).toHaveLength(12);
  expect(deedree.requirements).toEqual([['Woodcutting', 8], ['Farming', 6]]);
  const plan = calculateAstrologyPlan({ action: deedree, currentXp: 0, targetXp: 83 }, 10, 0);
  expect(plan).toMatchObject({ actions: 21, xpGained: 84, trainingSeconds: 63, projectedKnowledge: 31 });
});

it('uses the next minor threshold and preserves separately unlocked major nodes', () => {
  expect(nextAstrologyThreshold(66)).toBe(178);
  expect(nextAstrologyThreshold(65_896)).toBeUndefined();
  expect(availableAstrologyNodes(582, 4, 0)).toEqual({ minor: 1, major: 1 });
  expect(availableAstrologyNodes(582, 4, 1)).toEqual({ minor: 1, major: 0 });
  const plan = calculateAstrologyPlan({ action: deedree, currentXp: 0, targetXp: 0 }, 10, 4, 12);
  expect(plan).toMatchObject({ actions: 2, xpGained: 8, trainingSeconds: 6, knowledgePerObservation: 1.04 });
  expect(plan.projectedKnowledge).toBeCloseTo(12.08);
  const reached = calculateAstrologyPlan({ action: deedree, currentXp: 0, targetXp: 0 }, 13, 4, 12);
  expect(reached.actions).toBe(0);
});

it('stacks each purchased telescope once', () => {
  const bonuses = resolveAstrologyTelescopes({ version: 32, demo: false, shopPurchases: {
    'MelvorBase:CopperTelescope': 2,
    'MelvorBase:IronTelescope': 1,
    'MelvorBase:DragonTelescope': 1,
    'MelvorBase:SteelTelescope': 0,
  } });
  expect(bonuses).toMatchObject({ intervalReduction: 4, xp: 4, knowledge: 10 });
  expect(astrologyObservationSeconds(3, bonuses.intervalReduction)).toBe(2.88);
});
