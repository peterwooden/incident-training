# Incident Training RPG (Cloudflare)

Consumer-grade multiplayer simulation platform for role-based incident exercises.

## What changed

- Formal **Scene Panel** architecture with role-gated visibility.
- Two scenarios with panelized gameplay:
  - `bomb-defusal`
  - `bushfire-command`
- GM controls:
  - role finalization
  - panel grant/revoke
  - panel lock/unlock
  - role simulation view
- Debrief logging and replay metrics.
- Cinematic React UI using SVG + Canvas effects with optional audio cues.

## Stack

- Backend: Cloudflare Workers + Durable Objects + SSE
- Frontend: React + Vite (Cloudflare Pages compatible)
- Shared contracts: TypeScript package (`packages/shared`)

## Scene Panel model

Each mode exposes a panel registry. Panels are `shared`, `role-scoped`, or `gm-only`.

- Players see a role-based subset (with GM runtime overrides).
- GM sees all panels and can simulate role perspective.
- All action authorization is enforced server-side by panel access + lock state.

## API

- `POST /api/rooms`
- `POST /api/rooms/:code/join`
- `POST /api/rooms/:code/start`
- `POST /api/rooms/:code/action`
- `POST /api/rooms/:code/roles/assign`
- `POST /api/rooms/:code/panels/access`
- `POST /api/rooms/:code/panels/lock`
- `POST /api/rooms/:code/gm/simulate-role`
- `GET /api/rooms/:code/state?playerId=...`
- `GET /api/rooms/:code/events?playerId=...` (SSE)

## Local run

```bash
npm install
npm run dev:api
npm run dev:web
```

Open: `http://127.0.0.1:5173/`

## Validation

```bash
npm run build
npm run test
npm run test:e2e
```
