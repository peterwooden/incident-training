import { useMemo, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import type { RoomView } from "@incident/shared";
import type { RoomContextValue, Session } from "./types";
import { HomePage } from "./pages/HomePage";
import { JoinRoomPage } from "./pages/JoinRoomPage";
import { RoomPage } from "./pages/RoomPage";
import { VisualRegressionPage } from "./pages/VisualRegressionPage";
import { RoomContext } from "./context";

export default function App() {
  const [session, setSessionState] = useState<Session | undefined>(undefined);
  const [state, setState] = useState<RoomView | undefined>(undefined);

  const value = useMemo<RoomContextValue>(
    () => ({
      session,
      setSession: (next) => setSessionState(next),
      state,
      setState,
    }),
    [session, state],
  );

  return (
    <RoomContext.Provider value={value}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/join/:roomCode" element={<JoinRoomPage />} />
        <Route path="/room/:roomCode" element={<RoomPage />} />
        <Route path="/visual-regression" element={<VisualRegressionPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </RoomContext.Provider>
  );
}
