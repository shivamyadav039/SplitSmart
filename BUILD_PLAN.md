# Build Plan: ExpenseSync

This build plan outlines our structured technical execution roadmap to construct the ExpenseSync application. It is based strictly on the agreed source of truth in [AI_CONTEXT.md](file:///Users/shivamyadav/splitwise_Clone/AI_CONTEXT.md).

---

## 1. Architectural Foundation & Specifications

### Tech Stack
- **Frontend:** React (Vite SPA) + Tailwind CSS (Vibrant Navy Glassmorphism styling).
- **Backend:** Node.js + Express (Controller-Service-DB layered architecture).
- **Database:** PostgreSQL (raw SQL queries with connection pool using `pg` client).
- **Session Auth:** JWT tokens stored in `localStorage` + standard bcrypt hashing.
- **Testing:** Vitest + Supertest (Backend), Vitest + React Testing Library (Frontend).

### Relational Database Model
The database is structured to track users, groups, memberships, expenses, splits, metadata, payments, and import logs:
- `users`: Account registration and credentials.
- `groups`: Shared flatmate space.
- `group_memberships`: Join/leave date history timelines.
- `expenses`: Preserves amount, currency, notes, date, split type, and exchange rate snapshot.
- `expense_splits`: Maps actual calculated INR owed amounts and settlement status per participant.
- `split_metadata`: Preserves original percentage, share weight, or unequal split inputs.
- `payments`: Tracks settlement logs between members.
- `import_logs`: Documents CSV importer resolution steps.

---

## 2. Construction Sequence (Step-by-Step)

### Step 1: Database Setup & Idempotent Seeding
- **Actions:**
  - Execute PostgreSQL table migration script (`schema.sql`).
  - Implement idempotent seed script (`npm run seed`) to create users (Aisha, Rohan, Priya, Sam, Meera, Dev) with demo passwords (`demo123` hashed) and Flatmates Group.
  - Setup membership timelines (e.g. Sam joins `2026-04-15`, Meera leaves `2026-03-31`).
  - Add initial dummy transactions (INR/USD expenses and settlements) to verify math on fresh starts.

### Step 2: Layered Backend REST API Setup
- **Actions:**
  - Initialize Express app structure (`routes/`, `controllers/`, `services/`, `db/`, `middleware/`, `utils/`).
  - Setup database client connection pool (`db/pool.js`).
  - Write transaction helper utility `withTransaction` in `db/transaction.js`.
  - Implement Auth router (`/api/auth/register`, `/api/auth/login`, `/api/auth/me`).
  - Implement Group Membership timeline router (`/api/groups/:id/members`).

### Step 3: Core Business & Calculation Services
- **Actions:**
  - Build Split math service in `services/expense.service.js` (Equal, Unequal, Percentage, and Share split calculators rounding to 2 decimal places and routing decimal remainders to the final participant).
  - Implement membership eligibility check logic inside expense creation (verifying that payer and all split participants are active on the expense date).
  - Build dynamic SQL aggregation balance query in `services/balance.service.js` (joins expenses, splits, and payments to compute net receivable/payable summaries dynamically in Postgres).
  - Implement Rohan's audit trail itemized query in `services/balance.service.js`.
  - Wire up Expenses and Payments routers (`POST /api/expenses`, `GET /api/groups/:id/expenses`, `POST /api/payments`).

### Step 4: CSV Importer Engine & Validation Parser
- **Actions:**
  - Implement CSV parsing stream in `services/csvImport.service.js`.
  - Implement the 15 Anomaly Detection checks in `services/anomaly.service.js` (flagging identical duplicates, conflicting duplicates, ambiguous dates, missing payers, non-group members, and active membership timeline mismatches).
  - Implement batch resolutions commitment route `POST /api/import/confirm` wrapped inside a database transaction (`withTransaction`) to ensure atomic imports.

### Step 5: Frontend Authentication & Navigation
- **Actions:**
  - Initialize Vite React project. Install Tailwind CSS and setup the Navy Glassmorphic layout.
  - Create global `AuthContext` to persist JWT tokens in `localStorage` and request header interceptors.
  - Build Register and Login pages, including standard credential input fields and the **Quick Demo Login** switcher buttons (active when `DEMO_MODE=true`).
  - Set up routing guard component (`AuthGuard`) and wire up navbar links.

### Step 6: Groups Dashboard & Modal Workflows
- **Actions:**
  - Build Aisha's Dashboard view (`/dashboard`) containing balance card summaries (receivables vs payables).
  - Build Group Details page (`/groups/:id`) with tab panels:
    - *Overview:* Visual summary of outstanding balances (who owes whom).
    - *Expenses:* Paginated list of shared expenses + *Add Expense* form modal supporting all split calculators.
    - *Balances:* List of members with a click trigger to open *Rohan's Audit Trail Modal*.
    - *Settlements:* Payments log + *Settle Up* payment form modal.
    - *Members:* Sidebar displaying join/leave timeline dates.

### Step 7: CSV Importer Multi-step Wizard Page
- **Actions:**
  - Build Importer page (`/import`) supporting file upload, grid preview of detected anomalies, choice selections (dropdowns for missing payer, date overrides for ambiguous dates, options for duplicates, etc.), and the final downloadable Import Report page.

### Step 8: Quality Verification (Testing)
- **Actions:**
  - Write Vitest unit tests for calculations, rounding splits, USD-INR snapshot conversions, and membership timeline checks.
  - Write Supertest integration tests for backend endpoints.
  - Run frontend critical UI validation tests.

### Step 9: Production Deployment
- **Actions:**
  - Deploy monorepo structure to Render.
  - Configure production environment variables (`DATABASE_URL`, `JWT_SECRET`, `NODE_ENV`, `PORT`, `DEMO_MODE=true`).
  - Run idempotent seeding script in the build step.

---

## 3. Key Risks & Implementation Guardrails
- **Ledger Invariants:** Always assert that `sum(split amounts) == total expense` and dynamic balance summaries sum to exactly zero (zero-sum group ledger).
- **Concurrency Safety:** Do not caching balances in user columns. Dynamic calculation ensures data remains real-time.
- **Rollback Safety:** Never commit database writes until all resolution rows in the CSV confirm validation. If any resolution fails, execute automatic transaction rollback.

---

## 4. Immediate Next Steps
- [ ] Confirm this Build Plan.
- [ ] Execute database setup (`schema.sql` and seeding).
- [ ] Implement backend auth, transaction helper, and layered skeleton.
