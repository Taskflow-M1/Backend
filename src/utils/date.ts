/** Fonctions communes de validation et de formatage des dates métier. */
const ISO_DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Checks that a string is a real civil calendar date (rejects e.g. 2026-02-30 or 2025-02-29)
export function isRealCalendarDate(value: string): boolean {
  if (!ISO_DATE_ONLY_REGEX.test(value)) {
    return false;
  }

  const [yearStr, monthStr, dayStr] = value.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const utcDate = new Date(Date.UTC(year, month - 1, day));

  return (
    utcDate.getUTCFullYear() === year &&
    utcDate.getUTCMonth() === month - 1 &&
    utcDate.getUTCDate() === day
  );
}

export function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}
