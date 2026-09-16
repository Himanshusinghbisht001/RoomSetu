# RoomSetu — Backend

> API backend for the RoomSetu room-finding platform. Connects Room Owners and Room Seekers across India, starting with Nainital, Uttarakhand.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (Active LTS) |
| Framework | Express.js 5 |
| Language | TypeScript (strict mode) |
| Database | MongoDB Atlas via Mongoose |
| Validation | Zod |
| Security | Helmet, CORS, express-rate-limit, express-mongo-sanitize |
| Auth | JWT (access + refresh tokens), bcryptjs, HttpOnly cookies |
| Logging | Winston (structured, with sensitive-data redaction) |
| HTTP Logs | Morgan |
| Testing | Vitest + Supertest + mongodb-memory-server |
| Linting | oxlint |
| Dev Runner | tsx |

---

## Folder Structure

```
Backend/
├── src/
│   ├── server.ts          # Entry point — starts HTTP server & DB
│   ├── app.ts             # Express app factory & middleware setup
│   ├── routes.ts          # Health & readiness endpoints
│   │
│   ├── config/
│   │   ├── env.ts         # Zod-validated environment config
│   │   └── db.ts          # Mongoose connection (credentials masked)
│   │
│   ├── middleware/
│   │   ├── errorHandler.ts  # Central error handler + 404 handler
│   │   ├── requireAuth.ts   # JWT authentication guard
│   │   ├── roleGuard.ts     # Role-based access control
│   │   └── validate.ts      # Reusable Zod validation middleware
│   │
│   ├── modules/
│   │   ├── auth/            # Registration, login, refresh, logout
│   │   ├── users/           # User profile (GET /me)
│   │   ├── rooms/           # CRUD, search, dashboard
│   │   └── locations/       # Future: location services
│   │
│   ├── services/            # Shared services (email, image, etc.)
│   ├── utils/
│   │   ├── logger.ts        # Winston logger with sensitive-data redaction
│   │   ├── response.ts      # sendSuccess / sendError helpers
│   │   └── AppError.ts      # Custom operational error class
│   ├── types/
│   │   └── express.d.ts     # Express Request augmentation (req.user)
│   └── tests/
│       ├── setup.ts         # Vitest env setup (safe placeholder values)
│       └── security.test.ts # Phase 8 security regression tests
│
├── .env.example             # Environment template (committed)
├── .gitignore
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── RoomSetu_Auth_Phase2.postman_collection.json
├── RoomSetu_Rooms_Phase3.postman_collection.json
├── RoomSetu_Environment.postman_environment.json
└── README.md
```

---

## Environment Setup

1. Copy the example file:

```bash
cp .env.example .env
```

2. Fill in your values in `.env`:

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | No | `development` | `development` / `production` / `test` |
| `PORT` | No | `5000` | HTTP port |
| `MONGODB_URI` | **Yes** | — | MongoDB Atlas connection string |
| `JWT_ACCESS_SECRET` | **Yes** | — | Min 32 chars. Signs access tokens |
| `JWT_REFRESH_SECRET` | **Yes** | — | Min 32 chars. Signs refresh tokens |
| `JWT_ACCESS_EXPIRES_IN` | No | `15m` | Access token TTL |
| `JWT_REFRESH_EXPIRES_IN` | No | `7d` | Refresh token TTL |
| `CLIENT_URL` | **Yes** | — | Frontend URL (e.g. `http://localhost:5173`) |
| `CORS_ORIGINS` | **Yes** | — | Comma-separated allowed origins |

> **Generate secrets:**
> ```bash
> node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
> ```

---

## Installation

```bash
npm install
```

---

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with hot-reload (tsx watch) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled production build |
| `npm run typecheck` | Run TS type checking without emitting |
| `npm run lint` | Run oxlint on the backend source |
| `npm test` | Run Vitest test suite |
| `npm run clean` | Remove `dist/` directory |

---

## Standard Response Format

All API responses follow a consistent JSON structure.

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Paginated success:**
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "total": 42,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

**Validation error (with field details):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "fields": {
      "email": ["Invalid email format"],
      "password": ["Password must be at least 8 characters long"]
    }
  }
}
```

---

## API Documentation

Base path: `/api/v1`

---

### Health & Readiness

#### `GET /api/v1/health`

Liveness check — confirms the API process is alive.

- **Auth:** None
- **Response:** `200`

```json
{ "success": true, "data": { "status": "ok" } }
```

#### `GET /api/v1/ready`

Readiness check — verifies the database connection is active.

- **Auth:** None
- **Response:** `200` if DB connected, `503` if not

**200 — Ready:**
```json
{ "success": true, "data": { "status": "ready" } }
```

**503 — Not ready:**
```json
{
  "success": false,
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "Database connection is not ready"
  }
}
```

---

### Authentication

#### `POST /api/v1/auth/register`

Register a new user account.

- **Auth:** None
- **Rate limit:** 20 requests / 15 min per IP
- **Request body:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `name` | string | Yes | Min 2 chars |
| `email` | string | Yes | Valid email, lowercased |
| `password` | string | Yes | Min 8 chars |
| `role` | string | Yes | `"seeker"` or `"owner"` |

**201 — Success:**
```json
{
  "success": true,
  "data": {
    "id": "665f...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "seeker"
  }
}
```

**409 — Duplicate email:**
```json
{ "success": false, "error": { "code": "CONFLICT", "message": "A resource with that value already exists" } }
```

#### `POST /api/v1/auth/login`

Authenticate with email and password.

- **Auth:** None
- **Rate limit:** 20 requests / 15 min per IP
- **Request body:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `email` | string | Yes | Valid email |
| `password` | string | Yes | Min 1 char |

**200 — Success:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "665f...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "seeker"
    },
    "accessToken": "<jwt>"
  }
}
```

Also sets an `HttpOnly` cookie named `roomsetu_refresh` containing the refresh token.

**401 — Invalid credentials:**
```json
{ "success": false, "error": { "code": "UNAUTHORIZED", "message": "Invalid email or password" } }
```

#### `POST /api/v1/auth/refresh`

Refresh the access token using the `roomsetu_refresh` HttpOnly cookie.

- **Auth:** None (uses cookie)
- **Request body:** None
- **Requires:** `roomsetu_refresh` cookie set by login

**200 — Success:**
```json
{
  "success": true,
  "data": {
    "accessToken": "<new-jwt>"
  }
}
```

Also rotates the refresh cookie.

**401 — No/invalid refresh token:**
```json
{ "success": false, "error": { "code": "UNAUTHORIZED", "message": "No refresh token provided" } }
```

#### `POST /api/v1/auth/logout`

Log out and clear the refresh cookie.

- **Auth:** None (uses cookie)
- **Request body:** None

**200 — Success:**
```json
{
  "success": true,
  "data": { "message": "Logged out successfully" }
}
```

---

### Users

#### `GET /api/v1/users/me`

Get the authenticated user's profile.

- **Auth:** Bearer token (`Authorization: Bearer <accessToken>`)
- **Role:** Any authenticated user

**200 — Success:**
```json
{
  "success": true,
  "data": {
    "id": "665f...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "seeker"
  }
}
```

**401 — No/invalid token:**
```json
{ "success": false, "error": { "code": "UNAUTHORIZED", "message": "..." } }
```

---

### Rooms

#### `POST /api/v1/rooms`

Create a new room listing.

- **Auth:** Bearer token
- **Role:** `owner` only
- **Request body:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `title` | string | Yes | 5–100 chars |
| `description` | string | Yes | Min 20 chars |
| `rent` | number | Yes | Positive |
| `location` | object | Yes | `{ country, state, city, area }` — all required, min 1 char |
| `roomType` | string | Yes | `"Single"`, `"Double"`, or `"PG"` |
| `contactNumber` | string | Yes | 10–15 chars, phone format |
| `images` | string[] | No | Array of valid URLs |
| `facilities` | string[] | No | e.g. `["Wi-Fi", "Water"]` |
| `suitableFor` | string[] | No | e.g. `["Student"]` |

**201 — Success:**
```json
{
  "success": true,
  "data": {
    "id": "665f...",
    "ownerId": "665f...",
    "title": "Beautiful Single Room",
    "description": "...",
    "rent": 5000,
    "location": { "country": "India", "state": "Uttarakhand", "city": "Nainital", "area": "Mallital" },
    "roomType": "Single",
    "availability": "Available",
    "isDeleted": false,
    "images": [],
    "facilities": ["Wi-Fi", "Water"],
    "suitableFor": ["Student"],
    "contactNumber": "9876543210",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

**403 — Seeker attempts owner action:**
```json
{ "success": false, "error": { "code": "FORBIDDEN", "message": "Insufficient permissions" } }
```

#### `GET /api/v1/rooms`

Public room search with filtering, pagination, and sorting.

- **Auth:** None
- **Query parameters:**

| Parameter | Type | Default | Validation |
|---|---|---|---|
| `page` | number | `1` | ≥ 1 |
| `limit` | number | `10` | 1–50 |
| `search` | string | — | Max 100 chars, searches `title` |
| `availability` | string | — | `"Available"` or `"Booked"` |
| `roomType` | string | — | `"Single"`, `"Double"`, or `"PG"` |
| `city` | string | — | Max 100 chars |
| `area` | string | — | Max 100 chars |
| `sort` | string | `newest` | `newest`, `oldest`, `rent_asc`, `rent_desc` |

**200 — Success:**
```json
{
  "success": true,
  "data": [ { "id": "...", "title": "...", ... } ],
  "pagination": {
    "total": 42,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

Soft-deleted rooms are **always excluded** from public results.

**400 — Invalid query:**
```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Validation failed" } }
```

#### `GET /api/v1/rooms/:id`

Get details for a specific room.

- **Auth:** None

**200 — Success:** Returns the room object.

**400 — Invalid ObjectId format:** `VALIDATION_ERROR`

**404 — Not found / soft-deleted:** `NOT_FOUND`

#### `GET /api/v1/rooms/my`

Get rooms belonging to the authenticated owner. Supports the same filters/pagination as the public search, plus `includeDeleted`.

- **Auth:** Bearer token
- **Role:** `owner` only
- **Additional query parameter:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `includeDeleted` | string | `false` | Set to `"true"` to include soft-deleted rooms |

**200 — Success:** Same paginated format as `GET /rooms`.

#### `PATCH /api/v1/rooms/:id`

Update room fields. Only the room owner can update.

- **Auth:** Bearer token
- **Role:** `owner` only
- **Request body:** Any subset of the create room fields (all optional).

**200 — Success:** Returns the updated room.

**404 — Not found or IDOR protection:** Returns `NOT_FOUND` if the room doesn't exist or belongs to a different owner.

#### `PATCH /api/v1/rooms/:id/availability`

Update room availability status.

- **Auth:** Bearer token
- **Role:** `owner` only
- **Request body:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `availability` | string | Yes | `"Available"` or `"Booked"` |

**200 — Success:** Returns the updated room.

#### `DELETE /api/v1/rooms/:id`

Soft-delete a room. Sets `isDeleted: true` without removing the document.

- **Auth:** Bearer token
- **Role:** `owner` only

**200 — Success:**
```json
{ "success": true, "data": { "message": "Room deleted successfully" } }
```

**404 — Not found or IDOR protection:** Returns `NOT_FOUND`.

---

### Dashboard

#### `GET /api/v1/rooms/dashboard/summary`

Get aggregate room counts for the authenticated owner.

- **Auth:** Bearer token
- **Role:** `owner` only

**200 — Success:**
```json
{
  "success": true,
  "data": {
    "totalRooms": 10,
    "availableRooms": 6,
    "bookedRooms": 3,
    "deletedRooms": 1
  }
}
```

Returns all zeros if the owner has no rooms.

---

## Permissions

| Role | Can do |
|---|---|
| **seeker** | Browse public rooms, view room details, manage own profile |
| **owner** | Everything seekers can do, plus create/update/delete rooms, view own dashboard |

- **IDOR protection:** Accessing/modifying another owner's room returns `404 Not Found` (not `403`) to prevent leaking resource existence.
- **Role guard:** Attempting owner-only actions as a seeker returns `403 Forbidden`.

---

## Error & Security Behavior

| Scenario | Response |
|---|---|
| Invalid ObjectId format | `400 VALIDATION_ERROR` |
| Valid ObjectId, room not found | `404 NOT_FOUND` |
| Accessing another owner's room | `404 NOT_FOUND` (IDOR protection) |
| Seeker calls owner-only endpoint | `403 FORBIDDEN` |
| No/expired access token | `401 UNAUTHORIZED` |
| Duplicate email on register | `409 CONFLICT` |
| Rate limit exceeded | `429 TOO_MANY_REQUESTS` |
| Body > 10kb | Request rejected |
| NoSQL injection attempt | Sanitized by express-mongo-sanitize |

---

## Logging

Winston structured logging is used throughout the application.

- **Development:** Colorized, human-readable console output with timestamps
- **Production:** Structured JSON format for log aggregation

**Sensitive data redaction** — the following are never logged:
- Passwords, password hashes
- Access tokens, refresh tokens, JWTs
- Authorization headers
- Authentication cookies
- MongoDB URIs, database credentials
- API keys and secrets

Morgan is used separately for HTTP request logging.

---

## Continuous Integration (CI)

A GitHub Actions workflow (`.github/workflows/ci.yml`) automatically runs on `push` and `pull_request` to `main`.

**Backend job:**
- `npm ci`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm test`
- `npm audit --audit-level=moderate`

**Frontend job:**
- `npm ci`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

> CI does not require a real MongoDB connection. DB-dependent tests are safely skipped when `MONGODB_TEST_URI` is not set.

---

## Postman

Three files are provided for API testing:

| File | Description |
|---|---|
| `RoomSetu_Auth_Phase2.postman_collection.json` | Auth endpoints (register, login, refresh, logout, me) |
| `RoomSetu_Rooms_Phase3.postman_collection.json` | Room CRUD, search, dashboard |
| `RoomSetu_Environment.postman_environment.json` | Environment variables (`baseUrl`, `accessToken`, `roomId`) |

Import the environment file first, then use the collections. All requests use `{{baseUrl}}` and `{{accessToken}}` variables from the environment.

---

## Development Phases

| Phase | Status | Description |
|---|---|---|
| 0 | ✅ Done | Planning & Architecture |
| 1 | ✅ Done | Project Foundation |
| 2 | ✅ Done | Authentication & Authorization |
| 3 | ✅ Done | Room Management Backend |
| 4 | ✅ Done | Owner Dashboard API |
| 5 | ✅ Done | Seeker Dashboard & Room Discovery |
| 6 | ✅ Done | Image & Location System |
| 7 | ✅ Done | Search & Filtering |
| 8 | ✅ Done | Security, Testing & Quality |
| 9 | ✅ Done | Refinement, Winston, CI & Git Hygiene |
| 10+ | Pending | Admin, Advanced Features, Deployment |
