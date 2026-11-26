import { calculateActionPlan, type CalculationInput, type SkillAction } from '../calculator';
import type { DecodedSave } from '../schemas/save';
import type { SkillId } from './skills';

export const astrologySource = 'https://db.melvor.aevv.net/entity/Astrology';
export const minorKnowledgeThresholds = [
  12, 66, 178, 290, 582, 1194, 2374, 3554, 5744, 9076, 14426, 19776, 27842, 38640, 52268, 65896,
] as const;

type Requirement = readonly [skill: SkillId, level: number];
type Constellation = readonly [id: string, level: number, xp: number, first: Requirement, alternative: Requirement];

// Steam build 26886380. Secondary skill requirements are alternatives.
const constellations = [
  ['Deedree', 1, 4, ['Woodcutting', 8], ['Farming', 6]],
  ['Terra', 10, 7, ['Mining', 8], ['Strength', 8]],
  ['Ameria', 25, 10, ['Fishing', 8], ['Firemaking', 8]],
  ['Ceedyr', 35, 12, ['Hunting', 8], ['Beastcrafting', 8]],
  ['Iridan', 45, 15, ['Smithing', 8], ['Attack', 8]],
  ['Syllia', 55, 21, ['Fletching', 8], ['Ranged', 8]],
  ['Arachi', 70, 31, ['Runecrafting', 8], ['Magic', 8]],
  ['Hyden', 80, 35, ['Crafting', 8], ['Prayer', 8]],
  ['Vale', 85, 39, ['Cooking', 8], ['Hitpoints', 14]],
  ['Ko', 90, 42, ['Agility', 8], ['Thieving', 8]],
  ['Tellus', 92, 45, ['Defence', 8], ['Slayer', 8]],
  ['Qimican', 95, 47, ['Herblore', 8], ['Ranching', 6]],
] as const satisfies readonly Constellation[];

export interface AstrologyAction extends SkillAction {
  baseKnowledge: number;
  requirements: readonly Requirement[];
  prerequisiteNote: string;
  source: string;
}

export const astrologyActions: AstrologyAction[] = constellations.map(([id, requiredLevel, baseXp, first, alternative]) => ({
  id, name: id, requiredLevel, baseXp, baseKnowledge: 1, intervalSeconds: 3,
  requirements: [first, alternative],
  prerequisiteNote: `Requires ${first[0]} level ${first[1]} or ${alternative[0]} level ${alternative[1]}.`,
  inputs: [], outputs: [],
  source: `https://db.melvor.aevv.net/astrology-constellation/${id}`,
}));

type Telescope = readonly [material: string, intervalReduction: number, xp: number, knowledge: number];
const telescopes = ([
  ['Copper', 2, 0, 0],
  ['Iron', 0, 2, 5],
  ['Steel', 2, 0, 0],
  ['Mithril', 0, 2, 5],
  ['Adamant', 2, 0, 0],
  ['Rune', 0, 2, 5],
  ['Dawnsteel', 2, 0, 0],
  ['Dragon', 2, 2, 5],
] as const satisfies readonly Telescope[]).map(([material, intervalReduction, xp, knowledge]) => ({
  id: `${material}Telescope`, name: `${material} Telescope`, intervalReduction, xp, knowledge,
}));

export function resolveAstrologyTelescopes(save: Pick<DecodedSave, 'version' | 'demo' | 'shopPurchases'> | null) {
  const purchases = save?.version === 32 && !save.demo ? save.shopPurchases : undefined;
  const purchased = telescopes.filter(({ id }) => (purchases?.[`MelvorBase:${id}`] ?? 0) > 0);
  return {
    purchased,
    intervalReduction: purchased.reduce((total, telescope) => total + telescope.intervalReduction, 0),
    xp: purchased.reduce((total, telescope) => total + telescope.xp, 0),
    knowledge: purchased.reduce((total, telescope) => total + telescope.knowledge, 0),
  };
}

export function astrologyObservationSeconds(base: number, intervalReduction: number) {
  return Math.max(0.001, Math.floor(Math.round(base * 1000) * (1 - intervalReduction / 100)) / 1000);
}

export function resolveAstrologyProgress(action: AstrologyAction, save: DecodedSave | null) {
  if (save?.version !== 32 || save.demo) return null;
  if (save.astrologyConstellations) {
    return save.astrologyConstellations[action.id] ?? { knowledge: 0, minorNodes: [], majorNodes: [] };
  }
  if (action.id !== 'Deedree' || !save.deedreeNodes) return null;
  return {
    knowledge: null,
    minorNodes: save.deedreeNodes.filter((id) => !id.startsWith('MelvorBase:DeedreeMajor')),
    majorNodes: save.deedreeNodes.filter((id) => id.startsWith('MelvorBase:DeedreeMajor')),
  };
}

export function nextAstrologyThreshold(knowledge: number) {
  return minorKnowledgeThresholds.find((threshold) => threshold > knowledge);
}

export function availableAstrologyNodes(knowledge: number, unlockedMinor: number, unlockedMajor: number) {
  const earnedMinor = minorKnowledgeThresholds.filter((threshold) => threshold <= knowledge).length;
  return {
    minor: Math.max(0, earnedMinor - unlockedMinor),
    major: Math.max(0, Math.floor(unlockedMinor / 4) - unlockedMajor),
  };
}

export function calculateAstrologyPlan(
  input: CalculationInput & { action: AstrologyAction },
  knowledge: number,
  bonusKnowledgePercentage: number,
  targetKnowledge?: number,
) {
  const plan = calculateActionPlan(input);
  const knowledgePerObservation = input.action.baseKnowledge * (1 + bonusKnowledgePercentage / 100);
  const intervalSeconds = input.effectiveIntervalSeconds ?? input.action.intervalSeconds;
  const remainingKnowledge = targetKnowledge === undefined ? 0 : Math.max(0, targetKnowledge - knowledge);
  let actions = targetKnowledge === undefined ? plan.actions : Math.ceil(remainingKnowledge / knowledgePerObservation);
  // Decimal rate calculations can put an exact threshold infinitesimally above a whole count.
  if (targetKnowledge !== undefined && actions > 0 && (actions - 1) * knowledgePerObservation >= remainingKnowledge) actions--;
  const xpGained = actions * plan.effectiveXpPerAction;
  const knowledgeGained = actions * knowledgePerObservation;
  return {
    ...plan, actions, xpGained, knowledgePerObservation, knowledgeGained, remainingKnowledge,
    projectedKnowledge: knowledge + knowledgeGained,
    xpOvershoot: targetKnowledge === undefined ? plan.xpOvershoot : 0,
    trainingSeconds: actions * intervalSeconds,
  };
}
