import { createContext, useContext } from "react";
import type { RoomContextValue } from "./types";

export const RoomContext = createContext<RoomContextValue | undefined>(undefined);

export function useRoomContext(): RoomContextValue {
  const ctx = useContext(RoomContext);
  if (!ctx) {
    throw new Error("RoomContext is missing");
  }
  return ctx;
}
