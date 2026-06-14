# Scope and Database Schema

This document logs all CSV data anomalies detected, the detection policies, the handling policies, and outlines the database schema.

---

## CSV Anomaly Log

Below is the log of 15 data anomalies found in [expenses_export.csv](file:///Users/shivamyadav/splitwise_Clone/expenses_export.csv), their detection logic, and their handling policies.

| ID | Anomaly / Issue in CSV | Example Row / Line | Detection Policy | Handling Policy (Requires user approval in importer UI) |
|---|---|---|---|---|
| **1** | **Duplicate Identical Logs** | Lines 5 & 6 (Marina Bites dinner identical amount/date) | Multiple rows with identical date, amount, currency, payer, and participant list. | **Policy:** Surface to user. Offer options: <br>1. *Keep First (Delete second)* <br>2. *Keep Second (Delete first)* <br>3. *Keep Both* |
| **2** | **Conflicting Duplicate Logs** | Lines 24 & 25 (Thalassa Dinner - Aisha logs 2400, Rohan logs 2450) | Rows on the same date with highly similar descriptions and overlapping participants, but different amounts/payers. | **Policy:** Flag as conflict. Offer options: <br>1. *Aisha's row wins* <br>2. *Rohan's row wins* <br>3. *Keep Both* |
| **3** | **Inconsistent Number Formatting** | Line 7 (`"1,200"` with quotes and comma) | Amount string contains quotes, commas, or other formatting symbols. | **Policy:** Automatically parse and strip non-numeric symbols (e.g., convert `"1,200"` to `1200.00`). Log as auto-fixed warning. |
| **4** | **Inconsistent Casing / Spaces in Names** | Line 9 (`priya` vs `Priya`), Line 27 (`rohan ` with trailing space) | `paid_by` or `split_with` names matching database users but with casing/whitespace deviations. | **Policy:** Automatically trim whitespace and normalize casing to match database records (e.g., `priya` $\rightarrow$ `Priya`). Log as auto-fixed warning. |
| **5** | **Alternate Names / Typos** | Line 11 (`Priya S` instead of `Priya`) | Name string does not match database user exactly, but has high similarity. | **Policy:** Prompt user: *"We found 'Priya S'. Map to existing user 'Priya' or create new user?"* |
| **6** | **Missing Payer (`paid_by`)** | Line 13 (`House cleaning supplies,,780,INR`) | The `paid_by` column is empty. | **Policy:** Flag as missing data. Prompt user to select who paid from the group list. |
| **7** | **Settlement Logged as Expense** | Line 14 (`Rohan paid Aisha back,Rohan,5000,INR,,Aisha`) | Empty `split_type`, description mentions "paid back" or "settle", and participant list is a single user. | **Policy:** Import as a **Settlement** record instead of an Expense. Surface this mapping for confirmation. |
| **8** | **Percentages Sum $\neq$ 100%** | Line 15 (Percentages sum to 110%) | Split type is `percentage` but the sum of split weights $\neq 100$. | **Policy:** Flag as invalid math. Offer options: <br>1. *Normalize percentages to equal 100%* (e.g., 30/110, 20/110) <br>2. *Manually edit percentages* |
| **9** | **Non-group member in splits** | Line 23 (`Kabir` in parasailing split) | A name in `split_with` is not in the group member database table. | **Policy:** Offer options: <br>1. *Create Kabir as a temporary member of the group* <br>2. *Exclude Kabir and split the cost only among group members* |
| **10** | **Negative amount (Refund)** | Line 26 (`Parasailing refund,Dev,-30,USD`) | Amount value is negative. | **Policy:** Treat as a refund. It reduces the amount owed by the split participants (acts as a credit). Log in report. |
| **11** | **Inconsistent/Messy Date Formats** | Line 27 (`Mar-14`), Line 34 (`04-05-2026`) | Date string does not match `DD-MM-YYYY` standard. | **Policy:** Try to auto-parse (e.g., `Mar-14` $\rightarrow$ `14-03-2026`). If ambiguous (e.g., `04-05-2026` could be April 5 or May 4), prompt user to confirm the date. |
| **12** | **Missing Currency** | Line 28 (Empty currency column for DMart groceries) | The `currency` field is empty. | **Policy:** Default to `INR` and log as a warning, or prompt user to select currency. |
| **13** | **Zero Amount Expense** | Line 31 Swiggy dinner (Amount is `0` INR) | The amount is `0` or empty. | **Policy:** Offer options: <br>1. *Skip importing this row* <br>2. *Import as a 0-value transaction* |
| **14** | **Membership mismatch (Active period)** | Line 36 (Meera in split list on April 2, but left March 31) | Participant listed in split is inactive in the group on the expense date. | **Policy:** Exclude the user automatically and split among the remaining active users, or prompt user to confirm. |
| **15** | **Split Details provided for Equal Split** | Line 42 (split_type is `equal` but split_details has `Aisha 1; Rohan 1...`) | Split type is `equal` but `split_details` is populated. | **Policy:** Ignore the split details and distribute equally. Log as auto-fixed warning. |

---

## Database Schema

```sql
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

-- Group Memberships Table
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

-- Split Metadata Table
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
