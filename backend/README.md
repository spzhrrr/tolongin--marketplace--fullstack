# Tolongin Backend — NestJS Edition

Production-ready marketplace backend with strict **Layered Architecture**:
**Controller → Service → Repository → Prisma → SQLite**

## 🚀 Quick Start

```bash
cd /app/backend-nest
npm install                              # already done
npx prisma migrate dev --name init       # already done (DB exists)
npx prisma db seed                        # already done (test users seeded)
npm run start:dev                         # dev server with watch mode
# OR
npm run build && node dist/src/main.js   # production-style start
```

Server: **http://localhost:3001**
Swagger UI: **http://localhost:3001/api/docs**
Database: SQLite at `prisma/dev.db`

## 🔑 Test Credentials

| Role   | Email               | Password   |
| ------ | ------------------- | ---------- |
| Admin  | admin@tolongin.com  | Admin@123  |
| Seller | seller@tolongin.com | Seller@123 |
| Buyer  | buyer@tolongin.com  | Buyer@123  |

## 🏗️ Architecture

**15 modules**, each strictly layered:

```
modules/<name>/
├── controllers/      ← HTTP request handling only (no business logic)
├── services/         ← Business logic, orchestration (no direct Prisma)
├── repositories/     ← All DB operations via Prisma client
├── dto/              ← class-validator request shapes + Swagger decorators
├── interfaces/       ← TS types
└── <name>.module.ts  ← Dependency wiring
```

Plus shared infrastructure:

```
common/
├── constants/enums.ts        ← String enums + ORDER_TRANSITIONS state machine
├── guards/                   ← JwtAuthGuard, RolesGuard (global)
├── decorators/               ← @Public, @Roles, @CurrentUser
├── filters/                  ← Global exception filter (consistent error JSON)
├── interceptors/             ← Logging
└── utils/helpers.ts          ← parseJsonField, paginate, etc.

config/app.config.ts          ← Env + JWT settings
prisma/                       ← schema.prisma + seed.ts + migrations
```

## 📡 API Surface (86 endpoints across 15 modules)

| Module            | Endpoints                                                                                                                                                             |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Auth**          | register, login, profile, change-password, forgot/reset password, logout                                                                                              |
| **Users**         | public profile, services, reviews, seller-profile                                                                                                                     |
| **Categories**    | CRUD (admin), list services/jobs in category                                                                                                                          |
| **Services**      | search/filter/paginate, CRUD (seller), featured, recommended                                                                                                          |
| **Jobs**          | CRUD, close                                                                                                                                                           |
| **Applications**  | apply, my-applications, decision (accept/reject), update, withdraw                                                                                                    |
| **Orders**        | create (from service or accepted application), buyer/seller lists, state-machine transitions (accept/start/submit-review/revision/complete/cancel), timeline, invoice |
| **Reviews**       | create (gated on COMPLETED order), get by seller/service, reply, helpful                                                                                              |
| **Payments**      | create, status, history, methods, webhook                                                                                                                             |
| **Withdrawals**   | request, history, balance, bank account CRUD                                                                                                                          |
| **Chat**          | conversations CRUD, messages, mark-as-read, **WebSocket gateway at `/chat`**                                                                                          |
| **Notifications** | list, unread-count, mark-read, mark-all-read, delete                                                                                                                  |
| **Disputes**      | create, get by id                                                                                                                                                     |
| **Admin**         | dashboard stats, manage users/sellers/services/jobs/orders/disputes, settings, activity log                                                                           |

## 🛡️ Auth & RBAC

- **JWT** via `@nestjs/jwt` + Passport
- Token payload: `{ sub, email, role }`
- `JwtAuthGuard` set **globally** (use `@Public()` to opt-out)
- `RolesGuard` set globally (use `@Roles(ROLE.X)` to restrict)
- `ADMIN` bypasses all role checks
- `BOTH` satisfies BUYER & SELLER

## 🔄 Order State Machine

`src/common/constants/enums.ts` exports `ORDER_TRANSITIONS`:

```ts
WAITING_CONFIRMATION -> buyer: [CANCELLED] | seller: [ACCEPTED, CANCELLED]
ACCEPTED            -> seller: [IN_PROGRESS, CANCELLED]
IN_PROGRESS         -> seller: [IN_REVIEW, CANCELLED]
IN_REVIEW           -> buyer:  [COMPLETED, REVISION_REQUESTED]
REVISION_REQUESTED  -> seller: [IN_REVIEW]
COMPLETED/CANCELLED -> terminal
DISPUTED            -> admin:  [COMPLETED, CANCELLED]
```

Enforced in `OrdersService.transition()`. Invalid transitions return **400** with clear reason.

## 💬 WebSocket Chat

Socket.IO gateway at `ws://localhost:3001/chat`

- Auth via `auth.token` or `query.token` (JWT)
- Events: `join`, `typing`, `send-message`, `ping`, `connected`, `new-message`, `new-message-notify`

## 🌱 Seed Data

3 users, 6 categories, 8 services, 5 jobs, 4 platform settings.
Re-run with `npx prisma db seed` (idempotent via upsert).

## 🧪 Tested Scenarios (all PASS)

- ✅ Login returns JWT for all 3 roles
- ✅ RBAC: Buyer cannot create service (403 `Required role: SELLER`)
- ✅ State machine: Buyer cannot skip to COMPLETED (400 `Transition not allowed`)
- ✅ Happy flow: order ACCEPTED → IN_PROGRESS → IN_REVIEW → COMPLETED works
- ✅ Admin stats: aggregates users/services/jobs/orders/revenue correctly
- ✅ Swagger: 86 documented paths
- ✅ Global exception filter: returns `{statusCode, message, errors, timestamp, path}`

## 🔄 Switch to MySQL (Production)

1. Edit `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "mysql"
     url      = env("DATABASE_URL")
   }
   ```
2. Update `.env`: `DATABASE_URL="mysql://user:pass@host:3306/tolongin_db"`
3. `npx prisma migrate dev --name init`
4. (optional) Convert `String @default("[]")` JSON fields back to `Json` for native MySQL JSON support.

No application code changes needed — Prisma handles the abstraction.

## ⚠️ Note

This NestJS backend runs **independently on port 3001**. The original FastAPI backend at `/app/backend` (port 8001) continues to serve the Tolongin frontend without interference.
