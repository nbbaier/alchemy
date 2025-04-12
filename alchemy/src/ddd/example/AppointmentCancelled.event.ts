import { z } from "zod";
import { event } from "../../ddd";

/**
 * Emitted when an appointment is cancelled
 *
 * @example
 * const appointmentCancelled = AppointmentCancelled({
 *   appointmentId: "appt-123",
 *   calendarId: "cal-456",
 *   reason: "Schedule conflict",
 *   cancelledAt: Date.now()
 * });
 */
export const AppointmentCancelled = event(
  "AppointmentCancelled",
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
     * Optional reason for cancellation
     */
    reason: z.string().optional(),

    /**
     * Timestamp when the appointment was cancelled
     */
    cancelledAt: z.number(),
  })
);
