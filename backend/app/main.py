from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel

from app.constants import APP_TITLE, APP_VERSION, CORS_ORIGINS
from app.database import engine
from app.routers import auth as auth_router
from app.routers import departments as departments_router
from app.routers import experiences as experiences_router
from app.routers import exports as exports_router
from app.routers import institutions as institutions_router
from app.routers import projects as projects_router
from app.routers import proposals as proposals_router
from app.routers import publications as publications_router
from app.routers import reports as reports_router
from app.routers import users as users_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    yield


app = FastAPI(
    title=APP_TITLE,
    version=APP_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(institutions_router.router)
app.include_router(departments_router.router)
app.include_router(users_router.router)
app.include_router(publications_router.router)
app.include_router(projects_router.router)
app.include_router(proposals_router.router)
app.include_router(experiences_router.router)
app.include_router(exports_router.router)
app.include_router(reports_router.router)


@app.get("/", tags=["Health"])
async def health_check():
    return {"status": "ok"}
