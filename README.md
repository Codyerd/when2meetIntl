# When2Meet-Lite (FastAPI + Postgres)

## What it does
- Users sign up (password optional) and set a timezone.
- Create an event and share its ID (or URL).
- Users submit their availability as local-time intervals; the server stores per-slot UTC ranges.
- Anyone can fetch aggregated availability converted to any timezone.

## Run locally

1) Create DB:
```bash
createdb when2meet
# or: psql -c 'CREATE DATABASE when2meet;'
