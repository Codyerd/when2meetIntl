import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/when2meet")
SLOT_MINUTES = int(os.getenv("SLOT_MINUTES", "30"))
