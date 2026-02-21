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
    if (!created.joinUrl?.endsWith(`/join/${roomCode}`)) {
      throw new Error("expected joinUrl to use /join/:roomCode");
    }

    const joinResp = await fetch(`${BASE_URL}/api/rooms/${encodeURIComponent(roomCode)}/join`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Alice", preferredRole: "Device Specialist" }),
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
        actionType: "bomb_stabilize_widget",
        widgetId: "device_console",
      }),
    });
    if (!actionResp.ok) throw new Error(`action failed: ${actionResp.status}`);

    const gmFsmResp = await fetch(`${BASE_URL}/api/rooms/${encodeURIComponent(roomCode)}/action`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        playerId: created.gmPlayerId,
        actionType: "gm_fsm_transition",
        widgetId: "fsm_editor",
        payload: { transitionId: "bomb-stage:symbols" },
      }),
    });
    if (!gmFsmResp.ok) throw new Error(`gm fsm action failed: ${gmFsmResp.status}`);

    const stateResp = await fetch(
      `${BASE_URL}/api/rooms/${encodeURIComponent(roomCode)}/state?playerId=${encodeURIComponent(joined.playerId)}`,
    );
    const statePayload = await stateResp.json();
    if (statePayload.state.mode !== "bomb-defusal") {
      throw new Error("expected bomb-defusal mode");
    }
    if (!statePayload.state.widgetDeck) {
      throw new Error("expected panel deck in room view");
    }
    const devicePanel = statePayload.state.widgetDeck.widgetsById.device_console;
    if (!devicePanel?.payload?.stageId) {
      throw new Error("expected staged bomb payload in device panel");
    }
    if (devicePanel.payload.stageId !== "symbols") {
      throw new Error("expected GM FSM transition to switch to symbols stage");
    }

    const createBushfireResp = await fetch(`${BASE_URL}/api/rooms`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ gmName: "GM Bushfire", mode: "bushfire-command" }),
    });
    if (!createBushfireResp.ok) throw new Error(`create bushfire room failed: ${createBushfireResp.status}`);
    const bushfireCreated = await createBushfireResp.json();
    const bushfireCode = bushfireCreated.roomCode;

    const joinBushfire = async (name, preferredRole) => {
      const resp = await fetch(`${BASE_URL}/api/rooms/${encodeURIComponent(bushfireCode)}/join`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, preferredRole }),
      });
      if (!resp.ok) throw new Error(`bushfire join failed (${name}): ${resp.status}`);
      return resp.json();
    };

    const firePlayer = await joinBushfire("Fire", "Fire Operations SME");
    const policePlayer = await joinBushfire("Police", "Police Operations SME");
    const radioPlayer = await joinBushfire("Radio", "Public Information Officer");

    const blockedStartResp = await fetch(`${BASE_URL}/api/rooms/${encodeURIComponent(bushfireCode)}/start`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ gmSecret: bushfireCreated.gmSecret, forceStart: false }),
    });
    if (blockedStartResp.status !== 409) {
      throw new Error(`expected missing-role start block, got ${blockedStartResp.status}`);
    }
    const blockedPayload = await blockedStartResp.json();
    if (!Array.isArray(blockedPayload.missingRoles) || !blockedPayload.missingRoles.includes("Meteorologist")) {
      throw new Error("expected Meteorologist in missing role list");
    }

    const weatherPlayer = await joinBushfire("Weather", "Meteorologist");

    const startBushfireResp = await fetch(`${BASE_URL}/api/rooms/${encodeURIComponent(bushfireCode)}/start`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ gmSecret: bushfireCreated.gmSecret, forceStart: false }),
    });
    if (!startBushfireResp.ok) throw new Error(`bushfire start failed: ${startBushfireResp.status}`);

    const gmBushfireStateResp = await fetch(
      `${BASE_URL}/api/rooms/${encodeURIComponent(bushfireCode)}/state?playerId=${encodeURIComponent(bushfireCreated.gmPlayerId)}`,
    );
    if (!gmBushfireStateResp.ok) throw new Error("failed to fetch bushfire gm state");
    const gmBushfireState = await gmBushfireStateResp.json();
    const promptDeck = gmBushfireState.state.widgetDeck?.widgetsById?.gm_prompt_deck?.payload;
    if (!promptDeck?.releasableCardIds?.length) {
      throw new Error("expected releasable prompt cards for GM");
    }

    const cardId = promptDeck.releasableCardIds[0];
    const releaseResp = await fetch(`${BASE_URL}/api/rooms/${encodeURIComponent(bushfireCode)}/action`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        playerId: bushfireCreated.gmPlayerId,
        actionType: "gm_release_prompt",
        widgetId: "gm_prompt_deck",
        payload: { cardId },
      }),
    });
    if (!releaseResp.ok) throw new Error(`prompt release failed: ${releaseResp.status}`);

    const weatherStateResp = await fetch(
      `${BASE_URL}/api/rooms/${encodeURIComponent(bushfireCode)}/state?playerId=${encodeURIComponent(weatherPlayer.playerId)}`,
    );
    const weatherState = await weatherStateResp.json();
    const weatherPrompts = weatherState.state.widgetDeck?.widgetsById?.role_briefing?.payload?.prompts ?? [];

    const fireStateResp = await fetch(
      `${BASE_URL}/api/rooms/${encodeURIComponent(bushfireCode)}/state?playerId=${encodeURIComponent(firePlayer.playerId)}`,
    );
    const fireState = await fireStateResp.json();
    const firePrompts = fireState.state.widgetDeck?.widgetsById?.role_briefing?.payload?.prompts ?? [];

    const radioStateResp = await fetch(
      `${BASE_URL}/api/rooms/${encodeURIComponent(bushfireCode)}/state?playerId=${encodeURIComponent(radioPlayer.playerId)}`,
    );
    const radioState = await radioStateResp.json();
    const radioPrompts = radioState.state.widgetDeck?.widgetsById?.role_briefing?.payload?.prompts ?? [];

    const visibleCount =
      [weatherPrompts, firePrompts, radioPrompts]
        .map((list) => list.some((prompt) => prompt.id === cardId))
        .filter(Boolean)
        .length;
    if (visibleCount !== 1) {
      throw new Error("expected released prompt to be private to exactly one role panel");
    }

    const phase4Resp = await fetch(`${BASE_URL}/api/rooms/${encodeURIComponent(bushfireCode)}/action`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        playerId: bushfireCreated.gmPlayerId,
        actionType: "gm_fsm_transition",
        widgetId: "fsm_editor",
        payload: { transitionId: "bushfire-phase:phase_4_catastrophe" },
      }),
    });
    if (!phase4Resp.ok) throw new Error(`phase transition failed: ${phase4Resp.status}`);

    const terminalResp = await fetch(`${BASE_URL}/api/rooms/${encodeURIComponent(bushfireCode)}/action`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        playerId: bushfireCreated.gmPlayerId,
        actionType: "gm_fsm_transition",
        widgetId: "fsm_editor",
        payload: { transitionId: "bushfire-state:terminal_failed" },
      }),
    });
    if (!terminalResp.ok) throw new Error(`terminal transition failed: ${terminalResp.status}`);

    const terminalStateResp = await fetch(
      `${BASE_URL}/api/rooms/${encodeURIComponent(bushfireCode)}/state?playerId=${encodeURIComponent(policePlayer.playerId)}`,
    );
    const terminalState = await terminalStateResp.json();
    if (terminalState.state.status !== "failed") {
      throw new Error("expected bushfire scenario terminal failure state");
    }

    const gmTerminalStateResp = await fetch(
      `${BASE_URL}/api/rooms/${encodeURIComponent(bushfireCode)}/state?playerId=${encodeURIComponent(bushfireCreated.gmPlayerId)}`,
    );
    const gmTerminalState = await gmTerminalStateResp.json();
    const currentNodeId = gmTerminalState.state.widgetDeck?.widgetsById?.fsm_editor?.payload?.currentNodeId;
    if (currentNodeId !== "terminal_failed") {
      throw new Error("expected FSM current node terminal_failed for GM view");
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
