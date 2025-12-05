# -*- coding: utf-8 -*-
"""Fix datasets table schema."""

from app.database import init_db, init_engine
from app.config import Config

# Initialize database engine
init_engine(Config.DATABASE_URL)

# Recreate tables
init_db()

print("Datasets table has been recreated with correct schema.")













