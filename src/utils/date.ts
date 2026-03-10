import { Timestamp } from "firebase/firestore";
import { format, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";

function toDate(date: Date | Timestamp): Date {
  if (date instanceof Timestamp) {
    return date.toDate();
  }
  return date;
}

/** Format as "Mar 9, 2026" */
export function formatDate(date: Date | Timestamp): string {
  return format(toDate(date), "MMM d, yyyy");
}

/** Format as "March 2026" */
export function formatMonthYear(date: Date): string {
  return format(date, "MMMM yyyy");
}

/** Get the first and last moment of the month containing `date`. */
export function getMonthRange(date: Date): { start: Date; end: Date } {
  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
  };
}

/** Check whether `date` falls within the same calendar month as `targetMonth`. */
export function isWithinMonth(date: Date, targetMonth: Date): boolean {
  const { start, end } = getMonthRange(targetMonth);
  return isWithinInterval(date, { start, end });
}
