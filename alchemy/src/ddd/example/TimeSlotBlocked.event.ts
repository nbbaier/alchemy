import { z } from "zod";
import { event } from "../../ddd";

/**
 * Emitted when a time slot is blocked on a calendar
 *
 * @example
 * const timeSlotBlocked = TimeSlotBlocked({
 *   blockId: "block-123",
 *   calendarId: "cal-456",
 *   title: "Focus Time",
 *   startTime: 1634567890000,
 *   endTime: 1634571490000,
 *   recurrence: null,
 *   createdAt: Date.now()
 * });
 */
export const TimeSlotBlocked = event(
  "TimeSlotBlocked",
  z.object({
    /**
     * Unique identifier for the blocked time slot
     */
    blockId: z.string(),

    /**
     * ID of the calendar this block belongs to
     */
    calendarId: z.string(),

    /**
     * Title/reason for blocking the time slot
     */
    title: z.string(),

    /**
     * Start time of the blocked slot (timestamp)
     */
    startTime: z.number(),

    /**
     * End time of the blocked slot (timestamp)
     */
    endTime: z.number(),

    /**
     * Optional recurrence rule (null means no recurrence)
     */
    recurrence: z.string().nullable().optional(),

    /**
     * Timestamp when the block was created
     */
    createdAt: z.number(),
  })
);
