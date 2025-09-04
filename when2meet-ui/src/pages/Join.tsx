import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Join() {
  const [id, setId] = useState('')
  const nav = useNavigate()
  return (
    <div className="container">
      <h2>Join an Event</h2>
      <div className="card">
        <div className="row">
          <input placeholder="Event ID" value={id} onChange={e=>setId(e.target.value)} style={{width:200}} />
          <button onClick={()=>{
            const n = Number(id)
            if (!n) return alert('Enter a numeric Event ID')
            nav(`/event?eventid=${n}`)
          }}>Go</button>
        </div>
      </div>
    </div>
  )
}
