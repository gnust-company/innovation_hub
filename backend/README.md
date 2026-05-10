<div align="center">

# ⚙️ Innovation Hub — Backend

### FastAPI + SQLAlchemy 2.0 + PostgreSQL

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-009688?style=flat-square&logo=python&logoColor=white)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![MinIO](https://img.shields.io/badge/MinIO-Storage-E05244?style=flat-square&logo=minio&logoColor=white)](https://min.io/)

</div>

---

## Kiến trúc

```
app/
├── domain/              # Entities, Repository interfaces (business logic thuần)
├── application/         # Use cases, DTOs, Application services
├── infrastructure/      # Database models, API routes, external services
│   ├── database/       # SQLAlchemy models + Alembic migrations
│   └── web/api/        # FastAPI endpoints (v1)
├── core/               # Config, shared utilities
└── main.py             # Entry point
```

Clean Architecture — business logic không phụ thuộc framework hay database.

---

## Tech Stack

| Công nghệ | Mục đích |
|:----------|:---------|
| **FastAPI** | Web framework, async, auto docs |
| **SQLAlchemy 2.0** | ORM async, JSONB support |
| **Pydantic v2** | Validation, serialization |
| **PostgreSQL 16** | Primary database |
| **Alembic** | Database migrations |
| **MinIO** | File storage (avatar, images) |
| **JWT** | Stateless authentication |
| **dependency-injector** | Dependency injection |
| **structlog** | Structured logging |

---

## API Endpoints

| Group | Endpoints | Mô tả |
|:------|:----------|:------|
| **Auth** | register, login, refresh, change-password | JWT authentication |
| **Users** | CRUD me/{id}, avatar upload, settings | Profile & preferences |
| **Problems** | CRUD, reactions, privacy, shared users | Problem Feed |
| **Rooms** | CRUD, privacy, shared users, link to Problem | Brainstorming Rooms |
| **Ideas** | CRUD, status workflow, pin, votes (1-5 sao) | Brainstorm Ideas |
| **Comments** | CRUD, threaded (parent_id) | Cho Problems, Ideas, Event Ideas |
| **Reactions** | like/dislike/insight toggle | Cho Problems & Ideas |
| **Dashboard** | stats, trending ideas, recent activity, activity over time, category breakdown | User + Admin analytics |
| **Events** | CRUD (Draft/Active/Closed), introduction, FAQ | Quản lý sự kiện |
| **Event Teams** | create, join/leave, approve/reject, manage members | Team management |
| **Event Ideas** | submit (manual/from Room), structured 7-field form | Ý tưởng thi đấu |
| **Scoring** | 8 criteria (4P + 4S), Likert 5-point, max 100 | Chấm điểm circular |
| **Notifications** | polling, 15+ types, mark read, click-to-navigate | Real-time updates |
| **Chat** | sessions, messages, SSE streaming proxy to Agent BE | AI ChatBot |
| **Uploads** | images, avatars → MinIO | File management |

> API Docs: `http://localhost:3000/api/v1/docs` (qua Nginx proxy)

---

## Quick Start

### Docker Compose (recommended)

```bash
# Từ root project
cp .env.example .env
cp backend/.env.example backend/.env
docker compose up --build -d
```

### Chạy local (development)

```bash
cd backend
cp .env.example .env
poetry install
poetry run uvicorn app.main:app --reload
```

### Tạo Admin

```bash
docker compose exec api poetry run python scripts/create_admin.py
```

Default: `admin` / `abc13579`

---

## Database Migrations

```bash
# Tạo migration mới
docker compose exec api poetry run alembic revision --autogenerate -m "description"

# Apply
docker compose exec api poetry run alembic upgrade head

# Rollback
docker compose exec api poetry run alembic downgrade -1
```

---

## Code Formatting

```bash
poetry run black .
poetry run isort .
```
