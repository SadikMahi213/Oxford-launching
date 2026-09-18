# Team Dev Access — Production PostgreSQL over Tailscale

Secure read/write access to the production PostgreSQL database
(`arbigrow` on the **arbigrow-prod** server) for approved team members.

> **Important:** This is the **production** database. `arbigrow_dev` has
> **no `CREATE`/`TRUNCATE`/`DROP`** privileges on tables. Always test changes
> on a staging database first. Do not share these credentials outside the team.

---

## 1. Prerequisites

- A Tailscale account (invitation must come from the tailnet admin).
- Tailscale installed on your machine.
- A PostgreSQL client (`psql`, DBeaver, pgAdmin, or an ORM).

### Install Tailscale

| OS      | Install command                                                                 |
| ------- | ------------------------------------------------------------------------------- |
| Windows | `winget install Tailscale.Tailscale` then sign in, or download from tailscale.com |
| macOS   | `brew install --cask tailscale`                                                  |
| Linux   | `curl -fsSL https://tailscale.com/install.sh \| sh`                              |
| Ubuntu  | `sudo apt install tailscale` (from official repo)                                |

---

## 2. Join the tailnet

Open the invite link sent by the admin (or ask them for a fresh one):

```
https://login.tailscale.com/admin/invite/4wawgauit3EB4STVx9bs11
```

Sign in with the Tailscale account you were invited with, then start Tailscale
and connect:

```
tailscale up
```

Verify you can see the production server:

```
tailscale status
```

You should see a node named **arbigrow-prod**.

> **Shared-user IP:** the database is reached at the shared-node address
> `100.108.87.0` (what shared users see in `tailscale status`). The server's own
> tailnet IP is `100.65.94.73` — used only by tailnet *members* (e.g. the admin).
> If you're connecting via a node share, always use `100.108.87.0`.

> If the invite link expired, ask the tailnet admin to generate a new one:
> Tailscale Admin Console → Users → Invites → **Invite users**.

---

## 3. Connection details

| Setting | Value |
| ------- | ----- |
| Host (shared-node Tailscale IP) | `100.108.87.0` |
| Host (member tailnet IP)        | `100.65.94.73` (admin only) |
| Host (MagicDNS)                 | `arbigrow-prod.taildfff64.ts.net` |
| Port                | `5432` |
| Database            | `arbigrow` |
| Username            | `arbigrow_dev` |
| Password            | `QhxYtN7jYcNNAeQw8KV1VXOvc8e0iJNWj95e9soS` |
| SSL                 | Not required (traffic is encrypted by Tailscale WireGuard) |

---

## 4. Connection strings

### psql (CLI)

```
psql "postgresql://arbigrow_dev:QhxYtN7jYcNNAeQw8KV1VXOvc8e0iJNWj95e9soS@100.108.87.0:5432/arbigrow"
```

Quick sanity check:

```
psql "postgresql://arbigrow_dev:QhxYtN7jYcNNAeQw8KV1VXOvc8e0iJNWj95e9soS@100.108.87.0:5432/arbigrow" -c "SELECT count(*) FROM users;"
```

> Verified 2026-08-05: shared-user connection returns `74` users. Use your psql
> full path on Windows, e.g.
> `& "C:\Program Files\PostgreSQL\18\bin\psql.exe" "postgresql://arbigrow_dev:...@100.108.87.0:5432/arbigrow" -c "SELECT count(*) FROM users;"`

### Laravel `.env`

```dotenv
DB_CONNECTION=pgsql
DB_HOST=100.108.87.0
DB_PORT=5432
DB_DATABASE=arbigrow
DB_USERNAME=arbigrow_dev
DB_PASSWORD=QhxYtN7jYcNNAeQw8KV1VXOvc8e0iJNWj95e9soS
```

### Node.js (`pg`)

```js
const { Pool } = require('pg');

const pool = new Pool({
  host: '100.108.87.0',
  port: 5432,
  database: 'arbigrow',
  user: 'arbigrow_dev',
  password: 'QhxYtN7jYcNNAeQw8KV1VXOvc8e0iJNWj95e9soS',
});
```

Or a single connection string:

```
postgresql://arbigrow_dev:QhxYtN7jYcNNAeQw8KV1VXOvc8e0iJNWj95e9soS@100.108.87.0:5432/arbigrow
```

### Python (SQLAlchemy / asyncpg)

```
postgresql+asyncpg://arbigrow_dev:QhxYtN7jYcNNAeQw8KV1VXOvc8e0iJNWj95e9soS@100.108.87.0:5432/arbigrow
```

### DBeaver / pgAdmin

Host: `100.108.87.0` · Port: `5432` · Database: `arbigrow`
User: `arbigrow_dev` · Password: as above.

---

## 5. Permissions granted to `arbigrow_dev`

- `CONNECT` on database `arbigrow`
- `USAGE` on schema `public`
- `SELECT`, `INSERT`, `UPDATE`, `DELETE` on all tables
- `USAGE`, `SELECT` on all sequences (auto-increment works)
- Same privileges automatically applied to future tables/sequences
  (`ALTER DEFAULT PRIVILEGES`)

**Not granted:** `CREATE`, `DROP`, `TRUNCATE`, `ALTER`, `GRANT`, role/DB
creation, superuser, replication. A role change or table-structure change
requires the tailnet admin.

---

## 6. Security model

- Postgres listens **only** on the Tailscale network (shared-node `100.108.87.0:5432`
  / member `100.65.94.73:5432`) and on the server's loopback — it is **not**
  reachable from the public internet.
- All traffic is encrypted end-to-end by Tailscale (WireGuard); the DB connection
  itself needs no TLS.
- `pg_hba.conf` requires SCRAM password auth on every network path; the
  unrestricted `host all all all` rule has been removed.

---

## 7. Troubleshooting

| Symptom | Fix |
| ------- | --- |
| `connection refused` | Make sure Tailscale is up and `arbigrow-prod` is listed in `tailscale status`. |
| `password authentication failed` | Password rotated — ask the admin for the current value. |
| `permission denied for schema public` | Expected for `CREATE`; use `postgres` superuser (admin only) for DDL. |
| Host not found / no route | Shared users must use `100.108.87.0`; members use `100.65.94.73`. |
| Invite link expired | Ask the admin to generate a new invite in the Tailscale Admin Console. |
