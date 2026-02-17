import { describe, expect, it } from "vitest";
import type { RoomState } from "@incident/shared";
import { SevEscalationMode } from "../src/engine/sevEscalationMode";
import { CommsCrisisMode } from "../src/engine/commsCrisisMode";

function baseState(mode: RoomState["mode"]): RoomState {
  const engine = mode === "sev-escalation" ? new SevEscalationMode() : new CommsCrisisMode();
  return {
    roomCode: "AAA-BBB",
    mode,
    status: "running",
    createdAtEpochMs: Date.now(),
    startedAtEpochMs: Date.now(),
    pressure: 20,
    score: 0,
    players: [],
    objectives: engine.initObjectives(),
    timeline: [],
    publicSummary: engine.initSummary(),
    gmSecret: "secret",
  };
}

describe("SevEscalationMode", () => {
  it("rewards correct sequence", () => {
    const mode = new SevEscalationMode();
    const state = baseState("sev-escalation");

    const mutation = mode.onAction(
      state,
      { type: "acknowledge_incident", playerId: "p1" },
      Date.now(),
    );

    expect(mutation.scoreDelta).toBeGreaterThan(0);
    expect(mutation.markObjectiveIdsComplete?.length).toBe(1);
  });

  it("penalizes out of sequence", () => {
    const mode = new SevEscalationMode();
    const state = baseState("sev-escalation");

    const mutation = mode.onAction(state, { type: "stabilize_service", playerId: "p1" }, Date.now());

    expect(mutation.scoreDelta).toBeLessThan(0);
    expect(mutation.pressureDelta).toBeGreaterThan(0);
  });
});

describe("CommsCrisisMode", () => {
  it("fails after timeout", () => {
    const mode = new CommsCrisisMode();
    const state = baseState("comms-crisis");
    state.startedAtEpochMs = Date.now() - 9 * 60000;

    const mutation = mode.onTick(state, Date.now());

    expect(mutation.status).toBe("failed");
  });
});
