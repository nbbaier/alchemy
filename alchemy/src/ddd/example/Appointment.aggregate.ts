import { z } from "zod";
import { aggregate } from "../../ddd";
import { assertNever } from "../../ddd/assert-never";
import { AppointmentCancelled } from "./AppointmentCancelled.event";
import { AppointmentRescheduled } from "./AppointmentRescheduled.event";
import { AppointmentScheduled } from "./AppointmentScheduled.event";

/**
 * Appointment aggregate represents a scheduled appointment on a calendar
 *
 * @example
 * const appointment = {
 *   appointmentId: "appt-123",
 *   calendarId: "cal-456",
 *   title: "Team Meeting",
 *   description: "Weekly sync-up",
 *   startTime: 1634567890000,
 *   endTime: 1634571490000,
 *   participants: ["user-123", "user-456"],
 *   createdAt: 1634567890000,
 *   updatedAt: null,
 *   status: "scheduled",
 *   cancelReason: null
 * };
 */
export const Appointment = aggregate(
  "Appointment",
  {
    schema: z.object({
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

      /**
       * Timestamp when the appointment was last updated
       */
      updatedAt: z.number().nullable(),

      /**
       * Current status of the appointment
       */
      status: z.enum(["scheduled", "rescheduled", "cancelled"]),

      /**
       * Reason for cancellation (if cancelled)
       */
      cancelReason: z.string().nullable(),
    }),
    events: [
      AppointmentScheduled,
      AppointmentRescheduled,
      AppointmentCancelled,
    ],
  },
  (state, event) => {
    if (event.type === "AppointmentScheduled") {
      return {
        appointmentId: event.payload.appointmentId,
        calendarId: event.payload.calendarId,
        title: event.payload.title,
        description: event.payload.description,
        startTime: event.payload.startTime,
        endTime: event.payload.endTime,
        participants: event.payload.participants,
        createdAt: event.payload.createdAt,
        updatedAt: null,
        status: "scheduled",
        cancelReason: null,
      };
    } else if (event.type === "AppointmentRescheduled") {
      if (!state) return state;

      return {
        ...state,
        startTime: event.payload.newStartTime,
        endTime: event.payload.newEndTime,
        updatedAt: event.payload.updatedAt,
        status: "rescheduled",
      };
    } else if (event.type === "AppointmentCancelled") {
      if (!state) return state;

      return {
        ...state,
        updatedAt: event.payload.cancelledAt,
        status: "cancelled",
        cancelReason: event.payload.reason || null,
      };
    } else {
      return assertNever(event);
    }
  }
);
