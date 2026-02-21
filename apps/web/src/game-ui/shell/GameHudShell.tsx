import { useEffect, useMemo, useState } from "react";
import type {
  BombCoordinationBoardPayload,
  BombDeviceConsolePayload,
  BombRulebookPayload,
  BombSafetyTelemetryPayload,
  BushfireMapPayload,
  GmPromptDeckPayload,
  DebriefReplayPayload,
  FireOpsPayload,
  FsmEditorPayload,
  GmOrchestratorPayload,
  IncidentCommandPayload,
  IncidentRole,
  MissionHudPayload,
  StatusFeedPayload,
  PoliceOpsPayload,
  PlayerActionType,
  PublicInfoPayload,
  RoleBriefingPayload,
  RoomView,
  WidgetId,
  WeatherOpsPayload,
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
import { RoleBriefingPanel } from "../panels/bushfire/RoleBriefingPanel";
import { StatusFeedPanel } from "../panels/bushfire/StatusFeedPanel";
import { WeatherOpsPanel } from "../panels/bushfire/WeatherOpsPanel";
import { DebriefReplayPanel } from "../gm/DebriefReplayPanel";
import { GmFsmPanel } from "../gm/GmFsmPanel";
import { GmOrchestratorPanel } from "../gm/GmOrchestratorPanel";
import { GmPromptDeckPanel } from "../gm/GmPromptDeckPanel";
import { WidgetDashboard } from "./WidgetDashboard";
import { roleLabelForMode } from "../roles";

interface GameHudShellProps {
  state: RoomView;
  session: Session;
  error?: string;
  onAction: (
    actionType: PlayerActionType,
    widgetId: WidgetId,
    payload?: Record<string, string | number | boolean>,
  ) => Promise<void>;
  onAssignRole: (playerId: string, role: IncidentRole) => Promise<void>;
  onSetWidgetAccess: (playerId: string, widgetId: WidgetId, granted: boolean) => Promise<void>;
  onSetWidgetLock: (widgetId: WidgetId, locked: boolean) => Promise<void>;
  onSetSimulatedRole: (role?: IncidentRole) => Promise<void>;
}

export function GameHudShell({
  state,
  session,
  error,
  onAction,
  onAssignRole,
  onSetWidgetAccess,
  onSetWidgetLock,
  onSetSimulatedRole,
}: GameHudShellProps) {
  const [rulebookPage, setRulebookPage] = useState(0);
  const [advisoryDraft, setAdvisoryDraft] = useState("Evacuate high-risk sectors immediately.");
  const [debriefIndex, setDebriefIndex] = useState(0);

  const { triggerCue } = useAudioBus();

  const me = useMemo(
    () => state.players.find((player) => player.id === session.playerId),
    [session.playerId, state.players],
  );
  const isGm = Boolean(me?.isGameMaster);
  const roleLabel = me ? roleLabelForMode(state.mode, me.role) : "unknown";

  useEffect(() => {
    const orderedWidgets = state.widgetDeck.defaultOrder
      .map((widgetId) => state.widgetDeck.widgetsById[widgetId])
      .filter(Boolean);
    const cue = orderedWidgets.find((panel) => panel?.audioCue)?.audioCue;
    triggerCue(cue);
  }, [state.timeline.length, state.widgetDeck.defaultOrder, state.widgetDeck.widgetsById, triggerCue]);

  useEffect(() => {
    const manualWidget = state.widgetDeck.widgetsById.manual_rulebook;
    if (!manualWidget) {
      return;
    }
    const payload = manualWidget.payload as BombRulebookPayload;
    if (!payload.activeSpreadId) {
      return;
    }
    const activeIndex = payload.spreads.findIndex((spread) => spread.id === payload.activeSpreadId);
    if (activeIndex >= 0) {
      setRulebookPage((prev) => (prev === activeIndex ? prev : activeIndex));
    }
  }, [state.widgetDeck.widgetsById.manual_rulebook]);

  const renderWidget = (widgetId: string) => {
    const widget = state.widgetDeck.widgetsById[widgetId as WidgetId];
    if (!widget) {
      return null;
    }
    const effectiveFxProfile = "cinematic" as const;

    switch (widget.id) {
      case "mission_hud": {
        const payload = widget.payload as MissionHudPayload;
        return (
          <section className="scene-widget mission-hud-panel visual-heavy">
            <header className="widget-chip-row">
              <h3>{widget.title}</h3>
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
            payload={widget.payload as BombDeviceConsolePayload}
            locked={widget.locked.locked || state.status !== "running"}
            fxProfile={effectiveFxProfile}
            ambientLoopMs={widget.ambientLoopMs}
            hoverDepthPx={widget.hoverDepthPx}
            onCutWire={(wireId) => onAction("bomb_cut_wire", "device_console", { wireId })}
            onPressSymbol={(symbol) => onAction("bomb_press_symbol", "device_console", { symbol })}
            onStabilize={() => onAction("bomb_stabilize_widget", "device_console")}
          />
        );
      case "manual_rulebook":
        return (
          <BombRulebookPanel
            payload={widget.payload as BombRulebookPayload}
            currentPage={rulebookPage}
            onChangePage={setRulebookPage}
            fxProfile={effectiveFxProfile}
            ambientLoopMs={widget.ambientLoopMs}
            hoverDepthPx={widget.hoverDepthPx}
          />
        );
      case "safety_telemetry":
        return (
          <BombSafetyTelemetryPanel
            payload={widget.payload as BombSafetyTelemetryPayload}
            locked={widget.locked.locked || state.status !== "running"}
            onStabilize={() => onAction("bomb_stabilize_widget", "safety_telemetry")}
          />
        );
      case "coordination_board":
        return <BombCoordinationBoardPanel payload={widget.payload as BombCoordinationBoardPayload} />;
      case "town_map":
        return (
          <BushfireMapPanel
            payload={widget.payload as BushfireMapPayload}
            locked={widget.locked.locked || state.status !== "running"}
            fxProfile={effectiveFxProfile}
            ambientLoopMs={widget.ambientLoopMs}
            hoverDepthPx={widget.hoverDepthPx}
            canUseFireTools={Boolean(state.widgetDeck.widgetsById.fire_ops_console) || isGm}
            canUsePoliceTools={Boolean(state.widgetDeck.widgetsById.police_ops_console) || isGm}
            onDeployCrew={(cellId) => onAction("bushfire_deploy_fire_crew", "fire_ops_console", { cellId })}
            onDropWater={(cellId) => onAction("bushfire_drop_water", "fire_ops_console", { cellId })}
            onCreateFirebreak={(cellId) => onAction("bushfire_create_firebreak", "fire_ops_console", { cellId })}
            onSetRoadblock={(cellId) => onAction("bushfire_set_roadblock", "police_ops_console", { cellId })}
          />
        );
      case "fire_ops_console":
        return <FireOpsPanel payload={widget.payload as FireOpsPayload} />;
      case "status_feed":
        return <StatusFeedPanel payload={widget.payload as StatusFeedPayload} />;
      case "police_ops_console":
        return <PoliceOpsPanel payload={widget.payload as PoliceOpsPayload} />;
      case "public_info_console":
        return (
          <PublicInfoPanel
            payload={widget.payload as PublicInfoPayload}
            advisoryDraft={advisoryDraft}
            onDraftChange={setAdvisoryDraft}
            onPublish={() => onAction("bushfire_submit_status_update", "public_info_console", { template: advisoryDraft })}
            locked={widget.locked.locked || state.status !== "running"}
          />
        );
      case "incident_command_console":
        return <IncidentCommandPanel payload={widget.payload as IncidentCommandPayload} />;
      case "weather_ops_console":
        return (
          <WeatherOpsPanel
            payload={widget.payload as WeatherOpsPayload}
            locked={widget.locked.locked || state.status !== "running"}
            onIssueForecast={(forecastType) =>
              onAction("bushfire_issue_forecast", "weather_ops_console", { forecastType })}
          />
        );
      case "role_briefing":
        return (
          <RoleBriefingPanel
            payload={widget.payload as RoleBriefingPayload}
            locked={widget.locked.locked || state.status !== "running"}
            onAcknowledge={(promptId) => onAction("bushfire_ack_prompt", "role_briefing", { promptId })}
          />
        );
      case "gm_orchestrator": {
        const payload = widget.payload as GmOrchestratorPayload;
        const widgetIds = Object.keys(state.widgetDeck.widgetsById) as WidgetId[];
        return (
          <GmOrchestratorPanel
            payload={payload}
            widgetIds={widgetIds}
            onAssignRole={onAssignRole}
            onToggleWidgetAccess={onSetWidgetAccess}
            onToggleWidgetLock={onSetWidgetLock}
            onSimulateRole={onSetSimulatedRole}
          />
        );
      }
      case "gm_prompt_deck":
        return (
          <GmPromptDeckPanel
            payload={widget.payload as GmPromptDeckPayload}
            locked={widget.locked.locked || state.status !== "running"}
            onRelease={(cardId) => onAction("gm_release_prompt", "gm_prompt_deck", { cardId })}
          />
        );
      case "fsm_editor":
        return (
          <GmFsmPanel
            payload={widget.payload as FsmEditorPayload}
            locked={widget.locked.locked}
            onTransition={(transitionId) =>
              onAction("gm_fsm_transition", "fsm_editor", { transitionId })}
          />
        );
      case "debrief_replay":
        return (
          <DebriefReplayPanel
            payload={widget.payload as DebriefReplayPayload}
            index={debriefIndex}
            onIndexChange={setDebriefIndex}
          />
        );
      default:
        return null;
    }
  };

  const visibilityLabelForWidget = (widgetId: string): string | undefined => {
    const widget = state.widgetDeck.widgetsById[widgetId as WidgetId];
    if (!widget) {
      return undefined;
    }
    if (widget.kind === "shared") {
      return "Everyone";
    }
    if (widget.kind === "gm-only") {
      return "Only you";
    }
    if (!isGm) {
      return "Only you";
    }
    const audienceByWidget: Partial<Record<WidgetId, string>> = {
      device_console: "Device Specialist",
      manual_rulebook: "Manual Analyst",
      safety_telemetry: "Safety Officer",
      coordination_board: "Lead Coordinator",
      fire_ops_console: "Firefighter",
      police_ops_console: "Police Officer",
      public_info_console: "Radio Host",
      weather_ops_console: "Meteorologist",
      incident_command_console: "Mayor",
      role_briefing: "Single role",
    };
    return audienceByWidget[widget.id] ?? "Selected players";
  };

  return (
    <main className="game-shell">
      <section className="game-topbar">
        <div>
          <p className="eyebrow">ROOM {state.roomCode}</p>
          <h1>{state.mode === "bomb-defusal" ? "Bomb Defusal" : "Bushfire Command"}</h1>
          <div className="topbar-chipline">
            <span className="chip">role {roleLabel}</span>
            <span className={`chip ${state.status === "running" ? "good" : "supporting"}`}>{state.status}</span>
          </div>
        </div>

        <div className="topbar-controls">
          <button
            className="secondary mini"
            onClick={() => navigator.clipboard.writeText(`${window.location.origin}/join/${state.roomCode}`)}
          >
            Copy Invite Link
          </button>
          {isGm && <span className="chip supporting">GM</span>}
        </div>
      </section>

      <WidgetDashboard
        widgetIds={state.widgetDeck.defaultOrder}
        renderWidget={renderWidget}
        visibilityLabelForWidget={visibilityLabelForWidget}
      />

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
