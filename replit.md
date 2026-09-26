# Resume Screener

Resume Screener is a local-first screening desk that compares a role brief with plain-text resumes and explains the fit signal without uploading candidate documents.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/resume-screener/src/App.tsx` — the complete local screening flow and results UI
- `artifacts/resume-screener/src/index.css` — visual theme, typography, motion, and responsive styles
- `artifacts/resume-screener/index.html` — page metadata and social sharing metadata
- `artifacts/resume-screener/public/` — favicon and crawler rules
- `artifacts/resume-screener/.replit-artifact/artifact.toml` — artifact routing and production serve settings

## Architecture decisions

- The first release is frontend-only and runs screening in the browser; no candidate documents leave the device.
- Fit is an advisory signal based on overlap between role signals and redacted resume text, not an automated hiring decision.
- The upload surface accepts plain text and Markdown only until a browser-safe PDF/DOCX parser is added.
- The fairness boundary is explicit: first-line names, email addresses, phone numbers, and common identity terms are removed before matching.

## Product

- Paste a job description and add multiple plain-text or Markdown resumes.
- Run a local screening pass and review ranked fit scores, matched signals, gaps to explore, and rationale.
- Load a sample desk, expand the fairness explanation, remove files, and export screening notes as JSON.

## User preferences

- The user wants this project ready to publish online.

## Gotchas

- Use the artifact workflow for preview; the Vite config requires `PORT` and `BASE_PATH`, which are supplied by that workflow.
- PDF and DOCX are not parsed in the current browser-only release; the UI intentionally tells users to convert them to text first.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
