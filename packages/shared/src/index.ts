export const ROOM_SCHEMA_VERSION = 4;

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
  | "Meteorologist"
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
  type: "action" | "tick" | "widget_access" | "widget_lock" | "role_assign" | "system";
  message: string;
  actorPlayerId?: string;
  widgetId?: WidgetId;
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
  | "gm_fsm_transition"
  | "bomb_cut_wire"
  | "bomb_press_symbol"
  | "bomb_stabilize_widget"
  | "bushfire_deploy_fire_crew"
  | "bushfire_drop_water"
  | "bushfire_set_roadblock"
  | "bushfire_create_firebreak"
  | "bushfire_issue_public_update"
  | "bushfire_issue_forecast"
  | "bushfire_ack_prompt"
  | "gm_release_prompt";

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
  precedenceOrder: string[];
  targetSequence: string[];
  enteredSequence: string[];
}

export type BombStageId = "wires" | "symbols" | "memory";
export type BombStageStatus = "active" | "intermission";

export interface BombMemoryModule {
  cues: number[];
  enteredSequence: string[];
}

export interface BombScenarioState {
  type: "bomb-defusal";
  timerSec: number;
  stageId: BombStageId;
  stageIndex: number;
  stageTimerSec: number;
  stageStatus: BombStageStatus;
  strikeCarry: number;
  moduleQueue: BombStageId[];
  completedStages: BombStageId[];
  intermissionUntilEpochMs?: number;
  strikes: number;
  maxStrikes: number;
  stabilizeCharges: number;
  status: "armed" | "defused" | "exploded";
  wireProgress: number;
  wires: BombWire[];
  symbolModule: BombSymbolModule;
  memoryModule: BombMemoryModule;
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
  phaseId: BushfirePhaseId;
  phaseIndex: number;
  phaseStartedAtEpochMs: number;
  elapsedSec: number;
  windDirection: "N" | "S" | "E" | "W";
  windStrength: 1 | 2 | 3;
  windKph: number;
  distanceToTownMeters: number;
  trafficCongestion: number;
  smokeDensity: number;
  rumorPressure: number;
  forecastConfidence: number;
  issuedForecasts: string[];
  publicAnxiety: number;
  containment: number;
  waterBombsAvailable: number;
  cells: BushfireCell[];
  publicAdvisories: string[];
  strategyNotes: string[];
  promptDeck: BushfirePromptCardState[];
}

export type BushfirePhaseId =
  | "phase_1_monitor"
  | "phase_2_escalation"
  | "phase_3_crisis"
  | "phase_4_catastrophe"
  | "terminal_failed";

export interface BushfirePromptCardState {
  id: string;
  phaseId: BushfirePhaseId;
  targetRole:
    | "Incident Controller"
    | "Fire Operations SME"
    | "Police Operations SME"
    | "Public Information Officer"
    | "Meteorologist";
  title: string;
  body: string;
  released: boolean;
  releasedAtEpochMs?: number;
  acknowledgedByPlayerIds: string[];
}

export type ScenarioState = BombScenarioState | BushfireScenarioState;

export type WidgetId =
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
  | "weather_ops_console"
  | "role_briefing"
  | "gm_orchestrator"
  | "gm_prompt_deck"
  | "fsm_editor"
  | "debrief_replay";

export type WidgetKind = "shared" | "role-scoped" | "gm-only";

export interface WidgetAccessRule {
  id: WidgetId;
  kind: WidgetKind;
  defaultRoles: IncidentRole[];
}

export interface WidgetLockState {
  locked: boolean;
  reason?: string;
  lockedByPlayerId?: string;
  atEpochMs?: number;
}

export type AudioCue = "warning" | "strike" | "spread" | "success" | "fail";
export type RenderMode = "svg" | "canvas" | "hybrid";
export type InteractionMode = "direct-gesture" | "diegetic-control" | "drawer-control";
export type OverlayTextLevel = "minimal" | "supporting" | "dense";
export type FxProfile = "cinematic" | "reduced";
export type MaterialPreset =
  | "metal-console"
  | "paper-manual"
  | "terrain-cinematic"
  | "glass-hud"
  | "ops-card"
  | "gm-deck";
export type CursorStyle = "pointer" | "crosshair" | "grab" | "not-allowed";

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

export interface DeviceSkin {
  shellGradient: [string, string];
  bezelDepth: number;
  grimeAmount: number;
  vignette: number;
  reflectionStrength: number;
  textureAssetId?: string;
}

export type BombComponentType = "capacitor" | "resistor" | "busbar" | "fuse" | "display" | "terminal";

export interface BombComponent {
  id: string;
  type: BombComponentType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotationDeg: number;
  state: "idle" | "active" | "fault" | "cut";
  valueLabel?: string;
}

export interface EnergyArc {
  id: string;
  points: Point2D[];
  intensity: number;
  speed: number;
  active: boolean;
}

export interface LightRig {
  id: string;
  kind: "key" | "fill" | "rim";
  x: number;
  y: number;
  intensity: number;
  color: string;
}

export interface InteractionRegion {
  id: string;
  targetId: string;
  kind: "wire" | "symbol" | "stabilizer" | "module";
  shape: "line" | "circle" | "rect";
  cursor: CursorStyle;
  enabled: boolean;
  affordance: "cut" | "press" | "hold" | "inspect";
  line?: { start: Point2D; end: Point2D; thickness: number };
  circle?: { center: Point2D; radius: number };
  rect?: { x: number; y: number; width: number; height: number };
}

export interface BombDeviceConsolePayload {
  status: BombScenarioState["status"];
  stageId: BombStageId;
  stageIndex: number;
  totalStages: number;
  stageTimerSec: number;
  stageStatus: BombStageStatus;
  completedStages: BombStageId[];
  stageObjective: string;
  timerSec: number;
  strikes: number;
  maxStrikes: number;
  stabilizeCharges: number;
  wires: Array<Pick<BombWire, "id" | "color" | "isCut">>;
  symbolModule: {
    availableSymbols: string[];
    enteredSequence: string[];
    precedenceOrder: string[];
  };
  memoryModule: {
    cue: number;
    step: number;
    totalSteps: number;
    availableDigits: string[];
    enteredSequence: string[];
  };
  wireAnchors: WireAnchor[];
  cuttableSegments: CuttableSegment[];
  moduleBounds: ModuleBounds[];
  stateLights: StateLight[];
  symbolNodes: SymbolNode[];
  deviceSkin: DeviceSkin;
  components: BombComponent[];
  energyArcs: EnergyArc[];
  lightRigs: LightRig[];
  interactionRegions: InteractionRegion[];
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
  spreadBackgroundAssetId: string;
  paperNormalAssetId: string;
  creaseMapAssetId: string;
  diagramAssets: Array<{ id: string; type: "wire" | "glyph" | "safety"; points: Point2D[] }>;
  diagramLayers: Array<{
    id: string;
    depth: "background" | "mid" | "foreground";
    type: "wire" | "glyph" | "safety";
    points: Point2D[];
    stroke?: string;
    fill?: string;
  }>;
  hotspots: ManualHotspot[];
  calloutPins: ManualCalloutPin[];
  turnHintPath: Point2D[];
}

export interface BombRulebookPayload {
  stageId: BombStageId;
  stageTitle: string;
  spreads: ManualSpread[];
  activeSpreadId?: string;
  /** @deprecated fallback-only */
  pages: BombScenarioState["manualPages"];
  /** @deprecated fallback-only */
  index: string[];
  hint: string;
}

export interface BombSafetyTelemetryPayload {
  stageId: BombStageId;
  currentRisk: number;
  stabilizeWindowSec: number;
  strikeCarry: number;
  stabilizeCharges: number;
  alarms: string[];
}

export interface BombCoordinationBoardPayload {
  stageId: BombStageId;
  currentDirective: string;
  stageRail: Array<{ stageId: BombStageId; label: string; completed: boolean; active: boolean }>;
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

export interface TerrainLayer {
  id: string;
  material: "grassland" | "forest" | "urban" | "water" | "asphalt";
  polygons: Point2D[][];
  tint: string;
  elevation: number;
}

export interface RoadSegment {
  id: string;
  points: Point2D[];
  width: number;
}

export interface RiverPath {
  id: string;
  points: Point2D[];
  width: number;
}

export interface LandmarkSprite {
  id: string;
  kind: "hospital" | "school" | "depot" | "station";
  x: number;
  y: number;
  scale: number;
  assetId: string;
}

export interface TreeCluster {
  id: string;
  x: number;
  y: number;
  radius: number;
  density: number;
}

export interface FireFrontContour {
  id: string;
  points: Point2D[];
  intensity: number;
  phase: number;
}

export interface WindSample {
  x: number;
  y: number;
  dx: number;
  dy: number;
  strength: number;
}

export interface ToolDropZone {
  id: string;
  zoneId: string;
  tool: BushfireToolType;
  x: number;
  y: number;
  radius: number;
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
  terrainLayers: TerrainLayer[];
  roadGraph: RoadSegment[];
  riverPaths: RiverPath[];
  landmarkSprites: LandmarkSprite[];
  treeClusters: TreeCluster[];
  fireFrontContours: FireFrontContour[];
  windField: WindSample[];
  toolDropZones: ToolDropZone[];
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

export interface WeatherOpsPayload {
  phaseId: BushfirePhaseId;
  windDirection: BushfireScenarioState["windDirection"];
  windStrength: BushfireScenarioState["windStrength"];
  windKph: number;
  forecastConfidence: number;
  nextShiftHint: string;
  recommendation: string;
  issuedForecasts: string[];
}

export interface RoleBriefingPayload {
  phaseId: BushfirePhaseId;
  role: IncidentRole;
  roleLabel: string;
  prompts: Array<{
    id: string;
    title: string;
    body: string;
    releasedAtEpochMs?: number;
    acknowledged: boolean;
    severity: "low" | "medium" | "high";
  }>;
}

export interface GmPromptDeckPayload {
  phaseId: BushfirePhaseId;
  cards: Array<{
    id: string;
    phaseId: BushfirePhaseId;
    targetRole: BushfirePromptCardState["targetRole"];
    title: string;
    body: string;
    released: boolean;
    releasedAtEpochMs?: number;
    acknowledgementCount: number;
  }>;
  releasableCardIds: string[];
}

export interface GmOrchestratorPayload {
  players: Player[];
  accessByPlayer: Record<string, WidgetId[]>;
  widgetLocks: Partial<Record<WidgetId, WidgetLockState>>;
  simulatedRole?: IncidentRole;
  roleOptions: IncidentRole[];
  cameraTargets: Array<{ id: string; label: string; x: number; y: number; urgency: number }>;
  riskHotspots: Array<{ id: string; x: number; y: number; severity: number; label: string }>;
  drawerSections: Array<{ id: "roles" | "access" | "locks" | "simulate"; title: string }>;
  selectionContext?: { selectedPlayerId?: string; selectedWidgetId?: WidgetId };
}

export interface FsmNodeView {
  id: string;
  label: string;
  kind: "room-status" | "scenario-status" | "stage" | "phase" | "metric-band";
  active: boolean;
  x: number;
  y: number;
}

export interface FsmTransitionView {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  label: string;
  actionPayload: string;
}

export interface FsmEditorPayload {
  mode: GameMode;
  currentNodeId: string;
  nodes: FsmNodeView[];
  transitions: FsmTransitionView[];
  hints: string[];
}

export interface DebriefReplayPayload {
  metrics: DebriefMetrics;
  events: DebriefEvent[];
}

export interface WidgetPayloadMap {
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
  weather_ops_console: WeatherOpsPayload;
  role_briefing: RoleBriefingPayload;
  gm_orchestrator: GmOrchestratorPayload;
  gm_prompt_deck: GmPromptDeckPayload;
  fsm_editor: FsmEditorPayload;
  debrief_replay: DebriefReplayPayload;
}

export type LiveGameplayWidgetId = Exclude<WidgetId, "gm_orchestrator" | "gm_prompt_deck" | "fsm_editor" | "debrief_replay">;
export type OverlayTextLevelForWidget<K extends WidgetId> = K extends LiveGameplayWidgetId
  ? Exclude<OverlayTextLevel, "dense">
  : OverlayTextLevel;

export interface WidgetView<K extends WidgetId = WidgetId> {
  id: K;
  kind: WidgetKind;
  title: string;
  subtitle?: string;
  priority: number;
  visualPriority: number;
  renderMode: RenderMode;
  interactionMode: InteractionMode;
  overlayTextLevel: OverlayTextLevelForWidget<K>;
  fxProfile: FxProfile;
  ambientLoopMs: number;
  hoverDepthPx: number;
  materialPreset: MaterialPreset;
  locked: WidgetLockState;
  audioCue?: AudioCue;
  payload: WidgetPayloadMap[K];
}

export type AnyWidgetView = {
  [K in WidgetId]: WidgetView<K>;
}[WidgetId];

export interface WidgetDeckView {
  availableWidgetIds: WidgetId[];
  widgetsById: Partial<{ [K in WidgetId]: WidgetView<K> }>;
  defaultOrder: WidgetId[];
  gmSimulatedRole?: IncidentRole;
}

export interface WidgetState {
  accessGrants: Record<string, WidgetId[]>;
  widgetLocks: Partial<Record<WidgetId, WidgetLockState>>;
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
  widgetState: WidgetState;
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
  widgetDeck: WidgetDeckView;
  debrief: DebriefView;
  yourPlayerId?: string;
}

export interface PlayerAction {
  type: PlayerActionType;
  playerId: string;
  widgetId: WidgetId;
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
  widgetId: WidgetId;
  payload?: Record<string, string | number | boolean>;
}

export interface AssignRoleRequest {
  gmSecret: string;
  playerId: string;
  role: IncidentRole;
}

export interface SetWidgetAccessRequest {
  gmSecret: string;
  playerId: string;
  widgetId: WidgetId;
  granted: boolean;
}

export interface SetWidgetLockRequest {
  gmSecret: string;
  widgetId: WidgetId;
  locked: boolean;
  reason?: string;
}

export interface SetGmSimulatedRoleRequest {
  gmSecret: string;
  role?: IncidentRole;
}
