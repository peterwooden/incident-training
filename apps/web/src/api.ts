import type {
  ActionRequest,
  AssignRoleRequest,
  CreateRoomRequest,
  IncidentRole,
  JoinRoomRequest,
  RoomView,
  SetGmSimulatedRoleRequest,
  SetWidgetAccessRequest,
  SetWidgetLockRequest,
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
    state: RoomView;
    roleOptions: IncidentRole[];
  }>;
}

export async function joinRoom(roomCode: string, body: JoinRoomRequest) {
  const resp = await fetch(`/api/rooms/${encodeURIComponent(roomCode)}/join`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`Join room failed: ${resp.status}`);
  return resp.json() as Promise<{ playerId: string; state: RoomView; roleOptions: IncidentRole[] }>;
}

export async function startRoom(roomCode: string, body: StartGameRequest) {
  const resp = await fetch(`/api/rooms/${encodeURIComponent(roomCode)}/start`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const details = await resp.text();
    throw new Error(`Start room failed: ${resp.status} ${details}`);
  }
  return resp.json() as Promise<{ state: RoomView }>;
}

export async function sendAction(roomCode: string, body: ActionRequest) {
  const resp = await fetch(`/api/rooms/${encodeURIComponent(roomCode)}/action`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`Action failed: ${resp.status}`);
  return resp.json() as Promise<{ state: RoomView }>;
}

export async function assignRole(roomCode: string, body: AssignRoleRequest) {
  const resp = await fetch(`/api/rooms/${encodeURIComponent(roomCode)}/roles/assign`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`Assign role failed: ${resp.status}`);
  return resp.json() as Promise<{ state: RoomView }>;
}

export async function setWidgetAccess(roomCode: string, body: SetWidgetAccessRequest) {
  const resp = await fetch(`/api/rooms/${encodeURIComponent(roomCode)}/widgets/access`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`Set widget access failed: ${resp.status}`);
  return resp.json() as Promise<{ state: RoomView }>;
}

export async function setWidgetLock(roomCode: string, body: SetWidgetLockRequest) {
  const resp = await fetch(`/api/rooms/${encodeURIComponent(roomCode)}/widgets/lock`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`Set widget lock failed: ${resp.status}`);
  return resp.json() as Promise<{ state: RoomView }>;
}

export async function setGmSimulatedRole(roomCode: string, body: SetGmSimulatedRoleRequest) {
  const resp = await fetch(`/api/rooms/${encodeURIComponent(roomCode)}/gm/simulate-role`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`Set GM simulation failed: ${resp.status}`);
  return resp.json() as Promise<{ state: RoomView }>;
}

export function subscribeToRoom(roomCode: string, playerId: string, onState: (state: RoomView) => void) {
  const eventSource = new EventSource(
    `/api/rooms/${encodeURIComponent(roomCode)}/events?playerId=${encodeURIComponent(playerId)}`,
  );

  eventSource.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data) as { type: string; state?: RoomView };
      if (payload.type === "snapshot" && payload.state) {
        onState(payload.state);
      }
    } catch {
      // ignore malformed events
    }
  };

  return () => eventSource.close();
}
