// The healing value is per item. The planner lets the user override it with their effective healing.
export const healingFoods = [
  { itemId: 'Shrimp', name: 'Shrimp', healing: 15 },
  { itemId: 'Sardine', name: 'Sardine', healing: 53 },
  { itemId: 'Beef', name: 'Beef', healing: 21 },
  { itemId: 'Chicken', name: 'Chicken', healing: 34 },
  { itemId: 'Herring', name: 'Herring', healing: 63 },
  { itemId: 'Trout', name: 'Trout', healing: 152 },
  { itemId: 'Perch', name: 'Perch', healing: 99 },
  { itemId: 'Mackerel', name: 'Mackerel', healing: 82 },
  { itemId: 'Pike', name: 'Pike', healing: 217 },
  { itemId: 'Salmon', name: 'Salmon', healing: 223 },
  { itemId: 'Lobster', name: 'Lobster', healing: 281 },
  { itemId: 'TroutSushi', name: 'Trout Sushi', healing: 56 },
  { itemId: 'SalmonSoup', name: 'Salmon Soup', healing: 58 },
  { itemId: 'Shark', name: 'Shark', healing: 590 },
  { itemId: 'Whale', name: 'Whale', healing: 2010 },
  { itemId: 'BananaPancake', name: 'Banana Pancake', healing: 181 },
] as const;

export function foodBudget(expectedDamage: number, healingPerFood: number, owned: number) {
  const required = Math.ceil(expectedDamage / healingPerFood);
  return { required, missing: Math.max(0, required - owned) };
}
