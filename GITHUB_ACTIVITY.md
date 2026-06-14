# GitHub Activity: Raised & Resolved Issues

This log documents the software issues, bugs, and feature limitations identified during the development of **ExpenseSync** and how they were resolved.

---

## 1. Issue List & Resolutions

### Issue #1: macOS Port Conflict on Port 5000 (Backend Crash)
* **Description:** macOS Control Center binds to port `5000` by default on macOS Monterey and later. This causes backend server launch crashes when starting Express.
* **Impact:** Blocker (Server could not start).
* **Resolution:** 
  - Moved the backend API server port default configuration to `5001` in `server/.env` and `server/index.js`.
  - Updated the proxy configuration on the frontend client to map backend endpoints to port `5001`.

### Issue #2: CSV Parsing Scanner ReferenceError on Row Numbers
* **Description:** The CSV parser scanning process crashed due to a reference error where `rowNum` was referenced instead of the declared `rowNumber` variable inside [anomaly.service.js](file:///Users/shivamyadav/splitwise_Clone/server/src/services/anomaly.service.js#L143).
* **Impact:** Blocker (Any uploaded CSV file failed to parse).
* **Resolution:** 
  - Corrected the variable reference from `rowNum` to `rowNumber` to ensure robust anomaly detection without execution failures.

### Issue #3: Anomaly Sorting Priority (Errors vs. Warnings)
* **Description:** Anomaly scanning output placed warnings before errors, preventing the frontend wizard from showing blocking errors (like missing payers) first.
* **Impact:** High (Pushed blockers down the page).
* **Resolution:** 
  - Implemented a custom sorting compare function inside [detectAnomalies](file:///Users/shivamyadav/splitwise_Clone/server/src/services/anomaly.service.js#L425) to prioritize `severity === 'error'` rows so they always appear at index 0.

### Issue #4: Division Decimal Remainder Drift (Balance Invariant Violation)
* **Description:** Equal division math of expenses (e.g., splitting $100$ INR between 3 users gives $33.33$ each) resulted in a $0.01$ INR balance leakage, violating the group ledger zero-sum invariant.
* **Impact:** Medium.
* **Resolution:** 
  - Added remainder correction math inside [csvImport.service.js](file:///Users/shivamyadav/splitwise_Clone/server/src/services/csvImport.service.js#L337) and splits processing. The final split participant receives the remainder of the division so that $\sum (\text{individual shares}) = \text{total expense}$.

### Issue #5: Broken CSS Custom Layouts and Dark Glassmorphism Contrast
* **Description:** User profile and names were not visible on the homepage/navbar due to conflicting black text on dark transparent glassmorphism panels.
* **Impact:** High (Poor user experience).
* **Resolution:** 
  - Migrated the application to the clean, official light layout style using Teal (`#1CC29F`) and charcoal tones.
  - Revamped form elements and inputs to use solid borders and clear colors.

### Issue #6: Missing Root `.gitignore` (Checking in `node_modules`)
* **Description:** The project had a client-level `.gitignore` but lacked a root `.gitignore`, leading to local `node_modules/` or local credentials `.env` configuration files being listed in `git status`.
* **Impact:** Medium.
* **Resolution:** 
  - Created a unified root-level `.gitignore` to keep node dependency caches, environment local configs, and system files (`.DS_Store`) untracked.

---

## 2. Raising & Managing Issues via GitHub CLI

To interactively raise and manage these issues directly on your GitHub repository page using the installed `gh` CLI, run the following commands:

### Step 1: Log in to your GitHub account
```bash
gh auth login
```

### Step 2: Raise a new issue on GitHub
```bash
gh issue create --title "Issue Title" --body "Describe the issue details here..."
```

### Step 3: View current open issues
```bash
gh issue list
```

### Step 4: Close and resolve an issue
```bash
gh issue close <issue-number>
```
