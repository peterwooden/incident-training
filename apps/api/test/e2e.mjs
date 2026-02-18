import { spawn } from "node:child_process";

const BASE_URL = "http://127.0.0.1:8787";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealth() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const resp = await fetch(`${BASE_URL}/api/health`);
      if (resp.ok) {
        return;
      }
    } catch {
      // retry
    }
    await sleep(500);
  }
  throw new Error("API did not become healthy");
}

async function run() {
  const cwd = new URL("..", import.meta.url);
  const proc = spawn("npx", ["wrangler", "dev", "src/index.ts", "--local", "--port", "8787"], {
    cwd,
    stdio: "pipe",
    env: {
      ...process.env,
      HOME: cwd.pathname,
    },
  });

  proc.stdout.on("data", () => {});
  proc.stderr.on("data", () => {});

  try {
    await waitForHealth();

    const createResp = await fetch(`${BASE_URL}/api/rooms`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ gmName: "GM", mode: "bomb-defusal" }),
    });
    if (!createResp.ok) throw new Error(`create room failed: ${createResp.status}`);
    const created = await createResp.json();
    const roomCode = created.roomCode;

    const joinResp = await fetch(`${BASE_URL}/api/rooms/${encodeURIComponent(roomCode)}/join`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Alice", preferredRole: "Safety Officer" }),
    });
    if (!joinResp.ok) throw new Error(`join room failed: ${joinResp.status}`);
    const joined = await joinResp.json();

    const startResp = await fetch(`${BASE_URL}/api/rooms/${encodeURIComponent(roomCode)}/start`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ gmSecret: created.gmSecret, forceStart: true }),
    });
    if (!startResp.ok) throw new Error(`start room failed: ${startResp.status}`);

    const eventResp = await fetch(
      `${BASE_URL}/api/rooms/${encodeURIComponent(roomCode)}/events?playerId=${encodeURIComponent(joined.playerId)}`,
    );
    if (!eventResp.ok || !eventResp.body) throw new Error("failed to open SSE stream");

    const reader = eventResp.body.getReader();
    const firstChunk = await reader.read();
    if (firstChunk.done) throw new Error("SSE stream closed unexpectedly");

    const actionResp = await fetch(`${BASE_URL}/api/rooms/${encodeURIComponent(roomCode)}/action`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        playerId: joined.playerId,
        actionType: "bomb_stabilize_panel",
        panelId: "safety_telemetry",
      }),
    });
    if (!actionResp.ok) throw new Error(`action failed: ${actionResp.status}`);

    const stateResp = await fetch(
      `${BASE_URL}/api/rooms/${encodeURIComponent(roomCode)}/state?playerId=${encodeURIComponent(joined.playerId)}`,
    );
    const statePayload = await stateResp.json();
    if (statePayload.state.mode !== "bomb-defusal") {
      throw new Error("expected bomb-defusal mode");
    }
    if (!statePayload.state.panelDeck) {
      throw new Error("expected panel deck in room view");
    }

    console.log("E2E passed");
    reader.cancel();
  } finally {
    proc.kill("SIGTERM");
    await sleep(500);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
