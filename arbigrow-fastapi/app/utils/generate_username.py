import random
import string


def generate_username(full_name: str, user_id: int) -> str:
    parts = full_name.strip().lower().split()
    if parts:
        base = parts[0] if len(parts) == 1 else f"{parts[0]}_{parts[-1]}"
    else:
        base = "user"
    suffix = f"{user_id % 10000:04d}"
    return f"{base}_{suffix}"
