import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateSE(d?: number | Date | string) {
  if (!d) return "";
  const date = typeof d === "number" || typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Lägger till hela år på ett ISO-datum (YYYY-MM-DD), skottårssäkert. */
export function addYearsISO(dateStr: string, years: number): string {
  const d = parseISODate(dateStr);
  if (!d) return "";
  const day = d.getDate();
  d.setDate(1);
  d.setFullYear(d.getFullYear() + years);
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, daysInMonth));
  return formatDateSE(d);
}

function parseISODate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Nästa ordinarie besiktning enligt BFS 2011:16.
 * I tid/tidigt → besiktningsdatum + intervall.
 * För sent → nästa datum i den ursprungliga cykeln (föregående + n × intervall).
 */
export function calculateNextInspectionDate({
  inspectionDate,
  previousDate,
  intervalYears,
  isFirstInspection = false,
}: {
  inspectionDate?: string;
  previousDate?: string;
  intervalYears: number;
  isFirstInspection?: boolean;
}): string {
  if (!intervalYears || intervalYears <= 0) return "";
  const today = parseISODate(inspectionDate);
  if (!today) return "";
  const fromToday = addYearsISO(inspectionDate!, intervalYears);

  const prev = parseISODate(previousDate);
  if (isFirstInspection || !prev) return fromToday;

  let deadline = addYearsISO(previousDate!, intervalYears);
  const deadlineDate = parseISODate(deadline);
  if (!deadlineDate) return fromToday;
  if (today.getTime() <= deadlineDate.getTime()) return fromToday;

  let guard = 0;
  while (guard++ < 200) {
    const d = parseISODate(deadline);
    if (!d || d.getTime() > today.getTime()) break;
    deadline = addYearsISO(deadline, intervalYears);
  }
  return deadline;
}
