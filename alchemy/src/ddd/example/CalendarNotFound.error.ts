import { z } from "zod";
import { error } from "../../ddd";

/**
 * Thrown when attempting to access a calendar that doesn't exist
 *
 * @example
 * throw new CalendarNotFound({ calendarId: "cal-123" });
 */
export const CalendarNotFound = error(
  "CalendarNotFound",
  z.object({
    /**
     * The ID of the calendar that was not found
     */
    calendarId: z.string(),
  })
);
