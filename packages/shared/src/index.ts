export type GameMode = "sev-escalation" | "comms-crisis";

export type IncidentRole = "IC" | "SME" | "Comms" | "Scribe" | "Observer";

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

export interface Objective {
  id: string;
  description: string;
  requiredAction: PlayerActionType;
  completed: boolean;
}

export type GameStatus = "lobby" | "running" | "resolved" | "failed";

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
  gmSecret: string;
}

export type PlayerActionType =
  | "assign_role"
  | "acknowledge_incident"
  | "open_bridge"
  | "escalate_vendor"
  | "publish_update"
  | "stabilize_service"
  | "declare_resolved";

export interface PlayerAction {
  type: PlayerActionType;
  playerId: string;
  payload?: Record<string, string | number | boolean>;
}

export interface GameEventEnvelope {
  type: "snapshot" | "timeline" | "system";
  state?: RoomState;
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
