import { z } from "zod";
import { error } from "../../ddd";

/**
 * Thrown when attempting to schedule an appointment or block time
 * that conflicts with an existing appointment or time block
 *
 * @example
 * throw new TimeConflictError({
 *   calendarId: "cal-123",
 *   startTime: 1634567890000,
 *   endTime: 1634571490000,
 *   conflictingItemIds: ["appt-123", "block-456"]
 * });
 */
export const TimeConflictError = error(
  "TimeConflictError",
  z.object({
    /**
     * The ID of the calendar with the conflict
     */
    calendarId: z.string(),

    /**
     * The start time of the conflicting slot
     */
    startTime: z.number(),

    /**
     * The end time of the conflicting slot
     */
    endTime: z.number(),

    /**
     * IDs of appointments or time blocks that conflict with the requested time
     */
    conflictingItemIds: z.array(z.string()),
  })
);
