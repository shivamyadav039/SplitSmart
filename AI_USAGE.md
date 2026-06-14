# AI Usage Log

This file tracks the AI tools used, key prompts, and any errors caught during the implementation process.

## AI Tools Used
- **Primary Collaborator:** Antigravity (powered by Gemini 3.5 Flash / Medium)
- **IDE Environment:** Antigravity IDE

## AI Errors Caught
1. **ReferenceError: rowNumber is not defined**:
   - *Symptom:* The backend crashed during CSV parsing with `ReferenceError: rowNumber is not defined`.
   - *Cause:* In `anomaly.service.js`, the loop variable was declared as `rowNum` but returned inside the results object as `rowNumber`.
   - *Fix:* Renamed the loop variable to `rowNumber` so that references are aligned across both the service and scanner scopes.
2. **macOS Port 5000 Conflict (EADDRINUSE)**:
   - *Symptom:* The Node server crashed with `EADDRINUSE: address already in use :::5000`.
   - *Cause:* macOS Control Center binds to port 5000 by default (AirPlay Receiver).
   - *Fix:* Relocated the server configuration to port 5001 across `.env`, the Axios endpoint definitions in `api.js`, and the verification scripts.

