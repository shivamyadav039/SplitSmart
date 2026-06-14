# ExpenseSync — Shared Expenses & Import Sync Manager

ExpenseSync is a shared expenses management application designed for flatmates and group trips. It replaces spreadsheets with a dynamic, transaction-safe database ledger that supports multi-currency splits, join/leave membership timelines, and an interactive CSV importer that detects and resolves 15 data anomalies.

---

## 1. Project Setup & Launch Instructions

### Prerequisites
* Node.js (v20+ recommended)
* PostgreSQL database instance running locally

### Database Configuration
1. Make sure your local PostgreSQL service is running.
2. In [server/.env](file:///Users/shivamyadav/splitwise_Clone/server/.env), configure your PostgreSQL connection string:
   ```env
   DATABASE_URL=postgresql://localhost:5432/splitwise
   JWT_SECRET=demo_secret_key_123_super_secure
   PORT=5001
   DEMO_MODE=true
   ```

### Execution Steps
From the root workspace directory, run:

1. **Install all dependencies:**
   ```bash
   npm run install:all
   ```
2. **Execute migrations & seed data:**
   This creates the tables and seeds initial users (Aisha, Rohan, Priya, Sam, Meera, Dev) and memberships:
   ```bash
   npm run --prefix server migrate && npm run --prefix server seed
   ```
3. **Start client & server concurrently:**
   ```bash
   npm run dev
   ```
   * Frontend: `http://localhost:5173/`
   * Backend API: `http://localhost:5001/`

---

## 2. CSV Anomaly Resolution Data Flow

### 2.1. End-to-End Import Sync Architecture

The diagram below illustrates how historical logs are uploaded, screened for anomalies, resolved by the user, and committed to the database ledger within a single atomic transaction block:

```mermaid
graph TD
    A["Upload expenses_export.csv"] --> B["Backend Parser (parseCSVBuffer)"]
    B --> C["Anomaly Scanner (detectAnomalies)"]
    
    C --> D{"Anomalies Detected?"}
    
    D -- Yes --> E["API returns anomalies list & importSessionId"]
    D -- No --> F["Auto-commit clean rows directly"]
    
    E --> G["Frontend Wizard displays rows needing review"]
    G --> H["User selects resolutions (e.g. Map user, Select date)"]
    H --> I["POST /api/import/confirm (Resolutions Array)"]
    
    I --> J["commitImportResolutions Service"]
    J --> K["BEGIN PostgreSQL Transaction"]
    
    K --> L["Process rows & apply overrode values / auto-fixes"]
    L --> M{"Validation check fails?"}
    
    M -- Yes --> N["ROLLBACK Transaction (Database is untouched)"]
    M -- No --> O["COMMIT Transaction (Expenses, Splits, Payments, Logs inserted)"]
    
    N --> P["Return 400 Bad Request error response"]
    O --> Q["Return 200 OK with Import Report & Audit Logs"]
```

### 2.2. Detailed Anomaly Resolution Decision Paths

The following flowchart displays the specific resolution mechanisms, decision nodes, and auto-fixes triggered during anomaly detection:

```mermaid
graph TD
    classDef error fill:#fee2e2,stroke:#ef4444,stroke-width:2px,color:#333;
    classDef warning fill:#fef3c7,stroke:#f59e0b,stroke-width:2px,color:#333;
    classDef process fill:#e0f2fe,stroke:#0284c7,stroke-width:2px,color:#333;
    classDef db fill:#dcfce7,stroke:#22c55e,stroke-width:2px,color:#333;

    Start[("CSV Row Parsed")] --> Check{"Is Warning or Error?"}
    
    %% Warning Path
    Check -- "Warning Anomaly" --> WarnType{"Requires User Choice?"}
    
    WarnType -- "No (Auto-Fix)" --> AutoFix["Apply Auto-Fix Logic"]:::process
    AutoFix --> LogWarn["Write Warning to Report Logs"]
    LogWarn --> SaveRow["Include in Transaction Payload"]
    
    WarnType -- "Yes" --> WarnWizard["Prompt User in Wizard Grid"]:::warning
    WarnWizard --> UserWarnOpt{"User Choice"}
    
    UserWarnOpt -- "Skip/Discard" --> SkipRow["Skip Row & Log Skip Action"]
    UserWarnOpt -- "Resolve/Accept" --> ApplyWarnRes["Apply Chosen Option (e.g. Settle / Keep Both)"]
    ApplyWarnRes --> SaveRow
    
    %% Error Path
    Check -- "Error Anomaly (Blocker)" --> ErrWizard["Surface Blocker in Wizard Grid"]:::error
    ErrWizard --> ErrType{"Error Type?"}
    
    ErrType -- "Missing Payer / Unknown User" --> UserMap{"User Action"}
    UserMap -- "Map User" --> MapPayer["Map to Existing DB Member"]
    UserMap -- "Add User" --> AddPayer["Create User in DB & Group Timeline"]
    UserMap -- "Skip" --> SkipRow
    
    ErrType -- "Ambiguous Date" --> UserDate{"User Action"}
    UserDate -- "Select Date" --> PickDate["Assign Selected Date"]
    UserDate -- "Skip" --> SkipRow
    
    ErrType -- "Invalid Split Percentage" --> UserPct{"User Action"}
    UserPct -- "Normalize" --> NormalizePct["Scale weights to sum to 100%"]
    UserPct -- "Skip" --> SkipRow

    MapPayer --> SaveRow
    AddPayer --> SaveRow
    PickDate --> SaveRow
    NormalizePct --> SaveRow
    
    %% Database Transaction
    SaveRow --> TransInit["BEGIN PostgreSQL Transaction"]:::db
    TransInit --> InsertDB["Insert Expense/Payment/Splits/Metadata"]
    InsertDB --> Commit["COMMIT Transaction"]:::db
    SkipRow --> SkipLog["Insert Skip Log into DB"]:::db
    
    style Start fill:#f1f5f9,stroke:#64748b,stroke-width:2px;
    style Check fill:#fafaf9,stroke:#78716c,stroke-width:2px;
```


---

## 3. The 15 Anomaly Scanners Summary

Our scanner analyzes every row and classifies issues as **Errors** (blocking rows requiring manual choice resolution) or **Warnings** (auto-fixed and documented in the report log):

1. **Duplicate Identical (Warning):** Same date, amount, and payer as an existing record. Resolved by skipping or keeping both.
2. **Conflicting Duplicate (Warning):** Similar description and date, but different amount/payer. Resolved by selecting which row wins.
3. **Number Formatting (Warning):** Amount has quotes or commas (e.g. `"1,200"`). Auto-normalized to `1200.00`.
4. **Casing / Whitespace (Warning):** Names have inconsistent casing or trailing spaces. Auto-normalized to database records.
5. **Typos / Alternate Names (Error):** Name matches a database user partially. User selects mapped user or adds new member.
6. **Missing Payer (Error):** Payer column is empty. User selects active group member to pay.
7. **Settlement Mixed in Expenses (Warning):** Description mentions payment. Maps row to Settlements (`payments`) table.
8. **Percentages sum != 100% (Error):** Percentages split sum is off. User normalizes weights or skips.
9. **Non-Group Member (Error):** Participant is not in database membership. User maps to member, adds member, or skips.
10. **Negative Amount (Warning):** Negative value parsed. Treated as refund credit splitting among members.
11. **Messy Date Format (Warning):** Ambiguous date format. Checked for day/month ambiguity, prompting manual date pick.
12. **Missing Currency (Warning):** Currency column empty. Auto-defaulted to INR.
13. **Zero Amount (Warning):** Value is `0`. Skipped or imported as zero-value log.
14. **Membership Active Timeline (Warning):** Participant was inactive on the expense date. Excluded from split.
15. **Split Details on Equal Split (Warning):** Split type is equal but weights provided. Auto-ignored.
