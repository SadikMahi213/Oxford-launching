from datetime import datetime

from pydantic import BaseModel, Field


class AnnouncementStatusUpdate(BaseModel):
    is_active: bool


class AnnouncementResponse(BaseModel):
    id: int
    title: str
    message: str | None = None
    translations: dict | None = None
    image_url: str | None = None
    is_active: bool
    created_by: int | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AnnouncementListResponse(BaseModel):
    data: list[AnnouncementResponse] = Field(default_factory=list)


class ActiveAnnouncementResponse(BaseModel):
    data: AnnouncementResponse | None = None
