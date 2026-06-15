# Decision Log

This log tracks every significant product and technical decision, the options considered, and the rationale for the final choice.

## Decisions

### DECISION-001: Project Scope & Tech Stack
- **Context:** We need a React frontend, PostgreSQL backend, and production deployment.
- **Options Considered:**
  1. Next.js with Prisma/PostgreSQL (Serverless deployment).
  2. Vite React Frontend + Node.js/Express Backend + PostgreSQL (Traditional 3-tier architecture).
- **Decision:** Option 2 (Vite React + Node/Express + PostgreSQL).
- **Reasoning:** Standard architecture that is easy to containerize or deploy on Render/Railway, separate API boundaries which are cleaner to test and debug, and very fast dev loop.

### DECISION-002: Authentication Method
- **Context:** The app requires a login module and must be easily testable/evaluatable by evaluators in a 45-minute live review.
- **Options Considered:**
  1. Full standard registration & credentials login (email/password with bcrypt hashing).
  2. Persona dropdown login (pick user from dropdown list to instantly switch sessions) with JWT token verification.
- **Decision:** Option 2 (Persona dropdown login).
- **Reasoning:** Extremely useful for testing since the evaluator wants to verify different user perspectives (e.g., Meera's view vs. Sam's view). We generate standard signed JWTs on the backend, securing the API and keeping the architecture professional while optimizing the demo UX.

### DECISION-003: Deployment Platform
- **Context:** Choose where to deploy the application for production access in 2 days.
- **Options Considered:**
  1. Monorepo hosting on Render or Railway (Option A).
  2. Static build on Vercel + backend service on Render/Railway (Option B).
- **Decision:** Option 1 (Render/Railway monorepo hosting).
- **Reasoning:** Minimizes cross-origin resource sharing (CORS) complexity, keeps all code under a single build pipeline, simplifies static route asset delivery by running a unified Express build, and fits the strict 2-day timeline perfectly.

### DECISION-004: UI Styling Framework
- **Context:** Select a styling strategy for rapid, responsive UI build.
- **Options Considered:**
  1. Vanilla CSS custom sheets.
  2. Tailwind CSS utility classes.
- **Decision:** Option 2 (Tailwind CSS).
- **Reasoning:** Accelerates UI building, facilitates structured dark glassmorphism effects, ensures responsive mobile-friendly layouts, and reduces boilerplate code.

### DECISION-005: Frontend Routing & Layout Structure
- **Context:** Structure routing and view organization for the dashboard, group management, and CSV importer.
- **Options Considered:**
  1. Single massive dashboard view containing all modals and conditional renders.
  2. Multi-route SPA using React Router v6 with explicit pages (Dashboard, Groups, Importer, Profile).
- **Decision:** Option 2 (Multi-route SPA).
- **Reasoning:** Better separation of concerns, simplifies CSV importer walkthrough and report preview, separates overall balance summaries from group-level operations, and tracks membership timelines cleanly.

### DECISION-006: Serverless Monorepo Deployment on Vercel
- **Context:** Deploying the monorepo to production with static assets and API routing.
- **Options Considered:**
  1. Render/Railway VM hosting (as originally planned).
  2. Vercel Serverless Function (Express monolith mapped to `/api/*`) + CDN static hosting.
- **Decision:** Option 2 (Vercel Serverless Deployment).
- **Reasoning:** Vercel offers high-speed global static asset caching and frictionless deployment pipelines. By wrapping Express under a single monolithic handler file (`api/index.js`) and using a `vercel.json` rewrite rule, we avoid CORS issues and VM hosting costs while matching the timeline perfectly.

### DECISION-007: Real-Time Chat using Client-Side Short Polling
- **Context:** Implement user chat within an expense with real-time sync, restricted to relational databases only.
- **Options Considered:**
  1. WebSockets/Socket.io (Stateful sockets).
  2. Server-Sent Events (SSE).
  3. Client-side Short Polling (HTTP request every 3 seconds).
- **Decision:** Option 3 (Client-side Short Polling against PostgreSQL tables).
- **Reasoning:** Since Vercel Serverless Functions are ephemeral and stateless, they cannot maintain persistent long-lived TCP sockets (WebSockets) or connections. Client-side short polling queries a relational database table (`expense_comments`) via stateless REST API endpoints, matching our deployment runtime constraints and fulfilling the user's relational database criteria without stateful servers or Redis messaging brokers.

### DECISION-008: Decoupling Database Migrations from Serverless Cold Starts
- **Context:** Database migrations were originally run asynchronously inside the Express startup sequence.
- **Options Considered:**
  1. Keep running migrations asynchronously at the module level on startup.
  2. Comment out runtime startup migrations and execute them via manual CLI commands or Vercel build phase scripts.
- **Decision:** Option 2 (Decoupling migrations).
- **Reasoning:** In Vercel serverless environments, module-level background promises can be frozen mid-execution as soon as the initial request returns, causing incomplete table structures. Concurrent container launches under load also cause race conditions where multiple instances attempt migrations, causing table lockups. Running migrations manually via `npm run migrate` or in deployment pipelines ensures transaction safety.
