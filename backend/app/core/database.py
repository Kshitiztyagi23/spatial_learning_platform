from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

from urllib.parse import urlparse, parse_qs, urlencode, urlunparse

def get_async_db_url(url: str) -> str:
    if url.startswith("postgresql://"):
        url = "postgresql+asyncpg://" + url[len("postgresql://"):]
    elif url.startswith("postgres://"):
        url = "postgresql+asyncpg://" + url[len("postgres://"):]
    
    parsed = urlparse(url)
    qs = parse_qs(parsed.query)
    qs.pop("sslmode", None)
    qs.pop("channel_binding", None)
    qs["ssl"] = ["require"]
    new_query = urlencode(qs, doseq=True)
    return urlunparse(parsed._replace(query=new_query))

# Reuse connections: opening one to Neon costs ~1.7 s (TLS + auth across the
# ocean) versus ~0.3 s per query, so a fresh connection per request made every
# page wait seconds. pre_ping drops connections Neon closed while idle (its
# compute suspends after ~5 minutes); recycle replaces them before that.
engine = create_async_engine(
    get_async_db_url(settings.database_url),
    echo=False,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
    pool_recycle=240,
    connect_args={"statement_cache_size": 0},
)
async_session_maker = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

class Base(DeclarativeBase):
    pass

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session
