"""Definisi custom exception dan handler error terstruktur untuk FastAPI."""

from typing import Any, Optional

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class AppException(Exception):
    """Exception dasar aplikasi dengan status HTTP dan kode error terstruktur."""

    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        error_code: str = "APP_ERROR",
        errors: Optional[Any] = None,
    ) -> None:
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.errors = errors
        super().__init__(message)


class ArasValidationError(AppException):
    """Error validasi khusus ketika input atau matriks kalkulasi ARAS tidak valid."""

    def __init__(self, message: str, errors: Optional[Any] = None) -> None:
        super().__init__(
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            error_code="ARAS_VALIDATION_ERROR",
            errors=errors,
        )


def register_exception_handlers(app: FastAPI) -> None:
    """Mendaftarkan global exception handlers agar seluruh response error konsisten."""

    @app.exception_handler(AppException)
    async def app_exception_handler(_request: Request, exc: AppException) -> JSONResponse:
        payload: dict[str, Any] = {
            "detail": exc.message,
            "error_code": exc.error_code,
        }
        if exc.errors is not None:
            payload["errors"] = exc.errors
        return JSONResponse(status_code=exc.status_code, content=payload)

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        _request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        formatted_errors = [
            {
                "field": ".".join(str(loc) for loc in err.get("loc", [])),
                "message": err.get("msg", "Input tidak valid"),
                "type": err.get("type", "value_error"),
            }
            for err in exc.errors()
        ]
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            content={
                "detail": "Validasi input gagal. Periksa kembali data yang dikirim.",
                "error_code": "VALIDATION_ERROR",
                "errors": formatted_errors,
            },
        )

