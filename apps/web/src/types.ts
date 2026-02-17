import type { RoomState } from "@incident/shared";

export interface Session {
  roomCode: string;
  playerId: string;
  gmSecret?: string;
}

export interface RoomContextValue {
  session?: Session;
  setSession: (session: Session) => void;
  state?: RoomState;
  setState: (state: RoomState | undefined) => void;
}
