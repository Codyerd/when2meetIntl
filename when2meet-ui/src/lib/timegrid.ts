// src/lib/timegrid.ts
import { addMinutes, eachDayOfInterval } from 'date-fns'
import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz'

export const SLOT_MIN = 30

export type DayCol = { dateKey: string; label: string }
export type DayRange = { startMin: number; endMin: number } // minutes from midnight [0..1440)

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x))

/** Build day columns (one per calendar day in displayTz) between UTC event bounds. */
export function buildDayColumns(startUtcISO: string, endUtcISO: string, displayTz: string): DayCol[] {
  const startZ = toZonedTime(new Date(startUtcISO), displayTz)
  const endZ = toZonedTime(new Date(endUtcISO), displayTz)
  const days = eachDayOfInterval({ start: startZ, end: endZ })
  return days.map(d => ({
    dateKey: formatInTimeZone(d, displayTz, 'yyyy-MM-dd'),
    label: formatInTimeZone(d, displayTz, 'EEE, MMM d'),
  }))
}

/** Always return 48 half-hour row labels, 00:00 → 23:30, in HH:mm. */
export function buildFullDayRows(): string[] {
  const out: string[] = []
  for (let m = 0; m < 24 * 60; m += SLOT_MIN) {
    const hh = String(Math.floor(m / 60)).padStart(2, '0')
    const mm = String(m % 60).padStart(2, '0')
    out.push(`${hh}:${mm}`)
  }
  return out
}

/** For each day column, compute the active window (mins from midnight) within event bounds. */
export function computeDailyRanges(
  startUtcISO: string,
  endUtcISO: string,
  displayTz: string,
  dayCols: DayCol[],
): Record<string, DayRange> {
  const result: Record<string, DayRange> = {}
  const startUtc = new Date(startUtcISO)
  const endUtc = new Date(endUtcISO)

  for (const day of dayCols) {
    const dayStartUtc = fromZonedTime(`${day.dateKey}T00:00:00`, displayTz)
    // end-exclusive = next day's 00:00
    const dayEndUtc   = new Date(fromZonedTime(`${day.dateKey}T00:00:00`, displayTz).getTime() + 24*60*60*1000)

    const s = new Date(Math.max(dayStartUtc.getTime(), startUtc.getTime()))
    const e = new Date(Math.min(dayEndUtc.getTime(), endUtc.getTime()))
    if (e <= s) { result[day.dateKey] = { startMin: 0, endMin: 0 }; continue }

    const sZ = toZonedTime(s, displayTz)
    const eZ = toZonedTime(e, displayTz)
    const toMin = (d: Date) => d.getHours() * 60 + d.getMinutes()

    result[day.dateKey] = {
      startMin: clamp(toMin(sZ), 0, 1440),
      endMin: clamp(toMin(eZ), 0, 1440),
    }
  }
  return result
}

/** Cell (dayKey + HH:mm in display TZ) → UTC interval edges for saving/toggling. */
export function cellToUtcInterval(dayKey: string, timeHHmm: string, displayTz: string) {
  const startWall = `${dayKey}T${timeHHmm}:00`
  const startUtc = fromZonedTime(startWall, displayTz)
  const endUtc = addMinutes(startUtc, SLOT_MIN)
  return { startUtc, endUtc }
}

/** Convert a UTC instant to {dayKey, hhmm} in display TZ for chip placement. */
export function instantToDisplayCell(utcISO: string, displayTz: string) {
  const d = new Date(utcISO)
  const dayKey = formatInTimeZone(d, displayTz, 'yyyy-MM-dd')
  const hhmm = formatInTimeZone(d, displayTz, 'HH:mm')
  return { dayKey, hhmm }
}
