// Neutralise les caractères spéciaux avant une recherche par expression régulière.
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
