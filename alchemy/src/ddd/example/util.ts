/**
 * Check if two time ranges overlap
 *
 * @param start1 Start time of first range
 * @param end1 End time of first range
 * @param start2 Start time of second range
 * @param end2 End time of second range
 * @returns true if the ranges overlap, false otherwise
 */
export function timeRangesOverlap(
  start1: number,
  end1: number,
  start2: number,
  end2: number
): boolean {
  return start1 < end2 && start2 < end1;
}
