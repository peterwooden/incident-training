import { useEffect, useMemo, useState } from "react";
import type {
  BombCoordinationBoardPayload,
  BombDeviceConsolePayload,
  BombRulebookPayload,
  BombSafetyTelemetryPayload,
  BushfireMapPayload,
  DebriefReplayPayload,
  FireOpsPayload,
  GmOrchestratorPayload,
  IncidentCommandPayload,
  IncidentRole,
  MissionHudPayload,
  PoliceOpsPayload,
  PlayerActionType,
  PublicInfoPayload,
  RoomView,
  ScenePanelId,
} from "@incident/shared";
import type { Session } from "../../types";
import { useAudioBus } from "../../audio/AudioBus";
import { BombCoordinationBoardPanel } from "../panels/bomb/BombCoordinationBoardPanel";
import { BombDeviceConsolePanel } from "../panels/bomb/BombDeviceConsolePanel";
import { BombRulebookPanel } from "../panels/bomb/BombRulebookPanel";
import { BombSafetyTelemetryPanel } from "../panels/bomb/BombSafetyTelemetryPanel";
import { BushfireMapPanel } from "../panels/bushfire/BushfireMapPanel";
import { FireOpsPanel } from "../panels/bushfire/FireOpsPanel";
import { IncidentCommandPanel } from "../panels/bushfire/IncidentCommandPanel";
import { PoliceOpsPanel } from "../panels/bushfire/PoliceOpsPanel";
import { PublicInfoPanel } from "../panels/bushfire/PublicInfoPanel";
import { DebriefReplayPanel } from "../gm/DebriefReplayPanel";
import { GmOrchestratorPanel } from "../gm/GmOrchestratorPanel";
import { PanelDashboard } from "./PanelDashboard";
import { useReducedFx } from "../visuals/core";

const REQUIRED_ROLES: Record<RoomView["mode"], IncidentRole[]> = {
  "bomb-defusal": ["Lead Coordinator", "Device Specialist", "Manual Analyst", "Safety Officer"],
  "bushfire-command": [
    "Incident Controller",
    "Fire Operations SME",
    "Police Operations SME",
    "Public Information Officer",
  ],
};

interface GameHudShellProps {
  state: RoomView;
  session: Session;
  error?: string;
  onStart: (forceStart: boolean) => Promise<void>;
  onAction: (
    actionType: PlayerActionType,
    panelId: ScenePanelId,
    payload?: Record<string, string | number | boolean>,
  ) => Promise<void>;
  onAssignRole: (playerId: string, role: IncidentRole) => Promise<void>;
  onSetPanelAccess: (playerId: string, panelId: ScenePanelId, granted: boolean) => Promise<void>;
  onSetPanelLock: (panelId: ScenePanelId, locked: boolean) => Promise<void>;
  onSetSimulatedRole: (role?: IncidentRole) => Promise<void>;
}

export function GameHudShell({
  state,
  session,
  error,
  onStart,
  onAction,
  onAssignRole,
  onSetPanelAccess,
  onSetPanelLock,
  onSetSimulatedRole,
}: GameHudShellProps) {
  const [forceStart, setForceStart] = useState(false);
  const [rulebookPage, setRulebookPage] = useState(0);
  const [advisoryDraft, setAdvisoryDraft] = useState("Evacuate high-risk sectors immediately.");
  const [debriefIndex, setDebriefIndex] = useState(0);

  const { settings, setMuted, setVolume, triggerCue } = useAudioBus();
  const fx = useReducedFx();

  const me = useMemo(
    () => state.players.find((player) => player.id === session.playerId),
    [session.playerId, state.players],
  );
  const isGm = Boolean(me?.isGameMaster);

  const missingRequiredRoles = useMemo(() => {
    const required = REQUIRED_ROLES[state.mode] ?? [];
    const present = new Set(state.players.map((player) => player.role));
    return required.filter((role) => !present.has(role));
  }, [state.mode, state.players]);

  useEffect(() => {
    const orderedPanels = state.panelDeck.defaultOrder
      .map((panelId) => state.panelDeck.panelsById[panelId])
      .filter(Boolean);
    const cue = orderedPanels.find((panel) => panel?.audioCue)?.audioCue;
    triggerCue(cue);
  }, [state.timeline.length, state.panelDeck.defaultOrder, state.panelDeck.panelsById, triggerCue]);

  const renderPanel = (panelId: string) => {
    const panel = state.panelDeck.panelsById[panelId as ScenePanelId];
    if (!panel) {
      return null;
    }
    const effectiveFxProfile = fx.fxProfile === "reduced" ? "reduced" : panel.fxProfile;

    switch (panel.id) {
      case "mission_hud": {
        const payload = panel.payload as MissionHudPayload;
        return (
          <section className="scene-panel mission-hud-panel visual-heavy">
            <header className="panel-chip-row">
              <h3>{panel.title}</h3>
              <div className="chip-strip">
                <span className="chip warning">{payload.timerSec}s</span>
                <span className="chip">P{payload.pressure}</span>
                <span className="chip good">S{payload.score}</span>
              </div>
            </header>

            <div className="visual-stage mission-stage">
              <svg viewBox="0 0 360 170" className="geometry-layer" aria-label="Mission status">
                <defs>
                  <linearGradient id="hudDeckGlow" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#86bcff55" />
                    <stop offset="100%" stopColor="#ff8f6540" />
                  </linearGradient>
                  <linearGradient id="hudRingActive" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#ffa66c" />
                    <stop offset="100%" stopColor="#ff5a43" />
                  </linearGradient>
                </defs>

                <rect x={12} y={12} width={336} height={146} rx={18} className="hud-deck-surface" />
                <rect x={12} y={12} width={336} height={146} rx={18} fill="url(#hudDeckGlow)" opacity={0.3} />

                <circle cx={70} cy={84} r={54} className="hud-ring" />
                <circle
                  cx={70}
                  cy={84}
                  r={54}
                  className="hud-ring-progress"
                  style={{ stroke: "url(#hudRingActive)", strokeDasharray: `${Math.round((payload.pressure / 100) * 339)} 339` }}
                />
                <circle cx={70} cy={84} r={36} className="hud-core-disc" />
                <text x={70} y={90} textAnchor="middle" className="hud-value">{payload.pressure}</text>

                <g className="hud-right-grid">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <line key={`hud_h_${idx}`} x1={146} y1={38 + idx * 20} x2={332} y2={38 + idx * 20} className="hud-grid-line" />
                  ))}
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <line key={`hud_v_${idx}`} x1={146 + idx * 62} y1={34} x2={146 + idx * 62} y2={118} className="hud-grid-line" />
                  ))}
                </g>

                <polyline points="146,86 168,74 186,80 204,60 226,68 246,52 270,62 294,50 332,58" className="hud-wave" />

                <rect x={146} y={124} width={186} height={26} rx={8} className="hud-status-pill" />
                <text x={156} y={141} className="hud-status-text">status {payload.status}</text>

                <g className="hud-metric-lane">
                  <rect x={146} y={48} width={56} height={8} rx={4} className="hud-metric-track" />
                  <rect x={146} y={48} width={Math.max(6, Math.min(56, (payload.timerSec / 600) * 56))} height={8} rx={4} className="hud-metric-fill timer" />
                  <rect x={214} y={48} width={56} height={8} rx={4} className="hud-metric-track" />
                  <rect x={214} y={48} width={Math.max(6, Math.min(56, (payload.score / 100) * 56))} height={8} rx={4} className="hud-metric-fill score" />
                  <rect x={282} y={48} width={50} height={8} rx={4} className="hud-metric-track" />
                  <rect x={282} y={48} width={Math.max(6, Math.min(50, (payload.pressure / 100) * 50))} height={8} rx={4} className="hud-metric-fill pressure" />
                </g>
              </svg>
            </div>
          </section>
        );
      }
      case "device_console":
        return (
          <BombDeviceConsolePanel
            payload={panel.payload as BombDeviceConsolePayload}
            locked={panel.locked.locked || state.status !== "running"}
            fxProfile={effectiveFxProfile}
            ambientLoopMs={panel.ambientLoopMs}
            hoverDepthPx={panel.hoverDepthPx}
            onCutWire={(wireId) => onAction("bomb_cut_wire", "device_console", { wireId })}
            onPressSymbol={(symbol) => onAction("bomb_press_symbol", "device_console", { symbol })}
            onStabilize={() => onAction("bomb_stabilize_panel", "device_console")}
          />
        );
      case "manual_rulebook":
        return (
          <BombRulebookPanel
            payload={panel.payload as BombRulebookPayload}
            currentPage={rulebookPage}
            onChangePage={setRulebookPage}
            fxProfile={effectiveFxProfile}
            ambientLoopMs={panel.ambientLoopMs}
            hoverDepthPx={panel.hoverDepthPx}
          />
        );
      case "safety_telemetry":
        return (
          <BombSafetyTelemetryPanel
            payload={panel.payload as BombSafetyTelemetryPayload}
            locked={panel.locked.locked || state.status !== "running"}
            onStabilize={() => onAction("bomb_stabilize_panel", "safety_telemetry")}
          />
        );
      case "coordination_board":
        return <BombCoordinationBoardPanel payload={panel.payload as BombCoordinationBoardPayload} />;
      case "town_map":
        return (
          <BushfireMapPanel
            payload={panel.payload as BushfireMapPayload}
            locked={panel.locked.locked || state.status !== "running"}
            fxProfile={effectiveFxProfile}
            ambientLoopMs={panel.ambientLoopMs}
            hoverDepthPx={panel.hoverDepthPx}
            canUseFireTools={Boolean(state.panelDeck.panelsById.fire_ops_console) || isGm}
            canUsePoliceTools={Boolean(state.panelDeck.panelsById.police_ops_console) || isGm}
            onDeployCrew={(cellId) => onAction("bushfire_deploy_fire_crew", "fire_ops_console", { cellId })}
            onDropWater={(cellId) => onAction("bushfire_drop_water", "fire_ops_console", { cellId })}
            onCreateFirebreak={(cellId) => onAction("bushfire_create_firebreak", "fire_ops_console", { cellId })}
            onSetRoadblock={(cellId) => onAction("bushfire_set_roadblock", "police_ops_console", { cellId })}
          />
        );
      case "fire_ops_console":
        return <FireOpsPanel payload={panel.payload as FireOpsPayload} />;
      case "police_ops_console":
        return <PoliceOpsPanel payload={panel.payload as PoliceOpsPayload} />;
      case "public_info_console":
        return (
          <PublicInfoPanel
            payload={panel.payload as PublicInfoPayload}
            advisoryDraft={advisoryDraft}
            onDraftChange={setAdvisoryDraft}
            onPublish={() => onAction("bushfire_issue_public_update", "public_info_console", { template: advisoryDraft })}
            locked={panel.locked.locked || state.status !== "running"}
          />
        );
      case "incident_command_console":
        return <IncidentCommandPanel payload={panel.payload as IncidentCommandPayload} />;
      case "gm_orchestrator": {
        const payload = panel.payload as GmOrchestratorPayload;
        const panelIds = Object.keys(state.panelDeck.panelsById) as ScenePanelId[];
        return (
          <GmOrchestratorPanel
            payload={payload}
            panelIds={panelIds}
            onAssignRole={onAssignRole}
            onTogglePanelAccess={onSetPanelAccess}
            onTogglePanelLock={onSetPanelLock}
            onSimulateRole={onSetSimulatedRole}
          />
        );
      }
      case "debrief_replay":
        return (
          <DebriefReplayPanel
            payload={panel.payload as DebriefReplayPayload}
            index={debriefIndex}
            onIndexChange={setDebriefIndex}
          />
        );
      default:
        return null;
    }
  };

  return (
    <main className="game-shell">
      <section className="game-topbar">
        <div>
          <p className="eyebrow">ROOM {state.roomCode}</p>
          <h1>{state.mode === "bomb-defusal" ? "Bomb Defusal" : "Bushfire Command"}</h1>
          <div className="topbar-chipline">
            <span className="chip">role {me?.role ?? "unknown"}</span>
            <span className={`chip ${state.status === "running" ? "good" : "supporting"}`}>{state.status}</span>
          </div>
        </div>

        <div className="topbar-controls">
          <button className="secondary mini" onClick={() => navigator.clipboard.writeText(state.roomCode)}>
            Copy Code
          </button>

          <label className="audio-control mini-switch">
            <input type="checkbox" checked={settings.muted} onChange={(e) => setMuted(e.target.checked)} />
            mute
          </label>

          <label className="volume-inline">
            vol
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.volume}
              onChange={(e) => setVolume(Number(e.target.value))}
            />
          </label>

          <button type="button" className="secondary mini" onClick={fx.toggleFxProfile}>
            FX {fx.isReducedFx ? "Reduced" : "Cinematic"}
          </button>

          {isGm && state.status === "lobby" && (
            <div className="start-controls">
              {missingRequiredRoles.length > 0 && (
                <p className="warning-text">Missing: {missingRequiredRoles.join(", ")}</p>
              )}
              <label className="mini-switch">
                <input
                  type="checkbox"
                  checked={forceStart}
                  onChange={(event) => setForceStart(event.target.checked)}
                />
                force start
              </label>
              <button onClick={() => onStart(forceStart)} disabled={missingRequiredRoles.length > 0 && !forceStart}>
                Launch
              </button>
            </div>
          )}
        </div>
      </section>

      <PanelDashboard panelIds={state.panelDeck.defaultOrder} renderPanel={renderPanel} />

      <section className="timeline-strip">
        <h3>Live Feed</h3>
        <div className="timeline-chip-lane">
          {state.timeline
            .slice()
            .reverse()
            .slice(0, 8)
            .map((entry) => (
              <span key={entry.id} className={`timeline-chip ${entry.kind}`}>
                {new Date(entry.atEpochMs).toLocaleTimeString()} {entry.message}
              </span>
            ))}
        </div>
      </section>

      {error && <p className="error">{error}</p>}
    </main>
  );
}
