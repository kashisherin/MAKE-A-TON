from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import init_db
from app.api.v1.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables on startup
    init_db()
    yield


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="KASHI – Production-Grade Billing, Payments & Subscription Intelligence Subsystem",
    lifespan=lifespan,
)

# Enable CORS for cross-origin integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok", "service": "kashi", "version": settings.app_version}


@app.get("/dashboard", response_class=HTMLResponse, tags=["ui"])
@app.get("/", response_class=HTMLResponse, tags=["ui"])
def dashboard():
    html_file = Path(__file__).parent / "static" / "dashboard.html"
    if html_file.exists():
        return HTMLResponse(content=html_file.read_text(encoding="utf-8"))
    return HTMLResponse(content="<h1>KASHI Dashboard UI</h1>")


app.include_router(api_router, prefix=settings.api_v1_prefix)
