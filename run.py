import os
import uvicorn
from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
from app.routers.sessions import router as sessions_router
from app.routers.chat import router as chat_router

# 1. Initialize SQLite Database Schema
Base.metadata.create_all(bind=engine)

# 2. Initialize FastAPI Application
app = FastAPI(
    title="NexusAI — Production-Grade Free Tier Q&A",
    description="High-performance, zero-cost AI Q&A Web App powered by Google Gemini Free Tier.",
    version="1.0.0",
)

# 3. Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Session-Id", "X-Session-Title"],
)

# 4. Mount Static Assets
static_dir = Path(__file__).resolve().parent / "app" / "static"
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

# 5. Include API Routers
app.include_router(sessions_router)
app.include_router(chat_router)

# 6. Root Frontend Single-Page Application (SPA)
template_path = Path(__file__).resolve().parent / "app" / "templates" / "index.html"

@app.get("/", include_in_schema=False)
async def serve_index():
    return FileResponse(str(template_path))

# 7. Health Check Endpoint
@app.get("/api/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "model": settings.MODEL_NAME,
        "database": "sqlite",
        "free_tier": True
    }

if __name__ == "__main__":
    print(f"🚀 Starting NexusAI on http://{settings.HOST}:{settings.PORT}")
    print(f"🧠 AI Model Engine: {settings.MODEL_NAME}")
    print(f"💾 Persistent Storage: {settings.DATABASE_URL}")
    uvicorn.run("run:app", host=settings.HOST, port=settings.PORT, reload=False)

