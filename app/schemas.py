from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime

# ----- Events -----
class EventCreate(BaseModel):
    title: str
    default_timezone: str = "UTC"
    start_utc: Optional[datetime] = None
    end_utc: Optional[datetime] = None

class EventOut(BaseModel):
    id: int
    title: str
    default_timezone: str
    start_utc: Optional[datetime]
    end_utc: Optional[datetime]
    class Config:
        from_attributes = True

# ----- Participants -----
class ParticipantUpsert(BaseModel):
    username: str
    timezone: str
    color: str = "#66ccff"

class ParticipantOut(BaseModel):
    id: int
    event_id: int
    username: str
    timezone: str
    color: str
    class Config:
        from_attributes = True

# ----- Availability -----
class IntervalIn(BaseModel):
    start_local: datetime
    end_local: datetime
    timezone: str

class AvailabilityIn(BaseModel):
    participant_id: int
    intervals: List[IntervalIn]

class CellOut(BaseModel):
    slot_start: datetime
    slot_end: datetime
    # list of participants present in this slot (name + color)
    participants: List[Dict[str, str]]

class GridOut(BaseModel):
    event_id: int
    timezone: str
    slots: List[CellOut]
