export const SLOT_MIN = 30

export function isoAt(dateStr: string, timeStr: string) {
  // local time ISO
  return new Date(`${dateStr}T${timeStr}`)
}

export function fmtRange(startIso: string, endIso: string) {
  const s = new Date(startIso)
  const e = new Date(endIso)
  const opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
  return `${s.toLocaleTimeString([], opts)} – ${e.toLocaleTimeString([], opts)}`
}

export function* halfHourSlots(start: Date, end: Date) {
  for (let t = new Date(start); t < end; t = new Date(t.getTime() + SLOT_MIN*60000)) {
    const t2 = new Date(t.getTime() + SLOT_MIN*60000)
    yield [t, t2] as const
  }
}
