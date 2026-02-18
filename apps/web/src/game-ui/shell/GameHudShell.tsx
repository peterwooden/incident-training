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

    switch (panel.id) {
      case "mission_hud": {
        const payload = panel.payload as MissionHudPayload;
        return (
          <section className="scene-panel mission-hud-panel">
            <header>
              <h3>{panel.title}</h3>
              <p>{payload.summary}</p>
            </header>
            <div className="mission-stats">
              <span>Timer {payload.timerSec}s</span>
              <span>Pressure {payload.pressure}</span>
              <span>Score {payload.score}</span>
              <span>Status {payload.status}</span>
            </div>
            <p className="slack-reminder">{payload.slackReminder}</p>
          </section>
        );
      }
      case "device_console":
        return (
          <BombDeviceConsolePanel
            payload={panel.payload as BombDeviceConsolePayload}
            locked={panel.locked.locked || state.status !== "running"}
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
          <p className="eyebrow">Room {state.roomCode}</p>
          <h1>{state.mode === "bomb-defusal" ? "Bomb Defusal Simulation" : "Bushfire Command Simulation"}</h1>
          <p>Role: {me?.role ?? "Unknown"} | Status: {state.status}</p>
        </div>
        <div className="topbar-controls">
          <button className="secondary" onClick={() => navigator.clipboard.writeText(state.roomCode)}>
            Copy Room Code
          </button>
          <label className="audio-control">
            <input type="checkbox" checked={settings.muted} onChange={(e) => setMuted(e.target.checked)} />
            Mute
          </label>
          <label>
            Volume
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.volume}
              onChange={(e) => setVolume(Number(e.target.value))}
            />
          </label>
          {isGm && state.status === "lobby" && (
            <div className="start-controls">
              {missingRequiredRoles.length > 0 && (
                <p className="warning-text">Missing roles: {missingRequiredRoles.join(", ")}</p>
              )}
              <label>
                <input
                  type="checkbox"
                  checked={forceStart}
                  onChange={(event) => setForceStart(event.target.checked)}
                />
                Force start (bypass missing roles)
              </label>
              <button onClick={() => onStart(forceStart)} disabled={missingRequiredRoles.length > 0 && !forceStart}>
                Launch Scenario
              </button>
            </div>
          )}
        </div>
      </section>

      <PanelDashboard panelIds={state.panelDeck.defaultOrder} renderPanel={renderPanel} />

      <section className="timeline-strip">
        <h3>Live Feed</h3>
        <ul>
          {state.timeline
            .slice()
            .reverse()
            .slice(0, 8)
            .map((entry) => (
              <li key={entry.id}>
                {new Date(entry.atEpochMs).toLocaleTimeString()} {entry.message}
              </li>
            ))}
        </ul>
      </section>

      {error && <p className="error">{error}</p>}
    </main>
  );
}
