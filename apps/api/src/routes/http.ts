import type { ActionRequest, CreateRoomRequest, JoinRoomRequest, StartGameRequest } from "@incident/shared";
import { createRoomCode } from "../domain/ids";
import { json, parseJson } from "../infra/json";

export interface Env {
  GAME_ROOM: DurableObjectNamespace;
}

function roomStubFromCode(env: Env, roomCode: string): DurableObjectStub {
  const id = env.GAME_ROOM.idFromName(roomCode);
  return env.GAME_ROOM.get(id);
}

export async function handleHttp(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method === "GET" && path === "/api/health") {
    return json({ ok: true, now: new Date().toISOString() });
  }

  if (request.method === "POST" && path === "/api/rooms") {
    const body = await parseJson<CreateRoomRequest>(request);
    const roomCode = createRoomCode();
    const stub = roomStubFromCode(env, roomCode);

    const initResp = await stub.fetch("https://room/init", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-room-code": roomCode,
      },
      body: JSON.stringify(body),
    });

    const payload = (await initResp.json()) as {
      gmPlayerId: string;
      gmSecret: string;
      state: unknown;
    };

    return json({
      roomCode,
      joinUrl: `/room/${roomCode}`,
      gmPlayerId: payload.gmPlayerId,
      gmSecret: payload.gmSecret,
      state: payload.state,
    });
  }

  const roomMatch = path.match(/^\/api\/rooms\/([^/]+)(?:\/(join|start|action|state|events))?$/);
  if (!roomMatch) {
    return json({ error: "Not found" }, 404);
  }

  const roomCode = decodeURIComponent(roomMatch[1]);
  const action = roomMatch[2] ?? "state";
  const stub = roomStubFromCode(env, roomCode);

  if (request.method === "POST" && action === "join") {
    const body = await parseJson<JoinRoomRequest>(request);
    return stub.fetch("https://room/join", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  if (request.method === "POST" && action === "start") {
    const body = await parseJson<StartGameRequest>(request);
    return stub.fetch("https://room/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  if (request.method === "POST" && action === "action") {
    const body = await parseJson<ActionRequest>(request);
    return stub.fetch("https://room/action", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  if (request.method === "GET" && action === "state") {
    return stub.fetch("https://room/state");
  }

  if (request.method === "GET" && action === "events") {
    const playerId = url.searchParams.get("playerId");
    const target = new URL("https://room/events");
    if (playerId) {
      target.searchParams.set("playerId", playerId);
    }
    return stub.fetch(target.toString());
  }

  return json({ error: "Not found" }, 404);
}
