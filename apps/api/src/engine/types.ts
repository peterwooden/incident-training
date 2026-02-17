import type { Player, PlayerAction, RoomState, ScenarioView, TimelineEvent } from "@incident/shared";

export interface ModeMutation {
  pressureDelta?: number;
  scoreDelta?: number;
  summary?: string;
  timelineAdds?: TimelineEvent[];
  markObjectiveIdsComplete?: string[];
  status?: RoomState["status"];
  replaceScenario?: RoomState["scenario"];
}

export interface GameModeEngine {
  initObjectives(): RoomState["objectives"];
  initSummary(): string;
  initScenario(): RoomState["scenario"];
  onAction(state: RoomState, action: PlayerAction, now: number): ModeMutation;
  onTick(state: RoomState, now: number): ModeMutation;
  toScenarioView(state: RoomState, player?: Player): ScenarioView;
}
