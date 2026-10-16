// Ticket ID generator — produces TICK-YYYY-NNNN format for Report.ticketId

import Report from '../models/Report.js';

/**
 * Generate the next unique ticket ID in TICK-YYYY-NNNN format.
 * Scans the latest ticket for the current year and increments the sequence.
 */
export const generateTicketId = async () => {
  const year = new Date().getFullYear();
  const prefix = `TICK-${year}-`;

  // Find the highest-sequence ticket for this year
  const latest = await Report.findOne(
    { ticketId: { $regex: `^${prefix}` } },
    { ticketId: 1 },
    { sort: { ticketId: -1 } }
  );

  let seq = 1;
  if (latest) {
    const parts = latest.ticketId.split('-');
    seq = parseInt(parts[2], 10) + 1;
  }

  return `${prefix}${String(seq).padStart(4, '0')}`;
};
