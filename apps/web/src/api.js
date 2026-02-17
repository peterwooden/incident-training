export async function createRoom(body) {
    const resp = await fetch("/api/rooms", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!resp.ok)
        throw new Error(`Create room failed: ${resp.status}`);
    return resp.json();
}
export async function joinRoom(roomCode, body) {
    const resp = await fetch(`/api/rooms/${encodeURIComponent(roomCode)}/join`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!resp.ok)
        throw new Error(`Join room failed: ${resp.status}`);
    return resp.json();
}
export async function startRoom(roomCode, body) {
    const resp = await fetch(`/api/rooms/${encodeURIComponent(roomCode)}/start`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!resp.ok)
        throw new Error(`Start room failed: ${resp.status}`);
    return resp.json();
}
export async function sendAction(roomCode, body) {
    const resp = await fetch(`/api/rooms/${encodeURIComponent(roomCode)}/action`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!resp.ok)
        throw new Error(`Action failed: ${resp.status}`);
    return resp.json();
}
export function subscribeToRoom(roomCode, playerId, onState) {
    const eventSource = new EventSource(`/api/rooms/${encodeURIComponent(roomCode)}/events?playerId=${encodeURIComponent(playerId)}`);
    eventSource.onmessage = (event) => {
        try {
            const payload = JSON.parse(event.data);
            if (payload.type === "snapshot" && payload.state) {
                onState(payload.state);
            }
        }
        catch {
            // ignore malformed events
        }
    };
    return () => eventSource.close();
}
