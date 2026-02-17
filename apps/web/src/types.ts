import type { RoomView } from "@incident/shared";

export interface Session {
  roomCode: string;
  playerId: string;
  gmSecret?: string;
}

export interface RoomContextValue {
  session?: Session;
  setSession: (session: Session) => void;
  state?: RoomView;
  setState: (state: RoomView | undefined) => void;
}
