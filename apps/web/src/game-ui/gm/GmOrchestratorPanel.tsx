import { useMemo, useState } from "react";
import type { GmOrchestratorPayload, IncidentRole, WidgetId } from "@incident/shared";
import { GmRoleSimulatorPanel } from "./GmRoleSimulatorPanel";

interface GmOrchestratorPanelProps {
  payload: GmOrchestratorPayload;
  widgetIds: WidgetId[];
  onAssignRole: (playerId: string, role: IncidentRole) => void;
  onToggleWidgetAccess: (playerId: string, widgetId: WidgetId, granted: boolean) => void;
  onToggleWidgetLock: (widgetId: WidgetId, locked: boolean) => void;
  onSimulateRole: (role?: IncidentRole) => void;
}

type DrawerId = "roles" | "access" | "locks" | "simulate";

export function GmOrchestratorPanel({
  payload,
  widgetIds,
  onAssignRole,
  onToggleWidgetAccess,
  onToggleWidgetLock,
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
    <section className="scene-widget gm-orchestrator-panel visual-heavy">
      <header className="widget-chip-row">
        <h3>GM Command Deck</h3>
        <div className="chip-strip">
          <span className="chip">players {payload.players.length}</span>
          <span className="chip warning">risks {payload.riskHotspots.length}</span>
        </div>
      </header>

      <div className="visual-stage gm-stage">
        <svg viewBox="0 0 760 220" className="geometry-layer" aria-label="GM tactical overview">
          <rect x={16} y={18} width={728} height={184} rx={18} className="gm-stage-surface" />
          <circle cx={380} cy={110} r={72} className="gm-core-ring" />
          <circle cx={380} cy={110} r={46} className="gm-core-ring inner" />

          {payload.cameraTargets.map((target) => {
            const cx = 40 + target.x * 680;
            const cy = 30 + target.y * 160;
            return (
              <g key={target.id} className="camera-target">
                <line x1={380} y1={110} x2={cx} y2={cy} className="gm-link-line" />
                <circle cx={cx} cy={cy} r={10 + target.urgency * 14} className="camera-node" />
                <text x={54 + target.x * 680} y={34 + target.y * 160} className="camera-label">{target.label}</text>
              </g>
            );
          })}

          {payload.riskHotspots.map((hotspot) => (
            <g key={hotspot.id} className="risk-hotspot">
              <line
                x1={380}
                y1={110}
                x2={40 + hotspot.x * 680}
                y2={30 + hotspot.y * 160}
                className="gm-risk-link"
              />
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
              <h4>{selectedPlayer.name} widget grants</h4>
              <div className="grant-grid">
                {widgetIds.map((widgetId) => (
                  <button
                    key={`${selectedPlayer.id}-${widgetId}`}
                    type="button"
                    className={`grant-chip ${accessSet.has(widgetId) ? "active" : ""}`}
                    onClick={() => onToggleWidgetAccess(selectedPlayer.id, widgetId, !accessSet.has(widgetId))}
                  >
                    {widgetId}
                  </button>
                ))}
              </div>
            </section>
          )}

          {activeDrawer === "locks" && (
            <section className="gm-drawer" role="tabpanel">
              <div className="lock-grid">
                {widgetIds.map((widgetId) => {
                  const locked = payload.widgetLocks[widgetId]?.locked === true;
                  return (
                    <button
                      key={widgetId}
                      type="button"
                      className={`lock-chip ${locked ? "locked" : ""}`}
                      onClick={() => onToggleWidgetLock(widgetId, !locked)}
                    >
                      {widgetId}
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
