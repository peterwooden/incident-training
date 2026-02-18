import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { IncidentRole, PlayerActionType, ScenePanelId } from "@incident/shared";
import {
  assignRole,
  sendAction,
  setGmSimulatedRole,
  setPanelAccess,
  setPanelLock,
  startRoom,
  subscribeToRoom,
} from "../api";
import { useRoomContext } from "../context";
import { GameHudShell } from "../game-ui/shell/GameHudShell";

export function RoomPage() {
  const { roomCode = "" } = useParams();
  const { session, state, setState } = useRoomContext();
  const [error, setError] = useState<string | undefined>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!session || session.roomCode !== roomCode) {
      navigate("/");
      return;
    }

    const close = subscribeToRoom(roomCode, session.playerId, setState);
    return close;
  }, [navigate, roomCode, session, setState]);

  if (!session || !state) {
    return <main className="game-shell">Loading...</main>;
  }

  const onStart = async (forceStart: boolean) => {
    if (!session.gmSecret) {
      return;
    }
    setError(undefined);
    try {
      const started = await startRoom(roomCode, { gmSecret: session.gmSecret, forceStart });
      setState(started.state);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const onAction = async (
    actionType: PlayerActionType,
    panelId: ScenePanelId,
    payload?: Record<string, string | number | boolean>,
  ) => {
    setError(undefined);
    try {
      const updated = await sendAction(roomCode, {
        playerId: session.playerId,
        actionType,
        panelId,
        payload,
      });
      setState(updated.state);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const onAssignRole = async (playerId: string, role: IncidentRole) => {
    if (!session.gmSecret) {
      return;
    }
    setError(undefined);
    try {
      const updated = await assignRole(roomCode, { gmSecret: session.gmSecret, playerId, role });
      setState(updated.state);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const onSetPanelAccess = async (playerId: string, panelId: ScenePanelId, granted: boolean) => {
    if (!session.gmSecret) {
      return;
    }
    setError(undefined);
    try {
      const updated = await setPanelAccess(roomCode, {
        gmSecret: session.gmSecret,
        playerId,
        panelId,
        granted,
      });
      setState(updated.state);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const onSetPanelLock = async (panelId: ScenePanelId, locked: boolean) => {
    if (!session.gmSecret) {
      return;
    }
    setError(undefined);
    try {
      const updated = await setPanelLock(roomCode, {
        gmSecret: session.gmSecret,
        panelId,
        locked,
        reason: locked ? "Locked by GM" : "Unlocked by GM",
      });
      setState(updated.state);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const onSetSimulatedRole = async (role?: IncidentRole) => {
    if (!session.gmSecret) {
      return;
    }
    setError(undefined);
    try {
      const updated = await setGmSimulatedRole(roomCode, {
        gmSecret: session.gmSecret,
        role,
      });
      setState(updated.state);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <GameHudShell
      state={state}
      session={session}
      error={error}
      onStart={onStart}
      onAction={onAction}
      onAssignRole={onAssignRole}
      onSetPanelAccess={onSetPanelAccess}
      onSetPanelLock={onSetPanelLock}
      onSetSimulatedRole={onSetSimulatedRole}
    />
  );
}
