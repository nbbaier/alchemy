import { z } from "zod";
import { aggregate } from "../../ddd";
import { assertNever } from "../../ddd/assert-never";
import { TimeSlotBlocked } from "./TimeSlotBlocked.event";
import { TimeSlotUnblocked } from "./TimeSlotUnblocked.event";

/**
 * TimeBlock aggregate represents a blocked time slot on a calendar
 *
 * @example
 * const timeBlock = {
 *   blockId: "block-123",
 *   calendarId: "cal-456",
 *   title: "Focus Time",
 *   startTime: 1634567890000,
 *   endTime: 1634571490000,
 *   recurrence: null,
 *   createdAt: 1634567890000,
 *   status: "active"
 * };
 */
export const TimeBlock = aggregate(
  "TimeBlock",
  {
    schema: z.object({
      /**
       * Unique identifier for the blocked time slot
       */
      blockId: z.string(),

      /**
       * ID of the calendar this block belongs to
       */
      calendarId: z.string(),

      /**
       * Title/reason for blocking the time slot
       */
      title: z.string(),

      /**
       * Start time of the blocked slot (timestamp)
       */
      startTime: z.number(),

      /**
       * End time of the blocked slot (timestamp)
       */
      endTime: z.number(),

      /**
       * Optional recurrence rule (null means no recurrence)
       */
      recurrence: z.string().nullable(),

      /**
       * Timestamp when the block was created
       */
      createdAt: z.number(),

      /**
       * Current status of the block (active or inactive)
       */
      status: z.enum(["active", "inactive"]),
    }),
    events: [TimeSlotBlocked, TimeSlotUnblocked],
  },
  (state, event) => {
    if (event.type === "TimeSlotBlocked") {
      return {
        blockId: event.payload.blockId,
        calendarId: event.payload.calendarId,
        title: event.payload.title,
        startTime: event.payload.startTime,
        endTime: event.payload.endTime,
        recurrence: event.payload.recurrence ?? null,
        createdAt: event.payload.createdAt,
        status: "active",
      };
    } else if (event.type === "TimeSlotUnblocked") {
      if (!state) return state;

      return {
        ...state,
        status: "inactive",
      };
    } else {
      return assertNever(event);
    }
  }
);
