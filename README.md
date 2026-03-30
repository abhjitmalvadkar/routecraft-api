# RouteCraft API

**Backend REST API for RouteCraft — AI-powered travel quote creation platform for DMCs.**

## Tech Stack

| Technology | Purpose |
|---|---|
| NestJS | Backend framework (TypeScript, modular, DI) |
| TypeORM | ORM with PostgreSQL |
| PostgreSQL | Database |
| Passport.js + JWT | Authentication (24h token expiry) |
| bcryptjs | Password hashing (10 salt rounds) |
| class-validator | Request validation (DTOs with decorators) |
| OpenAI API (GPT-4o-mini) | AI itinerary generation |
| Puppeteer | PDF generation (HTML template to PDF) |
| Nodemailer + Gmail SMTP | Email sending |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm

### Installation

```bash
git clone https://github.com/abhjitmalvadkar/routecraft-api.git
cd routecraft-api
npm install
```

### Database Setup

```bash
# Create the database
psql -U postgres -c "CREATE DATABASE routecraft;"
```

### Environment Setup

Create `.env`:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=routecraft

# JWT
JWT_SECRET=routecraft-jwt-secret-change-in-production
JWT_EXPIRES_IN=24h

# Server
PORT=4000
FRONTEND_URL=http://localhost:3000
NODE_ENV=development

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-4o-mini

# Email (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=RouteCraft <your-email@gmail.com>
```

### Run

```bash
# Development (auto-creates tables via TypeORM synchronize)
npm run start:dev

# Seed the database
npx ts-node src/seeds/seed.ts

# Production build
npm run build
npm run start:prod
```

The API runs on **http://localhost:4000** with prefix `/api/v1/`.

### Verify

```bash
curl http://localhost:4000/api/v1/health
# Returns: { "success": true, "data": { "status": "ok" } }
```

## Demo Credentials

After running the seed script:

| Role | Email | Password |
|---|---|---|
| Super Admin | admin@routecraft.com | Admin@1234 |
| Org Admin | admin@desertdreams.ae | Demo@1234 |
| Agent | priya@desertdreams.ae | Demo@1234 |

## API Endpoints

### Auth (4 endpoints)

| Method | Path | Description |
|---|---|---|
| POST | `/auth/login` | Login — returns JWT token |
| POST | `/auth/change-password` | Change password (requires auth) |
| GET | `/auth/profile` | Get current user with org relation |
| PUT | `/auth/profile` | Update name, phone |

### Admin — Super Admin (15 endpoints)

| Method | Path | Description |
|---|---|---|
| GET | `/admin/dashboard` | Dashboard stats |
| GET | `/admin/orgs` | List orgs (with _count, orgAdmin) |
| POST | `/admin/orgs` | Create org (can exist without admin) |
| GET | `/admin/orgs/:id` | Get org detail |
| PUT | `/admin/orgs/:id` | Update org |
| PATCH | `/admin/orgs/:id/status` | Suspend/reactivate org |
| DELETE | `/admin/orgs/:id` | Soft delete org + users |
| POST | `/admin/orgs/:orgId/admin` | Create Org Admin |
| POST | `/admin/orgs/:orgId/invite` | Invite user (role: ORG_ADMIN or AGENT) |
| PATCH | `/admin/orgs/:orgId/users/:userId/status` | Suspend/reactivate user |
| DELETE | `/admin/orgs/:orgId/users/:userId` | Soft delete user |
| POST | `/admin/orgs/:orgId/remind` | Resend invite email |
| GET | `/admin/orgs/:orgId/users` | List users in org |
| GET | `/admin/orgs/:orgId/users/:userId` | User dashboard |
| GET | `/admin/orgs/:orgId/quotes/:quoteId` | Quote detail |

### Org — Org Admin (18 endpoints)

| Method | Path | Description |
|---|---|---|
| GET | `/org/dashboard` | Dashboard with approval queue |
| GET | `/org/settings` | Get org settings |
| PUT | `/org/settings` | Update settings |
| GET | `/org/destinations` | List destinations (with service count) |
| POST | `/org/destinations` | Create destination |
| PUT | `/org/destinations/:id` | Update destination |
| DELETE | `/org/destinations/:id` | Soft delete destination |
| GET | `/org/services` | List services (with destination) |
| POST | `/org/services` | Create service |
| GET | `/org/services/:id` | Get service detail |
| PUT | `/org/services/:id` | Update service |
| DELETE | `/org/services/:id` | Soft delete service |
| GET | `/org/agents` | List agents |
| POST | `/org/agents/invite` | Invite agent |
| GET | `/org/agents/:id` | Agent detail |
| GET | `/org/agents/:id/markup` | Get markup config |
| PUT | `/org/agents/:id/markup` | Update markup config |
| DELETE | `/org/agents/:id` | Soft delete agent |

### Org Quotes (7 endpoints)

| Method | Path | Description |
|---|---|---|
| GET | `/org/quotes` | List all quotes in org |
| GET | `/org/quotes/:id` | Get quote detail |
| POST | `/org/quotes` | Create quote |
| POST | `/org/quotes/:id/pricing` | Set pricing |
| POST | `/org/quotes/:id/send` | Send quote email |
| GET | `/org/quotes/:id/download` | Download PDF |
| PATCH | `/org/quotes/:id/approve` | Approve quote |
| PATCH | `/org/quotes/:id/rework` | Rework with comment |
| GET | `/org/approvals` | List pending approvals |

### Agent (13 endpoints)

| Method | Path | Description |
|---|---|---|
| GET | `/agent/dashboard` | Agent dashboard |
| GET | `/agent/markup` | Own markup options |
| GET | `/agent/catalog` | Browse service catalog |
| GET | `/agent/catalog/alternatives/:serviceId` | Get alternatives |
| GET | `/agent/catalog/:serviceId` | Get service detail |
| POST | `/agent/quotes` | Create quote |
| GET | `/agent/quotes` | List own quotes |
| GET | `/agent/quotes/:id` | Get quote detail |
| PUT | `/agent/quotes/:id/itinerary` | Update itinerary |
| POST | `/agent/quotes/:id/pricing` | Set pricing |
| POST | `/agent/quotes/:id/send` | Send quote |
| GET | `/agent/quotes/:id/download` | Download PDF |
| POST | `/agent/quotes/:id/resend` | Resend to email |
| DELETE | `/agent/quotes/:id` | Delete quote |

### AI (2 endpoints)

| Method | Path | Description |
|---|---|---|
| POST | `/ai/start` | Start AI conversation |
| POST | `/ai/continue` | Continue conversation |

### Upload (1 endpoint)

| Method | Path | Description |
|---|---|---|
| POST | `/upload/service-photo/:serviceId` | Upload service photo |

## Response Format

All responses use the envelope format:

```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "message": null
}
```

Error responses:

```json
{
  "success": false,
  "data": null,
  "error": { "code": "HTTP_401", "details": null },
  "message": "Invalid credentials"
}
```

Paginated responses:

```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 20,
    "page": 1,
    "limit": 10,
    "totalPages": 2
  }
}
```

## Project Structure

```
src/
├── entities/          # TypeORM entity classes + enums
├── seeds/             # Database seed script
├── common/            # Guards, decorators, filters, interceptors, DTOs
├── auth/              # Login, password, profile
├── admin/             # Super Admin org/user management
├── org/               # Org Admin dashboard, settings
├── destinations/      # Destination CRUD
├── services/          # Service CRUD
├── agents/            # Agent management + agent's own routes
├── ai/                # OpenAI integration
├── quotes/            # Quote lifecycle
├── pdf/               # Puppeteer PDF generation
├── email/             # Nodemailer emails
├── upload/            # File upload
├── app.module.ts      # Root module
├── main.ts            # Bootstrap
└── data-source.ts     # TypeORM CLI config
```

## Seed Data

The seed script creates:
- **1 Super Admin** — admin@routecraft.com
- **1 Organization** — Desert Dreams DMC (desert-dreams-dmc)
- **1 Org Admin** — Ahmed Al Rashid (admin@desertdreams.ae)
- **1 Agent** — Priya Sharma (priya@desertdreams.ae)
- **1 Markup Config** — 5 options (5% flagged, 10% flagged, 15%, 20%, 25%)
- **3 Destinations** — Dubai, Abu Dhabi, Sharjah
- **20 Services** — 4 Hotels, 4 Transfers, 8 Activities, 4 Meals (with full metadata)

## Security

- JWT Bearer token on all protected routes
- Role-based access: Super Admin (god mode), Org Admin, Agent
- Multi-tenant isolation: every query filters by orgId
- Soft delete: deletedAt column, never hard delete
- Password: bcrypt 10 rounds, rules enforced (8+ chars, upper, lower, number, special)
- Email immutability: cannot change once set
- Upload: orgId verification prevents cross-tenant access

## Frontend

The frontend app (routecraft-web) consumes this API:
- Repository: https://github.com/abhjitmalvadkar/routecraft-web
- Runs on port 3000
- Set `NEXT_PUBLIC_USE_MOCK=false` to connect to this backend

## License

Private — RouteCraft
