// Date utilities — normalize to UTC midnight and build date range queries

/**
 * Normalize any date-like value to UTC midnight (start of day in UTC).
 */
export const toUtcMidnight = (dateInput) => {
  const d = new Date(dateInput);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

/**
 * Build a MongoDB date range filter for a single calendar day (UTC).
 */
export const utcDayRange = (dateInput) => {
  const start = toUtcMidnight(dateInput);
  const end = new Date(start.getTime() + 86_400_000);
  return { $gte: start, $lt: end };
};
