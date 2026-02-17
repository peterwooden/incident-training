import type {
  ActionRequest,
  CreateRoomRequest,
  JoinRoomRequest,
  RoomState,
  StartGameRequest,
} from "@incident/shared";

export async function createRoom(body: CreateRoomRequest) {
  const resp = await fetch("/api/rooms", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`Create room failed: ${resp.status}`);
  return resp.json() as Promise<{
    roomCode: string;
    joinUrl: string;
    gmPlayerId: string;
    gmSecret: string;
    state: RoomState;
  }>;
}

export async function joinRoom(roomCode: string, body: JoinRoomRequest) {
  const resp = await fetch(`/api/rooms/${encodeURIComponent(roomCode)}/join`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`Join room failed: ${resp.status}`);
  return resp.json() as Promise<{ playerId: string; state: RoomState }>;
}

export async function startRoom(roomCode: string, body: StartGameRequest) {
  const resp = await fetch(`/api/rooms/${encodeURIComponent(roomCode)}/start`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`Start room failed: ${resp.status}`);
  return resp.json() as Promise<{ state: RoomState }>;
}

export async function sendAction(roomCode: string, body: ActionRequest) {
  const resp = await fetch(`/api/rooms/${encodeURIComponent(roomCode)}/action`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`Action failed: ${resp.status}`);
  return resp.json() as Promise<{ state: RoomState }>;
}

export function subscribeToRoom(roomCode: string, playerId: string, onState: (state: RoomState) => void) {
  const eventSource = new EventSource(
    `/api/rooms/${encodeURIComponent(roomCode)}/events?playerId=${encodeURIComponent(playerId)}`,
  );

  eventSource.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data) as { type: string; state?: RoomState };
      if (payload.type === "snapshot" && payload.state) {
        onState(payload.state);
      }
    } catch {
      // ignore malformed events
    }
  };

  return () => eventSource.close();
}
