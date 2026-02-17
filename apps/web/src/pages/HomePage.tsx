import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { GameMode, IncidentRole } from "@incident/shared";
import { createRoom, joinRoom } from "../api";
import { useRoomContext } from "../context";

const ROLE_OPTIONS: Record<GameMode, IncidentRole[]> = {
  "bomb-defusal": [
    "Lead Coordinator",
    "Device Specialist",
    "Manual Analyst",
    "Safety Officer",
    "Observer",
  ],
  "bushfire-command": [
    "Incident Controller",
    "Fire Operations SME",
    "Police Operations SME",
    "Public Information Officer",
    "Observer",
  ],
};

export function HomePage() {
  const [gmName, setGmName] = useState("Game Master");
  const [mode, setMode] = useState<GameMode>("bomb-defusal");
  const [joinCode, setJoinCode] = useState("");
  const [joinName, setJoinName] = useState("Player");
  const [joinRole, setJoinRole] = useState<IncidentRole>("Observer");
  const [error, setError] = useState<string | undefined>();
  const navigate = useNavigate();
  const { setSession, setState } = useRoomContext();

  const modeRoles = useMemo(() => ROLE_OPTIONS[mode], [mode]);

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
      const joined = await joinRoom(joinCode, { name: joinName, preferredRole: joinRole });
      setSession({ roomCode: joinCode, playerId: joined.playerId });
      setState(joined.state);
      navigate(`/room/${encodeURIComponent(joinCode)}`);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <main className="landing">
      <section className="hero card">
        <p className="eyebrow">Multiplayer Crisis Simulation</p>
        <h1>Command Under Pressure</h1>
        <p>
          Play a high-intensity cooperative simulation. Communicate only in Slack while operating the game surface.
          One team sees the device or map, others hold the critical playbook clues.
        </p>
        <div className="mode-grid">
          <article className={`mode-card ${mode === "bomb-defusal" ? "active" : ""}`}>
            <h3>Bomb Defusal</h3>
            <p>Asymmetric puzzle pressure inspired by social defusal games.</p>
            <button onClick={() => setMode("bomb-defusal")}>Choose Bomb Scenario</button>
          </article>
          <article className={`mode-card ${mode === "bushfire-command" ? "active" : ""}`}>
            <h3>Bushfire Command</h3>
            <p>Coordinate fire spread containment across a dynamic town map.</p>
            <button onClick={() => setMode("bushfire-command")}>Choose Bushfire Scenario</button>
          </article>
        </div>
      </section>

      <section className="card">
        <h2>Create Session</h2>
        <label>
          Facilitator Name
          <input value={gmName} onChange={(e) => setGmName(e.target.value)} />
        </label>
        <label>
          Scenario Mode
          <select value={mode} onChange={(e) => setMode(e.target.value as GameMode)}>
            <option value="bomb-defusal">Bomb Defusal</option>
            <option value="bushfire-command">Bushfire Command</option>
          </select>
        </label>
        <p className="hint">Recommended Slack setup: one shared call and one incident text channel.</p>
        <button onClick={onCreate}>Create Room</button>
      </section>

      <section className="card">
        <h2>Join Session</h2>
        <label>
          Room Code
          <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} />
        </label>
        <label>
          Name
          <input value={joinName} onChange={(e) => setJoinName(e.target.value)} />
        </label>
        <label>
          Preferred Role
          <select value={joinRole} onChange={(e) => setJoinRole(e.target.value as IncidentRole)}>
            {modeRoles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>
        <button onClick={onJoin}>Join Room</button>
      </section>

      {error && <p className="error">{error}</p>}
    </main>
  );
}
