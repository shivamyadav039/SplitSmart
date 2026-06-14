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
