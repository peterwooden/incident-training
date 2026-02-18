import type {
  BombScenarioState,
  BombWire,
  IncidentRole,
  ManualSpread,
  PanelDeckView,
  Point2D,
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

function wireLayoutPoint(index: number, start: boolean): Point2D {
  return {
    x: start ? 72 : 508,
    y: 48 + index * 40,
  };
}

function buildManualSpreads(scenario: BombScenarioState): ManualSpread[] {
  return scenario.manualPages.map((page, index) => {
    const yBase = 60 + index * 20;
    return {
      id: page.id,
      title: page.title,
      spreadBackgroundAssetId: index % 2 === 0 ? "manual-spread-blueprint" : "manual-spread-opsdesk",
      paperNormalAssetId: "paper-normal",
      creaseMapAssetId: "paper-crease",
      diagramAssets: [
        {
          id: `${page.id}_wire_arc`,
          type: "wire",
          points: [
            { x: 80, y: yBase },
            { x: 180, y: yBase + 30 },
            { x: 300, y: yBase + 10 },
          ],
        },
        {
          id: `${page.id}_glyph_path`,
          type: "glyph",
          points: [
            { x: 360, y: 84 },
            { x: 420, y: 134 },
            { x: 500, y: 90 },
          ],
        },
      ],
      diagramLayers: [
        {
          id: `${page.id}_bg_layer`,
          depth: "background",
          type: "safety",
          points: [
            { x: 50, y: 90 },
            { x: 700, y: 90 },
            { x: 700, y: 300 },
            { x: 50, y: 300 },
          ],
          fill: index % 2 === 0 ? "#f0e7d3" : "#ece3cf",
        },
        {
          id: `${page.id}_wire_layer`,
          depth: "mid",
          type: "wire",
          points: [
            { x: 92, y: yBase + 12 },
            { x: 210, y: yBase + 46 },
            { x: 332, y: yBase + 14 },
          ],
          stroke: "#315f96",
        },
        {
          id: `${page.id}_glyph_layer`,
          depth: "foreground",
          type: "glyph",
          points: [
            { x: 372, y: 92 },
            { x: 446, y: 144 },
            { x: 530, y: 94 },
          ],
          stroke: "#744730",
        },
      ],
      hotspots: page.sections.map((section, sectionIndex) => ({
        id: `${page.id}_spot_${sectionIndex + 1}`,
        x: 70,
        y: 150 + sectionIndex * 42,
        width: 520,
        height: 36,
        label: `Clause ${sectionIndex + 1}`,
        detail: section,
      })),
      calloutPins: page.sections.slice(0, 3).map((section, sectionIndex) => ({
        id: `${page.id}_pin_${sectionIndex + 1}`,
        x: 610,
        y: 80 + sectionIndex * 80,
        text: section,
      })),
      turnHintPath: [
        { x: 690, y: 280 },
        { x: 728, y: 292 },
        { x: 712, y: 334 },
      ],
    };
  });
}

function buildBombComponents(scenario: BombScenarioState) {
  return [
    ...scenario.wires.map((wire, index) => ({
      id: `terminal_${wire.id}`,
      type: "terminal" as const,
      x: 84,
      y: 36 + index * 40,
      width: 24,
      height: 24,
      rotationDeg: 0,
      state: wire.isCut ? ("cut" as const) : ("active" as const),
      valueLabel: wire.color.toUpperCase(),
    })),
    {
      id: "core_display",
      type: "display" as const,
      x: 548,
      y: 34,
      width: 132,
      height: 72,
      rotationDeg: 0,
      state: scenario.status === "armed" ? ("active" as const) : ("idle" as const),
      valueLabel: `${scenario.timerSec}s`,
    },
    {
      id: "fuse_bank",
      type: "fuse" as const,
      x: 556,
      y: 124,
      width: 120,
      height: 18,
      rotationDeg: 0,
      state: scenario.strikes > 0 ? ("fault" as const) : ("idle" as const),
      valueLabel: `STRIKE ${scenario.strikes}`,
    },
    {
      id: "busbar_a",
      type: "busbar" as const,
      x: 146,
      y: 218,
      width: 258,
      height: 9,
      rotationDeg: 0,
      state: "active" as const,
    },
    {
      id: "resistor_pack",
      type: "resistor" as const,
      x: 310,
      y: 22,
      width: 86,
      height: 18,
      rotationDeg: -8,
      state: "idle" as const,
      valueLabel: "4.7k",
    },
    {
      id: "capacitor_core",
      type: "capacitor" as const,
      x: 428,
      y: 24,
      width: 42,
      height: 58,
      rotationDeg: 8,
      state: scenario.timerSec < 160 ? ("fault" as const) : ("idle" as const),
      valueLabel: "220uF",
    },
  ];
}

function buildEnergyArcs(scenario: BombScenarioState) {
  return scenario.wires.map((wire, index) => ({
    id: `arc_${wire.id}`,
    points: [
      { x: 118, y: 48 + index * 40 },
      { x: 260, y: 44 + index * 42 },
      { x: 424, y: 48 + index * 40 },
    ],
    intensity: wire.isCut ? 0.15 : 0.42 + (wire.isCritical ? 0.26 : 0),
    speed: 0.6 + index * 0.12,
    active: !wire.isCut,
  }));
}

function buildLightRigs(scenario: BombScenarioState) {
  return [
    { id: "key", kind: "key" as const, x: 0.2, y: 0.05, intensity: 0.88, color: "#d5e7ff" },
    { id: "fill", kind: "fill" as const, x: 0.78, y: 0.14, intensity: 0.62, color: "#8cb9ff" },
    {
      id: "rim",
      kind: "rim" as const,
      x: 0.54,
      y: 0.94,
      intensity: 0.5 + Math.min(0.4, scenario.strikes * 0.12),
      color: "#ff9a72",
    },
  ];
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

    const wireAnchors = scenario.wires.map((wire, index) => ({
      wireId: wire.id,
      start: wireLayoutPoint(index, true),
      end: wireLayoutPoint(index, false),
    }));

    const cuttableSegments = scenario.wires.map((wire, index) => ({
      id: `seg_${wire.id}`,
      wireId: wire.id,
      start: { x: 180, y: 48 + index * 40 },
      end: { x: 420, y: 48 + index * 40 },
      thickness: 10,
    }));

    const symbolNodes = scenario.symbolModule.availableSymbols.map((symbol, idx) => {
      const angle = (Math.PI * 2 * idx) / scenario.symbolModule.availableSymbols.length;
      return {
        symbol,
        x: 615 + Math.cos(angle) * 44,
        y: 95 + Math.sin(angle) * 44,
        radius: 18,
      };
    });

    const interactionRegions = [
      ...cuttableSegments.map((segment) => {
        const wire = scenario.wires.find((item) => item.id === segment.wireId);
        return {
          id: `region_${segment.id}`,
          targetId: segment.wireId,
          kind: "wire" as const,
          shape: "line" as const,
          cursor: wire?.isCut ? ("not-allowed" as const) : ("crosshair" as const),
          enabled: !wire?.isCut && scenario.status === "armed",
          affordance: "cut" as const,
          line: { start: segment.start, end: segment.end, thickness: segment.thickness + 8 },
        };
      }),
      ...symbolNodes.map((node) => ({
        id: `region_symbol_${node.symbol}`,
        targetId: node.symbol,
        kind: "symbol" as const,
        shape: "circle" as const,
        cursor: scenario.status === "armed" ? ("pointer" as const) : ("not-allowed" as const),
        enabled: scenario.status === "armed",
        affordance: "press" as const,
        circle: { center: { x: node.x, y: node.y }, radius: node.radius + 8 },
      })),
      {
        id: "region_stabilizer",
        targetId: "stability_module",
        kind: "stabilizer" as const,
        shape: "circle" as const,
        cursor: scenario.status === "armed" ? ("grab" as const) : ("not-allowed" as const),
        enabled: scenario.status === "armed",
        affordance: "hold" as const,
        circle: { center: { x: 615, y: 195 }, radius: 44 },
      },
    ];

    pushPanel({
      id: "mission_hud",
      kind: "shared",
      title: "Mission HUD",
      subtitle: "Primary pressure instrumentation",
      priority: 1,
      visualPriority: 100,
      renderMode: "hybrid",
      interactionMode: "direct-gesture",
      overlayTextLevel: "minimal",
      fxProfile: "cinematic",
      ambientLoopMs: 3200,
      hoverDepthPx: 4,
      materialPreset: "glass-hud",
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
      visualPriority: 96,
      renderMode: "hybrid",
      interactionMode: "diegetic-control",
      overlayTextLevel: "minimal",
      fxProfile: "cinematic",
      ambientLoopMs: 1800,
      hoverDepthPx: 10,
      materialPreset: "metal-console",
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
        wireAnchors,
        cuttableSegments,
        moduleBounds: [
          { id: "wire_module", x: 28, y: 24, width: 510, height: 210 },
          { id: "glyph_module", x: 540, y: 24, width: 150, height: 120 },
          { id: "stability_module", x: 540, y: 150, width: 150, height: 82 },
        ],
        stateLights: [
          { id: "ok", x: 570, y: 196, color: "green", active: scenario.strikes === 0 },
          { id: "warn", x: 610, y: 196, color: "amber", active: scenario.strikes === 1 },
          { id: "danger", x: 650, y: 196, color: "red", active: scenario.strikes >= 2 },
        ],
        symbolNodes,
        deviceSkin: {
          shellGradient: ["#1a283d", "#0a101a"],
          bezelDepth: 10,
          grimeAmount: 0.32,
          vignette: 0.5,
          reflectionStrength: 0.56,
          textureAssetId: "bomb-chassis-normal",
        },
        components: buildBombComponents(scenario),
        energyArcs: buildEnergyArcs(scenario),
        lightRigs: buildLightRigs(scenario),
        interactionRegions,
        shakeIntensity: Math.min(1, (scenario.strikes / scenario.maxStrikes) * 0.85 + (540 - scenario.timerSec) / 1000),
        diagnostics: scenario.deviceReadouts,
      },
    });

    pushPanel({
      id: "manual_rulebook",
      kind: "role-scoped",
      title: "Manual Rulebook",
      subtitle: "Multi-page procedural logic",
      priority: 3,
      visualPriority: 88,
      renderMode: "svg",
      interactionMode: "direct-gesture",
      overlayTextLevel: "minimal",
      fxProfile: "cinematic",
      ambientLoopMs: 2600,
      hoverDepthPx: 6,
      materialPreset: "paper-manual",
      locked: withLock("manual_rulebook"),
      payload: {
        spreads: buildManualSpreads(scenario),
        activeSpreadId: scenario.manualPages[0]?.id,
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
      visualPriority: 84,
      renderMode: "hybrid",
      interactionMode: "diegetic-control",
      overlayTextLevel: "supporting",
      fxProfile: "cinematic",
      ambientLoopMs: 2100,
      hoverDepthPx: 5,
      materialPreset: "metal-console",
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
      visualPriority: 80,
      renderMode: "svg",
      interactionMode: "diegetic-control",
      overlayTextLevel: "supporting",
      fxProfile: "cinematic",
      ambientLoopMs: 2400,
      hoverDepthPx: 4,
      materialPreset: "ops-card",
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
        visualPriority: 76,
        renderMode: "hybrid",
        interactionMode: "drawer-control",
        overlayTextLevel: "dense",
        fxProfile: "cinematic",
        ambientLoopMs: 3400,
        hoverDepthPx: 3,
        materialPreset: "gm-deck",
        locked: withLock("gm_orchestrator"),
        payload: {
          players: args.state.players,
          accessByPlayer: args.panelState.accessGrants,
          panelLocks: args.panelState.panelLocks,
          simulatedRole: args.panelState.gmSimulatedRole,
          roleOptions: args.roleOptions,
          cameraTargets: [
            { id: "ct_device", label: "Device Core", x: 0.36, y: 0.44, urgency: 0.82 },
            { id: "ct_rulebook", label: "Manual Desk", x: 0.76, y: 0.4, urgency: 0.56 },
            { id: "ct_safety", label: "Telemetry", x: 0.66, y: 0.75, urgency: 0.69 },
          ],
          riskHotspots: [
            { id: "risk_timer", x: 0.6, y: 0.22, severity: Math.max(0, 1 - scenario.timerSec / 540), label: "Timer" },
            { id: "risk_strike", x: 0.6, y: 0.3, severity: scenario.strikes / scenario.maxStrikes, label: "Strikes" },
          ],
          drawerSections: [
            { id: "roles", title: "Roles" },
            { id: "access", title: "Panel Access" },
            { id: "locks", title: "Panel Locks" },
            { id: "simulate", title: "Simulate Role" },
          ],
          selectionContext: {},
        },
      };

      panelMap.debrief_replay = {
        id: "debrief_replay",
        kind: "gm-only",
        title: "Debrief Replay",
        subtitle: "Post-round diagnostics",
        priority: 99,
        visualPriority: 40,
        renderMode: "svg",
        interactionMode: "drawer-control",
        overlayTextLevel: "dense",
        fxProfile: "reduced",
        ambientLoopMs: 4200,
        hoverDepthPx: 2,
        materialPreset: "ops-card",
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
