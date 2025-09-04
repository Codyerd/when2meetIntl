from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse  
from sqlalchemy.orm import Session
from typing import List

from .database import Base, engine, get_db
from . import models, schemas
from .utils import to_utc, utc_to_tz, quantize_to_slots_utc

app = FastAPI(title="When2Meet-Lite (No-Auth)")

# TODO: Change to actual frontend, current accept all connections
import os
origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "ok", "service": "when2meet-plus API"}


Base.metadata.create_all(bind=engine)

# --------- Events ----------
@app.post("/api/events", response_model=schemas.EventOut)
def create_event(payload: schemas.EventCreate, db: Session = Depends(get_db)):
    ev = models.Event(**payload.model_dump())
    db.add(ev)
    db.commit()
    db.refresh(ev)
    return ev

@app.get("/api/events/{event_id}", response_model=schemas.EventOut)
def get_event(event_id: int, db: Session = Depends(get_db)):
    ev = db.get(models.Event, event_id)
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")
    return ev

# --------- Participants ----------
@app.post("/api/events/{event_id}/participants", response_model=schemas.ParticipantOut)
def upsert_participant(event_id: int, payload: schemas.ParticipantUpsert, db: Session = Depends(get_db)):
    ev = db.get(models.Event, event_id)
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")

    p = (
        db.query(models.Participant)
        .filter(models.Participant.event_id == event_id, models.Participant.username == payload.username)
        .one_or_none()
    )
    if p:
        p.timezone = payload.timezone
        p.color = payload.color
    else:
        p = models.Participant(event_id=event_id, **payload.model_dump())
        db.add(p)
    db.commit()
    db.refresh(p)
    return p

@app.get("/api/events/{event_id}/participants", response_model=List[schemas.ParticipantOut])
def list_participants(event_id: int, db: Session = Depends(get_db)):
    return (
        db.query(models.Participant)
        .filter(models.Participant.event_id == event_id)
        .order_by(models.Participant.username.asc())
        .all()
    )

# --------- Availability ----------
@app.post("/api/events/{event_id}/availability")
def submit_availability(event_id: int, payload: schemas.AvailabilityIn, db: Session = Depends(get_db)):
    ev = db.get(models.Event, event_id)
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")

    part = db.get(models.Participant, payload.participant_id)
    if not part or part.event_id != event_id:
        raise HTTPException(status_code=400, detail="Invalid participant")

    # overwrite this participant's slots
    db.query(models.Availability).filter_by(event_id=event_id, participant_id=part.id).delete()

    total = 0
    for itv in payload.intervals:
        s_utc = to_utc(itv.start_local, itv.timezone)
        e_utc = to_utc(itv.end_local, itv.timezone)
        if e_utc <= s_utc:
            continue
        for s, e in quantize_to_slots_utc(s_utc, e_utc):
            db.add(models.Availability(
                event_id=event_id,
                participant_id=part.id,
                slot_start_utc=s,
                slot_end_utc=e
            ))
            total += 1

    db.commit()
    return {"status": "ok", "slots_added": total}

@app.get("/api/events/{event_id}/grid", response_model=schemas.GridOut)
def grid(
    event_id: int,
    tz: str = Query("UTC", description="Display timezone (e.g., America/Los_Angeles)"),
    db: Session = Depends(get_db),
):
    ev = db.get(models.Event, event_id)
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")

    rows = (
        db.query(models.Availability, models.Participant)
        .join(models.Participant, models.Availability.participant_id == models.Participant.id)
        .filter(models.Availability.event_id == event_id)
        .all()
    )

    # aggregate by slot
    buckets = {}
    for av, p in rows:
        key = (av.slot_start_utc, av.slot_end_utc)
        buckets.setdefault(key, []).append({"username": p.username, "color": p.color})

    # convert to requested tz
    cells = []
    for (s_utc, e_utc), plist in sorted(buckets.items()):
        cells.append({
            "slot_start": utc_to_tz(s_utc, tz),
            "slot_end": utc_to_tz(e_utc, tz),
            "participants": plist
        })

    return {"event_id": event_id, "timezone": tz, "slots": cells}
