import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { GameMode } from "@incident/shared";
import { createRoom, joinRoom } from "../api";
import { useRoomContext } from "../context";

export function HomePage() {
  const [gmName, setGmName] = useState("Game Master");
  const [mode, setMode] = useState<GameMode>("sev-escalation");
  const [joinCode, setJoinCode] = useState("");
  const [joinName, setJoinName] = useState("Engineer");
  const [error, setError] = useState<string | undefined>();
  const navigate = useNavigate();
  const { setSession, setState } = useRoomContext();

  const onCreate = async () => {
    setError(undefined);
    try {
      const created = await createRoom({ gmName, mode });
      setSession({
        roomCode: created.roomCode,
        playerId: created.gmPlayerId,
        gmSecret: created.gmSecret,
      });
      setState(created.state);
      navigate(`/room/${encodeURIComponent(created.roomCode)}`);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const onJoin = async () => {
    setError(undefined);
    try {
      const joined = await joinRoom(joinCode, { name: joinName });
      setSession({ roomCode: joinCode, playerId: joined.playerId });
      setState(joined.state);
      navigate(`/room/${encodeURIComponent(joinCode)}`);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <main className="page">
      <section className="card">
        <h1>Incident Training RPG</h1>
        <p>Run multiplayer drills for incident coordination roles and communication discipline.</p>
        <label>
          GM Name
          <input value={gmName} onChange={(e) => setGmName(e.target.value)} />
        </label>
        <label>
          Mode
          <select value={mode} onChange={(e) => setMode(e.target.value as GameMode)}>
            <option value="sev-escalation">SEV Escalation</option>
            <option value="comms-crisis">Comms Crisis</option>
          </select>
        </label>
        <button onClick={onCreate}>Create Room</button>
      </section>

      <section className="card">
        <h2>Join Room</h2>
        <label>
          Room Code
          <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} />
        </label>
        <label>
          Name
          <input value={joinName} onChange={(e) => setJoinName(e.target.value)} />
        </label>
        <button onClick={onJoin}>Join</button>
      </section>

      {error && <p className="error">{error}</p>}
    </main>
  );
}
