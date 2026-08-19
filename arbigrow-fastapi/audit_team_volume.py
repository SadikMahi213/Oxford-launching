"""
Team Volume Audit Script for user mdbakhtiarho223
===================================================
Run: python audit_team_volume.py

Connects to production database via DATABASE_URL in .env
and produces a complete Team Volume breakdown with exact database evidence.
"""

import asyncio
import os
import sys
from decimal import Decimal

from dotenv import load_dotenv
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not found in .env")
    sys.exit(1)

TARGET = "mdbakhtiarho223"
SEP = "=" * 80


async def run():
    engine = create_async_engine(DATABASE_URL, echo=False)
    factory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with factory() as db:

        # STEP 0
        print(SEP)
        print("STEP 0: LOCATING USER")
        print(SEP)
        r = await db.execute(text("""
            SELECT id, user_no, username, full_name, parent_lvl_1_id,
                   team_volume, deposit_wallet, created_at
            FROM users WHERE username = :u OR user_no = :u
        """), {"u": TARGET})
        row = r.fetchone()
        if not row:
            print(f"  User '{TARGET}' NOT FOUND.")
            await engine.dispose()
            return

        uid = row[0]
        print(f"  User ID:         {row[0]}")
        print(f"  User No:         {row[1]}")
        print(f"  Username:        {row[2]}")
        print(f"  Full Name:       {row[3]}")
        print(f"  Parent Lvl 1:    {row[4]}")
        print(f"  Cached Team Vol: {row[5]}")
        print(f"  Deposit Wallet:  {row[6]}")
        print(f"  Created At:      {row[7]}")

        # STEP 1
        print(f"\n{SEP}")
        print("STEP 1: ALL DEPOSITS FOR THIS USER")
        print(SEP)
        r = await db.execute(text("""
            SELECT id, amount, status, network_name, txid, created_at
            FROM deposits WHERE user_id = :uid ORDER BY created_at ASC
        """), {"uid": uid})
        deps = r.fetchall()

        app = Decimal("0")
        pend = Decimal("0")
        rej = Decimal("0")

        print(f"\n  {'ID':<8} {'Amount':>12} {'Status':<12} {'Network':<15} {'Date':<22} {'TXID'}")
        print(f"  {'-'*8} {'-'*12} {'-'*12} {'-'*15} {'-'*22} {'-'*30}")

        for d in deps:
            did, amt, st, net, tx, dt = d
            a = Decimal(str(amt))
            ds = dt.strftime("%Y-%m-%d %H:%M:%S") if dt else "N/A"
            txs = (tx[:20] + "...") if tx and len(tx) > 20 else (tx or "N/A")
            if st == "approved":
                app += a
            elif st == "pending":
                pend += a
            elif st == "rejected":
                rej += a
            mk = " [OK]" if st == "approved" else " [PEND]" if st == "pending" else " [REJ]"
            print(f"  {did:<8} {float(a):>10.2f}  {st:<12} {net or 'N/A':<15} {ds:<22} {txs}{mk}")

        total_all = app + pend + rej
        print(f"\n  TOTAL (all statuses):     {float(total_all):>10.2f} USDT")
        print(f"    Approved:               {float(app):>10.2f} USDT  <-- counted in team_volume")
        print(f"    Pending:                {float(pend):>10.2f} USDT")
        print(f"    Rejected:               {float(rej):>10.2f} USDT")
        print(f"\n  >>> SELF VOLUME (approved): {float(app):.2f} USDT")

        # STEP 2
        print(f"\n{SEP}")
        print("STEP 2: RECURSIVE DESCENDANT TREE (10 generations)")
        print(SEP)
        r = await db.execute(text("""
            WITH RECURSIVE team_tree AS (
                SELECT id, 1 AS depth
                FROM users WHERE parent_lvl_1_id = :uid
                UNION ALL
                SELECT u.id, tt.depth + 1
                FROM users u
                INNER JOIN team_tree tt ON u.parent_lvl_1_id = tt.id
                WHERE tt.depth < 10
            )
            SELECT t.id, t.depth, u.user_no, u.username, u.full_name,
                   u.parent_lvl_1_id, u.created_at
            FROM team_tree t JOIN users u ON u.id = t.id
            ORDER BY t.depth, u.id
        """), {"uid": uid})
        desc = r.fetchall()

        if not desc:
            print("\n  *** NO DESCENDANTS FOUND ***")
        else:
            print(f"\n  Total descendants: {len(desc)}")
            print(f"\n  {'Gen':<7} {'ID':<8} {'UserNo':<12} {'Username':<22} {'Full Name':<25} {'Parent':<8} {'Joined'}")
            print(f"  {'-'*7} {'-'*8} {'-'*12} {'-'*22} {'-'*25} {'-'*8} {'-'*12}")
            for d in desc:
                did, depth, uno, uname, fname, pid, cr = d
                j = cr.strftime("%Y-%m-%d") if cr else "N/A"
                print(f"  Gen {depth:<3} {did:<8} {uno or 'N/A':<12} {uname or 'N/A':<22} {(fname or 'N/A')[:24]:<25} {pid or 'N/A':<8} {j}")

        # STEP 3
        print(f"\n{SEP}")
        print("STEP 3: DESCENDANT DEPOSITS BY GENERATION")
        print(SEP)

        if not desc:
            print("\n  No descendants -> no descendant deposits.")
        else:
            dids = [d[0] for d in desc]
            gen_map = {d[0]: d[1] for d in desc}
            name_map = {d[0]: (d[3] or "N/A") for d in desc}

            r = await db.execute(text("""
                SELECT d.id, d.user_id, d.amount, d.status, d.network_name,
                       d.txid, d.created_at
                FROM deposits d
                WHERE d.user_id IN :dids
                ORDER BY d.user_id, d.created_at
            """), {"dids": tuple(dids)})
            ddeps = r.fetchall()

            if not ddeps:
                print("\n  *** NO DESCENDANT DEPOSITS FOUND ***")
                print("  All descendants have zero deposit records.")
            else:
                gen_totals = {}
                gen_items = {}
                for dd in ddeps:
                    ddid, duid, amt, st, net, tx, dt = dd
                    g = gen_map.get(duid, 99)
                    a = Decimal(str(amt))
                    if st == "approved":
                        gen_totals[g] = gen_totals.get(g, Decimal("0")) + a
                    else:
                        gen_totals.setdefault(g, Decimal("0"))
                    gen_items.setdefault(g, []).append((ddid, duid, a, st, net, tx, dt))

                grand = Decimal("0")
                for g in sorted(gen_items.keys()):
                    ga = gen_totals.get(g, Decimal("0"))
                    grand += ga
                    print(f"\n  -- Generation {g} -- Approved total: {float(ga):.2f} USDT")
                    print(f"  {'DepID':<8} {'UserID':<8} {'Amount':>10} {'Status':<10} {'Network':<12} {'Date':<20} {'TXID'}")
                    print(f"  {'-'*8} {'-'*8} {'-'*10} {'-'*10} {'-'*12} {'-'*20} {'-'*25}")
                    for ddid, duid, a, st, net, tx, dt in gen_items[g]:
                        ds = dt.strftime("%Y-%m-%d %H:%M:%S") if dt else "N/A"
                        txs = (tx[:20] + "...") if tx and len(tx) > 20 else (tx or "N/A")
                        mk = " [OK]" if st == "approved" else " [PEND]" if st == "pending" else " [REJ]"
                        un = name_map.get(duid, "N/A")
                        print(f"  {ddid:<8} {duid:<8} {float(a):>8.2f}  {st:<10} {net or 'N/A':<12} {ds:<20} {txs}{mk}")

                print(f"\n  >>> TOTAL DESCENDANT APPROVED: {float(grand):.2f} USDT")

        # STEP 4
        print(f"\n{SEP}")
        print("STEP 4: FINAL TEAM VOLUME CALCULATION (reproducing get_team_volume)")
        print(SEP)

        if desc:
            dids = [d[0] for d in desc]
            r = await db.execute(text("""
                SELECT COALESCE(SUM(amount), 0)
                FROM deposits WHERE user_id IN :dids AND status = 'approved'
            """), {"dids": tuple(dids)})
            desc_total = Decimal(str(r.scalar()))
        else:
            desc_total = Decimal("0")

        # Reproduce the exact query from rank_service.py
        r = await db.execute(text("""
            SELECT COALESCE(SUM(amount), 0)
            FROM deposits WHERE user_id = :uid AND status = 'approved'
        """), {"uid": uid})
        fn_self = Decimal(str(r.scalar()))

        r = await db.execute(text("""
            WITH RECURSIVE team_tree AS (
                SELECT id, 1 AS depth FROM users WHERE parent_lvl_1_id = :uid
                UNION ALL
                SELECT u.id, tt.depth + 1
                FROM users u
                INNER JOIN team_tree tt ON u.parent_lvl_1_id = tt.id
                WHERE tt.depth < 10
            )
            SELECT COALESCE(SUM(d.amount), 0)
            FROM deposits d
            WHERE d.user_id IN (SELECT id FROM team_tree) AND d.status = 'approved'
        """), {"uid": uid})
        fn_desc = Decimal(str(r.scalar()))
        fn_team = fn_self + fn_desc

        print(f"""
  OWN APPROVED DEPOSITS (self):     {float(fn_self):>10.2f} USDT
  DESCENDANT APPROVED (sum):        {float(fn_desc):>10.2f} USDT
                                    {'-'*12}
  TEAM VOLUME (get_team_volume):    {float(fn_team):>10.2f} USDT

  UI Deposit History (all status):  {float(total_all):>10.2f} USDT
  Cached team_volume in users row:  {float(Decimal(str(row[5] or 0))):>10.2f} USDT
""")

        # STEP 5
        print(SEP)
        print("STEP 5: ROOT CAUSE ANALYSIS")
        print(SEP)

        extra = fn_team - fn_self
        print(f"""
  Self Volume (own approved):       {float(fn_self):>10.2f} USDT
  Team Volume (function result):    {float(fn_team):>10.2f} USDT
                                    {'-'*12}
  EXTRA FROM DESCENDANTS:           {float(extra):>10.2f} USDT
""")

        if extra == 0:
            print("  VERDICT: No descendant deposits. Team Volume = Own Deposits. NO BUG.")
        else:
            print(f"  VERDICT: The extra {float(extra):.2f} USDT comes from descendant approved deposits.")
            print("  This is correct per business rule: Team Volume = Own + Descendants (10 gens).\n")
            print("  EXACT SOURCE OF EACH DESCENDANT DOLLAR:\n")
            if desc:
                dids = [d[0] for d in desc]
                gen_map2 = {d[0]: d[1] for d in desc}
                r = await db.execute(text("""
                    SELECT d.id, d.user_id, d.amount, d.txid, d.created_at,
                           d.status, d.network_name,
                           u.username, u.user_no, u.full_name
                    FROM deposits d JOIN users u ON u.id = d.user_id
                    WHERE d.user_id IN :dids AND d.status = 'approved'
                    ORDER BY d.created_at
                """), {"dids": tuple(dids)})
                for sd in r.fetchall():
                    sdid, suid, samt, stx, sdt, sst, snet, suname, suno, sfname = sd
                    gen = gen_map2.get(suid, "?")
                    ds = sdt.strftime("%Y-%m-%d %H:%M:%S") if sdt else "N/A"
                    print(f"  User:   {sfname} ({suname}, No={suno})")
                    print(f"  Gen:    {gen}")
                    print(f"  Deposit ID: {sdid}")
                    print(f"  Amount:  {float(Decimal(str(samt))):.2f} USDT")
                    print(f"  TXID:   {stx}")
                    print(f"  Date:   {ds}")
                    print(f"  Network: {snet}")
                    print()

        await engine.dispose()
        print(SEP)
        print("AUDIT COMPLETE")
        print(SEP)


if __name__ == "__main__":
    asyncio.run(run())
