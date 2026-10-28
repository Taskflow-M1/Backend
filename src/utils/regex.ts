/** Protège une saisie utilisateur avant son utilisation dans une expression régulière. */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
