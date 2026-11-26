import type { ItemAmount } from '../calculator';

export type RecipeItem = string | [name: string, quantity: number, id?: string];

export function recipeItemId(name: string): string {
  return name.replace(/[^a-z0-9]/gi, '');
}

export function recipeItemAmount(item: RecipeItem): ItemAmount {
  const [itemName, quantity, id] = typeof item === 'string' ? [item, 1] : item;
  return { itemId: id ?? recipeItemId(itemName), itemName, quantity };
}
