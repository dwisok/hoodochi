// English names for the 20 items (the generator keeps the French ones as canonical ids).
import type { Slot } from './sprites-v2'

export const ITEM_NAMES: Record<Slot, [string, string, string, string]> = {
  tete: ['red cap', 'bucket hat', 'beret', 'jewelled crown'],
  yeux: ['sunglasses', 'monocle', 'gold glasses', 'laser visor'],
  cou: ['tie', 'scarf', 'gold chain', 'diamond pendant'],
  poignet: ['fabric bracelet', 'watch', 'big gold watch', 'diamond watch'],
  main: ['coffee cup', 'phone', 'cigar', 'wad of cash'],
}

export function itemName(slot: Slot, tier: number): string {
  return ITEM_NAMES[slot][Math.min(4, Math.max(1, tier)) - 1]
}
