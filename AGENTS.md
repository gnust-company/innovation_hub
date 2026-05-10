# AGENTS.md - Innovation Hub

This document provides essential information for AI coding agents working on the Innovation Hub project. The reader of this file is expected to know nothing about the project.

## Project Overview

**Innovation Hub** is an internal web platform for collecting problems and brainstorming ideas. It serves as a structured alternative to chaotic chat discussions, enabling teams to:

- Post and discuss problems with threaded comments and reactions
- Create brainstorming rooms with kanban board views and voting
- Track innovation metrics via dashboards with date range filtering
- Organize innovation competitions through the Event module (teams, scoring, awards)
- Support bilingual interface (English and Vietnamese)

### Core Features

| Module | Description |
|--------|-------------|
| Problem Feed | Newsfeed-style posting of organizational challenges with reactions (👍 👎 💡) and privacy controls |
| Idea Lab | Brainstorming rooms with kanban board view for idea management and star voting |
| Dashboard | Statistics, top contributors tracking, and recent activity for OKR goals |
| Events | Innovation competition overlay with team formation, structured idea scoring, FAQ, and awards |
| Authentication | JWT-based auth with member/admin role separation |
| ChatBot | Multi-session chat with AI Agent. Hub BE owns session/message history in PostgreSQL. Agent service (`innovation_hub_agent`) is stateless. |

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | React + TypeScript | React 18.2, TS 5.2 |
| **Build Tool** | Vite | 5.1.4 |
| **Styling** | Tailwind CSS | 3.4.1 |
| **State Management** | Zustand | 4.5.2 |
| **Backend** | Python + FastAPI | Python 3.11, FastAPI 0.104 |
| **Database** | PostgreSQL | 16 |
| **ORM** | SQLAlchemy | 2.0 (async) |
| **Migrations** | Alembic | 1.12 |
| **DI Container** | dependency-injector | 4.41 |
| **Storage** | MinIO | Latest |
| **Deploy** | Docker Compose | - |

### Additional Frontend Libraries

- **HTTP Client**: Axios 1.6.7 with request/response interceptors
- **Forms**: react-hook-form 7.51 + Zod 3.22 for validation
- **Rich Text**: TipTap 3.20 ecosystem (starter-kit, image, placeholder, etc.)
- **Markdown Rendering**: react-markdown 10.1 + remark-gfm 4.0
- **Charts**: Recharts 2.12
- **Animations**: Framer Motion 11.0
- **i18n**: react-i18next 16.6 + i18next-browser-languagedetector
- **Icons**: lucide-react 0.344
- **UI Primitives**: Radix UI (dialog, dropdown-menu, slot)
- **Typography**: @tailwindcss/typography 0.5.19
- **Date Utilities**: date-fns 3.3

### Additional Backend Libraries

- **Password Hashing**: bcrypt 4.0.1 (pinned) via passlib
- **JWT**: python-jose[cryptography] 3.3
- **Logging**: structlog 23.2
- **MinIO Client**: minio 7.2
- **HTTP Client (internal)**: httpx 0.25 (Agent proxy)

## Project Structure

```
innovation_hub/
├── backend/                    # FastAPI Backend (Clean Architecture)
│   ├── app/
│   │   ├── core/              # Configuration and exceptions
│   │   │   ├── config.py      # Pydantic Settings (env vars)
│   │   │   └── exceptions.py  # Custom AppException hierarchy
│   │   ├── domain/            # Business logic (no infra deps)
│   │   │   ├── entities/      # Domain entities (16 files)
│   │   │   ├── repositories/  # Repository interfaces (abstract)
│   │   │   └── value_objects/ # Value objects (Email, Role, Status, Category, Visibility)
│   │   ├── application/       # Application layer
│   │   │   ├── dto/           # Data Transfer Objects (16 modules)
│   │   │   ├── services/      # JWT, notifications, response enrichment
│   │   │   └── use_cases/     # Use cases organized by domain (auth, comment, event, idea, problem, room, etc.)
│   │   └── infrastructure/    # Infrastructure layer
│   │       ├── database/      # SQLAlchemy models, migrations, repo impls
│   │       ├── security/      # Password hashing, JWT handling
│   │       ├── storage/       # MinIO client
│   │       └── web/api/v1/    # FastAPI routes/endpoints (18 endpoint modules)
│   ├── scripts/               # Admin management utilities
│   ├── tests/                 # pytest configuration (conftest.py only; no actual test cases yet)
│   ├── pyproject.toml         # Poetry dependencies and tool configs
│   ├── alembic.ini            # Migration configuration
│   └── Dockerfile
├── frontend/                   # React Frontend
│   ├── src/
│   │   ├── api/               # API client (Axios) and domain-based endpoint modules
│   │   ├── components/        # React components
│   │   │   ├── common/        # Shared domain components (ProblemCard)
│   │   │   ├── feedback/      # Toast notifications
│   │   │   ├── layout/        # Header, Sidebar, MainLayout, AuthGuard
│   │   │   ├── notifications/ # Notification dropdown
│   │   │   └── ui/            # Base UI library + Aceternity effects
│   │   ├── pages/             # Page components
│   │   │   ├── ProblemFeed/   # Problem listing and creation
│   │   │   ├── ProblemDetail/ # Single problem view
│   │   │   ├── IdeaLab/       # Room listing
│   │   │   ├── RoomDetail/    # Room with ideas (kanban/list view)
│   │   │   ├── IdeaDetail/    # Single idea view + edit
│   │   │   ├── Dashboard/     # Statistics page
│   │   │   ├── Admin/         # User management
│   │   │   ├── Settings/      # User profile settings
│   │   │   ├── Events/        # Event listing and creation
│   │   │   ├── EventDetail/   # Event tabs (Introduction, Teams, Ideas, Scoring, Dashboard, FAQ, Awards)
│   │   │   ├── Landing/       # Marketing landing page
│   │   │   ├── Login/         # Login page
│   │   │   ├── Register/      # Registration page
│   │   │   └── Help/          # Help documentation page
│   │   ├── stores/            # Zustand stores (auth, chat, problems, notifications, UI)
│   │   ├── i18n/              # Internationalization (EN/VI)
│   │   ├── types/             # TypeScript type definitions (index.ts, chat.ts)
│   │   └── utils/             # Constants, helpers, TipTap utilities
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js     # "Clay" design system
│   └── Dockerfile
├── docker-compose.yml         # Orchestrates db, minio, api, frontend
└── .env.example               # Environment template
```

## Architecture Patterns

### Backend - Clean Architecture with DI

The backend follows **Clean Architecture** with clear separation of concerns and uses the `dependency-injector` library for dependency injection:

1. **Domain Layer** (`app/domain/`): Pure business logic
   - Entities contain business rules (e.g., `Problem.can_transition_to()`)
   - No dependencies on frameworks or infrastructure
   - Repository interfaces define contracts

2. **Application Layer** (`app/application/`): Use cases and DTOs
   - Use cases orchestrate domain objects
   - DTOs define input/output contracts
   - Services for cross-cutting concerns (JWT, notifications)

3. **Infrastructure Layer** (`app/infrastructure/`): External concerns
   - Database models and repository implementations
   - API endpoints (FastAPI routers)
   - Security implementations
   - Storage clients

4. **Core** (`app/core/`): Configuration and shared utilities

**DI Container**: `backend/app/container.py` wires dependencies. FastAPI dependencies in `deps.py` resolve repository instances from the container.

### Frontend Architecture

- **Component-based**: Functional components with hooks
- **State Management**: Zustand for global state (auth, notifications, UI, problems)
- **API Layer**: Axios with interceptors for token refresh and 401 handling
- **Routing**: React Router v6 with protected routes via AuthGuard
- **Styling**: Tailwind CSS with a custom "Clay" design system
  - Semantic color tokens via CSS variables
  - Custom swatches: matcha, lemon, slushie, ube, pomegranate, blueberry
  - Custom shadows (`clay-xs` through `clay-lg`)
  - Custom border radii: standard (12px), feature (24px), section (40px)
  - Font: Plus Jakarta Sans
- **i18n**: react-i18next with English and Vietnamese support
- **Rich Text**: TipTap editor with custom renderer for JSON content

## Build and Development Commands

### Full Stack (Docker Compose)

```bash
# Copy environment files
cp .env.example .env
cp backend/.env.example backend/.env

# Build and start all services
docker-compose up --build

# Run in background
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Backend Only

```bash
cd backend

# Install dependencies (requires Poetry)
poetry install

# Run development server
poetry run uvicorn app.main:app --reload

# Run migrations
poetry run alembic upgrade head

# Create new migration
poetry run alembic revision --autogenerate -m "description"

# Format code
poetry run black .
poetry run isort .

# Type checking
poetry run mypy .

# Run tests
poetry run pytest

# Create admin user
docker-compose exec api poetry run python scripts/create_admin.py
```

### Frontend Only

```bash
cd frontend

# Install dependencies
npm install

# Development server (with proxy to backend)
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Preview production build
npm run preview
```

## API Conventions

See `API_CONTRACT.md` for the complete API specification (Single Source of Truth).

### Key Conventions

- **Base URL**: `/api/v1` (api_router at `/api` + v1 prefix `/v1`)
- **Chat Base URL**: `/chat` (standalone router for chat sessions/messages)
- **Authentication**: JWT Bearer tokens in `Authorization` header
- **Response Format**:
  - Single item: Direct object
  - List: `{ items: [...], total, page, limit }`
  - Error: `{ detail: "message" }`
- **HTTP Methods**:
  - `GET` - Retrieve
  - `POST` - Create
  - `PATCH` - Partial update
  - `DELETE` - Remove (returns 204)
- **IDs**: UUID v4
- **Timestamps**: ISO 8601 format

### Important API Contract Rules

> **CRITICAL**: When changing API behavior, update `API_CONTRACT.md` FIRST, then implement in backend and frontend.

The API Contract includes a status table (Section 12) showing implementation history. All endpoints documented in the contract have been fully implemented.

## Database Schema

### Main Entities

| Entity | Description |
|--------|-------------|
| `users` | User accounts with roles (member/admin) |
| `problems` | Problem posts in the feed (TipTap JSONB content) |
| `rooms` | Brainstorming rooms linked to problems (optional) |
| `ideas` | Ideas within rooms with status workflow (TipTap JSONB description) |
| `comments` | Threaded comments on problems, ideas, and event ideas |
| `reactions` | Like/dislike/insight reactions |
| `votes` | Star ratings (1-5) on ideas |
| `notifications` | User notification feed with actor/target metadata |

### Event Entities

| Entity | Description |
|--------|-------------|
| `events` | Innovation competitions (draft/active/closed) |
| `event_teams` | Teams within an event with leader and slogan |
| `event_team_members` | Membership requests (pending/active) |
| `event_ideas` | Ideas submitted to events (5 TipTap JSONB fields) |
| `event_scoring_criteria` | Judging criteria per event (auto-seeded 8 criteria) |
| `event_scores` | Scores given by teams to event ideas |
| `event_faqs` | FAQ entries per event |
| `event_awards` | Award categories per event |
| `event_award_teams` | Junction table linking awards to teams |

### Chat Entities

| Entity | Description |
|--------|-------------|
| `chat_sessions` | User chat sessions with AI Agent (session ID = thread_id for Agent BE tracing) |
| `chat_messages` | Messages within sessions, role (user/assistant), sources (JSONB for wiki refs) |

### Status Workflows

**Problem Status:**
```
open → discussing → brainstorming → solved
  ↓                                → closed
  └────────────────────────────────┘
```
- Auto-transitions: `open`→`discussing` (on external comment), `open/discussing`→`brainstorming` (on room create)
- Manual transitions: To `solved` or `closed` (author/admin only)
- Terminal states (`solved`, `closed`) block new room creation

**Idea Status:**
```
draft ↔ refining ↔ reviewing → submitted
                              → closed
```
- Board view allows drag-drop between non-terminal states

**Room Status:**
```
active → archived
```

**Event Status:**
```
draft → active → closed
```
- Only Admin can create/manage events
- Closed events block all write operations

## Privacy Rules

Privacy is **decoupled** across entities:

```
Problem (visibility + shared_user_ids)  ← Independent
  └── Room (visibility + shared_user_ids)  ← Independent from Problem
       └── Idea  ← Inherits from Room
```

| Entity | Privacy Model |
|--------|--------------|
| **Problem** | `visibility` (`public`/`private`) + `shared_user_ids`. Independent. |
| **Room** | `visibility` + `shared_user_ids`. **Independent from Problem**, even when linked via `problem_id`. |
| **Idea** | **Inherits from Room**. No separate permission table. |

**Logic:**
- `public` → visible to all authenticated users (rooms also visible to guests without auth)
- `private` → visible only to author/creator, users in `shared_user_ids`, and Admin
- Admin bypasses all visibility checks
- If `shared_user_ids` is non-empty and `visibility` is `public`, the system auto-converts to `private`

## Code Style Guidelines

### Python (Backend)

- **Formatter**: Black (line length 88, target Python 3.11)
- **Import Sorting**: isort (black profile, `known_first_party = ["app"]`)
- **Type Checking**: mypy (`disallow_untyped_defs=true`, `ignore_missing_imports=true`)
- **Docstrings**: Google style
- **Naming**:
  - Classes: PascalCase
  - Functions/variables: snake_case
  - Constants: UPPER_SNAKE_CASE
  - Private: _leading_underscore

### TypeScript (Frontend)

- **Linter**: ESLint with TypeScript parser
- **Formatting**: Follow existing patterns
- **Naming**:
  - Components: PascalCase
  - Hooks: camelCase starting with `use`
  - Types/Interfaces: PascalCase
  - Constants: UPPER_SNAKE_CASE
- **Imports**: Use path aliases (`@/components`, `@/stores`)

### Pre-commit

The backend is configured for pre-commit hooks (see `pre-commit` in dev dependencies). Run `pre-commit install` inside the backend directory to enable automated formatting and linting on commits.

## Testing Strategy

### Backend Tests

```bash
# Run all tests
cd backend && poetry run pytest

# Run with coverage
poetry run pytest --cov=app

# Run specific test file
poetry run pytest tests/test_problems.py
```

- **Framework**: pytest with pytest-asyncio
- **Configuration**: `pyproject.toml` (`asyncio_mode="auto"`, `pythonpath=[".", "app"]`)
- **Location**: `backend/tests/`
- **Current State**: Only `conftest.py` exists (in-memory SQLite with aiosqlite, async session fixture). **No actual test cases have been written yet.**
- **Recommended**: Unit tests for domain logic, integration tests for API endpoints

### Frontend Tests

- **Current State**: No test suite configured. No test script in `package.json`.
- **Recommended**: Vitest (aligns with Vite) or Jest
- **Components to prioritize**: AuthGuard, API client interceptors, form validations

## Security Considerations

### Authentication & Authorization

- JWT tokens: Access token (30 min), Refresh token (7 days)
- Password hashing: bcrypt with salt
- Role-based access control: `member` vs `admin`
- Permission checks:
  - Members: Can only modify their own content
  - Admins: Can modify all content and manage users

### Data Validation

- Backend: Pydantic models for all inputs
- Frontend: Zod schemas for form validation
- File uploads: Limited to images (PNG, JPEG, WebP), max 10MB

### Environment Variables

**Never commit these to git:**

| Variable | Location | Purpose |
|----------|----------|---------|
| `JWT_SECRET` | `backend/.env` | JWT signing key |
| `DATABASE_URL` | `backend/.env` | PostgreSQL connection |
| `MINIO_SECRET_KEY` | `backend/.env` | Object storage credentials |

## Common Development Tasks

### Adding a New API Endpoint

1. Update `API_CONTRACT.md` with endpoint specification
2. Create/modify use case in `backend/app/application/use_cases/`
3. Add DTO in `backend/app/application/dto/`
4. Implement repository method if needed
5. Add endpoint in `backend/app/infrastructure/web/api/v1/endpoints/`
6. Register route in `backend/app/infrastructure/web/api/v1/router.py`
7. Add frontend API call in `frontend/src/api/`
8. Update frontend types in `frontend/src/types/index.ts`

### Adding a Database Migration

```bash
cd backend

# Generate migration from model changes
poetry run alembic revision --autogenerate -m "add_X_column"

# Review generated migration in app/infrastructure/database/migrations/versions/

# Apply migration
poetry run alembic upgrade head

# Downgrade if needed
poetry run alembic downgrade -1
```

### Adding i18n Translations

1. Add key to both `frontend/src/i18n/locales/en.json` and `vi.json`
2. Use in component: `const { t } = useTranslation(); t('key.subkey')`
3. Maintain consistent structure between languages

## Deployment

### Docker Compose Production

```bash
# Build and run
docker-compose -f docker-compose.yml up -d --build

# Check logs
docker-compose logs -f api
docker-compose logs -f frontend
```

### Service URLs (Development)

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Documentation | http://localhost:8000/docs |
| MinIO Console | http://localhost:9001 |

## Troubleshooting

### Database Connection Issues

- Ensure `DATABASE_URL` in `backend/.env` uses `db` as host (Docker container name), not `localhost`
- Check PostgreSQL container is healthy: `docker-compose ps`

### Migration Failures

1. Check migration file syntax
2. Ensure model matches database state
3. For stuck migrations: `poetry run alembic stamp head` then recreate

### Frontend API Proxy Issues

- Vite dev server proxies `/api` to `localhost:8000`
- Ensure backend is running on port 8000
- For Docker, Nginx handles proxying in production

### MinIO Upload Issues

- Check MinIO container is running
- Verify bucket `avatars` exists (created automatically on startup)
- Check `MINIO_ENDPOINT` uses container name (`minio:9000`) in Docker

## Documentation References

- `API_CONTRACT.md` - Complete API specification (SSOT; written in Vietnamese)
- `APPLICATION_OVERVIEW.md` - Product requirements (in Vietnamese)
- `README.md` - Quick start guide
- Backend: Swagger UI at `/docs` when running

## Agent Operating Rules

> **These rules are mandatory for all AI agents working on this project.**

### Workflow

1. **Pull the Issue** — Start from the assigned GitHub issue.
2. **Check docs first** — Read `@APPLICATION_OVERVIEW.md` and `@API_CONTRACT.md`. If the issue logic differs from the current docs, update the docs **before** implementing.
3. **Implement** — Make changes in code, then test.

### Project Notes

- **Runtime**: The project always runs via `docker-compose` from the **repository root**.
- **Admin Account**: `admin` / `abc13579`

### Hard Rules

- **NEVER** commit, push, or close a GitHub issue without explicit user permission.
- **ALWAYS** keep docs (`API_CONTRACT.md`, `APPLICATION_OVERVIEW.md`) in sync with code changes.

## Contact & Contributing

When making changes:
1. Follow existing code patterns
2. Update this document if conventions change
3. Ensure API contract is updated before implementation
4. Test both backend and frontend integration
