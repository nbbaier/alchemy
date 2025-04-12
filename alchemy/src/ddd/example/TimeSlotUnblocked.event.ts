import { z } from "zod";
import { event } from "../../ddd";

/**
 * Emitted when a previously blocked time slot is unblocked
 *
 * @example
 * const timeSlotUnblocked = TimeSlotUnblocked({
 *   blockId: "block-123",
 *   calendarId: "cal-456",
 *   unblockedAt: Date.now()
 * });
 */
export const TimeSlotUnblocked = event(
  "TimeSlotUnblocked",
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
     * Timestamp when the time slot was unblocked
     */
    unblockedAt: z.number(),
  })
);
