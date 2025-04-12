import { z } from "zod";
import { command } from "../../ddd";
import { generateId } from "../generate-id";
import { Calendar } from "./Calendar.aggregate";
import { CalendarCreated } from "./CalendarCreated.event";

/**
 * Command to create a new calendar
 *
 * @example
 * await CreateCalendar.execute("cal-123", {
 *   ownerId: "user-456",
 *   name: "Work Calendar"
 * });
 */
export const CreateCalendar = command(
  "CreateCalendar",
  {
    aggregate: Calendar,
    input: z.object({
      /**
       * The ID of the user who will own this calendar
       */
      ownerId: z.string(),

      /**
       * The display name of the calendar
       */
      name: z.string().min(1).max(100),
    }),
  },
  async (calendar, { ownerId, name }) => {
    // Check if calendar already exists
    if (calendar !== undefined) {
      return; // Calendar already exists, no change needed
    }

    // Create the calendar
    return CalendarCreated({
      calendarId: generateId("cal"),
      ownerId,
      name,
      createdAt: Date.now(),
    });
  }
);
