import type {
  DebriefEvent,
  IncidentRole,
  PanelState,
  Player,
  PlayerAction,
  RoomState,
  ScenePanelAccessRule,
  ScenePanelId,
  TimelineEvent,
} from "@incident/shared";

export interface SeededRandom {
  seed: number;
  nextFloat: () => number;
  nextInt: (max: number) => number;
  pick<T>(input: T[]): T;
  pickMany<T>(input: T[], count: number): T[];
  getCursor: () => number;
}

export interface ModeMutation {
  pressureDelta?: number;
  scoreDelta?: number;
  summary?: string;
  timelineAdds?: TimelineEvent[];
  markObjectiveIdsComplete?: string[];
  status?: RoomState["status"];
  replaceScenario?: RoomState["scenario"];
  debriefAdds?: DebriefEvent[];
}

export interface GameModeEngine {
  initObjectives(rng: SeededRandom): RoomState["objectives"];
  initSummary(): string;
  initScenario(rng: SeededRandom): RoomState["scenario"];
  getPanelDefinitions(): ScenePanelAccessRule[];
  getDefaultAccessTemplate(role: IncidentRole): ScenePanelId[];
  getPanelForAction(actionType: PlayerAction["type"]): ScenePanelId | undefined;
  onAction(state: RoomState, action: PlayerAction, now: number): ModeMutation;
  onTick(state: RoomState, now: number): ModeMutation;
  buildPanelDeck(args: {
    state: RoomState;
    viewer?: Player;
    effectiveRole: IncidentRole;
    panelState: PanelState;
    roleOptions: IncidentRole[];
    debriefMetrics: {
      executionAccuracy: number;
      timingDiscipline: number;
      communicationDiscipline: number;
      overall: number;
    };
  }): import("@incident/shared").PanelDeckView;
}
