# AI Usage Log

This file tracks the AI tools used, key prompts, and concrete cases where the AI produced something wrong, how we caught it, and how it was fixed.

## AI Tools Used
* **Primary Assistant**: **Antigravity** (powered by Gemini 3.5 Flash / Medium), an agentic coding assistant designed by the **Google DeepMind** team.
* **IDE**: Antigravity IDE with sandboxed command terminal execution.

## Key Prompts Used
1. **Database Schema & Math Setup**: *"Build a shared expense management backend using Node/Express and PostgreSQL. Implement strict database timelines for group memberships and equal/unequal split calculations rounding to 2 decimal places, with remainder adjustment for the final user."*
2. **CSV Anomaly Screening Engine**: *"Write a stream-based CSV parser that screens rows for 15 anomalies (duplicate rows, typo names, invalid split percentages, timeline mismatches). Allow batch resolution confirmation wrapped in a PostgreSQL transaction block."*
3. **Frontend Dashboard UI**: *"Create a responsive React page with a clean Teal styling theme, featuring overall debt metrics (receivables/payables), quick person switchers, timeline editor interfaces, and audit modals."*
4. **Serverless Deployment Configurations**: *"Configure the monorepo to deploy both React static pages and the Express server onto Vercel, routing API calls to a serverless lambda function."*
5. **Relational Chat System**: *"Implement a real-time message chat system inside expenses. Store all chats in a Postgres table and sync updates in real-time on the frontend using relational short polling."*

---

## AI Errors Caught & Resolved

We caught and resolved five concrete bugs/design issues produced by the AI:

### Case 1: Infinite Dashboard Loading Spinner
* **Symptom**: After a new user registered or logged in, the dashboard got stuck displaying the loading spinner ("Syncing accounts ledger...") forever.
* **Cause**: In [Dashboard.jsx](file:///Users/shivamyadav/splitwise_Clone/client/src/pages/Dashboard.jsx), the `fetchDashboardData` helper had an early exit check: `if (!user || !user.id) return;`. If the user context was still initializing, the function exited immediately but **never** called `setLoading(false)`, leaving the loading state as `true` permanently.
* **Fix**: Updated `fetchDashboardData` to call `setLoading(false)` before returning early.

---

### Case 2: Database Migrations Frozen on Serverless Cold Starts
* **Symptom**: On Vercel, registering or logging in threw `relation "users" does not exist` database errors even though migrations were coded to run automatically.
* **Cause**: In [server/index.js](file:///Users/shivamyadav/splitwise_Clone/server/index.js), the AI called `runMigrations()` asynchronously at the root module import level. In Vercel's serverless environment, background promises outside of the HTTP request lifecycle are frozen immediately after the request finishes, leaving database tables uncreated or half-migrated.
* **Fix**: Commented out the automatic startup migrations inside the Express server entrypoint. Added manual terminal commands (`npm run migrate`) and deployment build script configurations to execute migrations cleanly before deploy.

---

### Case 3: Vercel Lambda Invocations Crashing via `process.exit(1)`
* **Symptom**: The deployed backend returned `502 Bad Gateway` (FUNCTION_INVOCATION_FAILED) on all API calls.
* **Cause**: In [pool.js](file:///Users/shivamyadav/splitwise_Clone/server/src/db/pool.js), the AI called `process.exit(1)` immediately during module load if the connection failed or if `DATABASE_URL` was missing. Calling `process.exit(1)` kills Vercel's node serverless container execution completely.
* **Fix**: Wrapped the `process.exit(1)` calls inside a conditional block (`if (!process.env.VERCEL)`) to prevent crashing the container environment, allowing standard HTTP error routing to respond gracefully.

---

### Case 4: ReferenceError: `rowNumber` is Not Defined
* **Symptom**: Backend crashed during bulk CSV imports with `ReferenceError: rowNumber is not defined`.
* **Cause**: In `anomaly.service.js`, the loop parsing the CSV rows declared the iteration counter variable as `rowNum`, but the returned anomaly error payload referenced it as `rowNumber`.
* **Fix**: Renamed the iteration variable to `rowNumber` throughout the service scope to align with the payload structure.

---

### Case 5: macOS Port 5000 Conflicting Bind (EADDRINUSE)
* **Symptom**: Local development server crashed on startup with `Error: listen EADDRINUSE: address already in use :::5000`.
* **Cause**: The AI initially bound the backend server to port 5000. In recent macOS versions, the built-in Control Center binds to port 5000 by default (for AirPlay Receiver).
* **Fix**: Shifted the backend port from 5000 to 5001 across `.env.example`, `api.js`, server configurations, and port-testing scripts.
