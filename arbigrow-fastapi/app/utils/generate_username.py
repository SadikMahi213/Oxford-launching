import re


def generate_username(full_name: str, user_id: int) -> str:
    # lowercase
    name = full_name.lower()

    # remove non-alphanumeric characters
    name = re.sub(r'[^a-z0-9]', '', name)

    # take first 12 chars
    name = name[:12]

    # zero padded id
    padded_id = str(user_id).zfill(3)

    return f"{name}{padded_id}"
