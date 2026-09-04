# Deployment Guide

## Local Development (No Docker)

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate   # Windows
pip install -r requirements.txt
cp .env.example .env    # fill in values
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev             # → localhost:3000
```

---

## Docker Compose (Recommended)

```bash
# From project root
cp backend/.env.example backend/.env
# Edit SECRET_KEY at minimum

docker-compose up --build -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop
docker-compose down
```

Services:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- PostgreSQL: localhost:5432
- Redis: localhost:6379

---

## Database Migrations

```bash
cd backend

# Initialize Alembic (first time only)
alembic init alembic

# Create a migration
alembic revision --autogenerate -m "initial schema"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

---

## Production Checklist

Before deploying to production:

- [ ] Set strong `SECRET_KEY` (min 32 random bytes)
- [ ] Use environment-specific `DATABASE_URL` with SSL
- [ ] Set `DEBUG=false`
- [ ] Configure `CORS_ORIGINS` to your actual domain only
- [ ] Enable HTTPS (use a reverse proxy like Nginx or Caddy)
- [ ] Set `NEXT_PUBLIC_API_URL` to your production API domain
- [ ] Run `npm run build` to verify no build errors
- [ ] Run `pytest tests/ -v` to verify all tests pass
- [ ] Review `docs/SECURITY.md` checklist

---

## Environment Variables

### Backend (`.env`)
```
SECRET_KEY=<32+ random bytes>
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/db
REDIS_URL=redis://host:6379/0
DEBUG=false
AI_MODE=mock              # or "live" when ML model is ready
AI_MODEL_API_URL=         # your ML API endpoint
AI_MODEL_API_KEY=         # your ML API key
CORS_ORIGINS=["https://yourdomain.com"]
```

### Frontend (`.env.local`)
```
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
NEXT_PUBLIC_SHOW_MOCK_BADGE=false
```
