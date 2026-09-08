# Mera Area

Mera Area is a local-language community problem-solving app for India where neighbors ask questions, share help, and build stronger localities.

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

- `artifacts/mera-area-mobile/app/index.tsx` — mobile screens and interaction shell
- `artifacts/mera-area-mobile/context/AppContext.tsx` — seeded demo data, AsyncStorage persistence, and product actions
- `artifacts/mera-area-mobile/constants/colors.ts` — Mera Area light and dark theme tokens
- `artifacts/mera-area-mobile/supabase/` — production schema, RLS policies, and seed notes

## Architecture decisions

- The first mobile build is demo-first: it remains fully usable without Supabase credentials so stakeholders can test the core loop immediately.
- AsyncStorage is the local persistence adapter; the app boundary is designed to be replaced by Supabase Auth/Postgres/Storage without changing the screen-level experience.
- Locality is the primary community boundary for feed visibility and leaderboard context.
- Native image picker and microphone permissions are used for optional attachments instead of simulated upload controls.

## Product

Users can join in English or Hindi, browse locality posts, search by category, ask questions with optional media, answer neighbors, vote helpful, mark posts solved, earn points and badges, see a locality leaderboard, and report or block harmful content.

## User preferences

Keep the experience friendly, mobile-native, and useful even when optional backend configuration is missing.

## Gotchas

- `pnpm --filter @workspace/mera-area-mobile run typecheck` is the app verification command.
- Expo version checks may report newly published patch versions as too recent for the workspace's minimum release-age policy; do not bypass that safety policy casually.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
