# AGENTS.md

Repo-local rules for coding agents working on **StarNav** (product version **1.0.5**).

## What this project is

- Private-deployable personal navigation app: **Vue 3 + Express + SQLite**
- **Single process**: `server.ts` (via `tsx`) serves `/api/**`, static `dist/`, and SPA fallback
- **Not** a multi-service monorepo; do not split deployables or introduce an ORM without an explicit human decision

## Source layout

```text
src/web/       # SPA (Vite / Vue)
src/server/    # Express routes, controllers, services, tools
src/shared/    # Shared types, constants, pure helpers
server.ts      # Process entry
docker/        # Dockerfile, compose, entrypoint
docs/          # Living docs — start at docs/README.md
tests/         # Vitest suites (server|web|shared|extension|tools|integration|smoke; setup/shims at root)
clients/extension/  # Separate client; common JS synced from src/shared
scripts/       # docker|extension|openapi|release|quality
```

Path aliases: `@/*` → `src/web/*`, `@common/*` → `src/shared/*`.

## Architecture defaults

- Controllers stay thin; business logic lives in `src/server/services/**` (domain folders: bookmark, cache, database, identity, system, tools)
- Services return domain data / throw errors; HTTP envelope is assembled at controller/responder layer
- Prefer domain service imports over any reintroduced Manager facades
- Shared contracts: `src/shared/types` + `src/shared/api.ts`; SPA re-exports via `@/types`
- Backend TS uses **NodeNext** + `.js` extensions in relative imports (`tsconfig.server.json`); frontend uses bundler + `vue-tsc` (`tsconfig.json`)
- Keep `audit:prod` at **0** when changing dependencies

## Do not

- Split into multi-service / monorepo packages / greenfield rewrite
- Swap SQLite for another DB or add an ORM “for cleanliness”
- Change public API paths unless documenting deprecation
- Commit secrets or machine-specific local paths
- Reintroduce deleted facades (`BookmarkManager`, `CategoryManager`, etc.)

## Session start

1. Read this file
2. Read `README.md` and `docs/README.md`; for the task, open the relevant doc (`ARCHITECTURE`, `DEVELOPMENT`, `API`, `OPERATIONS`, `RELEASE`, `CONTRIBUTING`)
3. Inspect nearby code/tests before abstracting

## Verification (pick the smallest sufficient set)

| Change type         | Run                                            |
| ------------------- | ---------------------------------------------- |
| Default code        | `npm run typecheck` and/or `npm run test:fast` |
| Server only         | `npm run typecheck:server`                     |
| Web only            | `npm run typecheck:web`                        |
| Deps / prod surface | `npm run audit:prod`                           |
| Docker delivery     | `npm run docker:smoke` (uses `docker/`)        |
| Release-ish         | `npm run release:dry-run` (heavy)              |

Commands of record:

- Dev API: `npm run serve` (`tsx server.ts`)
- Dev UI: `npm run dev`
- Build: `npm run build`

## Docs ownership

- Living docs under `docs/` only; do not revive deleted archive plans/requirements
- Large architecture/process changes → update `docs/ARCHITECTURE.md` / `docs/DEVELOPMENT.md` / `docs/CONTRIBUTING.md` as appropriate
- Version strings: `package.json` is source of truth; run `npm run versions:sync` after bumps
