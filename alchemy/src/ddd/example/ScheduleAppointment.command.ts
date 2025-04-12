import { z } from "zod";
import { command } from "../../ddd";
import { generateId } from "../generate-id";
import { Appointment } from "./Appointment.aggregate";
import { AppointmentScheduled } from "./AppointmentScheduled.event";

/**
 * Command to schedule a new appointment
 *
 * @example
 * await ScheduleAppointment.execute("appt-123", {
 *   calendarId: "cal-456",
 *   title: "Team Meeting",
 *   description: "Weekly sync-up",
 *   startTime: 1634567890000,
 *   endTime: 1634571490000,
 *   participants: ["user-123", "user-456"]
 * });
 */
export const ScheduleAppointment = command(
  "ScheduleAppointment",
  {
    aggregate: Appointment,
    input: z
      .object({
        /**
         * The ID of the calendar for this appointment
         */
        calendarId: z.string(),

        /**
         * Title of the appointment
         */
        title: z.string().min(1).max(100),

        /**
         * Optional description of the appointment
         */
        description: z.string().optional(),

        /**
         * Start time of the appointment (timestamp)
         */
        startTime: z.number(),

        /**
         * End time of the appointment (timestamp)
         */
        endTime: z.number().refine((val) => val > 0, {
          message: "End time must be greater than start time",
        }),

        /**
         * List of user IDs participating in this appointment
         */
        participants: z.array(z.string()),
      })
      .refine((data) => data.endTime > data.startTime, {
        message: "End time must be after start time",
        path: ["endTime"],
      }),
  },
  async (appointment, input) => {
    // Check if appointment already exists
    if (appointment !== undefined) {
      // Appointment already exists, no change needed
      return;
    }

    // In a real system, you would check if the calendar exists
    // const calendar = await getCalendar(input.calendarId);
    // if (!calendar) {
    //   throw new CalendarNotFound({ calendarId: input.calendarId });
    // }

    // In a real system, you would check for time conflicts
    // const conflicts = await checkTimeConflicts(
    //   input.calendarId,
    //   input.startTime,
    //   input.endTime
    // );
    // if (conflicts.length > 0) {
    //   throw new TimeConflictError({
    //     calendarId: input.calendarId,
    //     startTime: input.startTime,
    //     endTime: input.endTime,
    //     conflictingItemIds: conflicts.map(c => c.id)
    //   });
    // }

    // Create the appointment
    return AppointmentScheduled({
      appointmentId: generateId("appt"),
      calendarId: input.calendarId,
      title: input.title,
      description: input.description,
      startTime: input.startTime,
      endTime: input.endTime,
      participants: input.participants,
      createdAt: Date.now(),
    });
  }
);
