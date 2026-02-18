import type {
  BombScenarioState,
  BombWire,
  IncidentRole,
  PanelDeckView,
  PlayerAction,
  RoomState,
  ScenePanelAccessRule,
  ScenePanelId,
  ScenePanelView,
} from "@incident/shared";
import type { GameModeEngine, ModeMutation, SeededRandom } from "./types";
import { newTimelineEvent } from "./helpers";

const WIRE_COLORS: BombWire["color"][] = ["red", "blue", "yellow", "white", "black"];
const SYMBOL_POOL = ["psi", "star", "lambda", "spiral", "bolt", "eye", "key", "sun"];

const PANEL_DEFINITIONS: ScenePanelAccessRule[] = [
  { id: "mission_hud", kind: "shared", defaultRoles: ["Observer"] },
  { id: "device_console", kind: "role-scoped", defaultRoles: ["Device Specialist"] },
  { id: "manual_rulebook", kind: "role-scoped", defaultRoles: ["Manual Analyst"] },
  { id: "safety_telemetry", kind: "role-scoped", defaultRoles: ["Safety Officer"] },
  { id: "coordination_board", kind: "role-scoped", defaultRoles: ["Lead Coordinator"] },
  { id: "gm_orchestrator", kind: "gm-only", defaultRoles: [] },
  { id: "debrief_replay", kind: "gm-only", defaultRoles: [] },
];

const DEFAULT_BY_ROLE: Record<IncidentRole, ScenePanelId[]> = {
  "Lead Coordinator": ["mission_hud", "coordination_board"],
  "Device Specialist": ["mission_hud", "device_console"],
  "Manual Analyst": ["mission_hud", "manual_rulebook"],
  "Safety Officer": ["mission_hud", "safety_telemetry"],
  "Incident Controller": ["mission_hud"],
  "Fire Operations SME": ["mission_hud"],
  "Police Operations SME": ["mission_hud"],
  "Public Information Officer": ["mission_hud"],
  Observer: ["mission_hud"],
};

function completeObjectiveForAction(
  objectives: RoomState["objectives"],
  action: RoomState["objectives"][number]["requiredAction"],
): string[] {
  const next = objectives.find((obj) => !obj.completed && obj.requiredAction === action);
  return next ? [next.id] : [];
}

function inferTimer(state: RoomState): number {
  if (state.scenario.type === "bomb-defusal") {
    return state.scenario.timerSec;
  }
  return 0;
}

function buildManualPages(scenario: BombScenarioState): BombScenarioState["manualPages"] {
  const criticalWireColors = scenario.wires
    .filter((wire) => wire.isCritical)
    .map((wire) => wire.color)
    .join(" then ");

  return [
    {
      id: "man_1",
      title: "Wire Taxonomy",
      sections: [
        "If two critical wires exist, cut only in called order.",
        `Priority wire signature this round: ${criticalWireColors}.`,
        "If uncertain, pause and force verbal confirmation loop.",
      ],
    },
    {
      id: "man_2",
      title: "Symbol Lexicon",
      sections: [
        `Glyph order for valid sequence: ${scenario.symbolModule.targetSequence.join(" -> ")}.`,
        "Any wrong glyph resets sequence and may trigger strikes.",
      ],
    },
    {
      id: "man_3",
      title: "Safety Procedure",
      sections: [
        "Safety Officer may run panel stabilization during red-zone pressure.",
        "Do not improvise; repeat every high-risk command before execution.",
      ],
    },
  ];
}

function createScenario(rng: SeededRandom): BombScenarioState {
  const wires = Array.from({ length: 5 }).map((_, idx) => ({
    id: `wire_${idx + 1}`,
    color: WIRE_COLORS[rng.nextInt(WIRE_COLORS.length)],
    isCut: false,
    isCritical: false,
  }));

  const criticalIds = rng.pickMany(
    wires.map((wire) => wire.id),
    2,
  );
  wires.forEach((wire) => {
    wire.isCritical = criticalIds.includes(wire.id);
  });

  const availableSymbols = rng.pickMany(SYMBOL_POOL, 5);
  const targetSequence = rng.pickMany(availableSymbols, 3);

  const scenario: BombScenarioState = {
    type: "bomb-defusal",
    timerSec: 540,
    strikes: 0,
    maxStrikes: 3,
    status: "armed",
    wires,
    symbolModule: {
      availableSymbols,
      targetSequence,
      enteredSequence: [],
    },
    deviceReadouts: [
      "Device shell vibration detected around panel A.",
      "Core display warning: follow manual sequence exactly.",
    ],
    manualPages: [],
    confirmationLedger: [],
  };

  scenario.manualPages = buildManualPages(scenario);
  return scenario;
}

export class BombDefusalMode implements GameModeEngine {
  initObjectives(_rng: SeededRandom): RoomState["objectives"] {
    return [
      {
        id: "bomb_obj_1",
        description: "Cut critical wires using analyst-confirmed order",
        requiredAction: "bomb_cut_wire",
        completed: false,
      },
      {
        id: "bomb_obj_2",
        description: "Input the manual-approved glyph sequence",
        requiredAction: "bomb_press_symbol",
        completed: false,
      },
      {
        id: "bomb_obj_3",
        description: "Run stabilization during high-pressure windows",
        requiredAction: "bomb_stabilize_panel",
        completed: false,
      },
    ];
  }

  initSummary(): string {
    return "Bomb simulation active. Keep all communication in Slack and enforce verbal confirmations.";
  }

  initScenario(rng: SeededRandom): RoomState["scenario"] {
    return createScenario(rng);
  }

  getPanelDefinitions(): ScenePanelAccessRule[] {
    return PANEL_DEFINITIONS;
  }

  getDefaultAccessTemplate(role: IncidentRole): ScenePanelId[] {
    return DEFAULT_BY_ROLE[role] ?? ["mission_hud"];
  }

  getPanelForAction(actionType: PlayerAction["type"]): ScenePanelId | undefined {
    const map: Partial<Record<PlayerAction["type"], ScenePanelId>> = {
      bomb_cut_wire: "device_console",
      bomb_press_symbol: "device_console",
      bomb_stabilize_panel: "safety_telemetry",
      assign_role: "gm_orchestrator",
    };
    return map[actionType];
  }

  onAction(state: RoomState, action: PlayerAction, now: number): ModeMutation {
    const scenario = state.scenario;
    if (scenario.type !== "bomb-defusal" || scenario.status !== "armed") {
      return {};
    }

    const next: BombScenarioState = {
      ...scenario,
      wires: scenario.wires.map((wire) => ({ ...wire })),
      symbolModule: {
        ...scenario.symbolModule,
        enteredSequence: [...scenario.symbolModule.enteredSequence],
      },
      manualPages: scenario.manualPages.map((page) => ({ ...page, sections: [...page.sections] })),
      confirmationLedger: [...scenario.confirmationLedger],
    };

    const timelineAdds = [
      newTimelineEvent("status", `${action.playerId} executed ${action.type}`, now, action.playerId),
    ];

    let pressureDelta = 0;
    let scoreDelta = 0;
    let summary = "Team coordinating under pressure.";

    if (action.type === "bomb_cut_wire") {
      const wireId = String(action.payload?.wireId ?? "");
      const wire = next.wires.find((candidate) => candidate.id === wireId);
      if (!wire || wire.isCut) {
        return {
          pressureDelta: 6,
          scoreDelta: -5,
          summary: "Invalid wire operation. Reset callouts and repeat the command chain.",
          timelineAdds: [
            ...timelineAdds,
            newTimelineEvent("inject", "Panel rejected wire command.", now),
          ],
        };
      }

      wire.isCut = true;
      next.confirmationLedger.push({ atEpochMs: now, message: `Wire cut command executed for ${wire.id}.` });
      if (wire.isCritical) {
        pressureDelta -= 4;
        scoreDelta += 10;
        summary = "Critical wire cleared.";
      } else {
        next.strikes += 1;
        pressureDelta += 10;
        scoreDelta -= 9;
        summary = "Incorrect wire. Strike registered.";
      }
    }

    if (action.type === "bomb_press_symbol") {
      const symbol = String(action.payload?.symbol ?? "");
      const expected = next.symbolModule.targetSequence[next.symbolModule.enteredSequence.length];
      if (symbol !== expected) {
        next.strikes += 1;
        next.symbolModule.enteredSequence = [];
        pressureDelta += 8;
        scoreDelta -= 7;
        summary = "Incorrect glyph order; sequence reset.";
      } else {
        next.symbolModule.enteredSequence.push(symbol);
        pressureDelta -= 2;
        scoreDelta += 8;
        summary = "Glyph accepted.";
      }
    }

    if (action.type === "bomb_stabilize_panel") {
      next.timerSec = Math.min(620, next.timerSec + 20);
      pressureDelta -= 7;
      scoreDelta += 6;
      summary = "Stabilization pulse successful.";
    }

    if (next.strikes >= next.maxStrikes) {
      next.status = "exploded";
      return {
        replaceScenario: next,
        pressureDelta: 20,
        scoreDelta: -20,
        status: "failed",
        summary: "Detonation triggered by strike limit breach.",
        timelineAdds: [...timelineAdds, newTimelineEvent("inject", "Bomb exploded.", now)],
      };
    }

    const allCriticalCut = next.wires.filter((wire) => wire.isCritical).every((wire) => wire.isCut);
    const symbolsSolved = next.symbolModule.enteredSequence.length === next.symbolModule.targetSequence.length;

    if (allCriticalCut && symbolsSolved) {
      next.status = "defused";
      return {
        replaceScenario: next,
        pressureDelta: -10,
        scoreDelta: 25,
        status: "resolved",
        summary: "Bomb defused. Excellent coordination discipline.",
        markObjectiveIdsComplete: [
          ...completeObjectiveForAction(state.objectives, "bomb_cut_wire"),
          ...completeObjectiveForAction(state.objectives, "bomb_press_symbol"),
          ...completeObjectiveForAction(state.objectives, "bomb_stabilize_panel"),
        ],
        timelineAdds: [...timelineAdds, newTimelineEvent("system", "Defusal confirmed.", now)],
      };
    }

    return {
      replaceScenario: next,
      pressureDelta,
      scoreDelta,
      summary,
      markObjectiveIdsComplete: completeObjectiveForAction(state.objectives, action.type),
      timelineAdds,
    };
  }

  onTick(state: RoomState, now: number): ModeMutation {
    const scenario = state.scenario;
    if (scenario.type !== "bomb-defusal" || state.status !== "running" || scenario.status !== "armed") {
      return {};
    }

    const next: BombScenarioState = {
      ...scenario,
      timerSec: Math.max(0, scenario.timerSec - 15),
      wires: scenario.wires.map((wire) => ({ ...wire })),
      symbolModule: { ...scenario.symbolModule, enteredSequence: [...scenario.symbolModule.enteredSequence] },
      manualPages: scenario.manualPages.map((page) => ({ ...page, sections: [...page.sections] })),
      confirmationLedger: [...scenario.confirmationLedger],
    };

    if (next.timerSec === 0) {
      next.status = "exploded";
      return {
        replaceScenario: next,
        status: "failed",
        pressureDelta: 20,
        scoreDelta: -20,
        summary: "Timer reached zero. Device exploded.",
        timelineAdds: [newTimelineEvent("inject", "Countdown reached zero.", now)],
      };
    }

    const warning = next.timerSec <= 120;
    return {
      replaceScenario: next,
      pressureDelta: warning ? 5 : 2,
      timelineAdds: warning
        ? [newTimelineEvent("inject", "Critical countdown window reached.", now)]
        : undefined,
    };
  }

  buildPanelDeck(args: {
    state: RoomState;
    viewer?: { id: string; role: IncidentRole; isGameMaster: boolean };
    effectiveRole: IncidentRole;
    panelState: RoomState["panelState"];
    roleOptions: IncidentRole[];
    debriefMetrics: {
      executionAccuracy: number;
      timingDiscipline: number;
      communicationDiscipline: number;
      overall: number;
    };
  }): PanelDeckView {
    const scenario = args.state.scenario;
    if (scenario.type !== "bomb-defusal") {
      throw new Error("invalid scenario");
    }

    const viewer = args.viewer;
    const isGm = Boolean(viewer?.isGameMaster);
    const granted = viewer ? args.panelState.accessGrants[viewer.id] ?? this.getDefaultAccessTemplate(viewer.role) : [];
    const availablePanelIds = isGm
      ? PANEL_DEFINITIONS.map((panel) => panel.id)
      : granted.filter((panelId) => panelId !== "gm_orchestrator" && panelId !== "debrief_replay");

    const panelMap: PanelDeckView["panelsById"] = {};

    const withLock = (id: ScenePanelId) => args.panelState.panelLocks[id] ?? { locked: false };

    const pushPanel = <K extends ScenePanelId>(panel: ScenePanelView<K>): void => {
      if (availablePanelIds.includes(panel.id)) {
        panelMap[panel.id] = panel as any;
      }
    };

    pushPanel({
      id: "mission_hud",
      kind: "shared",
      title: "Mission HUD",
      subtitle: "Primary pressure instrumentation",
      priority: 1,
      locked: withLock("mission_hud"),
      audioCue: scenario.timerSec < 90 ? "warning" : undefined,
      payload: {
        timerSec: inferTimer(args.state),
        pressure: args.state.pressure,
        score: args.state.score,
        status: args.state.status,
        summary: args.state.publicSummary,
        slackReminder: "Coordinate verbally in Slack before every critical action.",
      },
    });

    pushPanel({
      id: "device_console",
      kind: "role-scoped",
      title: "Device Console",
      subtitle: "Interactive bomb shell",
      priority: 2,
      locked: withLock("device_console"),
      audioCue: scenario.strikes > 0 ? "strike" : undefined,
      payload: {
        status: scenario.status,
        timerSec: scenario.timerSec,
        strikes: scenario.strikes,
        maxStrikes: scenario.maxStrikes,
        wires: scenario.wires.map((wire) => ({ id: wire.id, color: wire.color, isCut: wire.isCut })),
        symbolModule: {
          availableSymbols: scenario.symbolModule.availableSymbols,
          enteredSequence: scenario.symbolModule.enteredSequence,
        },
        diagnostics: scenario.deviceReadouts,
      },
    });

    pushPanel({
      id: "manual_rulebook",
      kind: "role-scoped",
      title: "Manual Rulebook",
      subtitle: "Multi-page procedural logic",
      priority: 3,
      locked: withLock("manual_rulebook"),
      payload: {
        pages: scenario.manualPages,
        index: scenario.manualPages.map((page) => page.title),
        hint: "Read exact clauses and demand repeat-back before execution.",
      },
    });

    pushPanel({
      id: "safety_telemetry",
      kind: "role-scoped",
      title: "Safety Telemetry",
      subtitle: "Risk and stabilization window",
      priority: 4,
      locked: withLock("safety_telemetry"),
      audioCue: scenario.timerSec < 100 ? "warning" : undefined,
      payload: {
        currentRisk: Math.min(100, Math.round((scenario.strikes / scenario.maxStrikes) * 50 + (540 - scenario.timerSec) / 8)),
        stabilizeWindowSec: Math.max(0, scenario.timerSec - 40),
        alarms: scenario.timerSec < 150 ? ["Countdown in critical band"] : ["Telemetry nominal"],
      },
    });

    pushPanel({
      id: "coordination_board",
      kind: "role-scoped",
      title: "Coordination Board",
      subtitle: "Command checklist and confirmations",
      priority: 5,
      locked: withLock("coordination_board"),
      payload: {
        checklist: args.state.objectives.map((objective) => ({
          id: objective.id,
          label: objective.description,
          completed: objective.completed,
        })),
        recentMessages: scenario.confirmationLedger.slice(-8),
      },
    });

    if (isGm) {
      panelMap.gm_orchestrator = {
        id: "gm_orchestrator",
        kind: "gm-only",
        title: "GM Orchestrator",
        subtitle: "Access and facilitation controls",
        priority: 90,
        locked: withLock("gm_orchestrator"),
        payload: {
          players: args.state.players,
          accessByPlayer: args.panelState.accessGrants,
          panelLocks: args.panelState.panelLocks,
          simulatedRole: args.panelState.gmSimulatedRole,
          roleOptions: args.roleOptions,
        },
      };

      panelMap.debrief_replay = {
        id: "debrief_replay",
        kind: "gm-only",
        title: "Debrief Replay",
        subtitle: "Post-round diagnostics",
        priority: 99,
        locked: withLock("debrief_replay"),
        payload: {
          metrics: args.debriefMetrics,
          events: args.state.debriefLog,
        },
      };
    }

    const defaultOrder = Object.values(panelMap)
      .sort((a, b) => a.priority - b.priority)
      .map((panel) => panel.id);

    return {
      availablePanelIds: defaultOrder,
      panelsById: panelMap,
      defaultOrder,
      gmSimulatedRole: args.panelState.gmSimulatedRole,
    };
  }
}
