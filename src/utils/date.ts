const ISO_DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Vérifie que la valeur est une vraie date, par exemple pas le 30 février.
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

// Retourne la date UTC du jour au format YYYY-MM-DD.
export function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}
