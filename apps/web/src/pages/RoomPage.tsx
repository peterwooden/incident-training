import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { IncidentRole, PlayerActionType, WidgetId } from "@incident/shared";
import {
  assignRole,
  sendAction,
  setGmSimulatedRole,
  setWidgetAccess,
  setWidgetLock,
  startRoom,
  subscribeToRoom,
} from "../api";
import { useRoomContext } from "../context";
import { WaitingRoomView } from "../game-ui/lobby/WaitingRoomView";
import { GameHudShell } from "../game-ui/shell/GameHudShell";

export function RoomPage() {
  const { roomCode = "" } = useParams();
  const { session, state, setState } = useRoomContext();
  const [error, setError] = useState<string | undefined>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!session || session.roomCode !== roomCode) {
      navigate(`/join/${encodeURIComponent(roomCode)}`);
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
    widgetId: WidgetId,
    payload?: Record<string, string | number | boolean>,
  ) => {
    setError(undefined);
    try {
      const updated = await sendAction(roomCode, {
        playerId: session.playerId,
        actionType,
        widgetId,
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

  const onSetWidgetAccess = async (playerId: string, widgetId: WidgetId, granted: boolean) => {
    if (!session.gmSecret) {
      return;
    }
    setError(undefined);
    try {
      const updated = await setWidgetAccess(roomCode, {
        gmSecret: session.gmSecret,
        playerId,
        widgetId,
        granted,
      });
      setState(updated.state);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const onSetWidgetLock = async (widgetId: WidgetId, locked: boolean) => {
    if (!session.gmSecret) {
      return;
    }
    setError(undefined);
    try {
      const updated = await setWidgetLock(roomCode, {
        gmSecret: session.gmSecret,
        widgetId,
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

  if (state.status === "lobby") {
    return (
      <WaitingRoomView
        state={state}
        session={session}
        error={error}
        onAssignRole={onAssignRole}
        onStart={onStart}
      />
    );
  }

  return (
    <GameHudShell
      state={state}
      session={session}
      error={error}
      onAction={onAction}
      onAssignRole={onAssignRole}
      onSetWidgetAccess={onSetWidgetAccess}
      onSetWidgetLock={onSetWidgetLock}
      onSetSimulatedRole={onSetSimulatedRole}
    />
  );
}
