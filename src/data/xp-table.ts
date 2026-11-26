export const xpTableSource = {
  name: 'Melvor2 XP Table',
  url: 'https://melvor2.com/xp-table/',
  gameVersion: 'Early Access build 26724394',
  retrievedAt: '2026-11-26',
  verification: 'Community reference labeled as sourced from game files',
  levelCap: 99,
} as const;

export const xpAtLevelTable = [
  0, 83, 174, 276, 388, 512, 650, 801, 969, 1154,
  1358, 1583, 1832, 2107, 2410, 2745, 3115, 3523, 3973, 4470,
  5018, 5623, 6291, 7028, 7841, 8739, 9730, 10823, 12030, 13362,
  14832, 16455, 18246, 20223, 22405, 24813, 27472, 30407, 33646, 37222,
  41170, 45527, 50338, 55648, 61510, 67982, 75126, 83013, 91719, 101331,
  111943, 123658, 136592, 150871, 166634, 184038, 203252, 224464, 247884, 273740,
  302286, 333802, 368597, 407013, 449426, 496252, 547951, 605030, 668048, 737625,
  814442, 899254, 992892, 1096275, 1210418, 1336440, 1475578, 1629197, 1798805, 1986065,
  2192815, 2421084, 2673111, 2951370, 3258591, 3597789, 3972291, 4385773, 4842292, 5346329,
  5902828, 6517250, 7195626, 7944611, 8771555, 9684574, 10692626, 11805603, 13034427, 14391157,
  15889106, 17542973, 19368988, 21385070, 23611002, 26068628, 28782065, 31777939, 35085651, 38737657,
  42769797, 47221638, 52136865, 57563714, 63555439, 70170836, 77474824, 85539078, 94442733, 104273162,
] as const;

export function xpAtLevel(level: number): number {
  if (!Number.isInteger(level) || level < 1 || level > xpAtLevelTable.length) {
    throw new RangeError(`Level must be an integer from 1 to ${xpAtLevelTable.length}.`);
  }
  return xpAtLevelTable[level - 1];
}

export function levelForXp(totalXp: number): number {
  if (!Number.isFinite(totalXp) || totalXp < 0) {
    throw new RangeError('Total XP must be finite and non-negative.');
  }

  let low = 0;
  let high = xpTableSource.levelCap - 1;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (xpAtLevelTable[middle] <= totalXp) low = middle;
    else high = middle - 1;
  }
  return low + 1;
}

// A completed action earns XP at its starting level, even when it crosses several thresholds.
export function* completionsByLevel(currentXp: number, xpPerCompletion: number, completions: number) {
  let previous = 0;
  for (let level = levelForXp(currentXp); level <= xpTableSource.levelCap && previous < completions; level++) {
    const throughLevel = level === xpTableSource.levelCap
      ? completions
      : Math.min(completions, Math.ceil((xpAtLevel(level + 1) - currentXp) / xpPerCompletion));
    if (throughLevel > previous) yield { level, count: throughLevel - previous };
    previous = throughLevel;
  }
}
