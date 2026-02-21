import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { GameMode } from "@incident/shared";
import { createRoom } from "../api";
import { useRoomContext } from "../context";

const MODE_CARDS: Array<{
  mode: GameMode;
  emoji: string;
  title: string;
  description: string;
}> = [
  {
    mode: "bomb-defusal",
    emoji: "💣",
    title: "Bomb Defusal",
    description: "Role-asymmetric gauntlet where specialists coordinate to clear staged modules under pressure.",
  },
  {
    mode: "bushfire-command",
    emoji: "🔥",
    title: "Bushfire Command",
    description: "Multi-role wildfire response simulation with tactical map control, evacuations, and public messaging.",
  },
];

const MODE_RITUAL: Record<GameMode, string[]> = {
  "bomb-defusal": [
    "Create a Slack channel for all role callouts.",
    "Assign Device Specialist, Manual Analyst, Safety Officer, and Lead Coordinator.",
    "Enforce verbal confirmation loops before critical actions.",
  ],
  "bushfire-command": [
    "Create a Slack channel for command comms.",
    "Assign Mayor, Firefighter, Police Officer, Radio Host, and Meteorologist.",
    "Use map interactions as execution surface and Slack for coordination only.",
  ],
};

export function HomePage() {
  const [gmName, setGmName] = useState("Facilitator");
  const [mode, setMode] = useState<GameMode>("bomb-defusal");
  const [error, setError] = useState<string | undefined>();
  const [creatingMode, setCreatingMode] = useState<GameMode | undefined>(undefined);

  const navigate = useNavigate();
  const { setSession, setState } = useRoomContext();

  const onCreate = async (selectedMode: GameMode) => {
    setError(undefined);
    setCreatingMode(selectedMode);
    try {
      const created = await createRoom({ gmName, mode: selectedMode });
      setSession({ roomCode: created.roomCode, playerId: created.gmPlayerId, gmSecret: created.gmSecret });
      setState(created.state);
      navigate(`/room/${encodeURIComponent(created.roomCode)}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreatingMode(undefined);
    }
  };

  return (
    <main className="landing-shell">
      <section className="landing-hero">
        <p className="eyebrow">Cinematic Team Simulation</p>
        <h1>Incident Training RPG</h1>
        <p>
          Launch a session, share the invite link, assign roles in the waiting room, then start.
        </p>
        <label>
          Facilitator Name
          <input value={gmName} onChange={(event) => setGmName(event.target.value)} />
        </label>
      </section>

      {MODE_CARDS.map((card) => (
        <section
          key={card.mode}
          className={`landing-card mode-card ${mode === card.mode ? "active" : ""}`}
          onMouseEnter={() => setMode(card.mode)}
        >
          <h2>{card.emoji} {card.title}</h2>
          <p>{card.description}</p>
          <button onClick={() => void onCreate(card.mode)} disabled={creatingMode !== undefined}>
            {creatingMode === card.mode ? "Starting..." : "Start Session"}
          </button>
        </section>
      ))}

      <section className="landing-card ritual-card">
        <h2>Facilitator Ritual</h2>
        <ol>
          {MODE_RITUAL[mode].map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      {error && <p className="error">{error}</p>}
    </main>
  );
}
