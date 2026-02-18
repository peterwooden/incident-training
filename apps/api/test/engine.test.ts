import { describe, expect, it } from "vitest";
import type { IncidentRole, RoomState } from "@incident/shared";
import { ROOM_SCHEMA_VERSION } from "@incident/shared";
import { createSeededRandom, snapshotCursor } from "../src/domain/rng";
import { BombDefusalMode } from "../src/engine/bombDefusalMode";
import { BushfireCommandMode } from "../src/engine/bushfireCommandMode";

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
});

describe("BushfireCommandMode", () => {
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
      roleOptions: ["Incident Controller", "Fire Operations SME", "Police Operations SME", "Public Information Officer", "Observer"],
      debriefMetrics: { executionAccuracy: 50, timingDiscipline: 50, communicationDiscipline: 50, overall: 50 },
    });
    const deckB = mode.buildPanelDeck({
      state: stateB,
      viewer: stateB.players[0],
      effectiveRole: "Fire Operations SME",
      panelState: stateB.panelState,
      roleOptions: ["Incident Controller", "Fire Operations SME", "Police Operations SME", "Public Information Officer", "Observer"],
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
});
