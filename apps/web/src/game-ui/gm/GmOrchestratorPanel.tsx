import { useMemo, useState } from "react";
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

type DrawerId = "roles" | "access" | "locks" | "simulate";

export function GmOrchestratorPanel({
  payload,
  panelIds,
  onAssignRole,
  onTogglePanelAccess,
  onTogglePanelLock,
  onSimulateRole,
}: GmOrchestratorPanelProps) {
  const [activeDrawer, setActiveDrawer] = useState<DrawerId | undefined>("roles");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(payload.players[0]?.id ?? "");

  const selectedPlayer = useMemo(
    () => payload.players.find((player) => player.id === selectedPlayerId) ?? payload.players[0],
    [payload.players, selectedPlayerId],
  );

  const accessSet = new Set(payload.accessByPlayer[selectedPlayer?.id ?? ""] ?? []);

  return (
    <section className="scene-panel gm-orchestrator-panel visual-heavy">
      <header className="panel-chip-row">
        <h3>GM Command Deck</h3>
        <div className="chip-strip">
          <span className="chip">players {payload.players.length}</span>
          <span className="chip warning">risks {payload.riskHotspots.length}</span>
        </div>
      </header>

      <div className="visual-stage gm-stage">
        <svg viewBox="0 0 760 220" className="geometry-layer" aria-label="GM tactical overview">
          <rect x={16} y={18} width={728} height={184} rx={18} className="gm-stage-surface" />

          {payload.cameraTargets.map((target) => (
            <g key={target.id} className="camera-target">
              <circle cx={40 + target.x * 680} cy={30 + target.y * 160} r={10 + target.urgency * 14} className="camera-node" />
              <text x={54 + target.x * 680} y={34 + target.y * 160} className="camera-label">{target.label}</text>
            </g>
          ))}

          {payload.riskHotspots.map((hotspot) => (
            <g key={hotspot.id} className="risk-hotspot">
              <circle cx={40 + hotspot.x * 680} cy={30 + hotspot.y * 160} r={8 + hotspot.severity * 16} className="risk-node" />
              <text x={52 + hotspot.x * 680} y={26 + hotspot.y * 160} className="risk-hotspot-label">{hotspot.label}</text>
            </g>
          ))}
        </svg>

        <div className="drawer-tabs" role="tablist" aria-label="GM controls">
          {payload.drawerSections.map((drawer) => (
            <button
              key={drawer.id}
              type="button"
              role="tab"
              className={`drawer-tab ${activeDrawer === drawer.id ? "active" : ""}`}
              onClick={() => setActiveDrawer(activeDrawer === drawer.id ? undefined : drawer.id)}
            >
              {drawer.title}
            </button>
          ))}
        </div>

        <div className="drawer-stack">
          {activeDrawer === "roles" && (
            <section className="gm-drawer" role="tabpanel">
              <div className="gm-player-pills">
                {payload.players.map((player) => (
                  <button
                    key={player.id}
                    type="button"
                    className={`gm-player-pill ${selectedPlayer?.id === player.id ? "active" : ""}`}
                    onClick={() => setSelectedPlayerId(player.id)}
                  >
                    {player.name}
                  </button>
                ))}
              </div>

              {selectedPlayer && (
                <div className="gm-role-picker">
                  {payload.roleOptions.map((role) => (
                    <button
                      key={`${selectedPlayer.id}-${role}`}
                      type="button"
                      className={`role-pill ${selectedPlayer.role === role ? "active" : ""}`}
                      onClick={() => onAssignRole(selectedPlayer.id, role)}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeDrawer === "access" && selectedPlayer && (
            <section className="gm-drawer" role="tabpanel">
              <h4>{selectedPlayer.name} panel grants</h4>
              <div className="grant-grid">
                {panelIds.map((panelId) => (
                  <button
                    key={`${selectedPlayer.id}-${panelId}`}
                    type="button"
                    className={`grant-chip ${accessSet.has(panelId) ? "active" : ""}`}
                    onClick={() => onTogglePanelAccess(selectedPlayer.id, panelId, !accessSet.has(panelId))}
                  >
                    {panelId}
                  </button>
                ))}
              </div>
            </section>
          )}

          {activeDrawer === "locks" && (
            <section className="gm-drawer" role="tabpanel">
              <div className="lock-grid">
                {panelIds.map((panelId) => {
                  const locked = payload.panelLocks[panelId]?.locked === true;
                  return (
                    <button
                      key={panelId}
                      type="button"
                      className={`lock-chip ${locked ? "locked" : ""}`}
                      onClick={() => onTogglePanelLock(panelId, !locked)}
                    >
                      {panelId}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {activeDrawer === "simulate" && (
            <section className="gm-drawer" role="tabpanel">
              <GmRoleSimulatorPanel
                roleOptions={payload.roleOptions}
                simulatedRole={payload.simulatedRole}
                onSimulateRole={onSimulateRole}
              />
            </section>
          )}
        </div>
      </div>
    </section>
  );
}
