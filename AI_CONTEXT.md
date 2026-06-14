# AI Context: ExpenseSync (Shared Expenses App)

This file is the single source of truth for the ExpenseSync project. It outlines the core product specifications, schemas, calculations, import anomaly rules, and API design.

---

## 1. Core Overview
ExpenseSync is a Shared Expenses Management application for flatmates. It replaces a spreadsheet with a web application that calculates balances, tracks payments, handles multi-currency transactions (USD fixed at 1 USD = 84 INR), maps join/leave membership timelines, and parses historical CSV data while reporting anomalies for manual resolution.

---

## 2. Relational Database Model (PostgreSQL)

```sql
-- Enable pgcrypto extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Groups Table
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Group Memberships Table (Tracks timelines)
CREATE TABLE group_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at DATE NOT NULL,
    left_at DATE,
    CONSTRAINT chk_joined_before_left CHECK (left_at IS NULL OR joined_at <= left_at)
);

-- Expenses Table
CREATE TABLE expenses (
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
CREATE TABLE expense_splits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount_owed NUMERIC(12, 2) NOT NULL,
    is_settled BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT unique_expense_user UNIQUE (expense_id, user_id)
);

-- Split Metadata Table (Stores original inputs)
CREATE TABLE split_metadata (
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
CREATE TABLE payments (
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
CREATE TABLE import_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    row_number INTEGER NOT NULL,
    problem_type VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    action_taken VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. Core Ledger Calculations & Invariants

* **Round Splits:** Store values rounded to 2 decimal places. To prevent balance drift, the final participant in the split list receives the division remainder so that:
  $$\sum (\text{Split Amounts}) = \text{Total Expense Amount (INR)}$$
* **Exchange Rate Snapshot:** Converted USD expenses are snapshotted at $1 USD = 84 INR$. Original values are preserved in columns `original_amount` and `original_currency`.
* **Dynamic Net Balance Computation:** Balances are never cached. They are calculated on the fly in PostgreSQL:
  $$\text{Net Balance} = \sum (\text{Expenses Paid}) - \sum (\text{Expenses Owed}) - \sum (\text{Settlements Paid}) + \sum (\text{Settlements Received})$$
* **Strict Membership Filters:** 
  - Expense split participants and payer must be active on `expense_date`:
    $$\text{joined\_at} \le \text{expense\_date} \text{ AND } (\text{left\_at IS NULL OR } \text{left\_at} \ge \text{expense\_date})$$
  - Settlements (`payments`) only require both users to belong (or have belonged) to the group.

---

## 4. CSV Importer Anomaly Resolution Rules

The multi-step importer parses rows and screens for 15 anomalies. If a row contains multiple anomalies, errors take precedence over warnings. Bulk imports must be executed inside a single database transaction (`BEGIN ... COMMIT`) for rollback safety.

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

## 5. Dual Authentication & Session

* **Credentials Login (Primary):** Sign up `/register` and sign in `/login` hashed with `bcrypt` yielding JWT tokens.
* **Quick Demo Switcher (Demo Mode):** Active when `DEMO_MODE=true` in the environment. An switcher bar at the top of the dashboard lets users toggle between Aisha, Rohan, Priya, Sam, Meera, and Dev instantly without logging out, updating the screen dynamically.
* **Persistence:** Tokens and user metadata are stored in `localStorage`. Any API `401 Unauthorized` response triggers automatic session purge and redirects to `/login?expired=true`.

---

## 6. REST API Contracts

### Authentication
* **POST `/api/auth/register`** — Request: `{ name, email, password }` $\rightarrow$ Response (201): `{ token, user: { id, name, email } }`
* **POST `/api/auth/login`** — Request: `{ email, password }` $\rightarrow$ Response (200): `{ token, user: { id, name, email } }`
* **GET `/api/auth/me`** — Response (200): `{ user: { id, name, email } }`

### Groups & Members
* **GET `/api/groups`** — Response (200): `{ groups: [{ id, name, created_at }] }`
* **POST `/api/groups`** — Request: `{ name }` $\rightarrow$ Response (201): `{ id, name }`
* **GET `/api/groups/:id/members`** — Response (200): `{ members: [{ user_id, name, joined_at, left_at }] }`
* **POST `/api/groups/:id/members`** — Request: `{ userId, joinedAt, leftAt }` $\rightarrow$ Response (200): `{ success: true }`

### Expenses & Payments
* **GET `/api/groups/:id/expenses`** — Queries: `?page=1&limit=20&memberId=uuid` $\rightarrow$ Response (200): `{ data: [...], pagination: { page, limit, totalItems, totalPages } }`
* **POST `/api/expenses`** — Request: `{ groupId, description, amount, currency, expenseDate, paidBy, splitType, participants: [{ userId, percentage, shares, customAmount }] }` $\rightarrow$ Response (210): `{ id, success: true }`
* **GET `/api/groups/:id/balances`** — Response (200): `{ debts: [{ debtor_id, debtor_name, creditor_id, creditor_name, amount }], summaries: [{ user_id, name, net_balance }] }`
* **GET `/api/groups/:id/expenses/audit/:userId`** — Response (200): `[{ id, type, date, description, total_amount, user_share, paid_by_name }]`
* **POST `/api/payments`** — Request: `{ groupId, paidBy, paidTo, amount, paymentDate, notes }` $\rightarrow$ Response (201): `{ id, success: true }`

### CSV Importer
* **POST `/api/import/parse`** — Upload: `file` multipart $\rightarrow$ Response (200): `{ importSessionId, anomalies: [{ rowNumber, description, anomalies: [...] }] }`
* **POST `/api/import/confirm`** — Request: `{ importSessionId, resolutions: [{ rowNumber, issueType, action, selectedUserId, selectedDate, targetUserId, memberName, memberId }] }` $\rightarrow$ Response (200): `{ success, imported_count, skipped_count, report: { summary: { total, imported, skipped, warnings, errors }, logs: [] } }`

---

## 7. Frontend Pages & Theme Spec

* **Path Routing:**
  - `/` — Static Home landing page showing text rotator transitions and mobile mockups.
  - `/login`, `/register` — Standard card forms with quick switcher profiles.
  - `/dashboard` — Desktop screen featuring quick actions, overall balance cards, group lists, active debt meters, and the top switch view dropdown.
  - `/groups/:id` — Details view with tabs for Overview (pairwise debts), Expenses (paginated feed), Balances (with click trigger audit trails), Settlements (payment feeds), and Members timelines.
  - `/import` — Importer wizard grid.
* **Theme Styling:** Clean Light Mode.
  - *Primary Accent:* Teal (`#1CC29F`)
  - *Background:* Off-white (`#F6F6F6` / `#FFFFFF`)
  - *Text Colors:* Charcoal (`#333333` / `#666666`)

---

## 8. Verification Tests (Vitest)
* Check that `parseCSVAmount` strips commas and quotes.
* Check that `parseCSVDate` flags ambiguity when Day and Month $\le 12$.
* Check that division remainders are assigned to the last participant to prevent balance leakages.
* Check that USD conversions snapshot the exchange rate.
* Check that membership timeline checks reject split participants who were inactive in the group on the expense date.
