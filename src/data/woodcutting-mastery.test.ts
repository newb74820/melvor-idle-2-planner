import { expect, it } from 'vitest';
import { resolveWoodcuttingMastery } from './woodcutting-mastery';
import { expectedWoodcuttingInterval } from './woodcutting-modifiers';
import { woodcuttingActions } from './woodcutting';
import { xpAtLevel } from './xp-table';

const levelTaskIds = [76, 77, 78, 79, 80, 81];
const petId = 'MelvorBase:WoodcuttingPetTask1';

function saveWithMastery(level: number, completed: number[] | 'all', woodyUnlocked: boolean | null) {
  const tasks: Record<string, { goalComplete: boolean | null; triggerMet: boolean }> = {};
  for (let id = 1; id <= 118; id += 1) {
    if ([3, 6, 9, 33, 36, 86].includes(id)) continue;
    tasks[`MelvorBase:WoodcuttingTask${id}`] = {
      goalComplete: levelTaskIds.includes(id) ? null : completed === 'all' || completed.includes(id),
      triggerMet: true,
    };
  }
  tasks[petId] = { goalComplete: null, triggerMet: true };
  return {
    version: 32, demo: false, woodyUnlocked,
    skills: [{ name: 'Woodcutting', level: null, xp: xpAtLevel(level) }],
    woodcuttingMasteryTasks: tasks,
  };
}

it('combines saved completions with the level milestones from the captured run', () => {
  const save = saveWithMastery(33, [1, 4, 7, 31, 70], false);
  save.woodcuttingMasteryTasks['MelvorBase:WoodcuttingTask43'].goalComplete = null;
  expect(resolveWoodcuttingMastery(save)).toMatchObject({
    confirmedPoints: 8, possiblePoints: 8, totalPoints: 413,
    rank: { name: 'Woodcutting Initiate' }, nextRank: { threshold: 21 },
    xpPercentage: 0, doubleDamagePercentage: 0,
  });
  save.woodyUnlocked = true;
  expect(resolveWoodcuttingMastery(save)?.confirmedPoints).toBe(20);
  save.woodcuttingMasteryTasks['MelvorBase:WoodcuttingTask10'].goalComplete = true;
  expect(resolveWoodcuttingMastery(save)).toMatchObject({
    confirmedPoints: 21, rank: { name: 'Apprentice Woodcutter' }, xpPercentage: 10,
  });
});

it('respects trigger flags and withholds bonuses for an uncertain rank', () => {
  const save = saveWithMastery(33, [1, 4, 7, 10, 13, 31, 70], null);
  save.woodcuttingMasteryTasks['MelvorBase:WoodcuttingTask13'].triggerMet = false;
  expect(resolveWoodcuttingMastery(save)).toMatchObject({
    confirmedPoints: 9, possiblePoints: 21,
    rank: { name: 'Woodcutting Initiate' }, possibleRank: { name: 'Apprentice Woodcutter' },
    xpPercentage: 0,
  });
  delete save.woodcuttingMasteryTasks[petId];
  expect(resolveWoodcuttingMastery(save)).toBeNull();
});

it('stacks confirmed rank rewards and applies the HP reduction after flat changes', () => {
  const mastery = resolveWoodcuttingMastery(saveWithMastery(99, 'all', true));
  expect(mastery).toMatchObject({
    confirmedPoints: 413, rank: { name: 'Expert Woodcutter' }, nextRank: null,
    xpPercentage: 20, doubleDamagePercentage: 10, healthReductionPercentage: 20, nestQuantityBonus: 1,
  });
  const teak = woodcuttingActions.find(({ id }) => id === 'teak-tree')!;
  const maple = woodcuttingActions.find(({ id }) => id === 'maple-tree')!;
  const debris = woodcuttingActions.find(({ id }) => id === 'wood-debris')!;
  expect(expectedWoodcuttingInterval(teak, 0, 0, 0, 1, 20)).toBe(4);
  expect(expectedWoodcuttingInterval(maple, 0, 0, 0, 1, 20)).toBe(6);
  expect(expectedWoodcuttingInterval(debris, 0.1, 0, 0, 0, 20)).toBe(30);
});
