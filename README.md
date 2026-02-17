# Incident Training RPG (Cloudflare)

Multiplayer incident-management training game for SaaS teams. A game master creates a room, shares a join code, and players coordinate roles/actions under pressure.

## Stack

- Backend: Cloudflare Workers + Durable Objects + SSE
- Frontend: React (Vite) intended for Cloudflare Pages
- Shared contracts: TypeScript package for game/API types

## Architecture

- `packages/shared`: interface-first contracts (`RoomState`, actions, modes, requests).
- `apps/api`: Worker API and `GameRoomDurableObject` room aggregate.
- `apps/web`: React UI; includes Pages function proxy `functions/api/[[path]].ts`.

### Core design

- One Durable Object per room code (`idFromName(roomCode)`) for strong, single-room consistency.
- Strategy interface (`GameModeEngine`) for extensible game modes.
- SSE fanout per room for low-latency state updates.
- Alarm-driven scenario progression for pressure/timed injects.

## Game modes

- `sev-escalation`: trains ordered SEV response execution.
- `comms-crisis`: trains comms alignment and update discipline.

## Local development

Install:

```bash
npm install
```

Run API:

```bash
npm run dev:api
```

Run Web:

```bash
npm run dev:web
```

Open: `http://localhost:5173`

## Validation (executed)

Build:

```bash
npm run build
```

Unit tests:

```bash
npm run test
```

End-to-end local runtime test (spawns Wrangler dev, creates room, joins, starts, opens SSE, sends action, validates state transition):

```bash
npm run test:e2e
```

## API overview

- `POST /api/rooms` create room (`gmName`, `mode`)
- `POST /api/rooms/:code/join`
- `POST /api/rooms/:code/start`
- `POST /api/rooms/:code/action`
- `GET /api/rooms/:code/state`
- `GET /api/rooms/:code/events?playerId=...` (SSE)

## Cloudflare best-practice alignment

- Durable Objects are used as per-room authoritative state actors.
- Timed progression uses Durable Object alarms.
- Streaming updates use Worker streaming primitives (`text/event-stream`).
- Request router keeps edge entrypoint thin; domain behavior is in mode engines.

References:

- https://developers.cloudflare.com/durable-objects/
- https://developers.cloudflare.com/durable-objects/api/base/
- https://developers.cloudflare.com/durable-objects/api/alarms/
- https://developers.cloudflare.com/workers/runtime-apis/streams/
- https://developers.cloudflare.com/workers/examples/server-sent-events/
- https://developers.cloudflare.com/workers/reference/how-workers-works/
