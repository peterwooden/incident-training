import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { PlayerActionType } from "@incident/shared";
import { sendAction, startRoom, subscribeToRoom } from "../api";
import { useRoomContext } from "../context";

const ACTIONS: PlayerActionType[] = [
  "assign_role",
  "acknowledge_incident",
  "open_bridge",
  "escalate_vendor",
  "publish_update",
  "stabilize_service",
  "declare_resolved",
];

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

  const pendingObjectives = useMemo(
    () => state?.objectives.filter((objective) => !objective.completed) ?? [],
    [state],
  );

  if (!session || !state) {
    return <main className="page">Loading...</main>;
  }

  const onStart = async () => {
    if (!session.gmSecret) {
      return;
    }
    setError(undefined);
    try {
      const started = await startRoom(roomCode, { gmSecret: session.gmSecret });
      setState(started.state);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const onAction = async (actionType: PlayerActionType) => {
    setError(undefined);
    try {
      const updated = await sendAction(roomCode, {
        playerId: session.playerId,
        actionType,
      });
      setState(updated.state);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <main className="page">
      <section className="card">
        <h1>Room {state.roomCode}</h1>
        <p>Mode: {state.mode}</p>
        <p>Status: {state.status}</p>
        <p>Pressure: {state.pressure}</p>
        <p>Score: {state.score}</p>
        <p>{state.publicSummary}</p>
        {session.gmSecret && state.status === "lobby" && <button onClick={onStart}>Start Scenario</button>}
      </section>

      <section className="card">
        <h2>Objectives</h2>
        <ul>
          {state.objectives.map((objective) => (
            <li key={objective.id}>
              [{objective.completed ? "x" : " "}] {objective.description}
            </li>
          ))}
        </ul>
        {pendingObjectives.length === 0 && <p>All objectives complete.</p>}
      </section>

      <section className="card">
        <h2>Actions</h2>
        <div className="actions">
          {ACTIONS.map((actionType) => (
            <button key={actionType} onClick={() => onAction(actionType)} disabled={state.status !== "running"}>
              {actionType}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Timeline</h2>
        <ul>
          {state.timeline
            .slice()
            .reverse()
            .map((entry) => (
              <li key={entry.id}>
                {new Date(entry.atEpochMs).toLocaleTimeString()} | {entry.kind} | {entry.message}
              </li>
            ))}
        </ul>
      </section>

      {error && <p className="error">{error}</p>}
    </main>
  );
}
