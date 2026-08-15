import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .api import bookings, continuity, demo, flights, risks, trips
from .database import Base, engine
from .monitor import monitor_loop


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(monitor_loop())
    yield
    task.cancel()


Base.metadata.create_all(bind=engine)

app = FastAPI(title="Agentic Trip Continuity Platform", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(trips.router)
app.include_router(bookings.router)
app.include_router(risks.router)
app.include_router(flights.router)
app.include_router(continuity.router)
app.include_router(demo.router)


@app.get("/health")
def health():
    return {"status": "ok"}


from pathlib import Path

static_dir = Path(__file__).parent.parent / "static"
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=static_dir), name="static")
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="frontend")