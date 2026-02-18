import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { GameMode, IncidentRole } from "@incident/shared";
import { createRoom, joinRoom } from "../api";
import { useRoomContext } from "../context";

const MODE_ROLES: Record<GameMode, IncidentRole[]> = {
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
  const [gmName, setGmName] = useState("Facilitator");
  const [mode, setMode] = useState<GameMode>("bomb-defusal");
  const [joinCode, setJoinCode] = useState("");
  const [joinName, setJoinName] = useState("Player");
  const [joinRole, setJoinRole] = useState<IncidentRole>("Observer");
  const [error, setError] = useState<string | undefined>();

  const navigate = useNavigate();
  const { setSession, setState } = useRoomContext();

  const roleOptions = useMemo(() => MODE_ROLES[mode], [mode]);

  const onCreate = async () => {
    setError(undefined);
    try {
      const created = await createRoom({ gmName, mode });
      setSession({ roomCode: created.roomCode, playerId: created.gmPlayerId, gmSecret: created.gmSecret });
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
    <main className="landing-shell">
      <section className="landing-hero">
        <p className="eyebrow">Cinematic Team Simulation</p>
        <h1>Scene Panel Crisis Games</h1>
        <p>
          Real-time multiplayer drills with strict information asymmetry. Run communication in Slack, execute operations in the game.
        </p>
        <div className="mode-selector">
          <button className={mode === "bomb-defusal" ? "active" : ""} onClick={() => setMode("bomb-defusal")}>Bomb Defusal</button>
          <button className={mode === "bushfire-command" ? "active" : ""} onClick={() => setMode("bushfire-command")}>Bushfire Command</button>
        </div>
      </section>

      <section className="landing-card">
        <h2>Create Room (GM)</h2>
        <label>
          Facilitator Name
          <input value={gmName} onChange={(event) => setGmName(event.target.value)} />
        </label>
        <label>
          Scenario
          <select value={mode} onChange={(event) => setMode(event.target.value as GameMode)}>
            <option value="bomb-defusal">Bomb Defusal</option>
            <option value="bushfire-command">Bushfire Command</option>
          </select>
        </label>
        <button onClick={onCreate}>Create Session</button>
      </section>

      <section className="landing-card">
        <h2>Join Room</h2>
        <label>
          Room Code
          <input value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} />
        </label>
        <label>
          Display Name
          <input value={joinName} onChange={(event) => setJoinName(event.target.value)} />
        </label>
        <label>
          Requested Role
          <select value={joinRole} onChange={(event) => setJoinRole(event.target.value as IncidentRole)}>
            {roleOptions.map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </label>
        <button onClick={onJoin}>Join Session</button>
      </section>

      <section className="landing-card ritual-card">
        <h2>Facilitator Ritual</h2>
        <ol>
          <li>Create dedicated Slack channel and call.</li>
          <li>Assign roles in lobby before launch.</li>
          <li>Remind team: no in-app chat, only Slack comms.</li>
        </ol>
      </section>

      {error && <p className="error">{error}</p>}
    </main>
  );
}
