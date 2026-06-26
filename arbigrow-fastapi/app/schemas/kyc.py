from pydantic import BaseModel
from enum import Enum


class DocumentType(str, Enum):
    nid = "nid"
    passport = "passport"
    driving_license = "driving_license"


class KYCResponse(BaseModel):
    id: int
    country: str
    document_type: DocumentType
    document_number: str
    status: str

    class Config:
        from_attributes = True
