import { describe, expect, it } from "vitest";
import type { RoomState } from "@incident/shared";
import { BombDefusalMode } from "../src/engine/bombDefusalMode";
import { BushfireCommandMode } from "../src/engine/bushfireCommandMode";

function baseState(mode: RoomState["mode"]): RoomState {
  const engine = mode === "bomb-defusal" ? new BombDefusalMode() : new BushfireCommandMode();
  return {
    roomCode: "AAA-BBB",
    mode,
    status: "running",
    createdAtEpochMs: Date.now(),
    startedAtEpochMs: Date.now(),
    pressure: 20,
    score: 0,
    players: [{ id: "p1", name: "One", role: "Observer", isGameMaster: false }],
    objectives: engine.initObjectives(),
    timeline: [],
    publicSummary: engine.initSummary(),
    scenario: engine.initScenario(),
    gmSecret: "secret",
  };
}

describe("BombDefusalMode", () => {
  it("decrements timer on tick", () => {
    const mode = new BombDefusalMode();
    const state = baseState("bomb-defusal");

    const before = state.scenario.type === "bomb-defusal" ? state.scenario.timerSec : 0;
    const mutation = mode.onTick(state, Date.now());
    const after = mutation.replaceScenario;

    expect(after?.type).toBe("bomb-defusal");
    if (after?.type === "bomb-defusal") {
      expect(after.timerSec).toBeLessThan(before);
    }
  });
});

describe("BushfireCommandMode", () => {
  it("deploy action improves containment opportunity", () => {
    const mode = new BushfireCommandMode();
    const state = baseState("bushfire-command");
    const firstCell = state.scenario.type === "bushfire-command" ? state.scenario.cells[0] : undefined;

    const mutation = mode.onAction(
      state,
      { type: "bushfire_deploy_fire_crew", playerId: "p1", payload: { cellId: firstCell?.id ?? "cell_1" } },
      Date.now(),
    );

    expect(mutation.scoreDelta).toBeGreaterThanOrEqual(0);
    expect(mutation.replaceScenario?.type).toBe("bushfire-command");
  });
});
