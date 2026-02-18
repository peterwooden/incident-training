export const ROOM_SCHEMA_VERSION = 2;

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

export interface DebriefEvent {
  id: string;
  atEpochMs: number;
  type: "action" | "tick" | "panel_access" | "panel_lock" | "role_assign" | "system";
  message: string;
  actorPlayerId?: string;
  panelId?: ScenePanelId;
  score: number;
  pressure: number;
}

export interface DebriefMetrics {
  executionAccuracy: number;
  timingDiscipline: number;
  communicationDiscipline: number;
  overall: number;
}

export interface DebriefView {
  events: DebriefEvent[];
  metrics: DebriefMetrics;
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
  manualPages: Array<{ id: string; title: string; sections: string[] }>;
  confirmationLedger: Array<{ atEpochMs: number; message: string }>;
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
  strategyNotes: string[];
}

export type ScenarioState = BombScenarioState | BushfireScenarioState;

export type ScenePanelId =
  | "mission_hud"
  | "device_console"
  | "manual_rulebook"
  | "safety_telemetry"
  | "coordination_board"
  | "town_map"
  | "fire_ops_console"
  | "police_ops_console"
  | "public_info_console"
  | "incident_command_console"
  | "gm_orchestrator"
  | "debrief_replay";

export type ScenePanelKind = "shared" | "role-scoped" | "gm-only";

export interface ScenePanelAccessRule {
  id: ScenePanelId;
  kind: ScenePanelKind;
  defaultRoles: IncidentRole[];
}

export interface ScenePanelLockState {
  locked: boolean;
  reason?: string;
  lockedByPlayerId?: string;
  atEpochMs?: number;
}

export type AudioCue = "warning" | "strike" | "spread" | "success" | "fail";

export interface MissionHudPayload {
  timerSec: number;
  pressure: number;
  score: number;
  status: GameStatus;
  summary: string;
  slackReminder: string;
}

export interface BombDeviceConsolePayload {
  status: BombScenarioState["status"];
  timerSec: number;
  strikes: number;
  maxStrikes: number;
  wires: Array<Pick<BombWire, "id" | "color" | "isCut">>;
  symbolModule: {
    availableSymbols: string[];
    enteredSequence: string[];
  };
  diagnostics: string[];
}

export interface BombRulebookPayload {
  pages: BombScenarioState["manualPages"];
  index: string[];
  hint: string;
}

export interface BombSafetyTelemetryPayload {
  currentRisk: number;
  stabilizeWindowSec: number;
  alarms: string[];
}

export interface BombCoordinationBoardPayload {
  checklist: Array<{ id: string; label: string; completed: boolean }>;
  recentMessages: Array<{ atEpochMs: number; message: string }>;
}

export interface BushfireMapPayload {
  windDirection: BushfireScenarioState["windDirection"];
  windStrength: BushfireScenarioState["windStrength"];
  containment: number;
  anxiety: number;
  cells: BushfireCell[];
}

export interface FireOpsPayload {
  waterBombsAvailable: number;
  burningZoneIds: string[];
  note: string;
}

export interface PoliceOpsPayload {
  evacuationZoneIds: string[];
  blockedZoneIds: string[];
  note: string;
}

export interface PublicInfoPayload {
  advisories: string[];
  anxiety: number;
  cadenceHint: string;
}

export interface IncidentCommandPayload {
  containment: number;
  strategicObjectives: string[];
  topRisks: string[];
}

export interface GmOrchestratorPayload {
  players: Player[];
  accessByPlayer: Record<string, ScenePanelId[]>;
  panelLocks: Partial<Record<ScenePanelId, ScenePanelLockState>>;
  simulatedRole?: IncidentRole;
  roleOptions: IncidentRole[];
}

export interface DebriefReplayPayload {
  metrics: DebriefMetrics;
  events: DebriefEvent[];
}

export interface ScenePanelPayloadMap {
  mission_hud: MissionHudPayload;
  device_console: BombDeviceConsolePayload;
  manual_rulebook: BombRulebookPayload;
  safety_telemetry: BombSafetyTelemetryPayload;
  coordination_board: BombCoordinationBoardPayload;
  town_map: BushfireMapPayload;
  fire_ops_console: FireOpsPayload;
  police_ops_console: PoliceOpsPayload;
  public_info_console: PublicInfoPayload;
  incident_command_console: IncidentCommandPayload;
  gm_orchestrator: GmOrchestratorPayload;
  debrief_replay: DebriefReplayPayload;
}

export interface ScenePanelView<K extends ScenePanelId = ScenePanelId> {
  id: K;
  kind: ScenePanelKind;
  title: string;
  subtitle?: string;
  priority: number;
  locked: ScenePanelLockState;
  audioCue?: AudioCue;
  payload: ScenePanelPayloadMap[K];
}

export type AnyScenePanelView = {
  [K in ScenePanelId]: ScenePanelView<K>;
}[ScenePanelId];

export interface PanelDeckView {
  availablePanelIds: ScenePanelId[];
  panelsById: Partial<{ [K in ScenePanelId]: ScenePanelView<K> }>;
  defaultOrder: ScenePanelId[];
  gmSimulatedRole?: IncidentRole;
}

export interface PanelState {
  accessGrants: Record<string, ScenePanelId[]>;
  panelLocks: Partial<Record<ScenePanelId, ScenePanelLockState>>;
  gmSimulatedRole?: IncidentRole;
}

export interface RoomState {
  schemaVersion: number;
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
  panelState: PanelState;
  debriefLog: DebriefEvent[];
  seed: number;
  rngCursor: number;
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
  panelDeck: PanelDeckView;
  debrief: DebriefView;
  yourPlayerId?: string;
}

export interface PlayerAction {
  type: PlayerActionType;
  playerId: string;
  panelId: ScenePanelId;
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
  forceStart?: boolean;
}

export interface ActionRequest {
  playerId: string;
  actionType: PlayerActionType;
  panelId: ScenePanelId;
  payload?: Record<string, string | number | boolean>;
}

export interface AssignRoleRequest {
  gmSecret: string;
  playerId: string;
  role: IncidentRole;
}

export interface SetPanelAccessRequest {
  gmSecret: string;
  playerId: string;
  panelId: ScenePanelId;
  granted: boolean;
}

export interface SetPanelLockRequest {
  gmSecret: string;
  panelId: ScenePanelId;
  locked: boolean;
  reason?: string;
}

export interface SetGmSimulatedRoleRequest {
  gmSecret: string;
  role?: IncidentRole;
}
