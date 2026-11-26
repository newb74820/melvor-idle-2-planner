import type { DecodedSave } from '../schemas/save';
import { levelForXp } from './xp-table';

export const woodcuttingMasterySource = 'https://db.melvor.aevv.net/entity/Woodcutting';

// Build 26724394 task IDs, grouped by the category's point value.
const taskGroups = [
  { points: 1, ids: [76, 1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34, 37, 40, 43, 46, 49, 52, 70, 82, 106, 112] },
  { points: 2, ids: [77, 2, 5, 8, 11, 14, 17, 20, 26, 29, 32, 35, 38, 41, 44, 47, 53, 55, 58, 61, 64, 67, 71, 83, 92, 95, 99, 107, 113] },
  { points: 3, ids: [78, 12, 15, 18, 21, 23, 27, 30, 39, 42, 45, 48, 50, 54, 56, 59, 62, 65, 68, 72, 84, 93, 96, 100, 108, 114] },
  { points: 5, ids: [79, 24, 51, 57, 60, 63, 66, 69, 73, 85, 118, 88, 94, 97, 101, 105, 109, 115] },
  { points: 8, ids: [80, 74, 87, 89, 90, 98, 102, 103, 110, 116] },
  { points: 12, ids: [81, 75, 91, 104, 111, 117] },
] as const;

const levelTasks = new Map([[76, 10], [77, 30], [78, 60], [79, 80], [80, 92], [81, 99]]);
const petTaskId = 'MelvorBase:WoodcuttingPetTask1';
const masteryTasks = [
  ...taskGroups.flatMap(({ points, ids }) => ids.map((id) => ({
    id: `MelvorBase:WoodcuttingTask${id}`,
    points,
    requiredLevel: levelTasks.get(id),
  }))),
  { id: petTaskId, points: 12, requiredLevel: undefined },
];
const totalPoints = masteryTasks.reduce((total, task) => total + task.points, 0);
const ranks = [
  { name: 'Woodcutting Initiate', percentage: 0 },
  { name: 'Apprentice Woodcutter', percentage: 5 },
  { name: 'Journeyman Woodcutter', percentage: 10 },
  { name: 'Skilled Woodcutter', percentage: 20 },
  { name: 'Veteran Woodcutter', percentage: 40 },
  { name: 'Prime Woodcutter', percentage: 65 },
  { name: 'Expert Woodcutter', percentage: 100 },
].map((rank) => ({ ...rank, threshold: Math.ceil(totalPoints * rank.percentage / 100) }));

export function resolveWoodcuttingMastery(
  save: Pick<DecodedSave, 'version' | 'demo' | 'skills' | 'woodcuttingMasteryTasks' | 'woodyUnlocked'> | null,
) {
  const savedTasks = save?.woodcuttingMasteryTasks;
  if (save?.version !== 32 || save.demo || !savedTasks || Object.keys(savedTasks).length !== masteryTasks.length) return null;

  const skill = save.skills.find(({ name }) => name.toLowerCase() === 'woodcutting');
  const level = skill ? levelForXp(skill.xp) : null;
  let confirmedPoints = 0;
  let possiblePoints = 0;
  for (const { id, points, requiredLevel } of masteryTasks) {
    const task = savedTasks[id];
    const isPetTask = id === petTaskId;
    const isCondition = isPetTask || requiredLevel !== undefined;
    if (!task || (isCondition && task.goalComplete !== null)) return null;
    if (!task.triggerMet) continue;

    // Progress goals can have no saved payload before the first matching event.
    let complete: boolean | null = task.goalComplete ?? false;
    if (isPetTask) complete = save.woodyUnlocked ?? null;
    if (requiredLevel !== undefined) complete = level === null ? null : level >= requiredLevel;
    if (complete === true) confirmedPoints += points;
    if (complete !== false) possiblePoints += points;
  }

  const rankFor = (points: number) => ranks.reduce((index, entry, current) => entry.threshold <= points ? current : index, 0);
  const rankIndex = rankFor(confirmedPoints);
  const rank = ranks[rankIndex];
  const possibleRank = ranks[rankFor(possiblePoints)];
  return {
    confirmedPoints,
    possiblePoints,
    totalPoints,
    rank,
    possibleRank,
    nextRank: ranks[rankIndex + 1] ?? null,
    xpPercentage: (rankIndex >= 1 ? 10 : 0) + (rankIndex >= 4 ? 10 : 0),
    doubleDamagePercentage: rankIndex >= 2 ? 10 : 0,
    healthReductionPercentage: rankIndex >= 4 ? 20 : 0,
    nestQuantityBonus: rankIndex >= 3 ? 1 : 0,
  };
}
