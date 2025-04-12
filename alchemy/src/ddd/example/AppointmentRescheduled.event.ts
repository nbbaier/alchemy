import { z } from "zod";
import { event } from "../../ddd";

/**
 * Emitted when an existing appointment is rescheduled
 *
 * @example
 * const appointmentRescheduled = AppointmentRescheduled({
 *   appointmentId: "appt-123",
 *   calendarId: "cal-456",
 *   previousStartTime: 1634567890000,
 *   previousEndTime: 1634571490000,
 *   newStartTime: 1634657890000,
 *   newEndTime: 1634661490000,
 *   updatedAt: Date.now()
 * });
 */
export const AppointmentRescheduled = event(
  "AppointmentRescheduled",
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
     * Previous start time of the appointment (timestamp)
     */
    previousStartTime: z.number(),

    /**
     * Previous end time of the appointment (timestamp)
     */
    previousEndTime: z.number(),

    /**
     * New start time of the appointment (timestamp)
     */
    newStartTime: z.number(),

    /**
     * New end time of the appointment (timestamp)
     */
    newEndTime: z.number(),

    /**
     * Timestamp when the appointment was updated
     */
    updatedAt: z.number(),
  })
);
