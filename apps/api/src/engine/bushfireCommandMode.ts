import type {
  BushfireCell,
  BushfireScenarioState,
  Player,
  PlayerAction,
  RoomState,
  ScenarioView,
} from "@incident/shared";
import type { GameModeEngine, ModeMutation } from "./types";
import { newTimelineEvent } from "./helpers";

const ZONES = [
  "Riverbend",
  "Cedar Hill",
  "Town Center",
  "South Farms",
  "Rail Junction",
  "East Ridge",
  "Pine Valley",
  "Lakeside",
  "North Estate",
];

const ROLE_INSTRUCTION: Record<string, string> = {
  "Incident Controller": "Direct strategy from Slack and keep role boundaries clear.",
  "Fire Operations SME": "Deploy crews, water drops, and firebreaks to reduce spread.",
  "Police Operations SME": "Manage roadblocks and evacuation corridors.",
  "Public Information Officer": "Issue public advisories and maintain trust under pressure.",
  Observer: "Observe cross-team handoffs and decision quality.",
};

function createCells(): BushfireCell[] {
  return ZONES.map((zoneName, idx) => ({
    id: `cell_${idx + 1}`,
    x: idx % 3,
    y: Math.floor(idx / 3),
    zoneName,
    fireLevel: idx === 1 || idx === 3 ? 45 : 0,
    fuel: 70 + Math.floor(Math.random() * 20),
    population: 50 + Math.floor(Math.random() * 250),
    evacuated: false,
    hasFireCrew: false,
    hasPoliceUnit: false,
    hasFirebreak: false,
  }));
}

function spreadFire(cells: BushfireCell[], windStrength: number): BushfireCell[] {
  const next = cells.map((cell) => ({ ...cell }));
  for (const cell of next) {
    if (cell.fireLevel <= 0) {
      continue;
    }

    const growth = windStrength * 3 + (cell.hasFirebreak ? -6 : 0) + (cell.hasFireCrew ? -8 : 0);
    cell.fireLevel = Math.max(0, Math.min(100, cell.fireLevel + growth));
    cell.fuel = Math.max(0, cell.fuel - 4);

    if (cell.fireLevel > 40) {
      const neighbors = next.filter(
        (candidate) =>
          Math.abs(candidate.x - cell.x) + Math.abs(candidate.y - cell.y) === 1 && candidate.fireLevel < 100,
      );

      for (const neighbor of neighbors) {
        const spread = Math.max(0, 8 + windStrength * 2 - (neighbor.hasFirebreak ? 8 : 0));
        neighbor.fireLevel = Math.max(neighbor.fireLevel, Math.min(100, neighbor.fireLevel + spread));
      }
    }
  }
  return next;
}

function containmentFromCells(cells: BushfireCell[]): number {
  const burning = cells.filter((cell) => cell.fireLevel > 0).length;
  const severe = cells.filter((cell) => cell.fireLevel >= 60).length;
  return Math.max(0, 100 - burning * 8 - severe * 6);
}

function completeObjectiveForAction(
  objectives: RoomState["objectives"],
  action: PlayerAction["type"],
): string[] {
  const next = objectives.find((obj) => !obj.completed && obj.requiredAction === action);
  return next ? [next.id] : [];
}

export class BushfireCommandMode implements GameModeEngine {
  initObjectives(): RoomState["objectives"] {
    return [
      {
        id: "fire_obj_1",
        description: "Deploy at least one fire crew to an active zone",
        requiredAction: "bushfire_deploy_fire_crew",
        completed: false,
      },
      {
        id: "fire_obj_2",
        description: "Issue public advisory before anxiety spikes",
        requiredAction: "bushfire_issue_public_update",
        completed: false,
      },
      {
        id: "fire_obj_3",
        description: "Create a firebreak protecting a high-risk zone",
        requiredAction: "bushfire_create_firebreak",
        completed: false,
      },
    ];
  }

  initSummary(): string {
    return "Bushfire command simulation active. Coordinate all comms in Slack while executing map operations in-game.";
  }

  initScenario(): RoomState["scenario"] {
    return {
      type: "bushfire-command",
      timerSec: 540,
      windDirection: ["N", "S", "E", "W"][Math.floor(Math.random() * 4)] as "N" | "S" | "E" | "W",
      windStrength: (Math.floor(Math.random() * 3) + 1) as 1 | 2 | 3,
      publicAnxiety: 25,
      containment: 72,
      waterBombsAvailable: 3,
      cells: createCells(),
      publicAdvisories: [],
    };
  }

  onAction(state: RoomState, action: PlayerAction, now: number): ModeMutation {
    const scenario = state.scenario;
    if (scenario.type !== "bushfire-command") {
      return {};
    }

    const next: BushfireScenarioState = {
      ...scenario,
      cells: scenario.cells.map((cell) => ({ ...cell })),
      publicAdvisories: [...scenario.publicAdvisories],
    };

    const timelineAdds = [
      newTimelineEvent("status", `${action.playerId} executed ${action.type}`, now, action.playerId),
    ];

    let pressureDelta = 0;
    let scoreDelta = 0;
    let summary: string | undefined;

    const targetCellId = String(action.payload?.cellId ?? "");
    const targetCell = next.cells.find((cell) => cell.id === targetCellId);

    if (action.type === "bushfire_deploy_fire_crew") {
      if (!targetCell) {
        return { pressureDelta: 3, scoreDelta: -3, timelineAdds };
      }
      targetCell.hasFireCrew = true;
      targetCell.fireLevel = Math.max(0, targetCell.fireLevel - 15);
      scoreDelta += 9;
      pressureDelta -= 4;
      summary = `Fire crew deployed to ${targetCell.zoneName}.`;
    }

    if (action.type === "bushfire_drop_water") {
      if (!targetCell || next.waterBombsAvailable <= 0) {
        return { pressureDelta: 5, scoreDelta: -4, timelineAdds };
      }
      next.waterBombsAvailable -= 1;
      targetCell.fireLevel = Math.max(0, targetCell.fireLevel - 25);
      scoreDelta += 10;
      pressureDelta -= 5;
      summary = `Water drop hit ${targetCell.zoneName}.`;
    }

    if (action.type === "bushfire_set_roadblock") {
      if (!targetCell) {
        return { pressureDelta: 3, scoreDelta: -2, timelineAdds };
      }
      targetCell.hasPoliceUnit = true;
      targetCell.evacuated = true;
      scoreDelta += 8;
      pressureDelta -= 3;
      summary = `Police roadblock + evacuation staged near ${targetCell.zoneName}.`;
    }

    if (action.type === "bushfire_create_firebreak") {
      if (!targetCell) {
        return { pressureDelta: 3, scoreDelta: -2, timelineAdds };
      }
      targetCell.hasFirebreak = true;
      scoreDelta += 8;
      pressureDelta -= 4;
      summary = `Firebreak established at ${targetCell.zoneName}.`;
    }

    if (action.type === "bushfire_issue_public_update") {
      const template = String(action.payload?.template ?? "Shelter-in-place advisory issued.");
      next.publicAdvisories.push(template);
      next.publicAnxiety = Math.max(0, next.publicAnxiety - 10);
      scoreDelta += 7;
      pressureDelta -= 2;
      summary = "Public information advisory delivered.";
    }

    next.containment = containmentFromCells(next.cells);

    if (next.containment >= 88 && next.publicAnxiety <= 35) {
      return {
        replaceScenario: next,
        status: "resolved",
        pressureDelta: -8,
        scoreDelta: 20,
        markObjectiveIdsComplete: completeObjectiveForAction(state.objectives, action.type),
        summary: "Fire contained and public risk stabilized.",
        timelineAdds: [...timelineAdds, newTimelineEvent("system", "Containment target reached.", now)],
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
    if (scenario.type !== "bushfire-command" || state.status !== "running") {
      return {};
    }

    const next: BushfireScenarioState = {
      ...scenario,
      timerSec: Math.max(0, scenario.timerSec - 15),
      cells: spreadFire(scenario.cells, scenario.windStrength),
      publicAdvisories: [...scenario.publicAdvisories],
      publicAnxiety: Math.min(100, scenario.publicAnxiety + (scenario.publicAdvisories.length > 0 ? 1 : 4)),
    };
    next.containment = containmentFromCells(next.cells);

    if (next.timerSec === 0 || next.publicAnxiety >= 90 || next.containment <= 25) {
      return {
        replaceScenario: next,
        status: "failed",
        pressureDelta: 18,
        scoreDelta: -15,
        summary: "Fire escalation exceeded command capacity.",
        timelineAdds: [newTimelineEvent("inject", "Scenario failed: spread and public panic overwhelmed response.", now)],
      };
    }

    return {
      replaceScenario: next,
      pressureDelta: 3,
      timelineAdds: [
        newTimelineEvent(
          "inject",
          `Wind ${next.windDirection} at strength ${next.windStrength}. Fire line is shifting across town.`,
          now,
        ),
      ],
    };
  }

  toScenarioView(state: RoomState, player?: Player): ScenarioView {
    const scenario = state.scenario;
    if (scenario.type !== "bushfire-command") {
      throw new Error("Invalid scenario mode");
    }

    const role = player?.role ?? "Observer";
    const visibleClues: string[] = [
      `Priority zones burning: ${scenario.cells
        .filter((cell) => cell.fireLevel >= 40)
        .map((cell) => cell.zoneName)
        .join(", ") || "none"}.`,
    ];

    if (role === "Fire Operations SME" || role === "Incident Controller") {
      visibleClues.push("Fire ops note: anchor lines where fuel remains high and access is open.");
    }
    if (role === "Police Operations SME" || role === "Incident Controller") {
      visibleClues.push("Police note: evacuate zones above 50 fire level before next wind pulse.");
    }
    if (role === "Public Information Officer" || role === "Incident Controller") {
      visibleClues.push("PIO note: frequent clear advisories reduce anxiety drift.");
    }

    return {
      type: "bushfire-command",
      timerSec: scenario.timerSec,
      windDirection: scenario.windDirection,
      windStrength: scenario.windStrength,
      publicAnxiety: scenario.publicAnxiety,
      containment: scenario.containment,
      waterBombsAvailable: scenario.waterBombsAvailable,
      cells: scenario.cells,
      publicAdvisories: scenario.publicAdvisories,
      visibleClues,
      roleInstruction:
        ROLE_INSTRUCTION[role] ?? "Support team cadence and communicate through the designated Slack channel.",
    };
  }
}
