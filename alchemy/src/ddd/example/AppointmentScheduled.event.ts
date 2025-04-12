import { z } from "zod";
import { event } from "../../ddd";

/**
 * Emitted when a new appointment is scheduled on a calendar
 *
 * @example
 * const appointmentScheduled = AppointmentScheduled({
 *   appointmentId: "appt-123",
 *   calendarId: "cal-456",
 *   title: "Team Meeting",
 *   description: "Weekly sync-up",
 *   startTime: 1634567890000,
 *   endTime: 1634571490000,
 *   participants: ["user-123", "user-456"],
 *   createdAt: Date.now()
 * });
 */
export const AppointmentScheduled = event(
  "AppointmentScheduled",
  z.object({
    /**
     * Unique identifier for the appointment
     */
    appointmentId: z.string(),

    /**
     * ID of the calendar this appointment belongs to
     */
    calendarId: z.string(),

    /**
     * Title of the appointment
     */
    title: z.string(),

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
    endTime: z.number(),

    /**
     * List of user IDs participating in this appointment
     */
    participants: z.array(z.string()),

    /**
     * Timestamp when the appointment was created
     */
    createdAt: z.number(),
  })
);
