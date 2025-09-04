import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './styles.css'
import Home from './pages/Home'
import CreateEvent from './pages/CreateEvent'
import Join from './pages/Join'
import EventPage from './pages/EventPage' // Availability

const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/createEvent', element: <CreateEvent /> },
  { path: '/join', element: <Join /> },
  { path: '/event', element: <EventPage /> }, // expects ?eventid=123
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
