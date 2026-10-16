// Staleness utility — single source of truth for GPS/manual freshness classification
// GPS: age >= 120s = STALE (inclusive); age >= 300s = UNAVAILABLE
// Manual: age >= 600s = STALE; age >= 900s = UNAVAILABLE

const GPS_STALE_MS = 120_000;   // 2 minutes
const GPS_UNAVAILABLE_MS = 300_000; // 5 minutes
const MANUAL_STALE_MS = 600_000;  // 10 minutes
const MANUAL_UNAVAILABLE_MS = 900_000; // 15 minutes

/**
 * Determine the locationStatus string from a location record and current time.
 * @param {Date|null} recordedAt - The timestamp of the location reading.
 * @param {'gps'|'manual'|null} source - The source of the location reading.
 * @returns {'LIVE'|'STALE'|'UNAVAILABLE'}
 */
export const getLocationStatus = (recordedAt, source = 'gps') => {
  if (!recordedAt) return 'UNAVAILABLE';
  const ageMs = Date.now() - new Date(recordedAt).getTime();
  const staleMs = source === 'manual' ? MANUAL_STALE_MS : GPS_STALE_MS;
  const unavailableMs = source === 'manual' ? MANUAL_UNAVAILABLE_MS : GPS_UNAVAILABLE_MS;

  if (ageMs >= unavailableMs) return 'UNAVAILABLE';
  if (ageMs >= staleMs) return 'STALE';
  return 'LIVE';
};

/**
 * Return stale/unavailable thresholds for a given source type (for documentation/testing).
 */
export const getStalenessThresholds = (source = 'gps') => ({
  staleMs: source === 'manual' ? MANUAL_STALE_MS : GPS_STALE_MS,
  unavailableMs: source === 'manual' ? MANUAL_UNAVAILABLE_MS : GPS_UNAVAILABLE_MS,
});
