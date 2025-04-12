import { z } from "zod";
import { error } from "../../ddd";

/**
 * Thrown when attempting to access an appointment that doesn't exist
 *
 * @example
 * throw new AppointmentNotFound({ appointmentId: "appt-123" });
 */
export const AppointmentNotFound = error(
  "AppointmentNotFound",
  z.object({
    /**
     * The ID of the appointment that was not found
     */
    appointmentId: z.string(),
  })
);
