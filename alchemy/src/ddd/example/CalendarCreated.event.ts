import { z } from "zod";
import { event } from "../../ddd";

/**
 * Emitted when a new calendar is created
 *
 * @example
 * const calendarCreated = CalendarCreated.create({
 *   calendarId: "cal-123",
 *   ownerId: "user-456",
 *   name: "Work Calendar",
 *   createdAt: Date.now()
 * });
 */
export const CalendarCreated = event(
  "CalendarCreated",
  z.object({
    /**
     * Unique identifier for the calendar
     */
    calendarId: z.string(),

    /**
     * ID of the user who owns this calendar
     */
    ownerId: z.string(),

    /**
     * Name of the calendar
     */
    name: z.string(),

    /**
     * Timestamp when the calendar was created
     */
    createdAt: z.number(),
  })
);
