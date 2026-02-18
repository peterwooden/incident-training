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
export type RenderMode = "svg" | "canvas" | "hybrid";
export type InteractionMode = "direct-gesture" | "diegetic-control" | "drawer-control";
export type OverlayTextLevel = "minimal" | "supporting" | "dense";

export interface Point2D {
  x: number;
  y: number;
}

export interface MissionHudPayload {
  timerSec: number;
  pressure: number;
  score: number;
  status: GameStatus;
  summary: string;
  slackReminder: string;
}

export interface WireAnchor {
  wireId: string;
  start: Point2D;
  end: Point2D;
}

export interface CuttableSegment {
  id: string;
  wireId: string;
  start: Point2D;
  end: Point2D;
  thickness: number;
}

export interface ModuleBounds {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface StateLight {
  id: string;
  x: number;
  y: number;
  color: "green" | "amber" | "red";
  active: boolean;
}

export interface SymbolNode {
  symbol: string;
  x: number;
  y: number;
  radius: number;
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
  wireAnchors: WireAnchor[];
  cuttableSegments: CuttableSegment[];
  moduleBounds: ModuleBounds[];
  stateLights: StateLight[];
  symbolNodes: SymbolNode[];
  shakeIntensity: number;
  /** @deprecated Use geometry fields and lights, this is fallback-only text */
  diagnostics: string[];
}

export interface ManualHotspot {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  detail: string;
}

export interface ManualCalloutPin {
  id: string;
  x: number;
  y: number;
  text: string;
}

export interface ManualSpread {
  id: string;
  title: string;
  diagramAssets: Array<{ id: string; type: "wire" | "glyph" | "safety"; points: Point2D[] }>;
  hotspots: ManualHotspot[];
  calloutPins: ManualCalloutPin[];
}

export interface BombRulebookPayload {
  spreads: ManualSpread[];
  activeSpreadId?: string;
  /** @deprecated fallback-only */
  pages: BombScenarioState["manualPages"];
  /** @deprecated fallback-only */
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

export type BushfireToolType = "crew" | "water" | "firebreak" | "roadblock";

export interface ZonePolygon {
  zoneId: string;
  points: Point2D[];
}

export interface AssetSlot {
  id: string;
  type: BushfireToolType;
  x: number;
  y: number;
}

export interface DragTarget {
  zoneId: string;
  accepts: BushfireToolType[];
  x: number;
  y: number;
  radius: number;
}

export interface WindVector {
  dx: number;
  dy: number;
}

export interface BushfireMapPayload {
  windDirection: BushfireScenarioState["windDirection"];
  windStrength: BushfireScenarioState["windStrength"];
  containment: number;
  anxiety: number;
  cells: BushfireCell[];
  zonePolygons: ZonePolygon[];
  assetSlots: AssetSlot[];
  dragTargets: DragTarget[];
  windVector: WindVector;
  heatFieldSeed: number;
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
  cameraTargets: Array<{ id: string; label: string; x: number; y: number; urgency: number }>;
  riskHotspots: Array<{ id: string; x: number; y: number; severity: number; label: string }>;
  drawerSections: Array<{ id: "roles" | "access" | "locks" | "simulate"; title: string }>;
  selectionContext?: { selectedPlayerId?: string; selectedPanelId?: ScenePanelId };
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

export type LiveGameplayPanelId = Exclude<ScenePanelId, "gm_orchestrator" | "debrief_replay">;
export type OverlayTextLevelForPanel<K extends ScenePanelId> = K extends LiveGameplayPanelId
  ? Exclude<OverlayTextLevel, "dense">
  : OverlayTextLevel;

export interface ScenePanelView<K extends ScenePanelId = ScenePanelId> {
  id: K;
  kind: ScenePanelKind;
  title: string;
  subtitle?: string;
  priority: number;
  visualPriority: number;
  renderMode: RenderMode;
  interactionMode: InteractionMode;
  overlayTextLevel: OverlayTextLevelForPanel<K>;
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
