// App constants — GPS thresholds, rate limits, pagination defaults, report auto-close window

export const GPS = {
  GOOD_ACCURACY_M: 30,          // <= 30m = good quality GPS, streak eligible
  HOLD_ACCURACY_M: 50,          // 30-50m = HOLD (save point, no streak change)
  POOR_RESET_ACCURACY_M: 50,    // > 50m = reset streak
  NEAR_STOP_RADIUS_M: 50,       // Bus must be within 50m of stop centre to "qualify"
  STREAK_REQUIRED: 3,           // 3 consecutive qualifying readings to confirm a stop
};

export const STALENESS = {
  GPS_STALE_S: 120,             // 2 minutes
  GPS_UNAVAILABLE_S: 300,       // 5 minutes
  MANUAL_STALE_S: 600,          // 10 minutes
  MANUAL_UNAVAILABLE_S: 900,    // 15 minutes
};

export const AUTH = {
  MAX_FAILED_ATTEMPTS: 5,       // Lock after 5 failures
  LOCKOUT_WINDOW_MS: 15 * 60 * 1000,  // 15-minute window for counting failures
  LOCKOUT_DURATION_MS: 15 * 60 * 1000, // Account locked for 15 minutes
};

export const REPORT = {
  AUTO_CLOSE_DAYS: 7,           // Reports auto-close 7 days after resolved
};

export const DELAY = {
  THRESHOLD_MINUTES: 15,        // Minimum delay to qualify for attendance verification
};

export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

// Report status transition graph — enforced by admin.service.js
export const REPORT_TRANSITIONS = {
  submitted: ['under_review', 'closed'],
  under_review: ['more_information_required', 'resolved', 'rejected'],
  more_information_required: ['under_review', 'closed'],
  resolved: ['closed'],
  rejected: ['closed'],
  closed: [],
};