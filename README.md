<div align="center">

<br>

# 💡 Innovation Hub

### Nền tảng Đổi mới Sáng tạo Nội bộ

**Thu thập vấn đề → Brainstorm giải pháp → Thi đấu trong Sự kiện**

<br>

[![Backend](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=python&logoColor=white)](https://fastapi.tiangolo.com/)
[![Frontend](https://img.shields.io/badge/Frontend-React_18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Database](https://img.shields.io/badge/DB-PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Deploy](https://img.shields.io/badge/Deploy-Docker-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)

<br><br>

</div>

---

## Giới thiệu

**Innovation Hub** là ứng dụng web nội bộ giúp bộ phận số hóa quy trình đổi mới sáng tạo — thay vì chat lung tung, mọi thứ đi qua quy trình có cấu trúc: **Đăng → Bàn → Làm**.

<table>
<tr>
<td width="33%" align="center">

### 📝 Problem Feed
Chia sẻ & thảo luận
điểm nghẽn, thách thức

</td>
<td width="33%" align="center">

### 💡 Idea Lab
Brainstorm giải pháp
trong không gian riêng

</td>
<td width="33%" align="center">

### 🏆 Events
Tổ chức cuộc thi
đổi mới sáng tạo nội bộ

</td>
</tr>
</table>

> **Mục tiêu OKR**: Phục vụ KR3 — *50 ý tưởng/năm, 70% tương tác, 20% thành dự án thử nghiệm*

---

## Tính năng chính

<table>
<tr>
<th width="180">Module</th>
<th>Tính năng</th>
</tr>
<tr>
<td>🔐 <strong>Xác thực</strong></td>
<td>Đăng nhập/Register · JWT token · Đổi mật khẩu · Upload avatar · Phân quyền Member/Admin</td>
</tr>
<tr>
<td>📝 <strong>Problem Feed</strong></td>
<td>Tạo & chia sẻ vấn đề · Rich text (TipTap) · 5 danh mục · Tìm kiếm & lọc nâng cao · Reaction 👍👎💡 · Comment threaded · <strong>Privacy</strong> (Public/Private + Share)</td>
</tr>
<tr>
<td>💡 <strong>Idea Lab</strong></td>
<td>Brainstorm Room (1-click từ Problem) · Kanban board kéo thả · Vote 1-5 sao · Ghim ý tưởng · Status workflow · <strong>Privacy độc lập</strong></td>
</tr>
<tr>
<td>📊 <strong>Dashboard</strong></td>
<td><em>User</em>: Stats, Trending Ideas, Recent Activity, Top Contributors · <em>Admin</em>: Analytics charts, Date filter, Status breakdowns</td>
</tr>
<tr>
<td>🏆 <strong>Events</strong></td>
<td>Tạo cuộc thi · Teams & Team Lead · Submit Idea (manual/from Room) · Chấm điểm 8 tiêu chí Likert 5-point (max 100) · Leaderboard · FAQ · Awards</td>
</tr>
<tr>
<td>🔔 <strong>Notifications</strong></td>
<td>Real-time polling · 15+ loại notification · Click-to-navigate · Mark as read</td>
</tr>
<tr>
<td>🤖 <strong>ChatBot</strong></td>
<td>Multi-session AI chat · Lịch sử conversations · Wiki-grounded answers · SSE streaming</td>
</tr>
<tr>
<td>🌐 <strong>Đa ngôn ngữ</strong></td>
<td>Tiếng Việt · English · Chuyển đổi tức thì trong Settings</td>
</tr>
<tr>
<td>❓ <strong>Help</strong></td>
<td>FAQ 7 danh mục · Tìm kiếm · Cập nhật theo tính năng mới</td>
</tr>
</table>

---

## Kiến trúc & Tech Stack

```
┌─────────────────────────────────────────────────────┐
│                    Docker Compose                     │
│                                                       │
│   ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│   │   Frontend   │  │   Backend    │  │    DB     │ │
│   │   React 18   │──│   FastAPI    │──│ PostgreSQL│ │
│   │   TypeScript │  │   Python 3.11│  │   16      │ │
│   │   Tailwind   │  │   SQLAlchemy │  └───────────┘ │
│   │   TipTap     │  │   Pydantic v2│  ┌───────────┐ │
│   └──────────────┘  └──────────────┘  │  MinIO    │ │
│         │                               │ (storage) │ │
│      Nginx                              └───────────┘ │
│     (proxy :3000)                                     │
└─────────────────────────────────────────────────────┘
```

| Layer | Công nghệ |
|:------|:----------|
| **Frontend** | React 18 · TypeScript · Vite · Tailwind CSS · Zustand · Framer Motion · TipTap · Recharts |
| **Backend** | Python 3.11+ · FastAPI · SQLAlchemy 2.0 (async) · Pydantic v2 · Alembic |
| **Database** | PostgreSQL 16 (JSONB cho TipTap content) |
| **Storage** | MinIO (avatar, image uploads) |
| **Deploy** | Docker Compose · Nginx reverse proxy |

---

## Quick Start

### Yêu cầu
- [Docker](https://www.docker.com/) & Docker Compose
- Git

### Cài đặt & Chạy

```bash
# Clone repo
git clone https://github.com/kpollz/innovation_hub.git
cd innovation_hub

# Copy environment
cp .env.example .env
cp backend/.env.example backend/.env

# Khởi động tất cả services
docker compose up --build -d
```

Truy cập: **http://localhost:3000**

### Tạo Admin

```bash
docker compose exec api poetry run python scripts/create_admin.py
```

Hoặc dùng default: `admin` / `abc13579`

### Đăng ký User thường

Mở **http://localhost:3000** → Click **Register**

---

## Ports & Services

| Service | URL | Ghi chú |
|:--------|:----|:--------|
| **Frontend** | http://localhost:3000 | Nginx proxy, bao gồm API proxy |
| **API Docs** | http://localhost:3000/api/v1/docs | Swagger UI (qua Nginx) |
| MinIO Console | http://localhost:9001 | File storage management |

> Frontend proxy tất cả `/api/` requests đến Backend qua Nginx. Không cần truy cập port 8000 trực tiếp.

---

## Cấu trúc dự án

```
innovation_hub/
├── backend/                    # Python FastAPI
│   ├── app/
│   │   ├── domain/            # Entities, repository interfaces
│   │   ├── application/       # Use cases, DTOs
│   │   ├── infrastructure/    # Database, API routes, services
│   │   │   ├── database/      # Models, migrations (Alembic)
│   │   │   └── web/api/       # FastAPI endpoints (v1)
│   │   └── main.py
│   ├── scripts/               # Admin utilities (create_admin, seed data)
│   ├── tests/                 # pytest configuration
│   └── Dockerfile
│
├── frontend/                   # React TypeScript
│   ├── src/
│   │   ├── api/               # API client functions
│   │   ├── components/        # Shared UI components
│   │   ├── pages/             # Page components
│   │   ├── stores/            # Zustand state management
│   │   ├── i18n/              # EN/VI translations
│   │   ├── types/             # TypeScript types
│   │   └── utils/             # Helpers, TipTap utilities
│   └── Dockerfile
│
├── docker-compose.yml          # Full stack orchestration
├── API_CONTRACT.md             # API documentation (Single Source of Truth)
├── APPLICATION_OVERVIEW.md     # Feature specification
└── AGENTS.md                   # AI agent guide
```

---

## Quyền riêng tư (Privacy)

```
Problem (public/private + shared_user_ids)  ← Độc lập
  └── Room (public/private + shared_users)  ← Độc lập, KHÔNG kế thừa Problem
       └── Idea                             ← Kế thừa từ Room
```

- **Public** — Tất cả users đều thấy
- **Private** — Chỉ author, shared users, và Admin
- Room có quyền **độc lập** với Problem (kể cả khi liên kết)
- Admin luôn thấy mọi nội dung

---

## Workflow

### Problem
```
Open ──→ Discussing ──→ Brainstorming ──→ Solved
 │           ↑               ↑            → Closed
 └───────────┘───────────────┘
```
*Tự động*: Open → Discussing (khi có comment) → Brainstorming (khi tạo Room)
*Thủ công*: → Solved / Closed (author hoặc Admin)

### Idea
```
Draft ↔ Refining ↔ Reviewing → Submitted
                                → Closed
```
Board view kéo thả tự do. Submitted & Closed là terminal.

### Event
```
Draft → Active → Closed
```
Active: Teams, Ideas, Scoring hoạt động. Closed: Read-only.

---

## Tài liệu

| File | Nội dung |
|:-----|:---------|
| [API_CONTRACT.md](API_CONTRACT.md) | API endpoints chi tiết — Single Source of Truth |
| [APPLICATION_OVERVIEW.md](APPLICATION_OVERVIEW.md) | Đặc tả tính năng & user flow |
| [AGENTS.md](AGENTS.md) | Hướng dẫn cho AI coding assistants |

---

## License

Internal use only — Innovation Hub
