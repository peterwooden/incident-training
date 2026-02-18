import type { GmOrchestratorPayload, IncidentRole, ScenePanelId } from "@incident/shared";
import { GmRoleSimulatorPanel } from "./GmRoleSimulatorPanel";

interface GmOrchestratorPanelProps {
  payload: GmOrchestratorPayload;
  panelIds: ScenePanelId[];
  onAssignRole: (playerId: string, role: IncidentRole) => void;
  onTogglePanelAccess: (playerId: string, panelId: ScenePanelId, granted: boolean) => void;
  onTogglePanelLock: (panelId: ScenePanelId, locked: boolean) => void;
  onSimulateRole: (role?: IncidentRole) => void;
}

export function GmOrchestratorPanel({
  payload,
  panelIds,
  onAssignRole,
  onTogglePanelAccess,
  onTogglePanelLock,
  onSimulateRole,
}: GmOrchestratorPanelProps) {
  return (
    <section className="scene-panel gm-orchestrator-panel">
      <header>
        <h3>GM Orchestrator</h3>
        <p>Control role finalization, panel access, and runtime locks.</p>
      </header>

      <GmRoleSimulatorPanel
        roleOptions={payload.roleOptions}
        simulatedRole={payload.simulatedRole}
        onSimulateRole={onSimulateRole}
      />

      <h4>Role Assignment</h4>
      <div className="gm-player-grid">
        {payload.players.map((player) => (
          <article key={player.id} className="gm-player-card">
            <p>
              <strong>{player.name}</strong> {player.isGameMaster ? "(GM)" : ""}
            </p>
            <select value={player.role} onChange={(event) => onAssignRole(player.id, event.target.value as IncidentRole)}>
              {payload.roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            <details>
              <summary>Panel Access</summary>
              <div className="gm-panel-access-list">
                {panelIds.map((panelId) => {
                  const hasPanel = (payload.accessByPlayer[player.id] ?? []).includes(panelId);
                  return (
                    <label key={`${player.id}-${panelId}`}>
                      <input
                        type="checkbox"
                        checked={hasPanel}
                        onChange={(event) => onTogglePanelAccess(player.id, panelId, event.target.checked)}
                      />
                      {panelId}
                    </label>
                  );
                })}
              </div>
            </details>
          </article>
        ))}
      </div>

      <h4>Panel Locks</h4>
      <div className="gm-panel-locks">
        {panelIds.map((panelId) => {
          const locked = payload.panelLocks[panelId]?.locked === true;
          return (
            <button key={panelId} className={locked ? "danger" : "secondary"} onClick={() => onTogglePanelLock(panelId, !locked)}>
              {locked ? `Unlock ${panelId}` : `Lock ${panelId}`}
            </button>
          );
        })}
      </div>
    </section>
  );
}
