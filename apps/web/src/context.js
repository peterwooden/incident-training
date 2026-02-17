import { createContext, useContext } from "react";
export const RoomContext = createContext(undefined);
export function useRoomContext() {
    const ctx = useContext(RoomContext);
    if (!ctx) {
        throw new Error("RoomContext is missing");
    }
    return ctx;
}
