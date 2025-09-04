import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createEvent } from '../lib/api'
import { TZ_LIST } from '../lib/tz'

export default function CreateEvent() {
  const nav = useNavigate()
  const [title, setTitle] = useState('Team Sync')
  const [tz, setTz] = useState('UTC')

  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate()+1)
  const dt = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9, 0).toISOString().slice(0,16)
  const [start, setStart] = useState(dt(tomorrow))
  const [end, setEnd] = useState(new Date(new Date(start).getTime()+8*3600*1000).toISOString().slice(0,16))

  async function onSubmit() {
    if (!title.trim()) return alert('Enter a title')
    const s = new Date(start), e = new Date(end)
    if (!(s < e)) return alert('End must be after Start')
    const ev = await createEvent(title.trim(), tz, s.toISOString(), e.toISOString())
    nav(`/event?eventid=${ev.id}`)
  }

  return (
    <div className="container">
      <h2>Create Event</h2>
      <div className="card">
        <div className="row">
          <input placeholder="Event title" value={title} onChange={e=>setTitle(e.target.value)} style={{minWidth:260}} />
          <label style={{display:'flex',alignItems:'center',gap:8}}>
            Current Timezone
            <select value={tz} onChange={e=>setTz(e.target.value)}>
              {TZ_LIST.map(t => <option key={t}>{t}</option>)}
            </select>
          </label>
        </div>
        <div className="row">
          <label>Start (local)
            <input type="datetime-local" value={start} onChange={e=>setStart(e.target.value)} style={{marginLeft:8}} />
          </label>
          <label>End (local)
            <input type="datetime-local" value={end} onChange={e=>setEnd(e.target.value)} style={{marginLeft:8}} />
          </label>
        </div>
        <div className="row">
          <button onClick={onSubmit}>Create</button>
        </div>
        <div className="help">Choose Event start/end time based on your TimeZone. It will automatically relects on other users' ends.</div>
      </div>
    </div>
  )
}
