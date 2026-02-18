import { useMemo, useState } from "react";
import type { IncidentRole, RoomView } from "@incident/shared";
import type { Session } from "../../types";

const MODE_ROLES: Record<RoomView["mode"], IncidentRole[]> = {
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

const REQUIRED_ROLES: Record<RoomView["mode"], IncidentRole[]> = {
  "bomb-defusal": ["Lead Coordinator", "Device Specialist", "Manual Analyst", "Safety Officer"],
  "bushfire-command": [
    "Incident Controller",
    "Fire Operations SME",
    "Police Operations SME",
    "Public Information Officer",
  ],
};

interface WaitingRoomViewProps {
  state: RoomView;
  session: Session;
  error?: string;
  onAssignRole: (playerId: string, role: IncidentRole) => Promise<void>;
  onStart: (forceStart: boolean) => Promise<void>;
}

export function WaitingRoomView({ state, session, error, onAssignRole, onStart }: WaitingRoomViewProps) {
  const [forceStart, setForceStart] = useState(false);
  const me = state.players.find((player) => player.id === session.playerId);
  const isGm = Boolean(me?.isGameMaster);

  const roles = MODE_ROLES[state.mode];
  const missingRequiredRoles = useMemo(() => {
    const present = new Set(state.players.map((player) => player.role));
    return REQUIRED_ROLES[state.mode].filter((role) => !present.has(role));
  }, [state.mode, state.players]);

  const inviteLink =
    typeof window === "undefined"
      ? `/join/${state.roomCode}`
      : `${window.location.origin}/join/${state.roomCode}`;

  const copyInviteLink = async () => {
    await navigator.clipboard.writeText(inviteLink);
  };

  return (
    <main className="game-shell waiting-room-shell">
      <section className="waiting-room-header">
        <div>
          <p className="eyebrow">Waiting Room</p>
          <h1>{state.mode === "bomb-defusal" ? "💣 Bomb Defusal" : "🔥 Bushfire Command"}</h1>
          <div className="topbar-chipline">
            <span className="chip">Room {state.roomCode}</span>
            <span className="chip supporting">{state.players.length} players</span>
            <span className={`chip ${missingRequiredRoles.length === 0 ? "good" : "warning"}`}>
              {missingRequiredRoles.length === 0 ? "Ready" : `${missingRequiredRoles.length} roles missing`}
            </span>
          </div>
        </div>
        <div className="waiting-room-controls">
          <button className="secondary mini" onClick={copyInviteLink}>
            Copy Invite Link
          </button>
        </div>
      </section>

      <section className="waiting-room-roster">
        <h2>Team Roster</h2>
        <div className="waiting-player-grid">
          {state.players.map((player) => (
            <article key={player.id} className="waiting-player-card">
              <div className="waiting-player-meta">
                <strong>{player.name}</strong>
                {player.isGameMaster && <span className="chip supporting">GM</span>}
              </div>
              {isGm ? (
                <select
                  value={player.role}
                  onChange={(event) => void onAssignRole(player.id, event.target.value as IncidentRole)}
                >
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="waiting-role-label">{player.role}</p>
              )}
            </article>
          ))}
        </div>
      </section>

      {isGm && (
        <section className="waiting-room-start">
          {missingRequiredRoles.length > 0 && (
            <p className="warning-text">Missing roles: {missingRequiredRoles.join(", ")}</p>
          )}
          <label className="mini-switch">
            <input
              type="checkbox"
              checked={forceStart}
              onChange={(event) => setForceStart(event.target.checked)}
            />
            force start
          </label>
          <button onClick={() => void onStart(forceStart)} disabled={missingRequiredRoles.length > 0 && !forceStart}>
            Start Session
          </button>
        </section>
      )}

      {!isGm && (
        <section className="waiting-room-note">
          <p>Waiting for GM to assign roles and start session.</p>
        </section>
      )}

      {error && <p className="error">{error}</p>}
    </main>
  );
}
