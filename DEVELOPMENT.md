# BuildMart — Developer Setup Guide

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 20 | [nvm](https://github.com/nvm-sh/nvm) |
| pnpm | ≥ 9 | `npm i -g pnpm@9` |
| Docker Desktop | Latest | [docker.com](https://docker.com) |
| Make | Any | `brew install make` (macOS) |

---

## First-time setup (30 seconds)

```bash
# 1. Clone & enter the repo
git clone https://github.com/your-org/buildmart.git && cd buildmart

# 2. Copy environment variables
cp .env.example .env
# → Fill in FIREBASE_*, JWT_SECRET, REFRESH_TOKEN_SECRET, COOKIE_SECRET

# 3. One-command bootstrap
make setup
# This runs: pnpm install → docker compose up → db:generate → db:migrate → db:seed
```

The API will be available at `http://localhost:3001/api/v1`.

---

## Daily development

```bash
# Start databases (Postgres + Redis)
make db-up

# Start API + Web in watch mode (Turborepo parallel)
make dev

# Or individually
make dev-api   # NestJS only
make dev-web   # Next.js only
```

---

## Auth flow overview

```
Client (Next.js)
  │
  ├─ 1. Firebase SDK sends OTP to phone via reCAPTCHA
  │
  ├─ 2. User enters OTP → Firebase SDK returns idToken (JWT)
  │
  ├─ 3. POST /api/v1/auth/otp/verify { phone, otpToken: idToken }
  │      ├─ Server verifies idToken via Firebase Admin SDK
  │      ├─ Upserts User in Postgres
  │      ├─ Creates Session row (hashed refresh token)
  │      └─ Sets HTTP-only cookies:
  │           access_token  (15m)  path=/
  │           refresh_token (30d)  path=/api/v1/auth/refresh
  │
  ├─ 4. Subsequent requests: access_token cookie sent automatically
  │
  ├─ 5. On 401: POST /api/v1/auth/refresh (refresh_token cookie auto-sent)
  │      └─ Rotates both tokens (old refresh invalidated in DB)
  │
  └─ 6. POST /api/v1/auth/logout → clears cookies + deletes Session row
```

### Twilio fallback (no Firebase)

Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` in `.env`.
Pass a 6-digit numeric string as `otpToken` instead of a Firebase ID token.

---

## Role system

| Role | Description | KYC Required |
|------|-------------|--------------|
| `BUYER` | Posts RFQs, accepts quotes, pays | No |
| `VENDOR` | Receives RFQ notifications, submits quotes | **Yes** |
| `ADMIN` | KYC approval, dispute resolution, analytics | No |

### Protecting routes

```typescript
// Public — no auth needed
@Public()
@Get('health')
health() { return 'ok'; }

// Authenticated (any role)
@Get('profile')
profile(@CurrentUser() user: JwtPayload) { ... }

// Role-restricted
@Roles(UserRole.ADMIN)
@Get('admin/users')
listUsers() { ... }

// Vendor with approved KYC
@RequireKyc()
@Roles(UserRole.VENDOR)
@Post('quotes')
submitQuote() { ... }
```

---

## Database commands

```bash
make db-migrate    # Apply new migrations (dev)
make db-studio     # Open Prisma Studio at http://localhost:5555
make db-seed       # Re-seed materials catalog
make db-reset      # ⚠  Drop all data + re-migrate + re-seed
```

## Docker commands

```bash
make docker-up      # Postgres + Redis
make docker-tools   # + pgAdmin (:5050) + RedisInsight (:8001)
make docker-full    # + API container (production build)
make docker-nuke    # ⚠  Destroy all containers + volumes
```

---

## Project structure

```
buildmart/
├── apps/
│   ├── api/                    # NestJS API
│   │   └── src/
│   │       ├── auth/           # ← Phase 2 (this PR)
│   │       │   ├── auth.module.ts
│   │       │   ├── auth.controller.ts
│   │       │   ├── auth.service.ts
│   │       │   ├── otp.service.ts        # Firebase + Twilio
│   │       │   ├── token.service.ts      # JWT + session store
│   │       │   ├── firebase.service.ts
│   │       │   ├── dto/
│   │       │   ├── guards/               # Jwt, Roles, Kyc
│   │       │   ├── strategies/           # passport-jwt
│   │       │   └── decorators/           # @Public @Roles @CurrentUser
│   │       ├── database/       # Prisma singleton
│   │       └── common/         # Filters, interceptors
│   └── web/                    # Next.js 15 (Phase 3)
└── packages/
    └── database/               # Prisma schema + client (Phase 1)
```
