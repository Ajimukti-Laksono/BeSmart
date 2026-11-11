"""Skema Pydantic umum untuk pesan status dan struktur response standar."""

from pydantic import BaseModel


class MessageResponse(BaseModel):
    """Response standar untuk aksi yang mengembalikan pesan konfirmasi."""

    message: str

