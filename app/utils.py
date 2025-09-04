from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from typing import List, Tuple
from .config import SLOT_MINUTES

def to_utc(dt_local: datetime, tz_name: str) -> datetime:
    """
    Interpret dt_local as a *wall-clock* time in tz_name, regardless of tzinfo on the object.
    This avoids accidental double-conversion when clients send ISO strings with 'Z'.
    """
    tz = ZoneInfo(tz_name)
    naive = dt_local.replace(tzinfo=None)        # drop any incoming tzinfo
    localized = naive.replace(tzinfo=tz)         # attach intended TZ
    return localized.astimezone(ZoneInfo("UTC"))

def utc_to_tz(dt_utc: datetime, tz_name: str) -> datetime:
    return dt_utc.astimezone(ZoneInfo(tz_name))

def quantize_to_slots_utc(start_utc: datetime, end_utc: datetime) -> List[Tuple[datetime, datetime]]:
    slot = timedelta(minutes=SLOT_MINUTES)
    floored_min = (start_utc.minute // SLOT_MINUTES) * SLOT_MINUTES
    start_floor = start_utc.replace(minute=floored_min, second=0, microsecond=0)
    if start_floor > start_utc:
        start_floor -= slot
    ceiled_min = ((end_utc.minute + SLOT_MINUTES - 1) // SLOT_MINUTES) * SLOT_MINUTES
    end_ceil = end_utc.replace(minute=0, second=0, microsecond=0) + timedelta(minutes=ceiled_min)
    if end_ceil <= end_utc:
        end_ceil += slot

    out = []
    cur = start_floor
    while cur < end_ceil:
        nxt = cur + slot
        if nxt > start_utc and cur < end_utc:
            out.append((cur, nxt))
        cur = nxt
    return out
