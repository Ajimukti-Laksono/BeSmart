"""Entrypoint aplikasi FastAPI untuk BeasiswaSmart (BeSmart)."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.db.session import check_db_connection
from app.routers import applicants as applicants_router
from app.routers import aras as aras_router
from app.routers import auth as auth_router
from app.routers import criteria as criteria_router
from app.routers import periods as periods_router
from app.routers import users as users_router


def create_app() -> FastAPI:
    """Factory function untuk membangun dan mengonfigurasi instance FastAPI."""
    application = FastAPI(
        title=settings.APP_NAME,
        description=(
            "Sistem Pendukung Keputusan Penentuan Penerima Beasiswa "
            "dengan Implementasi Algoritma ARAS (Additive Ratio Assessment)."
        ),
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_exception_handlers(application)

    application.include_router(auth_router.router, prefix=settings.API_PREFIX)
    application.include_router(users_router.router, prefix=settings.API_PREFIX)
    application.include_router(periods_router.router, prefix=settings.API_PREFIX)
    application.include_router(criteria_router.router, prefix=settings.API_PREFIX)
    application.include_router(applicants_router.router, prefix=settings.API_PREFIX)
    application.include_router(aras_router.router, prefix=settings.API_PREFIX)

    @application.get("/", tags=["Root"])
    def root() -> dict[str, str]:
        """Endpoint informasi dasar layanan API BeSmart."""
        return {
            "app": settings.APP_NAME,
            "version": "1.0.0",
            "docs": "/docs",
        }

    @application.get(f"{settings.API_PREFIX}/health", tags=["Health"])
    def health_check() -> dict[str, str]:
        """Memeriksa kesehatan layanan backend dan konektivitas database MySQL."""
        db_ok, db_status = check_db_connection()
        return {
            "status": "ok" if db_ok else "degraded",
            "app": settings.APP_NAME,
            "environment": settings.APP_ENV,
            "database": db_status,
        }

    return application


app = create_app()

