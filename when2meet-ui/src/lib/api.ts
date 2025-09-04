const API_BASE = import.meta.env.VITE_API_BASE as string

export type EventOut = {
  id: number
  title: string
  default_timezone: string
  start_utc?: string | null
  end_utc?: string | null
}

export type Participant = {
  id: number
  event_id: number
  username: string
  timezone: string
  color: string
}

export type GridCell = {
  slot_start: string
  slot_end: string
  participants: { username: string; color: string }[]
}

export type GridOut = {
  event_id: number
  timezone: string
  slots: GridCell[]
}

export async function createEvent(
  title: string,
  default_timezone: string,
  start_utc?: string | null,
  end_utc?: string | null
): Promise<EventOut> {
  const r = await fetch(`${API_BASE}/api/events`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ title, default_timezone, start_utc, end_utc })
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function getEvent(eventId: number): Promise<EventOut> {
  const r = await fetch(`${API_BASE}/api/events/${eventId}`)
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function upsertParticipant(eventId: number, username: string, timezone: string, color: string): Promise<Participant> {
  const r = await fetch(`${API_BASE}/api/events/${eventId}/participants`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ username, timezone, color })
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function fetchGrid(eventId: number, tz: string): Promise<GridOut> {
  const r = await fetch(`${API_BASE}/api/events/${eventId}/grid?tz=${encodeURIComponent(tz)}`)
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function submitAvailability(
  eventId: number,
  participant_id: number,
  intervals: {start_local: string, end_local: string, timezone: string}[]
) {
  const r = await fetch(`${API_BASE}/api/events/${eventId}/availability`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ participant_id, intervals })
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}
