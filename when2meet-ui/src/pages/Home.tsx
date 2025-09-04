import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="container">
      <h2>When2Meet International</h2>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:20,marginTop:20}}>
        <Link to="/createEvent" className="card" style={{textDecoration:'none',color:'inherit',height:160,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:18}}>
          Create a new Event
        </Link>
        <Link to="/join" className="card" style={{textDecoration:'none',color:'inherit',height:160,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:18}}>
          Join an event
        </Link>
      </div>
    </div>
  )
}
