import { describe, expect, it } from "vitest";
import type { IncidentRole, RoomState } from "@incident/shared";
import { ROOM_SCHEMA_VERSION } from "@incident/shared";
import { createSeededRandom, snapshotCursor } from "../src/domain/rng";
import { requiredRolesForMode } from "../src/domain/roles";
import { BombDefusalMode } from "../src/engine/bombDefusalMode";
import { BushfireCommandMode } from "../src/engine/bushfireCommandMode";
import type { ModeMutation } from "../src/engine/types";

function baseState(mode: RoomState["mode"], role: IncidentRole): RoomState {
  const engine = mode === "bomb-defusal" ? new BombDefusalMode() : new BushfireCommandMode();
  const rng = createSeededRandom(12345, 0);
  return {
    schemaVersion: ROOM_SCHEMA_VERSION,
    roomCode: "AAA-BBB",
    mode,
    status: "running",
    createdAtEpochMs: Date.now(),
    startedAtEpochMs: Date.now(),
    pressure: 20,
    score: 0,
    players: [{ id: "p1", name: "One", role, isGameMaster: false }],
    objectives: engine.initObjectives(rng),
    timeline: [],
    publicSummary: engine.initSummary(),
    scenario: engine.initScenario(rng),
    panelState: {
      accessGrants: { p1: engine.getDefaultAccessTemplate(role) },
      panelLocks: {},
    },
    debriefLog: [],
    seed: 12345,
    rngCursor: snapshotCursor(rng),
    gmSecret: "secret",
  };
}

function applyMutation(state: RoomState, mutation: ModeMutation): RoomState {
  const next: RoomState = { ...state };
  if (mutation.pressureDelta !== undefined) {
    next.pressure = Math.max(0, Math.min(100, next.pressure + mutation.pressureDelta));
  }
  if (mutation.scoreDelta !== undefined) {
    next.score = Math.max(0, next.score + mutation.scoreDelta);
  }
  if (mutation.summary) {
    next.publicSummary = mutation.summary;
  }
  if (mutation.markObjectiveIdsComplete?.length) {
    const completed = new Set(mutation.markObjectiveIdsComplete);
    next.objectives = next.objectives.map((objective) =>
      completed.has(objective.id) ? { ...objective, completed: true } : objective,
    );
  }
  if (mutation.timelineAdds?.length) {
    next.timeline = [...next.timeline, ...mutation.timelineAdds];
  }
  if (mutation.replaceScenario) {
    next.scenario = mutation.replaceScenario;
  }
  if (mutation.status) {
    next.status = mutation.status;
  }
  return next;
}

describe("BombDefusalMode", () => {
  it("decrements timer on tick", () => {
    const mode = new BombDefusalMode();
    const state = baseState("bomb-defusal", "Device Specialist");

    const before = state.scenario.type === "bomb-defusal" ? state.scenario.timerSec : 0;
    const mutation = mode.onTick(state, Date.now());
    const after = mutation.replaceScenario;

    expect(after?.type).toBe("bomb-defusal");
    if (after?.type === "bomb-defusal") {
      expect(after.timerSec).toBeLessThan(before);
    }
  });

  it("builds panel deck for manual analyst", () => {
    const mode = new BombDefusalMode();
    const state = baseState("bomb-defusal", "Manual Analyst");
    const deck = mode.buildPanelDeck({
      state,
      viewer: state.players[0],
      effectiveRole: "Manual Analyst",
      panelState: state.panelState,
      roleOptions: ["Lead Coordinator", "Manual Analyst", "Device Specialist", "Safety Officer", "Observer"],
      debriefMetrics: { executionAccuracy: 50, timingDiscipline: 50, communicationDiscipline: 50, overall: 50 },
    });

    expect(deck.availablePanelIds).toContain("manual_rulebook");
    expect(deck.availablePanelIds).not.toContain("device_console");
  });

  it("emits deterministic cinematic bomb payload", () => {
    const mode = new BombDefusalMode();
    const stateA = baseState("bomb-defusal", "Device Specialist");
    const stateB = baseState("bomb-defusal", "Device Specialist");

    const deckA = mode.buildPanelDeck({
      state: stateA,
      viewer: stateA.players[0],
      effectiveRole: "Device Specialist",
      panelState: stateA.panelState,
      roleOptions: ["Lead Coordinator", "Manual Analyst", "Device Specialist", "Safety Officer", "Observer"],
      debriefMetrics: { executionAccuracy: 50, timingDiscipline: 50, communicationDiscipline: 50, overall: 50 },
    });
    const deckB = mode.buildPanelDeck({
      state: stateB,
      viewer: stateB.players[0],
      effectiveRole: "Device Specialist",
      panelState: stateB.panelState,
      roleOptions: ["Lead Coordinator", "Manual Analyst", "Device Specialist", "Safety Officer", "Observer"],
      debriefMetrics: { executionAccuracy: 50, timingDiscipline: 50, communicationDiscipline: 50, overall: 50 },
    });

    const payloadA = deckA.panelsById.device_console?.payload;
    const payloadB = deckB.panelsById.device_console?.payload;

    expect(payloadA).toBeDefined();
    expect(payloadA && "components" in payloadA).toBe(true);
    expect(payloadA && "energyArcs" in payloadA).toBe(true);
    expect(payloadA && "interactionRegions" in payloadA).toBe(true);
    expect(JSON.stringify(payloadA)).toEqual(JSON.stringify(payloadB));
  });

  it("progresses deterministically through staged bomb gauntlet", () => {
    const mode = new BombDefusalMode();
    let state = baseState("bomb-defusal", "Device Specialist");
    let now = Date.now();

    if (state.scenario.type !== "bomb-defusal") {
      throw new Error("unexpected scenario");
    }
    const stageA = state.scenario;
    expect(stageA.stageId).toBe("wires");

    const criticalOrder = stageA.wires.filter((wire) => wire.isCritical).map((wire) => wire.id);
    for (const wireId of criticalOrder) {
      const mutation = mode.onAction(
        state,
        { type: "bomb_cut_wire", playerId: "p1", panelId: "device_console", payload: { wireId } },
        now,
      );
      state = applyMutation(state, mutation);
      now += 100;
    }

    if (state.scenario.type !== "bomb-defusal") {
      throw new Error("unexpected scenario after stage A");
    }
    expect(state.scenario.stageStatus).toBe("intermission");
    const intermissionA = state.scenario.intermissionUntilEpochMs ?? now;
    state = applyMutation(state, mode.onTick(state, intermissionA + 1));

    if (state.scenario.type !== "bomb-defusal") {
      throw new Error("unexpected scenario after transition A");
    }
    expect(state.scenario.stageId).toBe("symbols");
    const targetSymbols = [...state.scenario.symbolModule.targetSequence];
    for (const symbol of targetSymbols) {
      const mutation = mode.onAction(
        state,
        { type: "bomb_press_symbol", playerId: "p1", panelId: "device_console", payload: { symbol } },
        now,
      );
      state = applyMutation(state, mutation);
      now += 100;
    }

    if (state.scenario.type !== "bomb-defusal") {
      throw new Error("unexpected scenario after stage B");
    }
    expect(state.scenario.stageStatus).toBe("intermission");
    const intermissionB = state.scenario.intermissionUntilEpochMs ?? now;
    state = applyMutation(state, mode.onTick(state, intermissionB + 1));

    if (state.scenario.type !== "bomb-defusal") {
      throw new Error("unexpected scenario after transition B");
    }
    expect(state.scenario.stageId).toBe("memory");
    const cues = [...state.scenario.memoryModule.cues];
    cues.forEach((cue, index) => {
      const expected = String(((cue + index) % 4) + 1);
      const mutation = mode.onAction(
        state,
        { type: "bomb_press_symbol", playerId: "p1", panelId: "device_console", payload: { symbol: expected } },
        now,
      );
      state = applyMutation(state, mutation);
      now += 100;
    });

    expect(state.status).toBe("resolved");
    expect(state.objectives.every((objective) => objective.completed)).toBe(true);
    if (state.scenario.type === "bomb-defusal") {
      expect(state.scenario.completedStages).toEqual(["wires", "symbols", "memory"]);
      expect(state.scenario.status).toBe("defused");
    }
  });
});

describe("BushfireCommandMode", () => {
  it("requires meteorologist as a bushfire role gate", () => {
    const required = requiredRolesForMode("bushfire-command");
    expect(required).toContain("Meteorologist");
  });

  it("deploy action improves containment opportunity", () => {
    const mode = new BushfireCommandMode();
    const state = baseState("bushfire-command", "Fire Operations SME");
    const firstCell = state.scenario.type === "bushfire-command" ? state.scenario.cells[0] : undefined;

    const mutation = mode.onAction(
      state,
      {
        type: "bushfire_deploy_fire_crew",
        playerId: "p1",
        panelId: "fire_ops_console",
        payload: { cellId: firstCell?.id ?? "cell_1" },
      },
      Date.now(),
    );

    expect(mutation.scoreDelta).toBeGreaterThanOrEqual(0);
    expect(mutation.replaceScenario?.type).toBe("bushfire-command");
  });

  it("emits deterministic rich map payload", () => {
    const mode = new BushfireCommandMode();
    const stateA = baseState("bushfire-command", "Fire Operations SME");
    const stateB = baseState("bushfire-command", "Fire Operations SME");

    const deckA = mode.buildPanelDeck({
      state: stateA,
      viewer: stateA.players[0],
      effectiveRole: "Fire Operations SME",
      panelState: stateA.panelState,
      roleOptions: [
        "Incident Controller",
        "Fire Operations SME",
        "Police Operations SME",
        "Public Information Officer",
        "Meteorologist",
        "Observer",
      ],
      debriefMetrics: { executionAccuracy: 50, timingDiscipline: 50, communicationDiscipline: 50, overall: 50 },
    });
    const deckB = mode.buildPanelDeck({
      state: stateB,
      viewer: stateB.players[0],
      effectiveRole: "Fire Operations SME",
      panelState: stateB.panelState,
      roleOptions: [
        "Incident Controller",
        "Fire Operations SME",
        "Police Operations SME",
        "Public Information Officer",
        "Meteorologist",
        "Observer",
      ],
      debriefMetrics: { executionAccuracy: 50, timingDiscipline: 50, communicationDiscipline: 50, overall: 50 },
    });

    const payloadA = deckA.panelsById.town_map?.payload;
    const payloadB = deckB.panelsById.town_map?.payload;
    expect(payloadA).toBeDefined();
    expect(payloadA && "terrainLayers" in payloadA).toBe(true);
    expect(payloadA && "roadGraph" in payloadA).toBe(true);
    expect(payloadA && "fireFrontContours" in payloadA).toBe(true);
    expect(payloadA && "windField" in payloadA).toBe(true);
    expect(JSON.stringify(payloadA)).toEqual(JSON.stringify(payloadB));
  });

  it("keeps prompt deck deterministic by seed", () => {
    const mode = new BushfireCommandMode();
    const a = baseState("bushfire-command", "Meteorologist");
    const b = baseState("bushfire-command", "Meteorologist");
    if (a.scenario.type !== "bushfire-command" || b.scenario.type !== "bushfire-command") {
      throw new Error("unexpected scenario");
    }
    expect(a.scenario.promptDeck.map((card) => card.id)).toEqual(b.scenario.promptDeck.map((card) => card.id));
  });

  it("advances through all bushfire phases and ends in terminal failure", () => {
    const mode = new BushfireCommandMode();
    let state = baseState("bushfire-command", "Incident Controller");
    let now = Date.now();

    if (state.scenario.type !== "bushfire-command") {
      throw new Error("unexpected scenario");
    }
    expect(state.scenario.phaseId).toBe("phase_1_monitor");

    for (let i = 0; i < 12; i += 1) {
      state = applyMutation(state, mode.onTick(state, now));
      now += 15_000;
    }
    if (state.scenario.type !== "bushfire-command") {
      throw new Error("unexpected scenario");
    }
    expect(state.scenario.phaseId).toBe("phase_2_escalation");

    for (let i = 0; i < 16; i += 1) {
      state = applyMutation(state, mode.onTick(state, now));
      now += 15_000;
    }
    if (state.scenario.type !== "bushfire-command") {
      throw new Error("unexpected scenario");
    }
    expect(state.scenario.phaseId).toBe("phase_3_crisis");

    for (let i = 0; i < 16; i += 1) {
      state = applyMutation(state, mode.onTick(state, now));
      now += 15_000;
    }
    if (state.scenario.type !== "bushfire-command") {
      throw new Error("unexpected scenario");
    }
    expect(state.scenario.phaseId).toBe("phase_4_catastrophe");

    for (let i = 0; i < 8; i += 1) {
      state = applyMutation(state, mode.onTick(state, now));
      now += 15_000;
    }

    expect(state.status).toBe("failed");
    if (state.scenario.type === "bushfire-command") {
      expect(state.scenario.phaseId).toBe("terminal_failed");
      expect(state.scenario.timerSec).toBe(0);
    }
  });

  it("releases prompts for the target role and keeps other roles isolated", () => {
    const mode = new BushfireCommandMode();
    const base = baseState("bushfire-command", "Incident Controller");
    const gm = { id: "gm", name: "GM", role: "Incident Controller" as const, isGameMaster: true };
    const met = { id: "met", name: "Met", role: "Meteorologist" as const, isGameMaster: false };
    const fire = { id: "fire", name: "Fire", role: "Fire Operations SME" as const, isGameMaster: false };
    let state: RoomState = {
      ...base,
      players: [gm, met, fire],
      panelState: {
        accessGrants: {
          gm: mode.getPanelDefinitions().map((panel) => panel.id),
          met: mode.getDefaultAccessTemplate("Meteorologist"),
          fire: mode.getDefaultAccessTemplate("Fire Operations SME"),
        },
        panelLocks: {},
      },
    };

    state = applyMutation(
      state,
      mode.onAction(
        state,
        {
          type: "gm_release_prompt",
          playerId: "gm",
          panelId: "gm_prompt_deck",
          payload: { cardId: "p1_radio_rumor" },
        },
        Date.now(),
      ),
    );

    const metDeck = mode.buildPanelDeck({
      state,
      viewer: met,
      effectiveRole: met.role,
      panelState: state.panelState,
      roleOptions: ["Incident Controller", "Fire Operations SME", "Police Operations SME", "Public Information Officer", "Meteorologist", "Observer"],
      debriefMetrics: { executionAccuracy: 50, timingDiscipline: 50, communicationDiscipline: 50, overall: 50 },
    });

    const fireDeck = mode.buildPanelDeck({
      state,
      viewer: fire,
      effectiveRole: fire.role,
      panelState: state.panelState,
      roleOptions: ["Incident Controller", "Fire Operations SME", "Police Operations SME", "Public Information Officer", "Meteorologist", "Observer"],
      debriefMetrics: { executionAccuracy: 50, timingDiscipline: 50, communicationDiscipline: 50, overall: 50 },
    });

    const metPrompts = (metDeck.panelsById.role_briefing?.payload as { prompts: Array<{ id: string }> } | undefined)?.prompts ?? [];
    const firePrompts = (fireDeck.panelsById.role_briefing?.payload as { prompts: Array<{ id: string }> } | undefined)?.prompts ?? [];

    expect(metPrompts.map((prompt) => prompt.id)).not.toContain("p1_radio_rumor");
    expect(firePrompts.map((prompt) => prompt.id)).not.toContain("p1_radio_rumor");

    const pio = { id: "pio", name: "PIO", role: "Public Information Officer" as const, isGameMaster: false };
    const pioDeck = mode.buildPanelDeck({
      state: {
        ...state,
        players: [...state.players, pio],
        panelState: {
          ...state.panelState,
          accessGrants: {
            ...state.panelState.accessGrants,
            pio: mode.getDefaultAccessTemplate("Public Information Officer"),
          },
        },
      },
      viewer: pio,
      effectiveRole: pio.role,
      panelState: {
        ...state.panelState,
        accessGrants: {
          ...state.panelState.accessGrants,
          pio: mode.getDefaultAccessTemplate("Public Information Officer"),
        },
      },
      roleOptions: ["Incident Controller", "Fire Operations SME", "Police Operations SME", "Public Information Officer", "Meteorologist", "Observer"],
      debriefMetrics: { executionAccuracy: 50, timingDiscipline: 50, communicationDiscipline: 50, overall: 50 },
    });
    const pioPrompts = (pioDeck.panelsById.role_briefing?.payload as { prompts: Array<{ id: string }> } | undefined)?.prompts ?? [];
    expect(pioPrompts.map((prompt) => prompt.id)).toContain("p1_radio_rumor");
  });
});
