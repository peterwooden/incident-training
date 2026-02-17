import type { PlayerAction, RoomState, TimelineEvent } from "@incident/shared";

export interface ModeMutation {
  pressureDelta?: number;
  scoreDelta?: number;
  summary?: string;
  timelineAdds?: TimelineEvent[];
  markObjectiveIdsComplete?: string[];
  status?: RoomState["status"];
}

export interface GameModeEngine {
  initObjectives(now: number): RoomState["objectives"];
  initSummary(): string;
  onAction(state: RoomState, action: PlayerAction, now: number): ModeMutation;
  onTick(state: RoomState, now: number): ModeMutation;
}
