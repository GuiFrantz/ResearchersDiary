import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.constants import APP_TITLE, APP_VERSION
from app.routers import auth as auth_router
from app.routers import departments as departments_router
from app.routers import exports as exports_router
from app.routers import institutions as institutions_router
from app.routers import invitations as invitations_router
from app.routers import orcid as orcid_router
from app.routers import records as records_router
from app.routers import reports as reports_router
from app.routers import users as users_router

app = FastAPI(
    title=APP_TITLE,
    version=APP_VERSION,
    redirect_slashes=False,
)

cors_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(institutions_router.router)
app.include_router(departments_router.router)
app.include_router(users_router.router)
app.include_router(invitations_router.router)
for record_router in records_router.routers:
    app.include_router(record_router)
app.include_router(orcid_router.router)
app.include_router(exports_router.router)
app.include_router(reports_router.router)


@app.get("/", tags=["Health"])
async def health_check():
    return {"status": "ok"}
