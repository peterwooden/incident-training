import type {
  BombScenarioState,
  BombStageId,
  DebriefEvent,
  IncidentRole,
  WidgetState,
  Player,
  PlayerAction,
  RoomState,
  WidgetAccessRule,
  WidgetId,
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

export interface BombModuleContext {
  now: number;
  action: PlayerAction;
}

export interface BombModule {
  id: BombStageId;
  title: string;
  timerSec: number;
  objective: string;
  init: (rng: SeededRandom, scenario: BombScenarioState) => BombScenarioState;
  handleAction: (scenario: BombScenarioState, context: BombModuleContext) => {
    scenario: BombScenarioState;
    pressureDelta: number;
    scoreDelta: number;
    summary: string;
    timelineMessage?: string;
  };
  onTick?: (scenario: BombScenarioState, now: number) => {
    scenario: BombScenarioState;
    pressureDelta: number;
    scoreDelta: number;
    summary?: string;
    timelineMessage?: string;
  };
  isSolved: (scenario: BombScenarioState) => boolean;
  manualTitle: string;
  manualSections: (scenario: BombScenarioState) => string[];
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
  getWidgetDefinitions(): WidgetAccessRule[];
  getDefaultWidgetAccessTemplate(role: IncidentRole): WidgetId[];
  getWidgetForAction(actionType: PlayerAction["type"]): WidgetId | undefined;
  onAction(state: RoomState, action: PlayerAction, now: number): ModeMutation;
  onTick(state: RoomState, now: number): ModeMutation;
  buildWidgetDeck(args: {
    state: RoomState;
    viewer?: Player;
    effectiveRole: IncidentRole;
    widgetState: WidgetState;
    roleOptions: IncidentRole[];
    debriefMetrics: {
      executionAccuracy: number;
      timingDiscipline: number;
      communicationDiscipline: number;
      overall: number;
    };
  }): import("@incident/shared").WidgetDeckView;
}
