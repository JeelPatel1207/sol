You are building "Solar Monitor", a private solar plant monitoring PWA for family and friends
(max 20 users). Read README.md, ARCHITECTURE.md, DATABASE.sql, API_SPEC.md, SCREENS.md,
COLLECTOR.md and PHASES.md first. They are the source of truth.

Stack: Node.js 20 + Express, PostgreSQL (pg), node-cron, bcrypt, jsonwebtoken, zod for validation;
frontend React + Vite + Recharts + vite-plugin-pwa. Plain JavaScript (no TypeScript).

Rules:
1. Work on ONE phase at a time (I will tell you which). Do not build later phases.
2. Keep files small (<200 lines), one job per file, follow the folder structure in ARCHITECTURE.md.
3. Do not change the DB schema or API shape without asking me.
4. Secrets only from .env. Never log passwords, tokens or vendor credentials.
5. Every collector returns the normalized reading from ARCHITECTURE.md.
6. Validate all input. Use parameterized SQL only. Hash passwords with bcrypt.
7. After coding, tell me exactly how to run it and how to test it (commands), and list any
   assumptions. If something is unclear, ask me before guessing.
8. Store time in UTC, display in Asia/Kolkata. Mobile first UI, light and dark mode.
