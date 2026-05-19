import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# 2. Get the Database URL
DATABASE_URL = os.getenv("DATABASE_URL")

# 3. Create the SQLAlchemy Engine
# 'check_same_thread' is only needed for SQLite; for Postgres, we can keep it simple.
engine = create_engine(DATABASE_URL)

# 4. Create a Session factory
# This is like a blueprint for creating database connections.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 5. Create the Base class
# All your models (User, Profile, etc.) will inherit from this.
Base = declarative_base()

# 6. Dependency to get a DB session
# This 'yield' pattern ensures the connection is closed after the request is done.
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()