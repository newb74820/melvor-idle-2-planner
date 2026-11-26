import type { WoodcuttingAction } from './woodcutting';

interface SecondaryDrop {
  itemId: string;
  name: string;
  roll: 'hit' | 'cut';
  chancePercent: number;
  quantity: number;
}

const bird = (chancePercent = 0.25): SecondaryDrop => ({ itemId: 'BirdNest', name: 'Bird Nest', roll: 'hit', chancePercent, quantity: 1 });
const eagle = (chancePercent = 0.15): SecondaryDrop => ({ itemId: 'EagleNest', name: 'Eagle Nest', roll: 'hit', chancePercent, quantity: 1 });
const seed = (treeId: string, treeName: string, chancePercent: number): SecondaryDrop =>
  ({ itemId: `${treeId}TreeSeed`, name: `${treeName} Tree Seed`, roll: 'cut', chancePercent, quantity: 1 });
const stick = (chancePercent: number, quantity = 1): SecondaryDrop =>
  ({ itemId: 'Stick', name: 'Stick', roll: 'hit', chancePercent, quantity });

// Published recipe rates for build 26724394. Quests have no secondary rolls.
// https://db.melvor.aevv.net/entity/Woodcutting
const drops: Record<string, SecondaryDrop[]> = {
  'normal-tree': [bird()],
  'oak-tree': [bird(), seed('Oak', 'Oak', 0.1)],
  'willow-tree': [bird(), seed('Willow', 'Willow', 0.09)],
  'teak-tree': [bird(), seed('Teak', 'Teak', 0.09)],
  'maple-tree': [bird(), seed('Maple', 'Maple', 0.09)],
  'mahogany-tree': [bird(), seed('Mahogany', 'Mahogany', 0.09)],
  'yew-tree': [eagle(), seed('Yew', 'Yew', 0.08)],
  'magic-tree': [eagle(), seed('Magic', 'Magic', 0.08)],
  'ashen-tree': [bird(0.08), eagle(0.08), seed('Ashen', 'Ashen', 0.17)],
  'hard-oak-tree': [eagle(), seed('HardOak', 'Hard Oak', 0.08)],
  'redwood-tree': [eagle(), { itemId: 'DrakeNest', name: 'Drake Nest', roll: 'hit', chancePercent: 0.02, quantity: 1 }, seed('Redwood', 'Redwood', 0.08)],
  'flax-bush': [stick(25)],
  'ambervine-bush': [stick(50)],
  'spikemoss-shrub': [stick(75)],
  'duskleaf-bush': [stick(75, 2)],
};

interface SecondaryDropBonuses {
  birdNestChancePercent?: number;
  eagleNestChancePercent?: number;
  onCutChancePercent?: number;
  outputDoublingPercent?: number;
  nestQuantityBonus?: number;
  overgrowthCuts?: number;
}

export function estimateWoodcuttingDrops(
  action: WoodcuttingAction,
  cuts: number,
  secondsPerCut: number,
  bonuses: SecondaryDropBonuses = {},
) {
  return (drops[action.id] ?? []).map((drop) => {
    const isBird = drop.itemId === 'BirdNest';
    const isEagle = drop.itemId === 'EagleNest';
    const onHit = drop.roll === 'hit';
    const chanceBonus = isBird ? bonuses.birdNestChancePercent ?? 0
      : isEagle ? bonuses.eagleNestChancePercent ?? 0
        : onHit ? 0 : bonuses.onCutChancePercent ?? 0;
    const chancePercent = Math.min(100, drop.chancePercent + chanceBonus);
    const quantity = drop.quantity + (isBird || isEagle ? bonuses.nestQuantityBonus ?? 0 : 0);
    const rollsPerCut = onHit ? secondsPerCut / action.hitIntervalSeconds : 1;
    const boostedCuts = action.category === 'bush' ? Math.min(cuts, bonuses.overgrowthCuts ?? 0) : 0;
    const hitQuantityMultiplier = onHit ? 1 + (bonuses.outputDoublingPercent ?? 0) / 100 : 1;
    return {
      ...drop, chancePercent,
      expectedQuantity: (cuts * quantity + boostedCuts) * rollsPerCut * (chancePercent / 100) * hitQuantityMultiplier,
    };
  });
}
