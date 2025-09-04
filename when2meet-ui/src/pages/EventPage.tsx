import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { fetchGrid, getEvent, submitAvailability, upsertParticipant } from '../lib/api'
import { TZ_LIST } from '../lib/tz'
import {
  SLOT_MIN,
  type DayCol,
  buildDayColumns,
  buildFullDayRows,
  cellToUtcInterval,
  instantToDisplayCell,
} from '../lib/timegrid'
import { addMinutes } from 'date-fns'
import { formatNaiveInTZ } from '../lib/tzfmt'
import { clsx } from 'clsx'

const getLS = <T,>(k: string, d: T): T => { try { return JSON.parse(localStorage.getItem(k) || '') as T } catch { return d } }
const setLS = (k: string, v: any) => localStorage.setItem(k, JSON.stringify(v))

type UtcSlot = { slot_start: string; participants: { username: string; color: string }[] }

export default function EventPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const eventId = Number(params.get('eventid') || 0)

  const [eventTitle, setEventTitle] = useState('')
  const [eventDefaultTz, setEventDefaultTz] = useState('UTC')
  const [bounds, setBounds] = useState<{ start?: string; end?: string }>({})

  const [username, setUsername] = useState(getLS('username', ''))
  const [color, setColor] = useState(getLS('color', '#66ccff'))
  const [participantId, setParticipantId] = useState<number | null>(null) // do NOT gate UI by LS
  const [hasJoined, setHasJoined] = useState(false) // controls calendar visibility for this visit

  const [displayTz, setDisplayTz] = useState('America/Los_Angeles')

  const [rawUtcSlots, setRawUtcSlots] = useState<UtcSlot[] | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => { if (!eventId) navigate('/') }, [eventId, navigate])

  // Reset per-event visit state when navigating to a different event
  useEffect(() => {
    setHasJoined(false)
    setParticipantId(null)
    setSelected(new Set())
    setRawUtcSlots(null)
  }, [eventId])

  // Load event metadata
  useEffect(() => {
    (async () => {
      const ev = await getEvent(eventId)
      setEventTitle(ev.title)
      setEventDefaultTz(ev.default_timezone || 'UTC')
      setBounds({ start: ev.start_utc || undefined, end: ev.end_utc || undefined })
    })().catch(err => alert(`Load event failed: ${err}`))
  }, [eventId])

  // Persist small bits (but NOT hasJoined/participant gating)
  useEffect(() => setLS('username', username), [username])
  useEffect(() => setLS('color', color), [color])

  // Fixed rows (00:00 → 23:30) and columns (depend on bounds + display TZ)
  const timeRows = useMemo(() => buildFullDayRows(), [])
  const dayCols: DayCol[] = useMemo(() => {
    if (!bounds.start || !bounds.end) return []
    return buildDayColumns(bounds.start, bounds.end, displayTz)
  }, [bounds.start, bounds.end, displayTz])

  // Fetch availability in UTC (only after Join, or after Save)
  async function loadUtcGrid() {
    const gUTC = await fetchGrid(eventId, 'UTC')
    const slots: UtcSlot[] = gUTC.slots.map(s => ({
      slot_start: new Date(s.slot_start).toISOString(), // normalize
      participants: s.participants,
    }))
    setRawUtcSlots(slots)
  }

  // Reflow chips when TZ changes or raw slots change (no extra fetch)
  const displayMap = useMemo(() => {
    const m = new Map<string, { username: string; color: string }[]>()
    if (!rawUtcSlots) return m
    for (const s of rawUtcSlots) {
      const { dayKey, hhmm } = instantToDisplayCell(s.slot_start, displayTz)
      const k = `${dayKey}__${hhmm}`
      const prev = m.get(k) || []
      m.set(k, [...prev, ...s.participants])
    }
    return m
  }, [rawUtcSlots, displayTz])

  // Join/update profile (enforces single color per name via server)
  async function onJoin() {
    const name = username.trim()
    if (!name) return alert('Enter nickname')
    const p = await upsertParticipant(eventId, name, displayTz, color)
    setParticipantId(p.id)
    setHasJoined(true)          // calendar becomes visible ONLY after this
    setColor(p.color)           // trust server color for this username
    setLS('color', p.color)
    await loadUtcGrid()
  }

  function toggleCell(utcStartISO: string) {
    const next = new Set(selected)
    next.has(utcStartISO) ? next.delete(utcStartISO) : next.add(utcStartISO)
    setSelected(next)
  }

  // Save: compress selected UTC instants into naive wall-time intervals in Display TZ
  async function onSave() {
    if (!participantId) return alert('Join the event first')
    const keys = Array.from(selected).sort()
    if (!keys.length) return alert('No slots selected')

    const intervals: { start_local: string; end_local: string; timezone: string }[] = []
    let runStart = new Date(keys[0])
    let prev = new Date(keys[0])

    for (let i = 1; i < keys.length; i++) {
      const cur = new Date(keys[i])
      const expected = new Date(prev.getTime() + SLOT_MIN * 60000)
      if (cur.getTime() === expected.getTime()) {
        prev = cur
      } else {
        const endInstant = addMinutes(prev, SLOT_MIN)
        intervals.push({
          start_local: formatNaiveInTZ(runStart, displayTz),
          end_local: formatNaiveInTZ(endInstant, displayTz),
          timezone: displayTz,
        })
        runStart = cur
        prev = cur
      }
    }
    const endInstant = addMinutes(prev, SLOT_MIN)
    intervals.push({
      start_local: formatNaiveInTZ(runStart, displayTz),
      end_local: formatNaiveInTZ(endInstant, displayTz),
      timezone: displayTz,
    })

    await submitAvailability(eventId, participantId, intervals)
    await loadUtcGrid()        // refresh raw UTC, chips auto-reflow
    setSelected(new Set())     // clear selections (borders)
  }

  if (!bounds.start || !bounds.end) {
    return (
      <div className="container">
        <h2>{eventTitle || 'Event'} <span className="help">({eventDefaultTz})</span></h2>
        <div className="card">This event has no time bounds configured.</div>
      </div>
    )
  }

  return (
    <div className="container">
      <h2>{eventTitle || 'Event'}</h2>

      {/* Profile (calendar hidden until Join on this visit) */}
      <div className="card">
        <div className="section-title">Your Profile</div>
        <div className="row">
          <input
            placeholder="Nickname"
            value={username}
            onChange={e=>setUsername(e.target.value)}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>Color:</span>
            <input
              type="color"
              value={color}
              onChange={e=>setColor(e.target.value)}
              style={{ width: 40, height: 30, border: 'none', padding: 0, cursor: 'pointer' }}
              title="Pick your color"
            />
          </label>
          <button onClick={onJoin}>Join/Update</button>
          {hasJoined && <span className="help">You've joined as <b>{username}</b>.</span>}
        </div>
      </div>

      {/* Calendar appears only after Join is clicked (per-visit) */}
      {hasJoined && (
        <div className="card">
          <div className="section-title">Calendar</div>
          <div className="row">
            <label>Choose your TimeZone:
              <select value={displayTz} onChange={e=>setDisplayTz(e.target.value)} style={{marginLeft:8}}>
                {TZ_LIST.map(t => <option key={t}>{t}</option>)}
              </select>
            </label>
            <button onClick={onSave}>Save My Availability</button>
            <span className="help">
              Click 'Save' once you finished selecting time periods. Warn: will clear your previous availabilities, so keep them selected if you want to update on that
            </span>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th style={{width:110}}>Time</th>
                {dayCols.map(d => <th key={d.dateKey}>{d.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {timeRows.map(hhmm => (
                <tr key={hhmm}>
                  <td>{hhmm}</td>
                  {dayCols.map(day => {
                    // UTC instant for this cell (stable across TZ changes)
                    const { startUtc } = cellToUtcInterval(day.dateKey, hhmm, displayTz)
                    const utcKey = startUtc.toISOString()

                    // Chips mapped in display coordinates
                    const people = (displayMap.get(`${day.dateKey}__${hhmm}`) ?? [])
                    const isSel = selected.has(utcKey)

                    return (
                      <td
                        key={day.dateKey}
                        className={clsx('cell', isSel && 'selected')}
                        onClick={() => toggleCell(utcKey)}
                      >
                        {people.map(p => (
                          <span key={p.username} className="chip" style={{ background: p.color }}>{p.username}</span>
                        ))}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
