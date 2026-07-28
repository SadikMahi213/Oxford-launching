from collections import defaultdict
from app.models.user import User   # adjust if needed
from app.core.database import get_db  # adjust if needed
import asyncio
import random
import sys
from pathlib import Path

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# --- ADD PROJECT ROOT TO PATH ---
ROOT_DIR = Path(__file__).resolve().parent
sys.path.append(str(ROOT_DIR))

# --- IMPORT YOUR PROJECT DB + MODEL ---


API_URL = "http://127.0.0.1:8000/api/v1/auth/signup"
TOTAL_USERS_TO_CREATE = 50   # reduce first for readable logs


# ----------------------------
# CREATE USERS VIA API
# ----------------------------
async def create_users():
    print("\n==============================")
    print("🚀 STARTING USER CREATION")
    print("==============================\n")

    created_user_ids = [1]  # assuming user 1 exists

    async with httpx.AsyncClient(timeout=30.0) as client:
        for i in range(2, TOTAL_USERS_TO_CREATE + 2):
            referrer_id = random.choice(created_user_ids)
            referral_code = str(referrer_id).zfill(8)

            payload = {
                "email": f"loadtest_user_{i}@test.com",
                "password": "Test1234!",
                "nid_passport": f"NID_or_passport{i}",
                "referral_code": referral_code
            }

            print(f"\n➡️ Creating user {i}")
            print(f"   Selected Parent ID: {referrer_id}")
            print(f"   Referral Code Sent: {referral_code}")

            response = await client.post(API_URL, json=payload)

            if response.status_code != 200:
                print("❌ API FAILED")
                print("Status:", response.status_code)
                print("Response:", response.text)
                return []

            user_data = response.json()
            created_user_ids.append(user_data["id"])

            print("✅ CREATED SUCCESSFULLY")
            print(f"   New User ID: {user_data['id']}")
            print(f"   Stored Parent L1: {user_data.get('parent_lvl_1_id')}")
            print(f"   Stored Parent L2: {user_data.get('parent_lvl_2_id')}")
            print(f"   Stored Parent L3: {user_data.get('parent_lvl_3_id')}")
            print(f"   Stored Parent L4: {user_data.get('parent_lvl_4_id')}")
            print(f"   Stored Parent L5: {user_data.get('parent_lvl_5_id')}")

    print("\n🎉 USER CREATION COMPLETE\n")
    return created_user_ids


# ----------------------------
# VERIFY ANCESTRY IN DB
# ----------------------------
async def verify_ancestry():
    print("\n==============================")
    print("🔎 VERIFYING ANCESTRY LOGIC")
    print("==============================\n")

    async for db in get_db():
        result = await db.execute(select(User))
        users = result.scalars().all()

        errors = 0

        for user in users:
            if not user.parent_lvl_1_id:
                print(f"\n👑 ROOT USER: {user.id}")
                continue

            parent = await db.get(User, user.parent_lvl_1_id)

            expected = [
                parent.id if parent else None,
                parent.parent_lvl_1_id if parent else None,
                parent.parent_lvl_2_id if parent else None,
                parent.parent_lvl_3_id if parent else None,
                parent.parent_lvl_4_id if parent else None,
            ]

            actual = [
                user.parent_lvl_1_id,
                user.parent_lvl_2_id,
                user.parent_lvl_3_id,
                user.parent_lvl_4_id,
                user.parent_lvl_5_id,
            ]

            print("\n-----------------------------------")
            print(f"👤 User ID: {user.id}")
            print(f"   Parent ID (L1): {user.parent_lvl_1_id}")
            print(f"   Parent row exists: {'YES' if parent else 'NO'}")
            print(f"   Expected Chain : {expected}")
            print(f"   Stored Chain   : {actual}")

            if expected != actual:
                print("   ❌ MISMATCH DETECTED")
                errors += 1
            else:
                print("   ✅ OK")

        print("\n==============================")
        if errors == 0:
            print("🎉 ALL USERS PASSED ANCESTRY CHECK")
        else:
            print(f"⚠️ FOUND {errors} INCONSISTENCIES")
        print("==============================\n")

        break


async def print_tree():
    print("\n==============================")
    print("🌳 REFERRAL TREE STRUCTURE")
    print("==============================\n")

    async for db in get_db():
        result = await db.execute(select(User))
        users = result.scalars().all()

        # Build adjacency list (parent -> children)
        tree = defaultdict(list)
        root_nodes = []

        for user in users:
            if user.parent_lvl_1_id:
                tree[user.parent_lvl_1_id].append(user.id)
            else:
                root_nodes.append(user.id)

        def print_subtree(node, prefix="", is_last=True):
            connector = "└── " if is_last else "├── "
            print(prefix + connector + str(node))

            children = tree.get(node, [])
            for i, child in enumerate(children):
                is_child_last = i == len(children) - 1
                new_prefix = prefix + ("    " if is_last else "│   ")
                print_subtree(child, new_prefix, is_child_last)

        # Print each root
        for i, root in enumerate(root_nodes):
            is_last_root = i == len(root_nodes) - 1
            print_subtree(root, "", is_last_root)

        break

# ----------------------------
# MAIN
# ----------------------------


async def main():
    created = await create_users()
    if created:
        await verify_ancestry()
        await print_tree()


if __name__ == "__main__":
    asyncio.run(main())
