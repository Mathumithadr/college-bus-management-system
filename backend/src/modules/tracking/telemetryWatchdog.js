// Telemetry Watchdog Service: Monitors active trips for GPS heartbeats
// Tier 2: 3 mins without ping -> GPS_DISCONNECTED (Vice Rep can claim)
// Tier 3: 5 mins without ping -> TRACKING_OFFLINE (Admin critical alert)

import Trip from '../../models/Trip.js';
import BusLocationUpdate from '../../models/BusLocationUpdate.js';
import { writeAuditLog } from '../../middleware/audit.js';

const CHECK_INTERVAL_MS = 30 * 1000;
const STALE_THRESHOLD_MS = 3 * 60 * 1000;   // 3 min -> GPS_DISCONNECTED
const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 min -> TRACKING_OFFLINE

export const startTelemetryWatchdog = () => {
  setInterval(async () => {
    try {
      const activeTrips = await Trip.find({ tripStatus: 'in_progress' });

      for (const trip of activeTrips) {
        const latestPing = await BusLocationUpdate.findOne({ tripId: trip._id })
          .sort({ recordedAt: -1 });

        const age = latestPing
          ? Date.now() - new Date(latestPing.recordedAt).getTime()
          : Infinity;

        let newStatus = 'ACTIVE';
        if (age >= OFFLINE_THRESHOLD_MS) newStatus = 'TRACKING_OFFLINE';
        else if (age >= STALE_THRESHOLD_MS) newStatus = 'GPS_DISCONNECTED';

        if (newStatus !== trip.telemetryStatus) {
          const oldStatus = trip.telemetryStatus;
          trip.telemetryStatus = newStatus;
          await trip.save();

          if (newStatus === 'TRACKING_OFFLINE') {
            await writeAuditLog({
              actorId: null,
              action: 'TRIP_TELEMETRY_LOST',
              resourceType: 'Trip',
              resourceId: trip._id,
              details: { previousStatus: oldStatus, newStatus, ageSeconds: Math.floor(age / 1000) },
            });
            console.log(`🚨 CRITICAL: Trip ${trip._id} has been offline for ${Math.floor(age / 60000)} minutes!`);
          } else if (newStatus === 'GPS_DISCONNECTED') {
            console.log(`⚠️ Trip ${trip._id} GPS disconnected for ${Math.floor(age / 60000)} minutes`);
          }
        }
      }
    } catch (err) {
      console.error('Watchdog error:', err);
    }
  }, CHECK_INTERVAL_MS);

  console.log('🐕 Telemetry watchdog started (checks every 30s)');
};
