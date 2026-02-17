import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { BombScenarioView, BushfireScenarioView, PlayerActionType } from "@incident/shared";
import { sendAction, startRoom, subscribeToRoom } from "../api";
import { useRoomContext } from "../context";

const ADVISORY_TEMPLATES = [
  "Evacuate immediately from high-risk streets.",
  "Shelter at community center until next update.",
  "Road access changing. Follow police direction.",
];

function statusTone(status: string): string {
  if (status === "resolved") return "tone-good";
  if (status === "failed") return "tone-bad";
  return "tone-live";
}

export function RoomPage() {
  const { roomCode = "" } = useParams();
  const { session, state, setState } = useRoomContext();
  const [error, setError] = useState<string | undefined>();
  const [advisory, setAdvisory] = useState(ADVISORY_TEMPLATES[0]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!session || session.roomCode !== roomCode) {
      navigate("/");
      return;
    }

    const close = subscribeToRoom(roomCode, session.playerId, setState);
    return close;
  }, [navigate, roomCode, session, setState]);

  const me = useMemo(() => state?.players.find((player) => player.id === session?.playerId), [session, state]);

  if (!session || !state) {
    return <main className="scenario-page">Loading...</main>;
  }

  const execute = async (actionType: PlayerActionType, payload?: Record<string, string>) => {
    setError(undefined);
    try {
      const updated = await sendAction(roomCode, {
        playerId: session.playerId,
        actionType,
        payload,
      });
      setState(updated.state);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const onStart = async () => {
    if (!session.gmSecret) return;
    setError(undefined);
    try {
      const started = await startRoom(roomCode, { gmSecret: session.gmSecret });
      setState(started.state);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <main className="scenario-page">
      <section className="hud card">
        <div>
          <p className="eyebrow">Room {state.roomCode}</p>
          <h1>{state.mode === "bomb-defusal" ? "Bomb Defusal Simulation" : "Bushfire Command Simulation"}</h1>
          <p className="hint">All communications should happen in Slack. Game UI is your operation surface only.</p>
        </div>
        <div className="hud-stats">
          <p className={statusTone(state.status)}>Status: {state.status}</p>
          <p>Score: {state.score}</p>
          <p>Pressure: {state.pressure}</p>
          <p>Your Role: {me?.role ?? "Unknown"}</p>
          <button
            onClick={() => navigator.clipboard.writeText(state.roomCode)}
            className="secondary"
            title="Copy room code"
          >
            Copy Room Code
          </button>
          {session.gmSecret && state.status === "lobby" && <button onClick={onStart}>Launch Scenario</button>}
        </div>
      </section>

      <section className="card">
        <h2>Mission Pulse</h2>
        <p>{state.publicSummary}</p>
        <ul>
          {state.objectives.map((objective) => (
            <li key={objective.id}>
              {objective.completed ? "[done]" : "[todo]"} {objective.description}
            </li>
          ))}
        </ul>
      </section>

      {state.scenario.type === "bomb-defusal" ? (
        <BombDefusalPanel scenario={state.scenario} onAction={execute} locked={state.status !== "running"} />
      ) : (
        <BushfirePanel
          scenario={state.scenario}
          onAction={execute}
          locked={state.status !== "running"}
          advisory={advisory}
          setAdvisory={setAdvisory}
        />
      )}

      <section className="card timeline-card">
        <h2>Scenario Feed</h2>
        <ul>
          {state.timeline
            .slice()
            .reverse()
            .slice(0, 12)
            .map((entry) => (
              <li key={entry.id}>
                <strong>{new Date(entry.atEpochMs).toLocaleTimeString()}</strong> {entry.message}
              </li>
            ))}
        </ul>
      </section>

      {error && <p className="error">{error}</p>}
    </main>
  );
}

function BombDefusalPanel({
  scenario,
  onAction,
  locked,
}: {
  scenario: BombScenarioView;
  onAction: (actionType: PlayerActionType, payload?: Record<string, string>) => Promise<void>;
  locked: boolean;
}) {
  return (
    <>
      <section className="card bomb-core">
        <h2>Device Core</h2>
        <div className="meter-row">
          <span>Timer: {scenario.timerSec}s</span>
          <span>
            Strikes: {scenario.strikes}/{scenario.maxStrikes}
          </span>
          <span>Status: {scenario.status}</span>
        </div>
        <div className="wires">
          {scenario.wires.map((wire) => (
            <button
              key={wire.id}
              disabled={locked || wire.isCut || scenario.status !== "armed"}
              className={`wire wire-${wire.color} ${wire.isCut ? "cut" : ""}`}
              onClick={() => onAction("bomb_cut_wire", { wireId: wire.id })}
            >
              {wire.id} {wire.color} {wire.isCut ? "(cut)" : "(active)"}
            </button>
          ))}
        </div>
        <h3>Glyph Pad</h3>
        <div className="symbols">
          {scenario.symbolModule.availableSymbols.map((symbol) => (
            <button
              key={symbol}
              disabled={locked || scenario.status !== "armed"}
              className="symbol-btn"
              onClick={() => onAction("bomb_press_symbol", { symbol })}
            >
              {symbol}
            </button>
          ))}
        </div>
        <p>Entered sequence: {scenario.symbolModule.enteredSequence.join(" -> ") || "none"}</p>
        <button disabled={locked || scenario.status !== "armed"} onClick={() => onAction("bomb_stabilize_panel")}>
          Stabilize Panel
        </button>
      </section>

      <section className="card clue-card">
        <h2>Role Briefing</h2>
        <p>{scenario.roleInstruction}</p>
        <ul>
          {scenario.visibleClues.map((clue, idx) => (
            <li key={`${clue}-${idx}`}>{clue}</li>
          ))}
        </ul>
      </section>
    </>
  );
}

function BushfirePanel({
  scenario,
  onAction,
  locked,
  advisory,
  setAdvisory,
}: {
  scenario: BushfireScenarioView;
  onAction: (actionType: PlayerActionType, payload?: Record<string, string>) => Promise<void>;
  locked: boolean;
  advisory: string;
  setAdvisory: (next: string) => void;
}) {
  return (
    <>
      <section className="card bushfire-core">
        <h2>Town Operations Map</h2>
        <div className="meter-row">
          <span>Timer: {scenario.timerSec}s</span>
          <span>Containment: {scenario.containment}%</span>
          <span>Anxiety: {scenario.publicAnxiety}%</span>
          <span>
            Wind: {scenario.windDirection} / {scenario.windStrength}
          </span>
          <span>Water Bombs: {scenario.waterBombsAvailable}</span>
        </div>
        <div className="map-grid">
          {scenario.cells.map((cell) => (
            <article
              key={cell.id}
              className="map-cell"
              style={{
                background: `linear-gradient(135deg, rgba(255,130,88,${Math.min(0.9, cell.fireLevel / 100 + 0.1)}), rgba(42,57,79,0.8))`,
              }}
            >
              <h4>{cell.zoneName}</h4>
              <p>Fire {cell.fireLevel}%</p>
              <p>Population {cell.population}</p>
              <p>{cell.evacuated ? "Evacuated" : "Not Evacuated"}</p>
              <div className="cell-actions">
                <button disabled={locked} onClick={() => onAction("bushfire_deploy_fire_crew", { cellId: cell.id })}>
                  Crew
                </button>
                <button disabled={locked} onClick={() => onAction("bushfire_drop_water", { cellId: cell.id })}>
                  Water
                </button>
                <button disabled={locked} onClick={() => onAction("bushfire_create_firebreak", { cellId: cell.id })}>
                  Firebreak
                </button>
                <button disabled={locked} onClick={() => onAction("bushfire_set_roadblock", { cellId: cell.id })}>
                  Roadblock
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="card clue-card">
        <h2>Role Briefing</h2>
        <p>{scenario.roleInstruction}</p>
        <ul>
          {scenario.visibleClues.map((clue, idx) => (
            <li key={`${clue}-${idx}`}>{clue}</li>
          ))}
        </ul>
        <label>
          Public Advisory
          <select value={advisory} onChange={(event) => setAdvisory(event.target.value)}>
            {ADVISORY_TEMPLATES.map((template) => (
              <option key={template} value={template}>
                {template}
              </option>
            ))}
          </select>
        </label>
        <button
          disabled={locked}
          onClick={() => onAction("bushfire_issue_public_update", { template: advisory })}
        >
          Publish Advisory
        </button>
        <h3>Published Advisories</h3>
        <ul>
          {scenario.publicAdvisories.slice(-5).map((item, idx) => (
            <li key={`${item}-${idx}`}>{item}</li>
          ))}
        </ul>
      </section>
    </>
  );
}
