# Phase 14 Implementation Report — RoomSetu

---

## Footer Component

### Component

**File:** `frontend/src/components/Footer.tsx`

A fully reusable, shared `<Footer />` component was created as part of Phase 14. It accepts an optional `onReportIssue` prop (typed `() => void`) that is plumbed through to both the "Report an Issue" nav link-style button and the primary CTA button. This prop is prepared for future modal integration (Phase 15) without any breaking interface changes.

**Structure:**
`
[Official RoomSetu Logo]

Find Your Space.
Find the right room at the right place.

Quick Links          Support              Email
──────────           ──────────           ──────────────────────────
Home                 Report an Issue      himanshusinghbisht0011@
Find Rooms           Give Feedback        gmail.com
How It Works         Contact Us
                                          [ Report an Issue ]  <- CTA

────────────────────────────────────────────────────────────
© 2026 RoomSetu               Created by Himanshu Singh Bisht
`

---

### Official Logo Usage

- **Source:** `frontend/src/assets/logo.png` — the existing official logo asset, unchanged.
- Imported via Vite asset pipeline: `import logoSrc from '../assets/logo.png'`.
- Rendered at `height: 48px; width: auto; object-fit: contain` to preserve original aspect ratio.
- In light mode (dark navy background), `filter: brightness(1.1) drop-shadow(...)` ensures logo visibility.
- In dark mode, the filter is removed (logo on lighter `--surface`).
- `alt="RoomSetu official logo"` provides accessible text.

---

### Responsive Behavior

| Viewport | Layout |
|----------|--------|
| Desktop (>=961px) | 4-column grid: Brand 1.6fr, Quick Links 1fr, Support 1fr, Contact 1.4fr |
| Tablet (601–960px) | 2-column grid; Brand spans full width |
| Mobile (<=600px) | Single column; CTA button full-width; bottom bar stacks |

---

### Dark / Light Mode

Footer respects the `[data-theme="dark"]` toggle managed by ThemeProvider.

| Element | Light mode | Dark mode |
|---------|-----------|-----------|
| Background | `--color-primary` (#0F2747 navy) | `--surface` (#1E293B) |
| Nav links | rgba(255,255,255,0.75) | `--text-muted` |
| Nav link hover | `--color-accent` | `--accent` |
| Email link | `--color-accent` | `--accent` |

All values use existing CSS custom properties from `globals.css`.

---

### Developer Credit

Bottom bar displays:
`
© 2026 RoomSetu               Created by Himanshu Singh Bisht
`
Year is dynamically rendered with `new Date().getFullYear()`.

---

### Contact Email

**Email:** `himanshusinghbisht0011@gmail.com`

- Rendered as `mailto:` anchor in the Contact column.
- "Give Feedback" links to `mailto:...?subject=Feedback%20for%20RoomSetu`.
- "Contact Us" links to `mailto:...?subject=Contact%20from%20RoomSetu`.
- "Report an Issue" calls `onReportIssue` prop only (prepared for Phase 15 modal).

---

### Accessibility

- Semantic `<footer role="contentinfo" aria-label="Site footer">`.
- Two `<nav aria-label="...">` elements.
- Headings use `<h2>` maintaining proper hierarchy.
- Logo link has `aria-label`, image has descriptive `alt` text.
- All interactive elements have visible focus states.
- Color contrast meets WCAG AA.

---

### Pages Mounted

| Page | File |
|------|------|
| Home (landing) | frontend/src/pages/Home.tsx |
| Seeker (discovery) | frontend/src/pages/SeekerHome.tsx |
| Owner (dashboard) | frontend/src/pages/OwnerHome.tsx |
| Room Details | frontend/src/pages/RoomDetails.tsx |

Auth pages (Login, Register) intentionally excluded.

---

### Links — No Fake Routes Created

| Link | Target |
|------|--------|
| Home | / (existing) |
| Find Rooms | /seeker (existing) |
| How It Works | / (Home page, features section) |
| Report an Issue | onReportIssue prop (no route) |
| Give Feedback | mailto: with Feedback subject |
| Contact Us | mailto: with Contact subject |

---

### Verification Results

#### Frontend
| Command | Result |
|---------|--------|
| npm run typecheck | Exit 0 — no type errors |
| npm run build | Exit 0 — 292 modules, 1.19s |
| npm run lint | Exit 0 — 0 errors, 6 pre-existing warnings |

#### Backend
| Command | Result |
|---------|--------|
| npm run typecheck | Exit 0 |
| npm run build | Exit 0 |
| npm test | 28 passed, 11 skipped, 0 failures |
| npm audit | 0 vulnerabilities |

---

## Feedback Form Feature

### Backend API
- **Endpoint:** `POST /api/v1/feedback`
- **Controller:** Validates request using Zod schema, extracts user ID from JWT if present.
- **Service:** Stores feedback in MongoDB with a default `Pending` status.

### Security
- **`optionalAuth` middleware:** Specifically built for this endpoint. If a `Bearer` token is present, it MUST be valid (otherwise `401 Unauthorized` is returned). If no token is provided, the request proceeds as an anonymous guest.
- **userId Protection:** The `userId` is strictly derived from the verified JWT `req.user`. Any `userId` supplied by the client in the request body is ignored by Zod stripping, preventing ID spoofing.
- **status Protection:** The `status` field is set to `Pending` server-side and is never accepted from client input.
- **Data sanitization:** Emails are trimmed and lowercased, inputs are strictly validated. Internal database errors are NOT exposed.
- **Success Response:** The `userId` is stripped from the returned object to avoid leaking internal ID structures.

### Database (MongoDB)
- **Model:** `Feedback` with fields for `userId` (optional ref), `name`, `email`, `type`, `message`, `status`.
- **Indexes:** `userId`, `status`, `createdAt`.

### Frontend Component
- **File:** `frontend/src/features/feedback/FeedbackModal.tsx`
- **Features:**
  - Implemented using React Hook Form and Zod for client-side validation mirroring the backend.
  - Accessible dialog (`role="dialog"`, `aria-modal`, `aria-labelledby`, accessible error labels).
  - Handles 3 states: Form, Loading, and Success.
  - Fully responsive, dark mode compatible (using existing CSS modal tokens).
  - Closes on Escape, traps focus on first input.
- **Auth Integration:** Automatically prefills the user's `name` and `email` if they are logged in using `AuthProvider`.

### Footer Integration
- Both "Give Feedback" and "Report an Issue" buttons in the Footer have been updated.
- Both buttons open the SAME reusable `FeedbackModal` component.
- "Give Feedback" sets `defaultType="Suggestion"`.
- "Report an Issue" sets `defaultType="Bug / Error"`.

### Tests
- **Backend Tests (`src/tests/feedback.test.ts`):**
  - Stateless validation tests (invalid email, missing message, invalid types).
  - Token validation tests (401 on expired token).
  - DB-dependent tests verifying guest submissions, authenticated submissions (with server-attached `userId`), and testing that clients cannot override `userId` or `status`.

---

## Email Notifications for Feedback

### Overview

After a feedback submission is successfully persisted to MongoDB, the backend triggers a fire-and-forget email notification to the configured receiver address. The API response is never delayed or altered by email delivery outcome.

### New File: `Backend/src/services/email.service.ts`

Implements the Nodemailer SMTP integration with the following design:

| Function | Purpose |
|----------|---------|
| `isEmailConfigured()` | Returns `true` only when all 5 SMTP env vars are present |
| `sendFeedbackNotification(feedback)` | Sends notification; silently skips or handles errors |
| `_resetTransporter()` | Internal — resets singleton for test isolation only |

### Nodemailer Integration

- **Package:** `nodemailer` + `@types/nodemailer`
- **Transport:** SMTP with lazy singleton transporter
  - Port `465` → `secure: true` (SSL/TLS)
  - Port `587` → `secure: false` with `tls: { rejectUnauthorized: true }` (STARTTLS)
- **Gmail support:** Use an App Password for `SMTP_PASS` — never a normal Gmail password

### Lazy Transporter Initialization

The SMTP transporter is **not** created at application startup. It is created on the first call to `sendFeedbackNotification()` when SMTP is configured, then reused for all subsequent calls. This matches the Cloudinary service pattern:

```
Application starts → SMTP vars absent → server starts normally, no transporter
POST /api/v1/feedback → validate → save to DB → call sendFeedbackNotification()
  → isEmailConfigured() = false → log skip message → return
  → API returns 201
```

### Email Content

```
Subject: [RoomSetu] New Feedback - {type}

Body:
RoomSetu — New Feedback

Name:    {name}
Email:   {email}
Type:    {type}

Message:
{message}

Submitted At:
{createdAt ISO string}

User ID: {userId}   ← only for authenticated users
```

### Security

| Rule | Implementation |
|------|---------------|
| `SMTP_PASS` never logged | Not stored in any variable that touches logging |
| Receiver from env only | `env.FEEDBACK_RECEIVER_EMAIL` — callers cannot supply it |
| Header injection prevention | CR/LF stripped from `name`, `email`, `type` before use in subject |
| No credentials in response | Email service return value is `void` |
| No SMTP config in API output | Service is internal; never returned via any endpoint |
| Validated fields only | Only `name`, `email`, `type`, `message`, `createdAt`, `userId` used |

### Failure Handling

| Scenario | MongoDB | Email | API Response |
|----------|---------|-------|-------------|
| SMTP not configured | ✅ Saved | ⏭ Skipped (logged) | 201 |
| SMTP configured, send OK | ✅ Saved | ✅ Sent | 201 |
| SMTP configured, send fails | ✅ Saved | ❌ Failed (logged) | 201 |

**Feedback is never lost because email delivery failed.**

### Safe Log Messages

- Skip: `[Email] Feedback email notification skipped: SMTP not configured.`
- Failure: `[Email] Feedback email notification failed.`

`SMTP_PASS` and full SMTP config are never logged.

### Updated Files

| File | Change |
|------|--------|
| `Backend/src/services/email.service.ts` | **NEW** — full email service |
| `Backend/src/config/env.ts` | Added 5 optional SMTP env vars |
| `Backend/src/modules/feedback/feedback.controller.ts` | Fire-and-forget email after DB save |
| `Backend/.env.example` | SMTP configuration block added |
| `Backend/src/tests/feedback.test.ts` | 6 new email notification tests added |

### SMTP Configuration

Add to `Backend/.env` to enable email notifications:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=<16-char Gmail App Password>
FEEDBACK_RECEIVER_EMAIL=himanshusinghbisht0011@gmail.com
```

> **SMTP CONFIGURATION = PENDING USER CONFIGURATION**
>
> SMTP credentials have not been configured in the local `.env`. Automated tests pass without them. No real email has been sent — this requires manual configuration of a Gmail App Password.

### New Backend Tests (`Feedback Email Notification` suite)

| # | Test | Coverage |
|---|------|---------|
| 1 | `isEmailConfigured()` returns false when SMTP vars absent | Config guard |
| 2 | `sendFeedbackNotification` skips gracefully when SMTP not configured | Skip path |
| 3 | `sendFeedbackNotification` does not expose SMTP_PASS in return value | Credential safety |
| 4 | Receiver comes from server env, not from request body | Receiver enforcement |
| 5 | SMTP error does not change API response — feedback remains 201 | Failure isolation |
| 6 | Validation unchanged with SMTP configured — bad data still 400 | Validation integrity |

No real SMTP connection is made in any test. Tests use `vi.spyOn` and env manipulation for isolation. Transporter singleton is reset between tests via `_resetTransporter()`.

---

### Verification Results

#### Backend (Post Email Notification)
| Command | Result |
|---------|--------|
| `npm run typecheck` | ✅ Exit 0 — 0 errors |
| `npm run build` | ✅ Exit 0 — compiled successfully |
| `npm test` | ✅ **34 passed**, 11 skipped, **0 failures** (4 test files) |
| `npm audit --audit-level=moderate` | ✅ 0 vulnerabilities |

#### Frontend (Unchanged — confirmed clean)
| Command | Result |
|---------|--------|
| `npm run typecheck` | ✅ Exit 0 — 0 errors |
| `npm run build` | ✅ Exit 0 — 292 modules, 1.07s |
| `npm run lint` | ✅ Exit 0 — 0 errors, 6 pre-existing warnings (unrelated) |

---

*Stopped here. Phase 15 not started. Email notification feature complete.*
