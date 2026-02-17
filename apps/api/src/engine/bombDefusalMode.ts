import type {
  BombScenarioState,
  BombWire,
  Player,
  PlayerAction,
  RoomState,
  ScenarioView,
} from "@incident/shared";
import type { GameModeEngine, ModeMutation } from "./types";
import { newTimelineEvent } from "./helpers";

const WIRE_COLORS: BombWire["color"][] = ["red", "blue", "yellow", "white", "black"];
const SYMBOL_POOL = ["psi", "star", "lambda", "spiral", "bolt", "eye", "key", "sun"];

const ROLE_INSTRUCTION: Record<string, string> = {
  "Lead Coordinator": "Coordinate callouts in Slack. Keep everyone on sequence and time.",
  "Device Specialist": "You control physical module actions. Describe readouts in Slack.",
  "Manual Analyst": "You see manual clues only. Translate clues into exact commands.",
  "Safety Officer": "Watch strike count and timer. Trigger stabilizations at critical points.",
  Observer: "Observe flow and identify communication failures for the debrief.",
};

function pick<T>(input: T[], count: number): T[] {
  const arr = [...input];
  arr.sort(() => Math.random() - 0.5);
  return arr.slice(0, count);
}

function createScenario(): BombScenarioState {
  const wires = Array.from({ length: 5 }).map((_, idx) => ({
    id: `wire_${idx + 1}`,
    color: WIRE_COLORS[Math.floor(Math.random() * WIRE_COLORS.length)],
    isCut: false,
    isCritical: false,
  }));

  const criticalWires = pick(wires.map((w) => w.id), 2);
  wires.forEach((wire) => {
    wire.isCritical = criticalWires.includes(wire.id);
  });

  const availableSymbols = pick(SYMBOL_POOL, 5);
  const targetSequence = pick(availableSymbols, 3);

  const criticalDescriptions = wires
    .filter((wire) => wire.isCritical)
    .map((wire) => wire.color)
    .join(" then ");

  return {
    type: "bomb-defusal",
    timerSec: 480,
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
      "Panel A shows vibration spikes near battery compartment.",
      "Display flashes: PRIORITIZE wire sequence before symbol confirmation.",
    ],
    manualClues: [
      `Cut order clue: ${criticalDescriptions}.`,
      `Symbol rule: enter ${targetSequence.join(" -> ")} exactly.`,
      "If strikes reach 3, core charge becomes unstable immediately.",
    ],
  };
}

function completeObjectiveForAction(
  objectives: RoomState["objectives"],
  action: PlayerAction["type"],
): string[] {
  const next = objectives.find((obj) => !obj.completed && obj.requiredAction === action);
  return next ? [next.id] : [];
}

export class BombDefusalMode implements GameModeEngine {
  initObjectives(): RoomState["objectives"] {
    return [
      {
        id: "bomb_obj_1",
        description: "Cut both critical wires in the right order",
        requiredAction: "bomb_cut_wire",
        completed: false,
      },
      {
        id: "bomb_obj_2",
        description: "Enter the correct 3-symbol sequence",
        requiredAction: "bomb_press_symbol",
        completed: false,
      },
      {
        id: "bomb_obj_3",
        description: "Use stabilization when timer pressure peaks",
        requiredAction: "bomb_stabilize_panel",
        completed: false,
      },
    ];
  }

  initSummary(): string {
    return "Bomb response underway. Use Slack only for communication and keep command language precise.";
  }

  initScenario(): RoomState["scenario"] {
    return createScenario();
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
      deviceReadouts: [...scenario.deviceReadouts],
      manualClues: [...scenario.manualClues],
    };

    const timelineAdds = [
      newTimelineEvent("status", `${action.playerId} executed ${action.type}`, now, action.playerId),
    ];
    let pressureDelta = 0;
    let scoreDelta = 0;
    let summary: string | undefined;

    if (action.type === "bomb_cut_wire") {
      const wireId = String(action.payload?.wireId ?? "");
      const wire = next.wires.find((candidate) => candidate.id === wireId);
      if (!wire || wire.isCut) {
        return {
          timelineAdds: [
            ...timelineAdds,
            newTimelineEvent("inject", "Invalid wire operation; no panel change detected.", now),
          ],
          pressureDelta: 5,
          scoreDelta: -4,
          summary: "Control input mismatch. Reconfirm module labels in Slack.",
        };
      }

      wire.isCut = true;
      if (!wire.isCritical) {
        next.strikes += 1;
        pressureDelta += 11;
        scoreDelta -= 8;
        summary = "Wrong wire cut. Manual analyst and specialist must re-align instantly.";
      } else {
        pressureDelta -= 4;
        scoreDelta += 10;
        summary = "Critical wire cleared. Continue exact call-and-response cadence.";
      }
    }

    if (action.type === "bomb_press_symbol") {
      const symbol = String(action.payload?.symbol ?? "");
      if (!next.symbolModule.availableSymbols.includes(symbol)) {
        return {
          timelineAdds: [
            ...timelineAdds,
            newTimelineEvent("inject", "Unknown symbol submitted to keypad module.", now),
          ],
          pressureDelta: 4,
          scoreDelta: -4,
          summary: "Wrong symbol family. Verify glyph names verbally.",
        };
      }

      const expected = next.symbolModule.targetSequence[next.symbolModule.enteredSequence.length];
      if (symbol !== expected) {
        next.strikes += 1;
        next.symbolModule.enteredSequence = [];
        pressureDelta += 9;
        scoreDelta -= 7;
        summary = "Sequence reset after incorrect symbol. Restart with stricter confirmation loops.";
      } else {
        next.symbolModule.enteredSequence.push(symbol);
        pressureDelta -= 2;
        scoreDelta += 7;
      }
    }

    if (action.type === "bomb_stabilize_panel") {
      next.timerSec = Math.min(600, next.timerSec + 20);
      pressureDelta -= 8;
      scoreDelta += 6;
      summary = "Safety stabilization succeeded; temporary breathing room gained.";
    }

    if (next.strikes >= next.maxStrikes) {
      next.status = "exploded";
      return {
        replaceScenario: next,
        pressureDelta: 20,
        scoreDelta: -20,
        status: "failed",
        summary: "Bomb detonated after strike limit. Debrief communication protocol failure.",
        timelineAdds: [
          ...timelineAdds,
          newTimelineEvent("inject", "Critical detonation triggered by repeated mistakes.", now),
        ],
      };
    }

    const allCriticalCut = next.wires.filter((wire) => wire.isCritical).every((wire) => wire.isCut);
    const symbolSolved =
      next.symbolModule.enteredSequence.length === next.symbolModule.targetSequence.length;

    if (allCriticalCut && symbolSolved) {
      next.status = "defused";
      return {
        replaceScenario: next,
        pressureDelta: -10,
        scoreDelta: 25,
        status: "resolved",
        markObjectiveIdsComplete: [
          ...completeObjectiveForAction(state.objectives, "bomb_cut_wire"),
          ...completeObjectiveForAction(state.objectives, "bomb_press_symbol"),
          ...completeObjectiveForAction(state.objectives, "bomb_stabilize_panel"),
        ],
        summary: "Bomb defused. Team executed under pressure with high communication discipline.",
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
      timerSec: scenario.timerSec - 15,
      wires: scenario.wires.map((wire) => ({ ...wire })),
      symbolModule: { ...scenario.symbolModule, enteredSequence: [...scenario.symbolModule.enteredSequence] },
      deviceReadouts: [...scenario.deviceReadouts],
      manualClues: [...scenario.manualClues],
    };

    if (next.timerSec <= 0) {
      next.timerSec = 0;
      next.status = "exploded";
      return {
        replaceScenario: next,
        status: "failed",
        pressureDelta: 20,
        scoreDelta: -20,
        summary: "Timer elapsed. Simulated device exploded.",
        timelineAdds: [newTimelineEvent("inject", "Countdown reached zero. Detonation.", now)],
      };
    }

    const latePressure = next.timerSec < 120 ? 5 : 2;
    return {
      replaceScenario: next,
      pressureDelta: latePressure,
      timelineAdds:
        next.timerSec < 120
          ? [newTimelineEvent("inject", "Final two-minute warning. Keep callouts crisp.", now)]
          : undefined,
    };
  }

  toScenarioView(state: RoomState, player?: Player): ScenarioView {
    const scenario = state.scenario;
    if (scenario.type !== "bomb-defusal") {
      throw new Error("Invalid scenario mode");
    }

    const role = player?.role ?? "Observer";
    const visibleClues: string[] = [];

    if (role === "Device Specialist" || role === "Lead Coordinator") {
      visibleClues.push(...scenario.deviceReadouts);
    }
    if (role === "Manual Analyst" || role === "Lead Coordinator") {
      visibleClues.push(...scenario.manualClues);
    }
    if (visibleClues.length === 0) {
      visibleClues.push("You do not have direct module clues. Focus on process discipline and support.");
    }

    return {
      type: "bomb-defusal",
      timerSec: scenario.timerSec,
      strikes: scenario.strikes,
      maxStrikes: scenario.maxStrikes,
      status: scenario.status,
      wires: scenario.wires.map((wire) => ({ id: wire.id, color: wire.color, isCut: wire.isCut })),
      symbolModule: {
        availableSymbols: scenario.symbolModule.availableSymbols,
        enteredSequence: scenario.symbolModule.enteredSequence,
      },
      visibleClues,
      roleInstruction:
        ROLE_INSTRUCTION[role] ?? "Support clear communication loops and confirm every critical command.",
    };
  }
}
