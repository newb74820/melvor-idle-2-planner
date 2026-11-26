import type { SkillAction } from '../calculator';

export const agilitySource = 'https://db.melvor.aevv.net/entity/Agility';
export const agilityTechniques = ['Climbing', 'Jumping', 'Evading', 'Balancing', 'Rappelling'] as const;
export type AgilityTechnique = typeof agilityTechniques[number];
export type AgilityTechniqueProgress = Partial<Record<AgilityTechnique, number>>;

// A null technique marks a trap. Intervals are in seconds.
type Obstacle = [technique: AgilityTechnique | null, difficulty: number, seconds: number, maxDamage: number];
type Path = [id: string, name: string, xp: number, techniqueXp: number, obstacles: Obstacle[]];
type Course = [
  name: string, group: string, requiredLevel: number, primaryTechnique: AgilityTechnique | null,
  tickets: number | null, tokens: number | null, prerequisiteNote: string | null, paths: Path[],
];

// Course and obstacle data from Steam build 26886380.
const courses: Course[] = [
  ['Climb 1', 'Climbing Grounds', 1, 'Climbing', null, null, null, [
    ['Climb1SimplePath', 'Simple Path', 3, 5,
      [['Climbing', 2, 2.0, 25], ['Climbing', 3, 3.0, 25]]],
  ]],
  ['Climb 2', 'Climbing Grounds', 5, 'Climbing', null, null, null, [
    ['Climb2SimplePath', 'Simple Path', 3, 7,
      [['Climbing', 5, 2.0, 32], ['Climbing', 4, 2.0, 32], ['Climbing', 5, 2.0, 32]]],
  ]],
  ['Climb 3', 'Climbing Grounds', 10, 'Climbing', null, null, null, [
    ['Climb3SimplePath', 'Simple Path', 13, 19,
      [['Climbing', 6, 4.0, 42], ['Climbing', 7, 2.0, 42], ['Climbing', 8, 4.0, 42]]],
    ['Climb3AdvancedPath', 'Advanced Path', 10, 19,
      [['Climbing', 7, 3.0, 42], ['Climbing', 8, 3.0, 42], ['Jumping', 7, 3.0, 42]]],
  ]],
  ['Climb 4', 'Climbing Grounds', 30, 'Climbing', null, null, null, [
    ['Climb4SimplePath', 'Simple Path', 55, 44,
      [['Climbing', 19, 5.0, 82], ['Climbing', 18, 5.0, 82], ['Climbing', 18, 6.0, 82], ['Climbing', 18, 4.0, 82]]],
    ['Climb4AdvancedPath', 'Advanced Path', 52, 44,
      [['Climbing', 20, 5.0, 82], ['Climbing', 19, 5.0, 82], ['Evading', 16, 5.0, 82], ['Climbing', 19, 6.0, 82]]],
  ]],
  ['Climb 5', 'Climbing Grounds', 50, 'Climbing', null, null, null, [
    ['Climb5SimplePath', 'Simple Path', 185, 132,
      [['Climbing', 25, 7.0, 147], ['Climbing', 23, 4.0, 147], ['Climbing', 27, 6.0, 147], ['Climbing', 23, 6.0, 147], ['Climbing', 22, 4.0, 147], ['Climbing', 24, 6.0, 147]]],
    ['Climb5AdvancedPath', 'Advanced Path', 196, 132,
      [['Climbing', 26, 4.0, 147], ['Climbing', 24, 7.0, 147], ['Balancing', 22, 7.0, 147], ['Climbing', 24, 5.0, 147], ['Climbing', 23, 6.0, 147], ['Balancing', 22, 4.0, 147]]],
  ]],
  ['Climb 6', 'Climbing Grounds', 70, 'Climbing', null, null, null, [
    ['Climb6SimplePath', 'Simple Path', 449, 516,
      [['Climbing', 28, 8.0, 195], ['Climbing', 27, 5.0, 195], ['Climbing', 25, 5.0, 195], ['Climbing', 28, 5.0, 195], ['Climbing', 25, 9.0, 195], ['Climbing', 25, 9.0, 195], ['Climbing', 31, 6.0, 195]]],
    ['Climb6AdvancedPath', 'Advanced Path', 478, 516,
      [['Climbing', 29, 7.0, 195], ['Climbing', 28, 7.0, 195], ['Rappelling', 26, 6.0, 195], ['Climbing', 29, 8.0, 195], ['Climbing', 26, 5.0, 195], ['Climbing', 26, 6.0, 195], ['Rappelling', 26, 9.0, 195]]],
  ]],
  ['Climb 7', 'Climbing Grounds', 90, 'Climbing', null, null, null, [
    ['Climb7SimplePath', 'Simple Path', 750, 1001,
      [['Climbing', 35, 10.0, 283], ['Climbing', 33, 9.0, 283], ['Climbing', 34, 6.0, 283], ['Climbing', 37, 5.0, 283], ['Climbing', 36, 9.0, 283], ['Climbing', 36, 5.0, 283], ['Climbing', 35, 5.0, 283], ['Climbing', 36, 8.0, 283]]],
    ['Climb7AdvancedPath', 'Advanced Path', 971, 1001,
      [['Climbing', 36, 6.0, 283], ['Jumping', 31, 10.0, 283], ['Evading', 31, 6.0, 283], ['Climbing', 38, 8.0, 283], ['Climbing', 37, 11.0, 283], ['Climbing', 37, 6.0, 283], ['Evading', 31, 10.0, 283], ['Jumping', 31, 10.0, 283]]],
  ]],
  ['Jump 1', 'Jumping Grounds', 10, 'Jumping', null, null, null, [
    ['Jump1SimplePath', 'Simple Path', 8, 10,
      [['Jumping', 3, 2.0, 42], ['Jumping', 4, 4.0, 42]]],
  ]],
  ['Jump 2', 'Jumping Grounds', 25, 'Jumping', null, null, null, [
    ['Jump2SimplePath', 'Simple Path', 34, 31,
      [['Jumping', 13, 4.0, 72], ['Jumping', 14, 5.0, 72], ['Jumping', 14, 5.0, 72]]],
    ['Jump2AdvancedPath', 'Advanced Path', 24, 31,
      [['Jumping', 14, 3.0, 72], ['Jumping', 15, 3.0, 72], ['Evading', 12, 5.0, 72]]],
  ]],
  ['Jump 3', 'Jumping Grounds', 45, 'Jumping', null, null, null, [
    ['Jump3SimplePath', 'Simple Path', 91, 111,
      [['Jumping', 18, 5.0, 112], ['Jumping', 19, 4.0, 112], ['Jumping', 19, 5.0, 112], ['Jumping', 16, 7.0, 112]]],
    ['Jump3AdvancedPath', 'Advanced Path', 92, 111,
      [['Jumping', 19, 4.0, 112], ['Jumping', 20, 6.0, 112], ['Climbing', 16, 7.0, 112], ['Jumping', 17, 5.0, 112]]],
  ]],
  ['Jump 4', 'Jumping Grounds', 65, 'Jumping', null, null, null, [
    ['Jump4SimplePath', 'Simple Path', 360, 406,
      [['Jumping', 23, 8.0, 183], ['Jumping', 28, 6.0, 183], ['Jumping', 26, 7.0, 183], ['Jumping', 23, 8.0, 183], ['Jumping', 22, 6.0, 183], ['Jumping', 28, 6.0, 183]]],
    ['Jump4AdvancedPath', 'Advanced Path', 362, 406,
      [['Jumping', 24, 7.0, 183], ['Jumping', 29, 6.0, 183], ['Balancing', 23, 7.0, 183], ['Jumping', 24, 8.0, 183], ['Jumping', 23, 9.0, 183], ['Balancing', 23, 4.0, 183]]],
  ]],
  ['Jump 5', 'Jumping Grounds', 85, 'Jumping', null, null, null, [
    ['Jump5SimplePath', 'Simple Path', 624, 698,
      [['Jumping', 25, 7.0, 269], ['Jumping', 25, 6.0, 269], ['Jumping', 26, 6.0, 269], ['Jumping', 30, 7.0, 269], ['Jumping', 29, 5.0, 269], ['Jumping', 28, 10.0, 269], ['Jumping', 30, 10.0, 269]]],
    ['Jump5AdvancedPath', 'Advanced Path', 719, 698,
      [['Jumping', 26, 5.0, 269], ['Jumping', 26, 8.0, 269], ['Rappelling', 26, 10.0, 269], ['Jumping', 31, 5.0, 269], ['Jumping', 30, 9.0, 269], ['Jumping', 29, 5.0, 269], ['Rappelling', 26, 10.0, 269]]],
  ]],
  ['Jump 6', 'Jumping Grounds', 92, 'Jumping', null, null, null, [
    ['Jump6SimplePath', 'Simple Path', 783, 1094,
      [['Jumping', 34, 11.0, 290], ['Jumping', 38, 6.0, 290], ['Jumping', 32, 6.0, 290], ['Jumping', 33, 10.0, 290], ['Jumping', 38, 7.0, 290], ['Jumping', 35, 5.0, 290], ['Jumping', 35, 7.0, 290], ['Jumping', 37, 7.0, 290]]],
    ['Jump6AdvancedPath', 'Advanced Path', 829, 1094,
      [['Jumping', 35, 6.0, 290], ['Climbing', 31, 7.0, 290], ['Balancing', 31, 8.0, 290], ['Jumping', 34, 10.0, 290], ['Jumping', 39, 6.0, 290], ['Jumping', 36, 7.0, 290], ['Balancing', 31, 11.0, 290], ['Climbing', 31, 5.0, 290]]],
  ]],
  ['Evade 1', 'Evading Grounds', 25, 'Evading', null, null, null, [
    ['Evade1SimplePath', 'Simple Path', 17, 13,
      [['Evading', 3, 3.0, 72], ['Evading', 4, 4.0, 72]]],
  ]],
  ['Evade 2', 'Evading Grounds', 40, 'Evading', null, null, null, [
    ['Evade2SimplePath', 'Simple Path', 74, 49,
      [['Evading', 15, 4.0, 102], ['Evading', 12, 4.0, 102], ['Evading', 14, 6.0, 102], ['Evading', 14, 5.0, 102]]],
    ['Evade2AdvancedPath', 'Advanced Path', 102, 49,
      [['Evading', 16, 7.0, 102], ['Evading', 13, 7.0, 102], ['Balancing', 12, 7.0, 102], ['Evading', 15, 7.0, 102]]],
  ]],
  ['Evade 3', 'Evading Grounds', 60, 'Evading', null, null, null, [
    ['Evade3SimplePath', 'Simple Path', 244, 255,
      [['Evading', 22, 7.0, 171], ['Evading', 20, 8.0, 171], ['Evading', 24, 7.0, 171], ['Evading', 21, 5.0, 171], ['Evading', 21, 5.0, 171]]],
    ['Evade3AdvancedPath', 'Advanced Path', 238, 255,
      [['Evading', 23, 8.0, 171], ['Evading', 21, 4.0, 171], ['Climbing', 20, 8.0, 171], ['Evading', 22, 6.0, 171], ['Evading', 22, 5.0, 171]]],
  ]],
  ['Evade 4', 'Evading Grounds', 80, 'Evading', null, null, null, [
    ['Evade4SimplePath', 'Simple Path', 560, 812,
      [['Evading', 26, 10.0, 255], ['Evading', 29, 7.0, 255], ['Evading', 32, 6.0, 255], ['Evading', 26, 10.0, 255], ['Evading', 30, 5.0, 255], ['Evading', 25, 5.0, 255], ['Evading', 25, 6.0, 255]]],
    ['Evade4AdvancedPath', 'Advanced Path', 643, 812,
      [['Evading', 27, 10.0, 255], ['Evading', 30, 7.0, 255], ['Rappelling', 26, 5.0, 255], ['Evading', 27, 6.0, 255], ['Evading', 31, 7.0, 255], ['Evading', 26, 9.0, 255], ['Rappelling', 26, 7.0, 255]]],
  ]],
  ['Evade 5', 'Evading Grounds', 93, 'Evading', null, null, null, [
    ['Evade5SimplePath', 'Simple Path', 932, 1033,
      [['Evading', 30, 11.0, 294], ['Evading', 33, 8.0, 294], ['Evading', 38, 8.0, 294], ['Evading', 37, 6.0, 294], ['Evading', 33, 5.0, 294], ['Evading', 32, 10.0, 294], ['Evading', 33, 11.0, 294], ['Evading', 36, 11.0, 294]]],
    ['Evade5AdvancedPath', 'Advanced Path', 1016, 1033,
      [['Evading', 31, 11.0, 294], ['Jumping', 31, 7.0, 294], ['Rappelling', 31, 8.0, 294], ['Evading', 38, 9.0, 294], ['Evading', 34, 8.0, 294], ['Evading', 33, 11.0, 294], ['Rappelling', 31, 5.0, 294], ['Jumping', 31, 11.0, 294]]],
  ]],
  ['Balance 1', 'Balancing Grounds', 55, 'Balancing', null, null, null, [
    ['Balance1SimplePath', 'Simple Path', 74, 28,
      [['Balancing', 4, 6.0, 159], ['Balancing', 5, 6.0, 159]]],
  ]],
  ['Balance 2', 'Balancing Grounds', 75, 'Balancing', null, null, null, [
    ['Balance2SimplePath', 'Simple Path', 411, 336,
      [['Balancing', 16, 8.0, 207], ['Balancing', 17, 5.0, 207], ['Balancing', 18, 9.0, 207], ['Balancing', 18, 10.0, 207], ['Balancing', 16, 8.0, 207]]],
    ['Balance2AdvancedPath', 'Advanced Path', 424, 336,
      [['Balancing', 17, 8.0, 207], ['Balancing', 18, 10.0, 207], ['Rappelling', 16, 10.0, 207], ['Balancing', 19, 10.0, 207], ['Balancing', 17, 5.0, 207]]],
  ]],
  ['Balance 3', 'Balancing Grounds', 87, 'Balancing', null, null, null, [
    ['Balance3SimplePath', 'Simple Path', 622, 696,
      [['Balancing', 30, 6.0, 276], ['Balancing', 25, 6.0, 276], ['Balancing', 26, 9.0, 276], ['Balancing', 32, 6.0, 276], ['Balancing', 29, 7.0, 276], ['Balancing', 28, 5.0, 276], ['Balancing', 31, 11.0, 276]]],
    ['Balance3AdvancedPath', 'Advanced Path', 824, 696,
      [['Balancing', 31, 10.0, 276], ['Balancing', 26, 10.0, 276], ['Climbing', 26, 8.0, 276], ['Balancing', 33, 9.0, 276], ['Balancing', 30, 5.0, 276], ['Balancing', 29, 9.0, 276], ['Climbing', 26, 11.0, 276]]],
  ]],
  ['Balance 4', 'Balancing Grounds', 94, 'Balancing', null, null, null, [
    ['Balance4SimplePath', 'Simple Path', 883, 934,
      [['Balancing', 35, 8.0, 297], ['Balancing', 38, 6.0, 297], ['Balancing', 35, 10.0, 297], ['Balancing', 31, 9.0, 297], ['Balancing', 37, 9.0, 297], ['Balancing', 32, 10.0, 297], ['Balancing', 34, 7.0, 297], ['Balancing', 35, 7.0, 297]]],
    ['Balance4AdvancedPath', 'Advanced Path', 1120, 934,
      [['Balancing', 36, 7.0, 297], ['Evading', 31, 10.0, 297], ['Jumping', 31, 10.0, 297], ['Balancing', 32, 6.0, 297], ['Balancing', 38, 11.0, 297], ['Balancing', 33, 11.0, 297], ['Jumping', 31, 9.0, 297], ['Evading', 31, 9.0, 297]]],
  ]],
  ['Rappell 1', 'Rappelling Grounds', 70, 'Rappelling', null, null, null, [
    ['Rappell1SimplePath', 'Simple Path', 153, 40,
      [['Rappelling', 4, 9.0, 195], ['Rappelling', 5, 7.0, 195]]],
  ]],
  ['Rappell 2', 'Rappelling Grounds', 83, 'Rappelling', null, null, null, [
    ['Rappell2SimplePath', 'Simple Path', 477, 369,
      [['Rappelling', 19, 10.0, 266], ['Rappelling', 20, 8.0, 266], ['Rappelling', 16, 9.0, 266], ['Rappelling', 18, 6.0, 266], ['Rappelling', 18, 8.0, 266]]],
    ['Rappell2AdvancedPath', 'Advanced Path', 479, 369,
      [['Rappelling', 20, 10.0, 266], ['Rappelling', 21, 9.0, 266], ['Climbing', 16, 6.0, 266], ['Rappelling', 19, 5.0, 266], ['Rappelling', 19, 8.0, 266]]],
  ]],
  ['Rappell 3', 'Rappelling Grounds', 95, 'Rappelling', null, null, null, [
    ['Rappell3SimplePath', 'Simple Path', 967, 750,
      [['Rappelling', 36, 9.0, 297], ['Rappelling', 30, 7.0, 297], ['Rappelling', 32, 9.0, 297], ['Rappelling', 38, 10.0, 297], ['Rappelling', 31, 9.0, 297], ['Rappelling', 32, 10.0, 297], ['Rappelling', 37, 8.0, 297], ['Rappelling', 37, 8.0, 297]]],
    ['Rappell3AdvancedPath', 'Advanced Path', 1106, 750,
      [['Rappelling', 37, 11.0, 297], ['Balancing', 31, 9.0, 297], ['Evading', 31, 10.0, 297], ['Rappelling', 39, 10.0, 297], ['Rappelling', 32, 8.0, 297], ['Rappelling', 33, 11.0, 297], ['Evading', 31, 7.0, 297], ['Balancing', 31, 8.0, 297]]],
  ]],
  ['Arena 1', 'Arenas', 20, null, 5, 22, null, [
    ['Arena1AdvancedPath', 'Advanced Path', 96, 0,
      [['Climbing', 13, 5.0, 62], ['Jumping', 11, 6.0, 62], ['Climbing', 11, 6.0, 62], [null, 10, 6.0, 62], ['Climbing', 11, 5.0, 62], ['Jumping', 10, 5.0, 62]]],
  ]],
  ['Arena 2', 'Arenas', 40, null, 10, 37, null, [
    ['Arena2AdvancedPath', 'Advanced Path', 236, 0,
      [['Evading', 20, 6.0, 102], ['Jumping', 22, 6.0, 102], ['Climbing', 22, 7.0, 102], [null, 18, 8.0, 102], ['Jumping', 22, 5.0, 102], ['Climbing', 21, 5.0, 102], ['Evading', 21, 7.0, 102]]],
  ]],
  ['Arena 3', 'Arenas', 70, null, 20, 108, null, [
    ['Arena3AdvancedPath', 'Advanced Path', 1012, 0,
      [['Balancing', 34, 8.0, 195], ['Climbing', 32, 7.0, 195], ['Evading', 29, 10.0, 195], [null, 32, 11.0, 195], ['Jumping', 33, 11.0, 195], ['Evading', 28, 10.0, 195], [null, 33, 10.0, 195], ['Balancing', 34, 10.0, 195]]],
  ]],
  ['Arena 4', 'Arenas', 90, null, 25, 206, null, [
    ['Arena4AdvancedPath', 'Advanced Path', 2009, 0,
      [['Jumping', 38, 9.0, 283], ['Rappelling', 40, 9.0, 283], ['Balancing', 36, 9.0, 283], ['Climbing', 37, 10.0, 283], [null, 36, 12.0, 283], ['Balancing', 40, 12.0, 283], ['Jumping', 36, 13.0, 283], ['Rappelling', 37, 11.0, 283], [null, 38, 13.0, 283], ['Climbing', 38, 13.0, 283]]],
  ]],
  ['Ashen Lands Trail', 'Unique Trails', 60, null, null, null, 'Requires finding the Map to Ashen Lands.', [
    ['AshenLandsTrailAdvancedPath', 'Advanced Path', 1105, 0,
      [['Balancing', 28, 11.0, 195], ['Climbing', 27, 9.0, 195], ['Evading', 27, 11.0, 195], [null, 29, 10.0, 195], ['Jumping', 30, 10.0, 195], ['Evading', 25, 8.0, 195], [null, 26, 8.0, 195], ['Balancing', 29, 11.0, 195], [null, 30, 10.0, 195]]],
  ]],
  ['Dense Cave Trail', 'Unique Trails', 80, null, null, null, 'Requires finding the Map to Dense Cave.', [
    ['DenseCaveTrailAdvancedPath', 'Advanced Path', 1546, 0,
      [['Jumping', 30, 9.0, 255], ['Rappelling', 29, 11.0, 255], ['Balancing', 33, 12.0, 255], ['Climbing', 31, 10.0, 255], [null, 33, 8.0, 255], ['Balancing', 30, 12.0, 255], ['Jumping', 30, 9.0, 255], ['Rappelling', 30, 11.0, 255], [null, 33, 12.0, 255], ['Climbing', 28, 9.0, 255]]],
  ]],
  ['Torag Grounds Trail', 'Unique Trails', 85, null, null, null, 'Requires finding the Map to Torag Grounds.', [
    ['ToragGroundsTrailAdvancedPath', 'Advanced Path', 1558, 0,
      [[null, 31, 12.0, 269], ['Rappelling', 36, 11.0, 269], ['Jumping', 35, 10.0, 269], ['Rappelling', 37, 10.0, 269], ['Balancing', 38, 8.0, 269], ['Balancing', 35, 8.0, 269], ['Evading', 36, 12.0, 269], [null, 32, 10.0, 269], ['Evading', 38, 8.0, 269], [null, 36, 8.0, 269]]],
  ]],
  ['Night Climb', 'Night Sprints', 50, null, null, null, null, [
    ['NightClimbAdvancedPath', 'Advanced Path', 369, 0,
      [['Climbing', 26, 6.0, 147], ['Jumping', 25, 7.0, 147], ['Climbing', 26, 6.0, 147], ['Evading', 24, 7.0, 147], ['Jumping', 25, 5.0, 147], ['Climbing', 26, 6.0, 147], ['Jumping', 25, 5.0, 147], ['Jumping', 25, 4.0, 147], ['Evading', 24, 8.0, 147], ['Climbing', 26, 6.0, 147]]],
  ]],
  ['Moonlight Dash', 'Night Sprints', 70, null, null, null, null, [
    ['MoonlightDashAdvancedPath', 'Advanced Path', 870, 0,
      [['Balancing', 32, 7.0, 195], ['Balancing', 32, 8.0, 195], ['Jumping', 33, 6.0, 195], ['Climbing', 34, 8.0, 195], ['Evading', 32, 9.0, 195], ['Balancing', 33, 7.0, 195], ['Jumping', 34, 8.0, 195], ['Climbing', 33, 7.0, 195], ['Balancing', 32, 8.0, 195], ['Climbing', 34, 7.0, 195], ['Evading', 33, 7.0, 195], ['Balancing', 32, 8.0, 195]]],
  ]],
  ['Midnight Escape', 'Night Sprints', 90, null, null, null, null, [
    ['MidnightEscapeAdvancedPath', 'Advanced Path', 1482, 0,
      [['Rappelling', 41, 8.0, 283], ['Balancing', 41, 7.0, 283], ['Evading', 41, 7.0, 283], ['Jumping', 41, 6.0, 283], ['Climbing', 41, 9.0, 283], ['Jumping', 41, 8.0, 283], ['Balancing', 41, 6.0, 283], ['Evading', 41, 7.0, 283], ['Rappelling', 41, 8.0, 283], ['Jumping', 41, 9.0, 283], ['Climbing', 41, 9.0, 283], ['Balancing', 41, 9.0, 283], ['Rappelling', 41, 10.0, 283], ['Evading', 41, 9.0, 283], ['Rappelling', 41, 8.0, 283]]],
  ]],
  ['Abyssal Vault Escape', 'Abyssal Vault', 45, null, null, null, 'Requires The Ivory Athenaeum at step 3.', [
    ['AbyssalVaultEscapeAdvancedPath', 'Advanced Path', 400, 0,
      [['Evading', 20, 6.0, 102], ['Evading', 22, 6.0, 102], ['Jumping', 22, 7.0, 102], [null, 18, 8.0, 102], ['Jumping', 22, 5.0, 102], ['Evading', 21, 5.0, 102], ['Evading', 21, 7.0, 102], ['Evading', 20, 6.0, 102], ['Jumping', 22, 6.0, 102], ['Climbing', 22, 7.0, 102]]],
  ]],
  ['Fleshbound Passage', 'The Sunken Tower', 60, null, null, null, 'Requires The Sunken Tower at step 3, Fleshbound Passage objective.', [
    ['FleshboundPassageAdvancedPath', 'Advanced Path', 800, 0,
      [['Climbing', 25, 10.0, 171], ['Climbing', 28, 9.0, 171], ['Jumping', 28, 7.0, 171], ['Jumping', 25, 10.0, 171], ['Evading', 25, 10.0, 171], ['Evading', 29, 7.0, 171], ['Balancing', 30, 9.0, 171], ['Balancing', 25, 9.0, 171], ['Climbing', 30, 6.0, 171], ['Climbing', 28, 6.0, 171]]],
  ]],
  ['Sinew Chasm', 'The Sunken Tower', 60, null, null, null, 'Requires The Sunken Tower at step 3, Sinew Chasm objective.', [
    ['SinewChasmAdvancedPath', 'Advanced Path', 800, 0,
      [[null, 28, 6.0, 171], [null, 29, 5.0, 171], [null, 30, 8.0, 171], [null, 31, 6.0, 171], [null, 32, 8.0, 171], [null, 33, 7.0, 171]]],
  ]],
];

export interface AgilityAction extends SkillAction {
  source: string;
  recipeGroup: string;
  prerequisiteNote?: string;
  primaryTechnique: AgilityTechnique | null;
  techniqueXp: number;
  obstacles: Obstacle[];
}

export const agilityActions: AgilityAction[] = courses.flatMap((
  [course, recipeGroup, requiredLevel, primaryTechnique, tickets, tokens, prerequisiteNote, paths],
) => paths.map(([id, path, baseXp, techniqueXp, obstacles]) => ({
  id, name: paths.length > 1 || path === 'Advanced Path' ? `${course} - ${path}` : course,
  recipeGroup, requiredLevel, primaryTechnique, techniqueXp, obstacles, baseXp,
  intervalSeconds: obstacles.reduce((seconds, obstacle) => seconds + obstacle[2], 0),
  inputs: tickets === null ? [] : [{ itemId: 'ArenaEntryTicket', itemName: 'Arena Entry Ticket', quantity: tickets }],
  outputs: tokens === null ? [] : [{ itemId: 'ArenaRewardToken', itemName: 'Arena Reward Token', quantity: tokens }],
  source: `https://db.melvor.aevv.net/agility-course-path/${id}`,
  prerequisiteNote: prerequisiteNote ?? undefined,
})));
