import { useEffect, useMemo, useState } from 'react'
import { createEvent, fetchGrid, submitAvailability, upsertParticipant, type GridOut } from './lib/api'
import { TZ_LIST } from './lib/tz'
import { isoAt, halfHourSlots, SLOT_MIN } from './lib/time'
import { clsx } from 'clsx'

const getLS = <T,>(k: string, d: T): T => { try { return JSON.parse(localStorage.getItem(k) || '') as T } catch { return d } }
const setLS = (k: string, v: any) => localStorage.setItem(k, JSON.stringify(v))

export default function App() {
  const [eventId, setEventId] = useState<number | ''>(getLS<number>('eventId', 0) || '')
  const [title, setTitle] = useState('Team Sync')
  const [eventTz, setEventTz] = useState('UTC')

  const [username, setUsername] = useState(getLS<string>('username', ''))
  const [userTz, setUserTz] = useState(getLS<string>('userTz', 'America/Los_Angeles'))
  const [color, setColor] = useState(getLS<string>('color', '#66ccff'))
  const [participantId, setParticipantId] = useState<number | null>(getLS<number>('participantId', 0) || null)

  const todayStr = new Date().toISOString().slice(0,10)
  const [dateStr, setDateStr] = useState(todayStr)
  const [displayTz, setDisplayTz] = useState('America/Los_Angeles')
  const [startStr, setStartStr] = useState('09:00')
  const [endStr, setEndStr] = useState('17:00')

  const [grid, setGrid] = useState<GridOut | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set()) // ISO start keys

  useEffect(() => { if (eventId) setLS('eventId', eventId) }, [eventId])
  useEffect(() => setLS('username', username), [username])
  useEffect(() => setLS('userTz', userTz), [userTz])
  useEffect(() => setLS('color', color), [color])
  useEffect(() => { if (participantId) setLS('participantId', participantId) }, [participantId])

  const range = useMemo(() => {
    const s = isoAt(dateStr, startStr)
    const e = isoAt(dateStr, endStr)
    return { s, e }
  }, [dateStr, startStr, endStr])

  async function onCreateEvent() {
    const ev = await createEvent(title || 'Untitled', eventTz)
    setEventId(ev.id)
    setGrid(null)
    setSelected(new Set())
  }

  async function onJoin() {
    if (!eventId) return alert('Enter Event ID')
    if (!username.trim()) return alert('Enter username')
    const p = await upsertParticipant(Number(eventId), username.trim(), userTz, color)
    setParticipantId(p.id)
  }

  async function onBuildGrid() {
    if (!eventId) return alert('Enter Event ID')
    const g = await fetchGrid(Number(eventId), displayTz)
    setGrid(g)
    setSelected(new Set()) // fresh selection per build
  }

  function toggleSlot(isoStart: string) {
    const next = new Set(selected)
    if (next.has(isoStart)) next.delete(isoStart); else next.add(isoStart)
    setSelected(next)
  }

  function compressSelections(): { start_local: string, end_local: string, timezone: string }[] {
    const keys = Array.from(selected).sort()
    if (keys.length === 0) return []
    const out: { start_local: string, end_local: string, timezone: string }[] = []
    let runStart = new Date(keys[0])
    let prev = new Date(keys[0])

    for (let i=1; i<keys.length; i++) {
      const cur = new Date(keys[i])
      const expected = new Date(prev.getTime() + SLOT_MIN*60000)
      if (cur.getTime() === expected.getTime()) {
        prev = cur
      } else {
        const endLocal = new Date(prev.getTime() + SLOT_MIN*60000)
        out.push({ start_local: runStart.toISOString(), end_local: endLocal.toISOString(), timezone: userTz })
        runStart = cur
        prev = cur
      }
    }
    const endLocal = new Date(prev.getTime() + SLOT_MIN*60000)
    out.push({ start_local: runStart.toISOString(), end_local: endLocal.toISOString(), timezone: userTz })
    return out
  }

  async function onSave() {
    if (!eventId) return alert('Enter Event ID')
    if (!participantId) return alert('Join the event first')
    const intervals = compressSelections()
    if (intervals.length === 0) return alert('No slots selected')
    await submitAvailability(Number(eventId), participantId, intervals)
    await onBuildGrid()
  }

  // Build the local time grid (UI-only); the backend converts/aggregates data
  const rows = useMemo(() => {
    const arr: { start: Date, end: Date, key: string }[] = []
    for (const [s, e] of halfHourSlots(range.s, range.e)) {
      arr.push({ start: s, end: e, key: s.toISOString() })
    }
    return arr
  }, [range])

  // Map of slotStart → participants[] from grid (already in display tz)
  const slotMap = useMemo(() => {
    const m = new Map<string, { username: string; color: string }[]>()
    if (grid) {
      for (const c of grid.slots) {
        const k = new Date(c.slot_start).toISOString()
        m.set(k, c.participants)
      }
    }
    return m
  }, [grid])

  return (
    <div className="container">
      <h2>When2Meet Lite (React)</h2>

      <div className="card">
        <div className="section-title">Event</div>
        <div className="row">
          <input placeholder="Event ID" value={eventId} onChange={e => setEventId(e.target.value ? Number(e.target.value) : '')} style={{width:110}} />
          <input placeholder="New event title" value={title} onChange={e=>setTitle(e.target.value)} />
          <select value={eventTz} onChange={e=>setEventTz(e.target.value)}>
            {TZ_LIST.map(tz => <option key={tz}>{tz}</option>)}
          </select>
          <button onClick={onCreateEvent}>Create Event</button>
        </div>
      </div>

      <div className="card">
        <div className="section-title">Your Profile</div>
        <div className="row">
          <input placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} />
          <select value={userTz} onChange={e=>setUserTz(e.target.value)}>
            {TZ_LIST.map(tz => <option key={tz}>{tz}</option>)}
          </select>
          <input type="color" value={color} onChange={e=>setColor(e.target.value)} />
          <button onClick={onJoin}>Join / Update</button>
          {participantId && <span className="help">participant_id: {participantId}</span>}
        </div>
      </div>

      <div className="card">
        <div className="section-title">Calendar</div>
        <div className="row">
          <label>Date <input type="date" value={dateStr} onChange={e=>setDateStr(e.target.value)} /></label>
          <label>Start <input type="time" value={startStr} onChange={e=>setStartStr(e.target.value)} /></label>
          <label>End <input type="time" value={endStr} onChange={e=>setEndStr(e.target.value)} /></label>
          <label>Display TZ
            <select value={displayTz} onChange={e=>setDisplayTz(e.target.value)}>
              {TZ_LIST.map(tz => <option key={tz}>{tz}</option>)}
            </select>
          </label>
          <button onClick={onBuildGrid}>Build Grid</button>
          <button onClick={onSave}>Save My Availability</button>
          <span className="help">Click a row to toggle your availability (30-min slots).</span>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th style={{width:180}}>Time ({displayTz})</th>
              <th>People</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const people = slotMap.get(r.key) ?? []
              const isSel = selected.has(r.key)
              const label = `${r.start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} – ${r.end.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`
              return (
                <tr key={r.key}>
                  <td>{label}</td>
                  <td className={clsx('cell', isSel && 'selected')} onClick={() => toggleSlot(r.key)}>
                    {people.map(p => (
                      <span key={p.username} className="chip" style={{ background: p.color }}>{p.username}</span>
                    ))}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="help">Tip: after saving, “Build Grid” refresh shows everyone’s latest in your chosen display timezone.</div>
    </div>
  )
}
