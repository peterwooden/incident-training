export type GameMode = "bomb-defusal" | "bushfire-command";

export type IncidentRole =
  | "Lead Coordinator"
  | "Device Specialist"
  | "Manual Analyst"
  | "Safety Officer"
  | "Incident Controller"
  | "Fire Operations SME"
  | "Police Operations SME"
  | "Public Information Officer"
  | "Observer";

export interface Player {
  id: string;
  name: string;
  role: IncidentRole;
  isGameMaster: boolean;
}

export interface TimelineEvent {
  id: string;
  atEpochMs: number;
  kind: "inject" | "status" | "system";
  message: string;
  byPlayerId?: string;
}

export type PlayerActionType =
  | "assign_role"
  | "bomb_cut_wire"
  | "bomb_press_symbol"
  | "bomb_stabilize_panel"
  | "bushfire_deploy_fire_crew"
  | "bushfire_drop_water"
  | "bushfire_set_roadblock"
  | "bushfire_create_firebreak"
  | "bushfire_issue_public_update";

export interface Objective {
  id: string;
  description: string;
  requiredAction: PlayerActionType;
  completed: boolean;
}

export type GameStatus = "lobby" | "running" | "resolved" | "failed";

export interface BombWire {
  id: string;
  color: "red" | "blue" | "yellow" | "white" | "black";
  isCut: boolean;
  isCritical: boolean;
}

export interface BombSymbolModule {
  availableSymbols: string[];
  targetSequence: string[];
  enteredSequence: string[];
}

export interface BombScenarioState {
  type: "bomb-defusal";
  timerSec: number;
  strikes: number;
  maxStrikes: number;
  status: "armed" | "defused" | "exploded";
  wires: BombWire[];
  symbolModule: BombSymbolModule;
  deviceReadouts: string[];
  manualClues: string[];
}

export interface BushfireCell {
  id: string;
  x: number;
  y: number;
  zoneName: string;
  fireLevel: number;
  fuel: number;
  population: number;
  evacuated: boolean;
  hasFireCrew: boolean;
  hasPoliceUnit: boolean;
  hasFirebreak: boolean;
}

export interface BushfireScenarioState {
  type: "bushfire-command";
  timerSec: number;
  windDirection: "N" | "S" | "E" | "W";
  windStrength: 1 | 2 | 3;
  publicAnxiety: number;
  containment: number;
  waterBombsAvailable: number;
  cells: BushfireCell[];
  publicAdvisories: string[];
}

export type ScenarioState = BombScenarioState | BushfireScenarioState;

export interface BombScenarioView {
  type: "bomb-defusal";
  timerSec: number;
  strikes: number;
  maxStrikes: number;
  status: "armed" | "defused" | "exploded";
  wires: Array<Pick<BombWire, "id" | "color" | "isCut">>;
  symbolModule: {
    availableSymbols: string[];
    enteredSequence: string[];
  };
  visibleClues: string[];
  roleInstruction: string;
}

export interface BushfireScenarioView {
  type: "bushfire-command";
  timerSec: number;
  windDirection: "N" | "S" | "E" | "W";
  windStrength: 1 | 2 | 3;
  publicAnxiety: number;
  containment: number;
  waterBombsAvailable: number;
  cells: BushfireCell[];
  publicAdvisories: string[];
  visibleClues: string[];
  roleInstruction: string;
}

export type ScenarioView = BombScenarioView | BushfireScenarioView;

export interface RoomState {
  roomCode: string;
  mode: GameMode;
  status: GameStatus;
  createdAtEpochMs: number;
  startedAtEpochMs?: number;
  endedAtEpochMs?: number;
  pressure: number;
  score: number;
  players: Player[];
  objectives: Objective[];
  timeline: TimelineEvent[];
  publicSummary: string;
  scenario: ScenarioState;
  gmSecret: string;
}

export interface RoomView {
  roomCode: string;
  mode: GameMode;
  status: GameStatus;
  createdAtEpochMs: number;
  startedAtEpochMs?: number;
  endedAtEpochMs?: number;
  pressure: number;
  score: number;
  players: Player[];
  objectives: Objective[];
  timeline: TimelineEvent[];
  publicSummary: string;
  scenario: ScenarioView;
  yourPlayerId?: string;
}

export interface PlayerAction {
  type: PlayerActionType;
  playerId: string;
  payload?: Record<string, string | number | boolean>;
}

export interface GameEventEnvelope {
  type: "snapshot" | "timeline" | "system";
  state?: RoomView;
  event?: TimelineEvent;
  message?: string;
}

export interface CreateRoomRequest {
  gmName: string;
  mode: GameMode;
}

export interface JoinRoomRequest {
  name: string;
  preferredRole?: IncidentRole;
}

export interface StartGameRequest {
  gmSecret: string;
}

export interface ActionRequest {
  playerId: string;
  actionType: PlayerActionType;
  payload?: Record<string, string | number | boolean>;
}
