import type {
  BombScenarioState,
  BombStageId,
  BombStageStatus,
  BombWire,
  IncidentRole,
  ManualSpread,
  PanelDeckView,
  PlayerActionType,
  Point2D,
  PlayerAction,
  RoomState,
  ScenePanelAccessRule,
  ScenePanelId,
  ScenePanelView,
} from "@incident/shared";
import type { BombModule, GameModeEngine, ModeMutation, SeededRandom } from "./types";
import { newTimelineEvent } from "./helpers";

const WIRE_COLORS: BombWire["color"][] = ["red", "blue", "yellow", "white", "black"];
const SYMBOL_POOL = ["psi", "star", "lambda", "spiral", "bolt", "eye", "key", "sun"];
const MEMORY_DIGITS = ["1", "2", "3", "4"];
const MODULE_QUEUE: BombStageId[] = ["wires", "symbols", "memory"];
const STAGE_TRANSITION_MS = 4_500;

const PANEL_DEFINITIONS: ScenePanelAccessRule[] = [
  { id: "mission_hud", kind: "shared", defaultRoles: ["Observer"] },
  { id: "device_console", kind: "role-scoped", defaultRoles: ["Device Specialist"] },
  { id: "manual_rulebook", kind: "role-scoped", defaultRoles: ["Manual Analyst"] },
  { id: "safety_telemetry", kind: "role-scoped", defaultRoles: ["Safety Officer"] },
  { id: "coordination_board", kind: "role-scoped", defaultRoles: ["Lead Coordinator"] },
  { id: "gm_orchestrator", kind: "gm-only", defaultRoles: [] },
  { id: "fsm_editor", kind: "gm-only", defaultRoles: [] },
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

const STAGE_LABELS: Record<BombStageId, string> = {
  wires: "Wire Discipline",
  symbols: "Symbol Keypad",
  memory: "Memory Relay",
};

const STAGE_OBJECTIVE_LABELS: Record<BombStageId, string> = {
  wires: "Cut only the critical wires in analyst-confirmed order.",
  symbols: "Enter keypad symbols in manual precedence order.",
  memory: "Enter the memory relay digits using the manual transformation rule.",
};

const STAGE_COMPLETE_ACTION: Record<BombStageId, PlayerActionType> = {
  wires: "bomb_cut_wire",
  symbols: "bomb_press_symbol",
  memory: "bomb_press_symbol",
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

function stageLabel(stageId: BombStageId): string {
  return STAGE_LABELS[stageId];
}

function isActionForDevice(actionType: PlayerAction["type"]): boolean {
  return actionType === "bomb_cut_wire" || actionType === "bomb_press_symbol";
}

function cloneScenario(scenario: BombScenarioState): BombScenarioState {
  return {
    ...scenario,
    moduleQueue: [...scenario.moduleQueue],
    completedStages: [...scenario.completedStages],
    wires: scenario.wires.map((wire) => ({ ...wire })),
    symbolModule: {
      ...scenario.symbolModule,
      availableSymbols: [...scenario.symbolModule.availableSymbols],
      precedenceOrder: [...scenario.symbolModule.precedenceOrder],
      enteredSequence: [...scenario.symbolModule.enteredSequence],
      targetSequence: [...scenario.symbolModule.targetSequence],
    },
    memoryModule: {
      cues: [...scenario.memoryModule.cues],
      enteredSequence: [...scenario.memoryModule.enteredSequence],
    },
    deviceReadouts: [...scenario.deviceReadouts],
    manualPages: scenario.manualPages.map((page) => ({ ...page, sections: [...page.sections] })),
    confirmationLedger: [...scenario.confirmationLedger],
  };
}

function buildDeviceReadouts(scenario: BombScenarioState): string[] {
  const stageNote = `Active stage: ${stageLabel(scenario.stageId)} (${scenario.stageIndex + 1}/${scenario.moduleQueue.length}).`;
  const strikeNote = `Strikes ${scenario.strikes}/${scenario.maxStrikes} | Stabilizers ${scenario.stabilizeCharges}.`;
  const cue = scenario.stageId === "memory"
    ? `Memory cue ${scenario.memoryModule.cues[scenario.memoryModule.enteredSequence.length] ?? "-"}.`
    : "Comms discipline required before every execution.";

  return [stageNote, strikeNote, cue];
}

const wiresModule: BombModule = {
  id: "wires",
  title: "Wire Discipline",
  timerSec: 190,
  objective: STAGE_OBJECTIVE_LABELS.wires,
  init(rng, scenario) {
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

    return {
      ...scenario,
      wires,
      wireProgress: 0,
    };
  },
  handleAction(scenario, context) {
    const next = cloneScenario(scenario);

    if (context.action.type !== "bomb_cut_wire") {
      return {
        scenario: next,
        pressureDelta: 3,
        scoreDelta: -2,
        summary: "Incorrect tool for current module.",
        timelineMessage: "Wire module ignored non-wire action.",
      };
    }

    const wireId = String(context.action.payload?.wireId ?? "");
    const wire = next.wires.find((candidate) => candidate.id === wireId);
    if (!wire || wire.isCut) {
      next.strikes += 1;
      next.strikeCarry = next.strikes;
      return {
        scenario: next,
        pressureDelta: 10,
        scoreDelta: -8,
        summary: "Invalid wire operation. Strike registered.",
        timelineMessage: "Panel rejected invalid wire target.",
      };
    }

    wire.isCut = true;
    next.confirmationLedger.push({ atEpochMs: context.now, message: `Wire command executed for ${wire.id}.` });

    if (!wire.isCritical) {
      next.strikes += 1;
      next.strikeCarry = next.strikes;
      return {
        scenario: next,
        pressureDelta: 9,
        scoreDelta: -6,
        summary: "Non-critical wire cut. Strike registered.",
        timelineMessage: "Incorrect wire cut detected.",
      };
    }

    const criticalWires = next.wires.filter((candidate) => candidate.isCritical);
    const expected = criticalWires[next.wireProgress];
    if (expected?.id !== wire.id) {
      next.strikes += 1;
      next.strikeCarry = next.strikes;
      return {
        scenario: next,
        pressureDelta: 11,
        scoreDelta: -7,
        summary: "Critical wire cut out of order. Strike registered.",
        timelineMessage: "Critical cut order mismatch.",
      };
    }

    next.wireProgress += 1;
    return {
      scenario: next,
      pressureDelta: -5,
      scoreDelta: 10,
      summary: "Critical wire cleared in correct order.",
      timelineMessage: "Critical wire phase advancing.",
    };
  },
  isSolved(scenario) {
    const critical = scenario.wires.filter((wire) => wire.isCritical);
    return critical.length > 0 && critical.every((wire) => wire.isCut) && scenario.wireProgress === critical.length;
  },
  manualTitle: "Wire Taxonomy",
  manualSections(scenario) {
    const criticalColorOrder = scenario.wires.filter((wire) => wire.isCritical).map((wire) => wire.color.toUpperCase());
    return [
      "Only critical wires should be cut in this stage.",
      `Expected critical callout order: ${criticalColorOrder.join(" -> ")}.`,
      "If the operator calls a non-listed wire, halt and force repeat-back.",
    ];
  },
};

const symbolsModule: BombModule = {
  id: "symbols",
  title: "Symbol Keypad",
  timerSec: 170,
  objective: STAGE_OBJECTIVE_LABELS.symbols,
  init(rng, scenario) {
    const precedenceOrder = rng.pickMany(SYMBOL_POOL, SYMBOL_POOL.length);
    const availableSymbols = precedenceOrder.slice(0, 5);
    const targetSequence = [...availableSymbols]
      .sort((a, b) => precedenceOrder.indexOf(a) - precedenceOrder.indexOf(b))
      .slice(0, 4);

    return {
      ...scenario,
      symbolModule: {
        availableSymbols,
        precedenceOrder,
        targetSequence,
        enteredSequence: [],
      },
    };
  },
  handleAction(scenario, context) {
    const next = cloneScenario(scenario);

    if (context.action.type !== "bomb_press_symbol") {
      return {
        scenario: next,
        pressureDelta: 3,
        scoreDelta: -2,
        summary: "Incorrect tool for current module.",
        timelineMessage: "Keypad module ignored non-symbol action.",
      };
    }

    const symbol = String(context.action.payload?.symbol ?? "");
    const expected = next.symbolModule.targetSequence[next.symbolModule.enteredSequence.length];
    if (symbol !== expected) {
      next.strikes += 1;
      next.strikeCarry = next.strikes;
      next.symbolModule.enteredSequence = [];
      return {
        scenario: next,
        pressureDelta: 8,
        scoreDelta: -7,
        summary: "Wrong glyph entered. Sequence reset.",
        timelineMessage: "Glyph sequence reset after mismatch.",
      };
    }

    next.symbolModule.enteredSequence.push(symbol);
    next.confirmationLedger.push({ atEpochMs: context.now, message: `Glyph accepted: ${symbol}.` });
    return {
      scenario: next,
      pressureDelta: -3,
      scoreDelta: 8,
      summary: "Glyph accepted.",
      timelineMessage: "Symbol sequence advanced.",
    };
  },
  isSolved(scenario) {
    return scenario.symbolModule.enteredSequence.length === scenario.symbolModule.targetSequence.length;
  },
  manualTitle: "Symbol Lexicon",
  manualSections(scenario) {
    return [
      `Precedence table: ${scenario.symbolModule.precedenceOrder.join(" -> ")}.`,
      "Operator reads visible glyph set. Analyst returns precedence order subset.",
      "Any mismatch resets the module and adds a strike.",
    ];
  },
};

const memoryModule: BombModule = {
  id: "memory",
  title: "Memory Relay",
  timerSec: 150,
  objective: STAGE_OBJECTIVE_LABELS.memory,
  init(rng, scenario) {
    return {
      ...scenario,
      memoryModule: {
        cues: Array.from({ length: 4 }).map(() => rng.nextInt(4) + 1),
        enteredSequence: [],
      },
    };
  },
  handleAction(scenario, context) {
    const next = cloneScenario(scenario);

    if (context.action.type !== "bomb_press_symbol") {
      return {
        scenario: next,
        pressureDelta: 3,
        scoreDelta: -2,
        summary: "Incorrect tool for current module.",
        timelineMessage: "Memory relay ignored non-keypad input.",
      };
    }

    const input = String(context.action.payload?.symbol ?? "");
    const step = next.memoryModule.enteredSequence.length;
    const cue = next.memoryModule.cues[step] ?? 0;
    const expected = String(((cue + step) % 4) + 1);

    if (input !== expected) {
      next.strikes += 1;
      next.strikeCarry = next.strikes;
      next.memoryModule.enteredSequence = [];
      return {
        scenario: next,
        pressureDelta: 10,
        scoreDelta: -8,
        summary: "Memory relay mismatch. Sequence reset.",
        timelineMessage: "Memory relay mismatch.",
      };
    }

    next.memoryModule.enteredSequence.push(input);
    next.confirmationLedger.push({ atEpochMs: context.now, message: `Memory relay accepted digit ${input}.` });
    return {
      scenario: next,
      pressureDelta: -4,
      scoreDelta: 9,
      summary: "Memory relay step accepted.",
      timelineMessage: "Memory relay advanced.",
    };
  },
  isSolved(scenario) {
    return scenario.memoryModule.enteredSequence.length === scenario.memoryModule.cues.length;
  },
  manualTitle: "Memory Procedure",
  manualSections() {
    return [
      "At step n (starting at 1), operator reports displayed cue c (1..4).",
      "Analyst computes response: ((c + (n - 1)) mod 4) + 1.",
      "Any mismatch resets the entered sequence for this stage.",
    ];
  },
};

const MODULES: Record<BombStageId, BombModule> = {
  wires: wiresModule,
  symbols: symbolsModule,
  memory: memoryModule,
};

function currentModule(scenario: BombScenarioState): BombModule {
  return MODULES[scenario.stageId];
}

function createScenario(rng: SeededRandom): BombScenarioState {
  let scenario: BombScenarioState = {
    type: "bomb-defusal",
    timerSec: 560,
    stageId: MODULE_QUEUE[0],
    stageIndex: 0,
    stageTimerSec: MODULES[MODULE_QUEUE[0]].timerSec,
    stageStatus: "active",
    strikeCarry: 0,
    moduleQueue: [...MODULE_QUEUE],
    completedStages: [],
    strikes: 0,
    maxStrikes: 3,
    stabilizeCharges: 3,
    status: "armed",
    wireProgress: 0,
    wires: [],
    symbolModule: {
      availableSymbols: [],
      precedenceOrder: [],
      targetSequence: [],
      enteredSequence: [],
    },
    memoryModule: {
      cues: [],
      enteredSequence: [],
    },
    deviceReadouts: [],
    manualPages: [],
    confirmationLedger: [],
  };

  scenario = wiresModule.init(rng, scenario);
  scenario = symbolsModule.init(rng, scenario);
  scenario = memoryModule.init(rng, scenario);
  scenario.manualPages = buildManualPages(scenario);
  scenario.deviceReadouts = buildDeviceReadouts(scenario);
  return scenario;
}

function wireLayoutPoint(index: number, start: boolean): Point2D {
  return {
    x: start ? 72 : 508,
    y: 48 + index * 40,
  };
}

function buildManualPages(scenario: BombScenarioState): BombScenarioState["manualPages"] {
  return scenario.moduleQueue.map((stageId, index) => ({
    id: `manual_${stageId}`,
    title: `${index + 1}. ${MODULES[stageId].manualTitle}`,
    sections: MODULES[stageId].manualSections(scenario),
  }));
}

function buildManualSpreads(scenario: BombScenarioState): ManualSpread[] {
  return scenario.manualPages.map((page, index) => {
    const yBase = 60 + index * 24;
    const isCurrentStage = scenario.stageIndex === index;

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
            { x: 360, y: 84 + index * 10 },
            { x: 420, y: 134 + index * 8 },
            { x: 500, y: 90 + index * 8 },
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
          fill: isCurrentStage ? "#f2ead6" : "#ece3cf",
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
            { x: 372, y: 92 + index * 8 },
            { x: 446, y: 144 + index * 8 },
            { x: 530, y: 94 + index * 8 },
          ],
          stroke: "#744730",
        },
      ],
      hotspots: page.sections.map((section, sectionIndex) => ({
        id: `${page.id}_spot_${sectionIndex + 1}`,
        x: 70,
        y: 146 + sectionIndex * 42,
        width: 520,
        height: 36,
        label: `Clause ${sectionIndex + 1}`,
        detail: section,
      })),
      calloutPins: page.sections.slice(0, 3).map((section, sectionIndex) => ({
        id: `${page.id}_pin_${sectionIndex + 1}`,
        x: 610,
        y: 82 + sectionIndex * 80,
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
  const activeCue = scenario.memoryModule.cues[scenario.memoryModule.enteredSequence.length] ?? 0;

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
      valueLabel: scenario.stageId === "memory" ? `CUE ${activeCue || "-"}` : `${scenario.stageTimerSec}s`,
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
      valueLabel: `S${scenario.stageIndex + 1}`,
    },
    {
      id: "capacitor_core",
      type: "capacitor" as const,
      x: 428,
      y: 24,
      width: 42,
      height: 58,
      rotationDeg: 8,
      state: scenario.stageTimerSec < 45 ? ("fault" as const) : ("idle" as const),
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
    active: scenario.stageId === "wires" && !wire.isCut,
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

function maybeDetonate(next: BombScenarioState, now: number): ModeMutation | undefined {
  if (next.strikes >= next.maxStrikes) {
    next.status = "exploded";
    next.strikeCarry = next.strikes;
    return {
      replaceScenario: next,
      pressureDelta: 20,
      scoreDelta: -20,
      status: "failed",
      summary: "Detonation triggered by strike limit breach.",
      timelineAdds: [newTimelineEvent("inject", "Bomb exploded.", now)],
    };
  }
  if (next.timerSec <= 0 || (next.stageStatus === "active" && next.stageTimerSec <= 0)) {
    next.status = "exploded";
    return {
      replaceScenario: next,
      pressureDelta: 20,
      scoreDelta: -20,
      status: "failed",
      summary: "Countdown reached zero on active module.",
      timelineAdds: [newTimelineEvent("inject", "Countdown reached zero.", now)],
    };
  }
  return undefined;
}

function stageOrderRail(scenario: BombScenarioState) {
  return scenario.moduleQueue.map((stageId) => ({
    stageId,
    label: stageLabel(stageId),
    completed: scenario.completedStages.includes(stageId),
    active: scenario.stageId === stageId && scenario.stageStatus === "active",
  }));
}

function buildBombFsmPayload(state: RoomState) {
  const scenario = state.scenario;
  if (scenario.type !== "bomb-defusal") {
    throw new Error("invalid scenario");
  }

  const nodes = [
    { id: "room:lobby", label: "Lobby", kind: "room-status" as const, active: state.status === "lobby", x: 0.1, y: 0.14 },
    { id: "room:running", label: "Running", kind: "room-status" as const, active: state.status === "running", x: 0.32, y: 0.14 },
    { id: "room:resolved", label: "Resolved", kind: "room-status" as const, active: state.status === "resolved", x: 0.56, y: 0.14 },
    { id: "room:failed", label: "Failed", kind: "room-status" as const, active: state.status === "failed", x: 0.78, y: 0.14 },
    { id: "bomb:armed", label: "Bomb Armed", kind: "scenario-status" as const, active: scenario.status === "armed", x: 0.2, y: 0.42 },
    { id: "bomb:defused", label: "Bomb Defused", kind: "scenario-status" as const, active: scenario.status === "defused", x: 0.48, y: 0.42 },
    { id: "bomb:exploded", label: "Bomb Exploded", kind: "scenario-status" as const, active: scenario.status === "exploded", x: 0.76, y: 0.42 },
    { id: "stage:wires", label: "Stage A Wires", kind: "stage" as const, active: scenario.stageId === "wires", x: 0.18, y: 0.76 },
    { id: "stage:symbols", label: "Stage B Symbols", kind: "stage" as const, active: scenario.stageId === "symbols", x: 0.46, y: 0.76 },
    { id: "stage:memory", label: "Stage C Memory", kind: "stage" as const, active: scenario.stageId === "memory", x: 0.74, y: 0.76 },
  ];

  const transitions = [
    { id: "t_room_running", fromNodeId: "room:lobby", toNodeId: "room:running", label: "Force Running", actionPayload: "room-status:running" },
    { id: "t_room_resolved", fromNodeId: "room:running", toNodeId: "room:resolved", label: "Resolve", actionPayload: "room-status:resolved" },
    { id: "t_room_failed", fromNodeId: "room:running", toNodeId: "room:failed", label: "Fail", actionPayload: "room-status:failed" },
    { id: "t_bomb_armed", fromNodeId: "bomb:defused", toNodeId: "bomb:armed", label: "Re-arm", actionPayload: "bomb-status:armed" },
    { id: "t_bomb_defused", fromNodeId: "bomb:armed", toNodeId: "bomb:defused", label: "Mark Defused", actionPayload: "bomb-status:defused" },
    { id: "t_bomb_exploded", fromNodeId: "bomb:armed", toNodeId: "bomb:exploded", label: "Explode", actionPayload: "bomb-status:exploded" },
    { id: "t_stage_wires", fromNodeId: "bomb:armed", toNodeId: "stage:wires", label: "Go Stage A", actionPayload: "bomb-stage:wires" },
    { id: "t_stage_symbols", fromNodeId: "bomb:armed", toNodeId: "stage:symbols", label: "Go Stage B", actionPayload: "bomb-stage:symbols" },
    { id: "t_stage_memory", fromNodeId: "bomb:armed", toNodeId: "stage:memory", label: "Go Stage C", actionPayload: "bomb-stage:memory" },
  ];

  const currentNodeId = nodes.find((node) => node.active)?.id ?? "room:running";
  return {
    mode: "bomb-defusal" as const,
    currentNodeId,
    nodes,
    transitions,
    hints: [
      `Room status: ${state.status}`,
      `Bomb status: ${scenario.status}`,
      `Active module: ${stageLabel(scenario.stageId)} (${scenario.stageStatus})`,
    ],
  };
}

export class BombDefusalMode implements GameModeEngine {
  initObjectives(_rng: SeededRandom): RoomState["objectives"] {
    return [
      {
        id: "bomb_obj_1",
        description: "Stage A: complete wire discipline module",
        requiredAction: "bomb_cut_wire",
        completed: false,
      },
      {
        id: "bomb_obj_2",
        description: "Stage B: complete symbol keypad module",
        requiredAction: "bomb_press_symbol",
        completed: false,
      },
      {
        id: "bomb_obj_3",
        description: "Stage C: complete memory relay module",
        requiredAction: "bomb_press_symbol",
        completed: false,
      },
    ];
  }

  initSummary(): string {
    return "Bomb gauntlet active. Keep all communication in Slack and enforce verbal confirmations.";
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
      assign_role: "gm_orchestrator",
      gm_fsm_transition: "fsm_editor",
    };
    return map[actionType];
  }

  onAction(state: RoomState, action: PlayerAction, now: number): ModeMutation {
    const scenario = state.scenario;
    if (scenario.type !== "bomb-defusal" || scenario.status !== "armed") {
      return {};
    }

    const next = cloneScenario(scenario);
    const timelineAdds = [
      newTimelineEvent("status", `${action.playerId} executed ${action.type}`, now, action.playerId),
    ];

    let pressureDelta = 0;
    let scoreDelta = 0;
    let summary = "Team coordinating under pressure.";

    if (action.type === "bomb_stabilize_panel") {
      if (next.stageStatus !== "active") {
        pressureDelta += 1;
        summary = "Stabilizer ignored during stage intermission.";
      } else if (next.stabilizeCharges <= 0) {
        next.strikes += 1;
        next.strikeCarry = next.strikes;
        pressureDelta += 8;
        scoreDelta -= 6;
        summary = "Stabilizer cartridge depleted. Strike registered.";
        timelineAdds.push(newTimelineEvent("inject", "Stabilizer depleted.", now));
      } else {
        next.stabilizeCharges -= 1;
        next.timerSec = Math.min(620, next.timerSec + 14);
        next.stageTimerSec = Math.min(MODULES[next.stageId].timerSec + 25, next.stageTimerSec + 10);
        pressureDelta -= 7;
        scoreDelta += 6;
        summary = "Stabilization pulse successful.";
        next.confirmationLedger.push({ atEpochMs: now, message: "Safety Officer executed stabilization pulse." });
      }
    } else {
      const stageModule = currentModule(next);
      const result = stageModule.handleAction(next, { now, action });
      pressureDelta += result.pressureDelta;
      scoreDelta += result.scoreDelta;
      summary = result.summary;
      Object.assign(next, result.scenario);
      if (result.timelineMessage) {
        timelineAdds.push(newTimelineEvent("status", result.timelineMessage, now));
      }
    }

    next.deviceReadouts = buildDeviceReadouts(next);
    next.manualPages = buildManualPages(next);

    const detonated = maybeDetonate(next, now);
    if (detonated) {
      detonated.timelineAdds = [...(detonated.timelineAdds ?? []), ...timelineAdds];
      return detonated;
    }

    if (next.stageStatus === "active" && currentModule(next).isSolved(next)) {
      const solvedStage = next.stageId;
      if (!next.completedStages.includes(solvedStage)) {
        next.completedStages.push(solvedStage);
      }

      if (next.completedStages.length >= next.moduleQueue.length) {
        next.status = "defused";
        return {
          replaceScenario: next,
          pressureDelta: pressureDelta - 12,
          scoreDelta: scoreDelta + 28,
          status: "resolved",
          summary: "Bomb defused across all gauntlet stages.",
          markObjectiveIdsComplete: completeObjectiveForAction(state.objectives, STAGE_COMPLETE_ACTION[solvedStage]),
          timelineAdds: [...timelineAdds, newTimelineEvent("system", "Final stage solved. Defusal confirmed.", now)],
        };
      }

      const nextStageIndex = next.stageIndex + 1;
      const nextStageId = next.moduleQueue[nextStageIndex];
      next.stageStatus = "intermission";
      next.intermissionUntilEpochMs = now + STAGE_TRANSITION_MS;
      next.deviceReadouts = [
        `${stageLabel(solvedStage)} cleared.`,
        `Preparing ${stageLabel(nextStageId)}.`,
        "Hold comms discipline through transition.",
      ];

      return {
        replaceScenario: next,
        pressureDelta: pressureDelta - 4,
        scoreDelta: scoreDelta + 14,
        summary: `Stage cleared: ${stageLabel(solvedStage)}.`,
        markObjectiveIdsComplete: completeObjectiveForAction(state.objectives, STAGE_COMPLETE_ACTION[solvedStage]),
        timelineAdds: [...timelineAdds, newTimelineEvent("system", `Stage ${stageLabel(solvedStage)} solved.`, now)],
      };
    }

    return {
      replaceScenario: next,
      pressureDelta,
      scoreDelta,
      summary,
      timelineAdds,
    };
  }

  onTick(state: RoomState, now: number): ModeMutation {
    const scenario = state.scenario;
    if (scenario.type !== "bomb-defusal" || state.status !== "running" || scenario.status !== "armed") {
      return {};
    }

    const next = cloneScenario(scenario);

    if (next.stageStatus === "intermission") {
      if (next.intermissionUntilEpochMs && now >= next.intermissionUntilEpochMs) {
        const stageIndex = Math.min(next.moduleQueue.length - 1, next.stageIndex + 1);
        const stageId = next.moduleQueue[stageIndex];
        next.stageIndex = stageIndex;
        next.stageId = stageId;
        next.stageStatus = "active";
        next.stageTimerSec = MODULES[stageId].timerSec;
        next.intermissionUntilEpochMs = undefined;
        next.deviceReadouts = buildDeviceReadouts(next);

        return {
          replaceScenario: next,
          pressureDelta: 1,
          summary: `Stage ${stageLabel(stageId)} is now active.`,
          timelineAdds: [newTimelineEvent("system", `Stage ${stageLabel(stageId)} started.`, now)],
        };
      }

      return {
        replaceScenario: next,
        pressureDelta: 1,
      };
    }

    next.timerSec = Math.max(0, next.timerSec - 15);
    next.stageTimerSec = Math.max(0, next.stageTimerSec - 15);
    next.deviceReadouts = buildDeviceReadouts(next);

    const detonated = maybeDetonate(next, now);
    if (detonated) {
      return detonated;
    }

    const warning = next.timerSec <= 120 || next.stageTimerSec <= 45;
    return {
      replaceScenario: next,
      pressureDelta: warning ? 5 : 2,
      timelineAdds: warning
        ? [newTimelineEvent("inject", `Critical countdown window reached for ${stageLabel(next.stageId)}.`, now)]
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
      : granted.filter((panelId) => panelId !== "gm_orchestrator" && panelId !== "fsm_editor" && panelId !== "debrief_replay");

    const panelMap: PanelDeckView["panelsById"] = {};

    const withLock = (id: ScenePanelId) => args.panelState.panelLocks[id] ?? { locked: false };

    const pushPanel = <K extends ScenePanelId>(panel: ScenePanelView<K>): void => {
      if (availablePanelIds.includes(panel.id)) {
        panelMap[panel.id] = panel as never;
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

    const symbolSource = scenario.stageId === "memory" ? MEMORY_DIGITS : scenario.symbolModule.availableSymbols;
    const symbolNodes = symbolSource.map((symbol, idx) => {
      const angle = (Math.PI * 2 * idx) / symbolSource.length;
      return {
        symbol,
        x: 615 + Math.cos(angle) * 44,
        y: 95 + Math.sin(angle) * 44,
        radius: 18,
      };
    });

    const canCutWire = scenario.stageStatus === "active" && scenario.stageId === "wires" && scenario.status === "armed";
    const canPressSymbol = scenario.stageStatus === "active" && (scenario.stageId === "symbols" || scenario.stageId === "memory") && scenario.status === "armed";

    const interactionRegions = [
      ...cuttableSegments.map((segment) => {
        const wire = scenario.wires.find((item) => item.id === segment.wireId);
        return {
          id: `region_${segment.id}`,
          targetId: segment.wireId,
          kind: "wire" as const,
          shape: "line" as const,
          cursor: canCutWire && !wire?.isCut ? ("crosshair" as const) : ("not-allowed" as const),
          enabled: canCutWire && !wire?.isCut,
          affordance: "cut" as const,
          line: { start: segment.start, end: segment.end, thickness: segment.thickness + 8 },
        };
      }),
      ...symbolNodes.map((node) => ({
        id: `region_symbol_${node.symbol}`,
        targetId: node.symbol,
        kind: "symbol" as const,
        shape: "circle" as const,
        cursor: canPressSymbol ? ("pointer" as const) : ("not-allowed" as const),
        enabled: canPressSymbol,
        affordance: "press" as const,
        circle: { center: { x: node.x, y: node.y }, radius: node.radius + 8 },
      })),
      {
        id: "region_stabilizer",
        targetId: "stability_module",
        kind: "stabilizer" as const,
        shape: "circle" as const,
        cursor: scenario.status === "armed" && scenario.stageStatus === "active" ? ("grab" as const) : ("not-allowed" as const),
        enabled: scenario.status === "armed" && scenario.stageStatus === "active",
        affordance: "hold" as const,
        circle: { center: { x: 615, y: 195 }, radius: 44 },
      },
    ];

    const stageRail = stageOrderRail(scenario);

    pushPanel({
      id: "mission_hud",
      kind: "shared",
      title: "Mission HUD",
      subtitle: `Stage ${scenario.stageIndex + 1}: ${stageLabel(scenario.stageId)}`,
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
        summary: `${args.state.publicSummary} | ${stageLabel(scenario.stageId)} ${scenario.stageStatus}`,
        slackReminder: "Coordinate verbally in Slack before every critical action.",
      },
    });

    pushPanel({
      id: "device_console",
      kind: "role-scoped",
      title: "Device Console",
      subtitle: `${stageLabel(scenario.stageId)} module`,
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
        stageId: scenario.stageId,
        stageIndex: scenario.stageIndex,
        totalStages: scenario.moduleQueue.length,
        stageTimerSec: scenario.stageTimerSec,
        stageStatus: scenario.stageStatus,
        completedStages: scenario.completedStages,
        stageObjective: STAGE_OBJECTIVE_LABELS[scenario.stageId],
        timerSec: scenario.timerSec,
        strikes: scenario.strikes,
        maxStrikes: scenario.maxStrikes,
        stabilizeCharges: scenario.stabilizeCharges,
        wires: scenario.wires.map((wire) => ({ id: wire.id, color: wire.color, isCut: wire.isCut })),
        symbolModule: {
          availableSymbols: scenario.symbolModule.availableSymbols,
          enteredSequence: scenario.symbolModule.enteredSequence,
          precedenceOrder: scenario.symbolModule.precedenceOrder,
        },
        memoryModule: {
          cue: scenario.memoryModule.cues[scenario.memoryModule.enteredSequence.length] ?? 0,
          step: scenario.memoryModule.enteredSequence.length + 1,
          totalSteps: scenario.memoryModule.cues.length,
          availableDigits: MEMORY_DIGITS,
          enteredSequence: scenario.memoryModule.enteredSequence,
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
        shakeIntensity: Math.min(1, (scenario.strikes / scenario.maxStrikes) * 0.85 + (560 - scenario.timerSec) / 1000),
        diagnostics: scenario.deviceReadouts,
      },
    });

    pushPanel({
      id: "manual_rulebook",
      kind: "role-scoped",
      title: "Manual Rulebook",
      subtitle: `Stage ${scenario.stageIndex + 1}: ${stageLabel(scenario.stageId)}`,
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
        stageId: scenario.stageId,
        stageTitle: stageLabel(scenario.stageId),
        spreads: buildManualSpreads(scenario),
        activeSpreadId: scenario.manualPages[scenario.stageIndex]?.id,
        pages: scenario.manualPages,
        index: scenario.manualPages.map((page) => page.title),
        hint: "Read exact clauses and demand repeat-back before execution.",
      },
    });

    pushPanel({
      id: "safety_telemetry",
      kind: "role-scoped",
      title: "Safety Telemetry",
      subtitle: `${stageLabel(scenario.stageId)} | ${scenario.stageStatus}`,
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
        stageId: scenario.stageId,
        currentRisk: Math.min(
          100,
          Math.round((scenario.strikes / scenario.maxStrikes) * 50 + (560 - scenario.timerSec) / 9 + (190 - scenario.stageTimerSec) / 6),
        ),
        stabilizeWindowSec: Math.max(0, scenario.stageTimerSec - 20),
        strikeCarry: scenario.strikeCarry,
        stabilizeCharges: scenario.stabilizeCharges,
        alarms:
          scenario.stageStatus === "intermission"
            ? ["Stage transition underway"]
            : scenario.stageTimerSec < 45
            ? ["Module timer in critical band"]
            : ["Telemetry nominal"],
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
        stageId: scenario.stageId,
        currentDirective: STAGE_OBJECTIVE_LABELS[scenario.stageId],
        stageRail,
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
            { id: "risk_timer", x: 0.6, y: 0.22, severity: Math.max(0, 1 - scenario.timerSec / 560), label: "Timer" },
            { id: "risk_strike", x: 0.6, y: 0.3, severity: scenario.strikes / scenario.maxStrikes, label: "Strikes" },
            { id: "risk_stage", x: 0.54, y: 0.4, severity: Math.max(0, 1 - scenario.stageTimerSec / 190), label: stageLabel(scenario.stageId) },
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

      panelMap.fsm_editor = {
        id: "fsm_editor",
        kind: "gm-only",
        title: "FSM Editor",
        subtitle: "Visualize and edit live state machine",
        priority: 94,
        visualPriority: 70,
        renderMode: "svg",
        interactionMode: "drawer-control",
        overlayTextLevel: "dense",
        fxProfile: "cinematic",
        ambientLoopMs: 3000,
        hoverDepthPx: 3,
        materialPreset: "gm-deck",
        locked: withLock("fsm_editor"),
        payload: buildBombFsmPayload(args.state),
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
