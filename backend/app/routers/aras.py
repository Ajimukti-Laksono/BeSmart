"""Router eksekusi kalkulasi ARAS dan pengambilan hasil peringkat beasiswa."""

from typing import Optional

from fastapi import APIRouter, Body, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db, require_roles
from app.models.user import User, UserRole
from app.schemas.aras import ArasCalculateRequest, ArasResultsResponse
from app.services.aras_service import ArasService

router = APIRouter(prefix="/aras", tags=["Kalkulasi & Hasil ARAS"])


@router.post(
    "/calculate/{period_id}",
    response_model=ArasResultsResponse,
    summary="Jalankan perhitungan metode ARAS untuk suatu periode (Admin)",
)
def calculate_aras(
    period_id: int,
    payload: Optional[ArasCalculateRequest] = Body(default=None),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> ArasResultsResponse:
    """Menjalankan kalkulasi ARAS, menyimpan hasil & log breakdown, dan memperbarui status periode."""
    publish = payload.publish if payload is not None else False
    return ArasService.calculate_for_period(db=db, period_id=period_id, publish=publish)


@router.get(
    "/results/{period_id}",
    response_model=ArasResultsResponse,
    summary="Ambil hasil ranking dan breakdown ARAS untuk suatu periode",
)
def get_aras_results(
    period_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ArasResultsResponse:
    """Mengembalikan hasil ranking ARAS dan breakdown langkah demi langkah (khusus admin/panitia)."""
    return ArasService.get_results_for_period(
        db=db,
        period_id=period_id,
        current_user=current_user,
    )

