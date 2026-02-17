# Incident Training RPG (Cloudflare)

Consumer-grade multiplayer simulation platform for incident-role training. Players coordinate in Slack while interacting with a role-specific game surface.

## Stack

- Backend: Cloudflare Workers + Durable Objects + SSE
- Frontend: React (Vite) for Cloudflare Pages
- Contracts: shared TypeScript package for mode/action/state interfaces

## Core experience

- Facilitator creates a room and shares a room code.
- Players join with scenario-specific roles.
- Communication happens out-of-band in Slack.
- Game UI provides role-specific operational surfaces only.

## Scenarios

- `bomb-defusal`
  - Asymmetric information between device and manual roles.
  - Interactive wire and symbol modules.
  - Time pressure, strike system, and stabilization actions.

- `bushfire-command`
  - Dynamic town map with progressive fire spread.
  - Fire, police, and public-information command actions.
  - Containment vs anxiety balancing under timer pressure.

## Architecture

- `packages/shared`
  - Interface-first domain model (room lifecycle, actions, scenario state/view).
- `apps/api`
  - Durable Object room aggregate.
  - Open/closed mode engine plugins (`GameModeEngine`) for scenario behavior.
  - Alarm-driven simulation ticks and SSE fanout.
- `apps/web`
  - Scenario-rich UI with mode-specific components.
  - Pages proxy function for `/api` passthrough.

### Design principles

- One DO per room (`idFromName(roomCode)`) for strong consistency.
- Engine registry isolates scenario logic from room orchestration.
- Role-scoped scenario views enforce communication asymmetry.
- Core room actor remains stable while new scenarios can be added via plugin.

## Local development

Install:

```bash
npm install
```

Run API:

```bash
npm run dev:api
```

Run web app:

```bash
npm run dev:web
```

Open: `http://127.0.0.1:5173/`

## Validation

Build:

```bash
npm run build
```

Tests:

```bash
npm run test
```

E2E (spawns local Wrangler dev, creates room, joins, starts, opens SSE, performs action):

```bash
npm run test:e2e
```

## API summary

- `POST /api/rooms` (`gmName`, `mode`)
- `POST /api/rooms/:code/join`
- `POST /api/rooms/:code/start`
- `POST /api/rooms/:code/action`
- `GET /api/rooms/:code/state?playerId=...`
- `GET /api/rooms/:code/events?playerId=...` (SSE)

## Cloudflare references

- https://developers.cloudflare.com/durable-objects/
- https://developers.cloudflare.com/durable-objects/api/base/
- https://developers.cloudflare.com/durable-objects/api/alarms/
- https://developers.cloudflare.com/workers/runtime-apis/streams/
- https://developers.cloudflare.com/workers/examples/server-sent-events/
