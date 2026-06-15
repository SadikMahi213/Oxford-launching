import boto3
import uuid
from fastapi import UploadFile
from app.core.config import settings
from botocore.client import Config
# from datetime import timedelta


def _get_s3_client():
    if not settings.B2_ENDPOINT or not settings.B2_KEY_ID or not settings.B2_APPLICATION_KEY:
        return None
    return boto3.client(
        "s3",
        endpoint_url=settings.B2_ENDPOINT,
        aws_access_key_id=settings.B2_KEY_ID,
        aws_secret_access_key=settings.B2_APPLICATION_KEY,
        region_name="us-west-004",
        config=Config(signature_version="s3v4"),
    )


s3_client = _get_s3_client()


async def upload_to_b2(file: UploadFile, folder: str) -> str:
    if not s3_client:
        raise RuntimeError("File storage is not configured. Please set B2 credentials.")

    file_extension = file.filename.split(".")[-1]
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    object_key = f"{folder}/{unique_filename}"

    content = await file.read()

    s3_client.put_object(
        Bucket=settings.B2_BUCKET_NAME,
        Key=object_key,
        Body=content,
        ContentType=file.content_type,
    )

    return object_key


def generate_presigned_url(object_key: str | None, expires_in: int = 3600):
    if not object_key:
        return None
    if not s3_client:
        return None

    return s3_client.generate_presigned_url(
        "get_object",
        Params={
            "Bucket": settings.B2_BUCKET_NAME,
            "Key": object_key,
        },
        ExpiresIn=expires_in,
    )
