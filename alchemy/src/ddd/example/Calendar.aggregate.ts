import { z } from "zod";
import { aggregate } from "../../ddd";
import { assertNever } from "../../ddd/assert-never";
import { CalendarCreated } from "./CalendarCreated.event";

/**
 * Calendar aggregate represents a user's calendar
 *
 * @example
 * const calendar = {
 *   calendarId: "cal-123",
 *   ownerId: "user-456",
 *   name: "Work Calendar",
 *   createdAt: 1634567890000,
 *   updatedAt: null
 * };
 */
export const Calendar = aggregate(
  "Calendar",
  {
    schema: z.object({
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

      /**
       * Timestamp when the calendar was last updated
       */
      updatedAt: z.number().nullable(),
    }),
    events: [CalendarCreated],
  },
  (state, event) => {
    if (event.type === "CalendarCreated") {
      return {
        calendarId: event.payload.calendarId,
        ownerId: event.payload.ownerId,
        name: event.payload.name,
        createdAt: event.payload.createdAt,
        updatedAt: null,
      };
    } else {
      return assertNever(event);
    }
  }
);
