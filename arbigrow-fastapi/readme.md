# 🛠️ Project Setup

## 1️⃣ Clone the Repository

```bash
git clone https://github.com/MH-PAVEL/oxfordfinancialads.git
cd arbigrow-fastapi
```

---

## 2️⃣ Create Virtual Environment

### Windows

```bash
python -m venv venv
venv\Scripts\activate
```

### Mac/Linux

```bash
python -m venv venv
source venv/bin/activate
```

---

## 3️⃣ Install Dependencies

```bash
pip install -r requirements.txt
```

---

## 4️⃣ Setup Environment Variables

Create a `.env` file in the project root.

Example:

```
DATABASE_URL=postgresql+asyncpg://USER:PASSWORD@HOST/DATABASE
SECRET_KEY=your_super_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

⚠️ For Neon:

- Use `postgresql+asyncpg://`
- Do NOT include `sslmode=require`
- SSL is handled in code

---

# 🗄️ Run Database Migrations

Before running the server, apply migrations if there are any changes in database tables made in the backend by you:

```bash
alembic revision --autogenerate -m "changed etc"
```

```bash
alembic upgrade head
```

This will create all required tables.

---

# ▶️ Run the Application

### Option 1 (Recommended)

```bash
python run.py
```

### Option 2

```bash
uvicorn app.main:app --reload
```

---

# 📚 API Documentation

Once running, open:

```
http://127.0.0.1:8000/docs
```

Interactive Swagger UI is available.

---

# ⚠️ Important Notes

- Do not commit `.env`
- Commit Alembic migrations
- Always run migrations before starting server

---
