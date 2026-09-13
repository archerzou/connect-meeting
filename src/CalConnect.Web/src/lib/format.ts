import { DateTime } from "luxon"
import { formatDuration } from "@/lib/duration"

export function fmtDate(iso: string): string {
  return DateTime.fromISO(iso).toFormat("ccc, LLL d")
}

export function fmtTime(iso: string): string {
  return DateTime.fromISO(iso).toFormat("h:mm a")
}

export function fmtDateTimeRange(startIso: string, durationMinutes: number): string {
  const start = DateTime.fromISO(startIso)
  const end = start.plus({ minutes: durationMinutes })
  return `${start.toFormat("ccc, LLL d")} · ${start.toFormat("h:mm a")}–${end.toFormat(
    "h:mm a"
  )} (${formatDuration(durationMinutes)})`
}

export function toInputDateTime(iso: string): string {
  // For <input type="datetime-local">
  return DateTime.fromISO(iso).toFormat("yyyy-LL-dd'T'HH:mm")
}

export function fromInputDateTime(value: string): string {
  // Parse the picked wall-clock time in the local zone, then send as UTC (…Z) —
  // Npgsql's `timestamp with time zone` only accepts UTC DateTimes.
  const dt = DateTime.fromFormat(value, "yyyy-LL-dd'T'HH:mm")
  return (dt.isValid ? dt.toUTC().toISO() : new Date(value).toISOString()) as string
}

export function initials(firstName?: string, lastName?: string): string {
  return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "?"
}
