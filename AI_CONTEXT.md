# AI Context: ExpenseSync (Shared Expenses App)

This file is the single source of truth for the ExpenseSync project. It outlines the core product specifications, schemas, calculations, import anomaly rules, API design, deployment configs, development trade-offs, and implementation logs.

---

## 1. Product Understanding & Scope

### Product Understanding
ExpenseSync is a shared expense management tool designed for flatmates and travel groups. It manages financial relationships by replacing error-prone spreadsheets with a transaction-safe database ledger. Users can log expenses, track splits, invite members with active timeline constraints, and settle up balances. 

A unique feature is the **CSV Importer**, which parses historical ledger exports, screens them against 15 distinct anomaly rules (classified into fatal errors and warnings), and allows users to resolve conflicts in a wizard grid prior to writing them to the database.

### Product Scope
* **Authentication**: Email/password authentication, persistent sessions, and a "Quick Persona Switcher" for demo purposes.
* **Groups & Timelines**: Support for multiple groups, members, and chronological membership timelines (joined/left dates).
* **Expense Ledger**: Creation of bills with four split types (equal, unequal, percentage, share weight), in-memory CSV import, and multi-currency conversions (fixed at $1 USD = 84 INR$).
* **Audit & Settle**: Dynamic net balance computation, pairwise debt minimization, and audit logs tracking expense records.
* **Production Deployment**: A monorepo architecture deployable to Vercel (compute) and Neon (database).

---

## 2. Engineering Requirements & Tech Stack

### Engineering Requirements
1. **Division Precision & Balance Integrity**: Splits are stored to 2 decimal places in `NUMERIC(12,2)`. To prevent drift, division remainder values are assigned to the last participant:
   $$\sum (\text{Split Amounts}) = \text{Total Expense Amount (INR)}$$
2. **Timeline Consistency**: Split participants and payers must have active memberships in the group on the day the bill is dated:
   $$\text{joined\_at} \le \text{expense\_date} \text{ AND } (\text{left\_at IS NULL OR } \text{left\_at} \ge \text{expense\_date})$$
3. **Transaction Safety**: Bulk imports must be executed inside a single PostgreSQL database transaction (`BEGIN ... COMMIT`). Any validation failure triggers a full rollback (`ROLLBACK`), keeping the database state clean.
4. **Stateless Operations**: No persistent files are written to the container storage. Uploads are handled in-memory, making the codebase serverless-compatible.

### Tech Stack
* **Frontend**: React (SPA), Vite (Bundler), Tailwind CSS (Styling), Lucide React (Icons), Axios (API client), React Router DOM (Routing).
* **Backend**: Node.js, Express.js (REST Routing), csv-parser (CSV reader), multer (In-memory uploads), bcryptjs (Hashing), jsonwebtoken (JWT).
* **Database**: PostgreSQL (Relational DB), pg (Connection Pool).

---

## 3. Relational Database Model (PostgreSQL)

```sql
-- Enable pgcrypto extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Groups Table
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Group Memberships Table (Tracks timelines)
CREATE TABLE IF NOT EXISTS group_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at DATE NOT NULL,
    left_at DATE,
    CONSTRAINT chk_joined_before_left CHECK (left_at IS NULL OR joined_at <= left_at)
);

-- Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    amount_inr NUMERIC(12, 2) NOT NULL,
    original_amount NUMERIC(12, 2) NOT NULL,
    original_currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    conversion_rate NUMERIC(12, 4) NOT NULL DEFAULT 1.0000,
    split_type VARCHAR(50) NOT NULL CHECK (split_type IN ('equal', 'unequal', 'percentage', 'share')),
    paid_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    expense_date DATE NOT NULL,
    notes TEXT,
    import_status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Expense Splits Table
CREATE TABLE IF NOT EXISTS expense_splits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount_owed NUMERIC(12, 2) NOT NULL,
    is_settled BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT unique_expense_user UNIQUE (expense_id, user_id)
);

-- Split Metadata Table (Stores original inputs)
CREATE TABLE IF NOT EXISTS split_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    percentage_value NUMERIC(5, 2),
    share_value NUMERIC(12, 2),
    custom_amount NUMERIC(12, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_metadata_expense_user UNIQUE (expense_id, user_id)
);

-- Payments Table (Settlements)
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    paid_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    paid_to UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    amount NUMERIC(12, 2) NOT NULL,
    payment_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_different_users CHECK (paid_by <> paid_to)
);

-- Import Logs Table
CREATE TABLE IF NOT EXISTS import_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    row_number INTEGER NOT NULL,
    problem_type VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    action_taken VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. REST API Contracts

### Authentication
* **POST `/api/auth/register`** — Request: `{ name, email, password }` $\rightarrow$ Response (201): `{ token, user: { id, name, email } }`
* **POST `/api/auth/login`** — Request: `{ email, password }` $\rightarrow$ Response (200): `{ token, user: { id, name, email } }`
* **GET `/api/auth/me`** — Response (200): `{ user: { id, name, email } }`
* **GET `/api/auth/users`** — Response (200): `{ users: [{ id, name, email }] }`
* **POST `/api/auth/users`** — (Create a quick user / invite) Request: `{ name, email }` $\rightarrow$ Response (201): `{ user }`

### Groups & Members
* **GET `/api/groups`** — Response (200): `{ groups: [{ id, name, created_at }] }`
* **POST `/api/groups`** — Request: `{ name }` $\rightarrow$ Response (201): `{ id, name }`
* **GET `/api/groups/:id/members`** — Response (200): `{ members: [{ user_id, name, joined_at, left_at }] }`
* **POST `/api/groups/:id/members`** — Request: `{ userId, joinedAt, leftAt }` $\rightarrow$ Response (200): `{ success: true }`

### Expenses & Payments
* **GET `/api/groups/:id/expenses`** — Queries: `?page=1&limit=20` $\rightarrow$ Response (200): `{ data: [...], pagination: { page, limit, totalItems, totalPages } }`
* **POST `/api/expenses`** — Request: `{ groupId, description, amount, currency, expenseDate, paidBy, splitType, participants: [{ userId, percentage, shares, customAmount }] }` $\rightarrow$ Response (201): `{ id, success: true }`
* **GET `/api/groups/:id/balances`** — Response (200): `{ debts: [{ debtor_id, debtor_name, creditor_id, creditor_name, amount }], summaries: [{ user_id, name, net_balance }] }`
* **GET `/api/groups/:id/expenses/audit/:userId`** — Response (200): `[{ id, type, date, description, total_amount, user_share, paid_by_name }]`
* **POST `/api/payments`** — Request: `{ groupId, paidBy, paidTo, amount, paymentDate, notes }` $\rightarrow$ Response (201): `{ id, success: true }`

### CSV Importer
* **POST `/api/import/parse`** — Upload: `file` multipart $\rightarrow$ Response (200): `{ importSessionId, anomalies: [{ rowNumber, description, anomalies: [...] }] }`
* **POST `/api/import/confirm`** — Request: `{ importSessionId, resolutions: [{ rowNumber, issueType, action, selectedUserId, selectedDate, targetUserId, memberName, memberId }] }` $\rightarrow$ Response (200): `{ success, imported_count, skipped_count, report: { summary: { total, imported, skipped, warnings, errors }, logs: [] } }`

---

## 5. CSV Importer Anomaly Resolution Rules

The multi-step importer parses rows and screens for 15 anomalies. If a row contains multiple anomalies, errors take precedence over warnings.

| Anomaly Type | Severity | Detection Logic | Action Choice (User / Auto Fix) |
|---|---|---|---|
| **1. Duplicate Identical** | Warning | Identical date, amount, currency, payer, and split list as an existing database or parsed row. | **User choice:** *Skip* (drop row) or *Keep Both*. |
| **2. Conflicting Duplicate** | Warning | Same date, description similarity $\ge 85\%$, same payer, amount difference $\le 10\%$. | **User choice:** *Keep Original*, *Keep New*, or *Keep Both*. |
| **3. Messy Numbers** | Warning | Amount has commas, quotes or spaces (e.g. `"1,200"`). | **Auto-fix:** Strip symbols, parse float. Log warning. |
| **4. Inconsistent Casing** | Warning | Name fields contain trailing spaces or incorrect casing. | **Auto-fix:** Trim and normalize to DB spelling. Log warning. |
| **5. Alternate Names / Typos** | Error | Name starts with similar letters but does not match DB exactly. | **User choice:** *Map member*, *Add member*, or *Skip row*. |
| **6. Missing Payer** | Error | The `paid_by` column is empty. | **User choice:** *Assign Payer* (select active user) or *Skip*. |
| **7. Settlement Entry** | Warning | Split type is empty or description mentions "paid back". | **User choice:** *Import as Settlement* (creates Payment) or *Import as Expense*. |
| **8. Invalid Percentage** | Error | Split type is `percentage` but weights $\neq 100\%$. | **User choice:** *Normalize percentages* or *Skip*. |
| **9. Non-Group Member** | Error | Name listed in split is not in the group member database. | **User choice:** *Add member to group* or *Exclude member*. |
| **10. Negative Amount** | Warning | Amount value is negative. | **Auto-fix:** Treat as refund (reduces split debt). Log warning. |
| **11. Messy Date Format** | Warning | Date format is not YYYY-MM-DD. | **Auto-fix:** Attempt conversion. If ambiguous, flag as Error. |
| **12. Missing Currency** | Warning | Currency column is empty. | **Auto-fix:** Default to INR. Log warning. |
| **13. Zero Amount Expense** | Warning | Amount is `0` or empty. | **User choice:** *Skip row* or *Import zero-value*. |
| **14. Membership Mismatch** | Warning | Participant listed in split is inactive in the group on the expense date. | **User choice:** *Keep member in split*, *Exclude member*, or *Skip*. |
| **15. Split Details on Equal** | Warning | Split type is `equal` but split details weights are provided. | **Auto-fix:** Ignore details, divide equally. Log warning. |

---

## 6. Frontend Structure

* **Routing** (`BrowserRouter`):
  * `/` — Static Home landing page showing mockups.
  * `/login`, `/register` — Authentication pages protected by `PublicRoute`.
  * `/dashboard` — Protected workspace layout featuring net balances, quick group setups, debt listings, and the quick switch bar.
  * `/groups/:id` — Details dashboard for an active group with tabs for pairwise debt reduction, paginated expense lists, member timeline trackers, and payment settlement lists.
  * `/import` — Importer wizard grid.
* **Authentication Provider** (`AuthContext`):
  * Manages global `user`, `token`, and `loading` states.
  * Sets default JWT tokens on all outbound `axios` requests via interceptors.
  * Automatically intercepts `401 Unauthorized` errors to force session logs purges and login redirects.

---

## 7. Implementation Decisions & Trade-Offs

1. **Monolith Serverless Function on Vercel**: 
   * *Decision*: Serve the Express API through a single serverless function file ([api/index.js](file:///Users/shivamyadav/splitwise_Clone/api/index.js)) rather than breaking the application into multiple endpoints.
   * *Trade-Off*: Avoids cold start latency overhead on a per-endpoint basis, though it creates a slightly larger lambda bundle.
2. **In-Memory File Parsing**:
   * *Decision*: Use `multer.memoryStorage()` to handle CSV parsing without writing files to local disk.
   * *Trade-Off*: Avoids read-only file system issues on Vercel, though it limits the max file upload size to Vercel's memory limits (approx. 50MB).
3. **Decoupled Database Migrations**:
   * *Decision*: Avoid running database migrations on startup.
   * *Trade-Off*: Running migrations asynchronously on cold starts under Vercel causes containers to freeze background promises or create deadlock conditions when scaled up concurrently. Moving migrations to a manual or pre-deploy step ensures ledger stability.

---

## 8. Verification & Testing Plan

* **Vitest Unit Tests**: Validate calculation rules such as CSV amount formatting, ambiguous date scanning, rounding divisions, and currency exchange rates.
* **Supertest Endpoint Tests**: Verify authorization guards, registration validation, group creations, and split insertions.
* **Manual Verification Flow**: Set up local environments, verify user switching, run CSV files through the wizard UI, verify that anomalies are resolved, and check database states.

---

## 9. Changes Made During Implementation

1. **Vercel Database Connection Guard**:
   * Modified [pool.js](file:///Users/shivamyadav/splitwise_Clone/server/src/db/pool.js) to check for `process.env.VERCEL`. When active, connection failures or missing variables do not call `process.exit(1)`, avoiding cryptic lambda crashes.
2. **Dashboard Infinite Loading Bug Fix**:
   * Updated [Dashboard.jsx](file:///Users/shivamyadav/splitwise_Clone/client/src/pages/Dashboard.jsx) inside `fetchDashboardData` to call `setLoading(false)` if the user object or ID is missing on mount, preventing the page from getting locked in a loading spinner state.
3. **Serverless Migration Shutdown**:
   * Deactivated automatic background migration and seeding scripts inside [server/index.js](file:///Users/shivamyadav/splitwise_Clone/server/index.js) when running in serverless contexts to prevent cold start latency, deadlocks, and incomplete transactions.
4. **README updates**:
   * Updated setup instructions for both local development and Vercel/Neon deployment configurations.

---

## 10. Known Limitations

* **No WebSockets**: Vercel Serverless Functions do not support long-lived TCP connections, so real-time push events via WebSockets are disabled.
* **In-Memory Upload Size**: File processing is bound to RAM, making the bulk importer unsuitable for very large files (>10MB).
* **Static Currency Exchange**: The USD to INR conversion rate is fixed at $84$. Live exchange rate integrations are scheduled on the roadmap.
* **First Request Latency**: Due to Vercel cold starts, the initial API call can take 1–3 seconds to respond.

---

## 11. AI Prompts and Model Responses

During the development, the AI assistant **Antigravity** (designed by Google DeepMind) was prompted to build the application with a focus on high aesthetic quality, relational integrity in PostgreSQL, and full-featured anomaly detection. The response strategy followed a modular, components-first methodology starting with database structures, followed by robust Express controllers, and ending with custom-designed Tailwind CSS UI components.

