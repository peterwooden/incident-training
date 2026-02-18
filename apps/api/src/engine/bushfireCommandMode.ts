import type {
  BushfireCell,
  BushfireScenarioState,
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

const PANEL_DEFINITIONS: ScenePanelAccessRule[] = [
  { id: "mission_hud", kind: "shared", defaultRoles: ["Observer"] },
  { id: "town_map", kind: "shared", defaultRoles: ["Observer"] },
  { id: "fire_ops_console", kind: "role-scoped", defaultRoles: ["Fire Operations SME"] },
  { id: "police_ops_console", kind: "role-scoped", defaultRoles: ["Police Operations SME"] },
  { id: "public_info_console", kind: "role-scoped", defaultRoles: ["Public Information Officer"] },
  { id: "incident_command_console", kind: "role-scoped", defaultRoles: ["Incident Controller"] },
  { id: "gm_orchestrator", kind: "gm-only", defaultRoles: [] },
  { id: "debrief_replay", kind: "gm-only", defaultRoles: [] },
];

const DEFAULT_BY_ROLE: Record<IncidentRole, ScenePanelId[]> = {
  "Incident Controller": ["mission_hud", "town_map", "incident_command_console"],
  "Fire Operations SME": ["mission_hud", "town_map", "fire_ops_console"],
  "Police Operations SME": ["mission_hud", "town_map", "police_ops_console"],
  "Public Information Officer": ["mission_hud", "town_map", "public_info_console"],
  "Lead Coordinator": ["mission_hud", "town_map"],
  "Device Specialist": ["mission_hud", "town_map"],
  "Manual Analyst": ["mission_hud", "town_map"],
  "Safety Officer": ["mission_hud", "town_map"],
  Observer: ["mission_hud", "town_map"],
};

function createCells(rng: SeededRandom): BushfireCell[] {
  return ZONES.map((zoneName, idx) => ({
    id: `cell_${idx + 1}`,
    x: idx % 3,
    y: Math.floor(idx / 3),
    zoneName,
    fireLevel: idx === 1 || idx === 3 ? 44 : rng.nextInt(15),
    fuel: 65 + rng.nextInt(25),
    population: 50 + rng.nextInt(320),
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
    cell.fuel = Math.max(0, cell.fuel - 5);

    if (cell.fireLevel > 40) {
      const neighbors = next.filter(
        (candidate) => Math.abs(candidate.x - cell.x) + Math.abs(candidate.y - cell.y) === 1,
      );

      for (const neighbor of neighbors) {
        const spread = Math.max(0, 7 + windStrength * 2 - (neighbor.hasFirebreak ? 8 : 0));
        neighbor.fireLevel = Math.max(neighbor.fireLevel, Math.min(100, neighbor.fireLevel + spread));
      }
    }
  }
  return next;
}

function containmentFromCells(cells: BushfireCell[]): number {
  const burning = cells.filter((cell) => cell.fireLevel > 0).length;
  const severe = cells.filter((cell) => cell.fireLevel >= 60).length;
  return Math.max(0, 100 - burning * 7 - severe * 7);
}

function completeObjectiveForAction(
  objectives: RoomState["objectives"],
  action: PlayerAction["type"],
): string[] {
  const next = objectives.find((obj) => !obj.completed && obj.requiredAction === action);
  return next ? [next.id] : [];
}

function burningZoneIds(cells: BushfireCell[]): string[] {
  return cells.filter((cell) => cell.fireLevel > 30).map((cell) => cell.id);
}

function toWindVector(direction: BushfireScenarioState["windDirection"], strength: number): { dx: number; dy: number } {
  const amplitude = Math.max(0.2, Math.min(1, strength / 3));
  if (direction === "N") return { dx: 0, dy: -amplitude };
  if (direction === "S") return { dx: 0, dy: amplitude };
  if (direction === "E") return { dx: amplitude, dy: 0 };
  return { dx: -amplitude, dy: 0 };
}

function toZonePolygons(cells: BushfireCell[]) {
  return cells.map((cell) => {
    const x = 20 + cell.x * 230;
    const y = 20 + cell.y * 110;
    return {
      zoneId: cell.id,
      points: [
        { x, y },
        { x: x + 210, y },
        { x: x + 210, y: y + 92 },
        { x, y: y + 92 },
      ],
    };
  });
}

function toDragTargets(cells: BushfireCell[]) {
  return cells.map((cell) => ({
    zoneId: cell.id,
    accepts: ["crew", "water", "firebreak", "roadblock"] as const,
    x: 125 + cell.x * 230,
    y: 68 + cell.y * 110,
    radius: 48,
  }));
}

function toTerrainLayers(cells: BushfireCell[]) {
  const toCellPolygon = (cell: BushfireCell) => {
    const x = 20 + cell.x * 230;
    const y = 20 + cell.y * 110;
    return [
      { x, y },
      { x: x + 210, y },
      { x: x + 210, y: y + 92 },
      { x, y: y + 92 },
    ];
  };

  return [
    {
      id: "terrain_grassland",
      material: "grassland" as const,
      polygons: cells.filter((cell) => cell.fireLevel < 35).map((cell) => toCellPolygon(cell)),
      tint: "#4b8a45",
      elevation: 0.1,
    },
    {
      id: "terrain_forest",
      material: "forest" as const,
      polygons: cells.filter((cell) => cell.fuel > 70).map((cell) => toCellPolygon(cell)),
      tint: "#2f6f3a",
      elevation: 0.2,
    },
    {
      id: "terrain_urban",
      material: "urban" as const,
      polygons: cells.filter((cell) => cell.population > 220).map((cell) => toCellPolygon(cell)),
      tint: "#6f737b",
      elevation: 0.25,
    },
    {
      id: "terrain_water",
      material: "water" as const,
      polygons: [
        [
          { x: 12, y: 306 },
          { x: 238, y: 314 },
          { x: 282, y: 352 },
          { x: 12, y: 352 },
        ],
      ],
      tint: "#2b72b0",
      elevation: 0,
    },
  ];
}

function toRoadGraph(cells: BushfireCell[]) {
  return cells
    .map((cell) => {
      const centerX = 125 + cell.x * 230;
      const centerY = 68 + cell.y * 110;
      return [
        { id: `road_h_${cell.id}`, points: [{ x: centerX - 96, y: centerY }, { x: centerX + 96, y: centerY }], width: 7 },
        { id: `road_v_${cell.id}`, points: [{ x: centerX, y: centerY - 44 }, { x: centerX, y: centerY + 44 }], width: 6 },
      ];
    })
    .flat();
}

function toRiverPaths() {
  return [
    {
      id: "river_main",
      points: [
        { x: 18, y: 292 },
        { x: 128, y: 272 },
        { x: 262, y: 292 },
        { x: 400, y: 278 },
        { x: 574, y: 300 },
        { x: 708, y: 286 },
      ],
      width: 24,
    },
  ];
}

function toLandmarkSprites(cells: BushfireCell[]) {
  return cells.slice(0, 6).map((cell, idx) => ({
    id: `landmark_${cell.id}`,
    kind: (["hospital", "school", "depot", "station"][idx % 4] as "hospital" | "school" | "depot" | "station"),
    x: 72 + cell.x * 230 + ((idx % 2) * 28),
    y: 46 + cell.y * 110 + ((idx % 3) * 12),
    scale: 0.8 + (idx % 3) * 0.1,
    assetId: `map-landmark-${idx % 4}`,
  }));
}

function toTreeClusters(cells: BushfireCell[]) {
  return cells.map((cell, idx) => ({
    id: `trees_${cell.id}`,
    x: 62 + cell.x * 230 + ((idx % 3) * 20),
    y: 42 + cell.y * 110 + ((idx % 4) * 10),
    radius: 18 + (cell.fuel % 20),
    density: Math.max(0.2, Math.min(1, cell.fuel / 100)),
  }));
}

function toFireFrontContours(cells: BushfireCell[]) {
  return cells
    .filter((cell) => cell.fireLevel > 0)
    .map((cell) => {
      const cx = 125 + cell.x * 230;
      const cy = 68 + cell.y * 110;
      return {
        id: `contour_${cell.id}`,
        points: [
          { x: cx - 30, y: cy - 4 },
          { x: cx - 8, y: cy - 24 },
          { x: cx + 24, y: cy - 10 },
          { x: cx + 34, y: cy + 8 },
          { x: cx + 8, y: cy + 24 },
          { x: cx - 20, y: cy + 20 },
          { x: cx - 30, y: cy - 4 },
        ],
        intensity: Math.max(0.1, Math.min(1, cell.fireLevel / 100)),
        phase: (cell.x + cell.y) * 0.5,
      };
    });
}

function toWindField(direction: BushfireScenarioState["windDirection"], strength: number) {
  const vector = toWindVector(direction, strength);
  const field: Array<{ x: number; y: number; dx: number; dy: number; strength: number }> = [];
  for (let y = 40; y <= 320; y += 56) {
    for (let x = 40; x <= 680; x += 80) {
      field.push({
        x,
        y,
        dx: vector.dx,
        dy: vector.dy,
        strength: Math.max(0.1, Math.min(1, strength / 3 + ((x + y) % 5) * 0.03)),
      });
    }
  }
  return field;
}

function toToolDropZones(cells: BushfireCell[]) {
  return cells
    .map((cell) => {
      const cx = 125 + cell.x * 230;
      const cy = 68 + cell.y * 110;
      return [
        { id: `drop_crew_${cell.id}`, zoneId: cell.id, tool: "crew" as const, x: cx - 34, y: cy - 34, radius: 14 },
        { id: `drop_water_${cell.id}`, zoneId: cell.id, tool: "water" as const, x: cx + 34, y: cy - 34, radius: 14 },
        { id: `drop_firebreak_${cell.id}`, zoneId: cell.id, tool: "firebreak" as const, x: cx - 34, y: cy + 34, radius: 14 },
        { id: `drop_roadblock_${cell.id}`, zoneId: cell.id, tool: "roadblock" as const, x: cx + 34, y: cy + 34, radius: 14 },
      ];
    })
    .flat();
}

export class BushfireCommandMode implements GameModeEngine {
  initObjectives(_rng: SeededRandom): RoomState["objectives"] {
    return [
      {
        id: "fire_obj_1",
        description: "Deploy fire crews into at least one active zone",
        requiredAction: "bushfire_deploy_fire_crew",
        completed: false,
      },
      {
        id: "fire_obj_2",
        description: "Issue a public advisory before anxiety exceeds 50%",
        requiredAction: "bushfire_issue_public_update",
        completed: false,
      },
      {
        id: "fire_obj_3",
        description: "Create a defensive firebreak near severe fire",
        requiredAction: "bushfire_create_firebreak",
        completed: false,
      },
    ];
  }

  initSummary(): string {
    return "Bushfire simulation underway. Use Slack for command communications and operate through your assigned panels.";
  }

  initScenario(rng: SeededRandom): RoomState["scenario"] {
    return {
      type: "bushfire-command",
      timerSec: 600,
      windDirection: ["N", "S", "E", "W"][rng.nextInt(4)] as "N" | "S" | "E" | "W",
      windStrength: (rng.nextInt(3) + 1) as 1 | 2 | 3,
      publicAnxiety: 20,
      containment: 74,
      waterBombsAvailable: 3,
      cells: createCells(rng),
      publicAdvisories: [],
      strategyNotes: ["Protect dense population zones first."],
    };
  }

  getPanelDefinitions(): ScenePanelAccessRule[] {
    return PANEL_DEFINITIONS;
  }

  getDefaultAccessTemplate(role: IncidentRole): ScenePanelId[] {
    return DEFAULT_BY_ROLE[role] ?? ["mission_hud", "town_map"];
  }

  getPanelForAction(actionType: PlayerAction["type"]): ScenePanelId | undefined {
    const map: Partial<Record<PlayerAction["type"], ScenePanelId>> = {
      bushfire_deploy_fire_crew: "fire_ops_console",
      bushfire_drop_water: "fire_ops_console",
      bushfire_create_firebreak: "fire_ops_console",
      bushfire_set_roadblock: "police_ops_console",
      bushfire_issue_public_update: "public_info_console",
      assign_role: "gm_orchestrator",
    };
    return map[actionType];
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
      strategyNotes: [...scenario.strategyNotes],
    };

    const targetCellId = String(action.payload?.cellId ?? "");
    const targetCell = next.cells.find((cell) => cell.id === targetCellId);

    const timelineAdds = [
      newTimelineEvent("status", `${action.playerId} executed ${action.type}`, now, action.playerId),
    ];

    let pressureDelta = 0;
    let scoreDelta = 0;
    let summary = "Command loop active.";

    if (action.type === "bushfire_deploy_fire_crew") {
      if (!targetCell) {
        return { pressureDelta: 3, scoreDelta: -3, timelineAdds, summary: "Invalid crew target." };
      }
      targetCell.hasFireCrew = true;
      targetCell.fireLevel = Math.max(0, targetCell.fireLevel - 14);
      pressureDelta -= 4;
      scoreDelta += 9;
      summary = `Fire crews deployed to ${targetCell.zoneName}.`;
    }

    if (action.type === "bushfire_drop_water") {
      if (!targetCell || next.waterBombsAvailable <= 0) {
        return { pressureDelta: 4, scoreDelta: -4, timelineAdds, summary: "Water drop failed." };
      }
      next.waterBombsAvailable -= 1;
      targetCell.fireLevel = Math.max(0, targetCell.fireLevel - 24);
      pressureDelta -= 5;
      scoreDelta += 11;
      summary = `Water drop landed on ${targetCell.zoneName}.`;
    }

    if (action.type === "bushfire_create_firebreak") {
      if (!targetCell) {
        return { pressureDelta: 3, scoreDelta: -3, timelineAdds, summary: "Invalid firebreak target." };
      }
      targetCell.hasFirebreak = true;
      pressureDelta -= 3;
      scoreDelta += 8;
      summary = `Firebreak established at ${targetCell.zoneName}.`;
    }

    if (action.type === "bushfire_set_roadblock") {
      if (!targetCell) {
        return { pressureDelta: 2, scoreDelta: -2, timelineAdds, summary: "Invalid roadblock target." };
      }
      targetCell.hasPoliceUnit = true;
      targetCell.evacuated = true;
      pressureDelta -= 3;
      scoreDelta += 8;
      summary = `Roadblock and evacuation lane activated for ${targetCell.zoneName}.`;
    }

    if (action.type === "bushfire_issue_public_update") {
      const template = String(action.payload?.template ?? "Emergency advisory issued.");
      next.publicAdvisories.push(template);
      next.publicAnxiety = Math.max(0, next.publicAnxiety - 10);
      pressureDelta -= 2;
      scoreDelta += 7;
      summary = "Public update broadcast delivered.";
    }

    next.containment = containmentFromCells(next.cells);

    if (next.containment >= 88 && next.publicAnxiety <= 35) {
      return {
        replaceScenario: next,
        status: "resolved",
        pressureDelta: -10,
        scoreDelta: 22,
        summary: "Containment and public confidence targets achieved.",
        timelineAdds: [...timelineAdds, newTimelineEvent("system", "Command objective achieved.", now)],
        markObjectiveIdsComplete: completeObjectiveForAction(state.objectives, action.type),
      };
    }

    return {
      replaceScenario: next,
      pressureDelta,
      scoreDelta,
      summary,
      timelineAdds,
      markObjectiveIdsComplete: completeObjectiveForAction(state.objectives, action.type),
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
      strategyNotes: [...scenario.strategyNotes],
      publicAnxiety: Math.min(100, scenario.publicAnxiety + (scenario.publicAdvisories.length > 0 ? 1 : 4)),
    };
    next.containment = containmentFromCells(next.cells);

    if (next.timerSec === 0 || next.publicAnxiety >= 92 || next.containment <= 24) {
      return {
        replaceScenario: next,
        status: "failed",
        pressureDelta: 18,
        scoreDelta: -14,
        summary: "Town response collapsed under spread and public panic.",
        timelineAdds: [newTimelineEvent("inject", "Critical failure threshold reached.", now)],
      };
    }

    return {
      replaceScenario: next,
      pressureDelta: 3,
      summary: "Fire front continues to shift.",
      timelineAdds: [
        newTimelineEvent(
          "inject",
          `Wind ${next.windDirection} / ${next.windStrength}. Fireline expanded across exposed sectors.`,
          now,
        ),
      ],
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
    if (scenario.type !== "bushfire-command") {
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
      subtitle: "Containment command view",
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
      payload: {
        timerSec: scenario.timerSec,
        pressure: args.state.pressure,
        score: args.state.score,
        status: args.state.status,
        summary: args.state.publicSummary,
        slackReminder: "Coordinate strategic commands in Slack before dispatching units.",
      },
    });

    pushPanel({
      id: "town_map",
      kind: "shared",
      title: "Town Map",
      subtitle: "Live spread visualization",
      priority: 2,
      visualPriority: 95,
      renderMode: "hybrid",
      interactionMode: "direct-gesture",
      overlayTextLevel: "minimal",
      fxProfile: "cinematic",
      ambientLoopMs: 1700,
      hoverDepthPx: 10,
      materialPreset: "terrain-cinematic",
      locked: withLock("town_map"),
      audioCue: scenario.containment < 40 ? "warning" : "spread",
      payload: {
        windDirection: scenario.windDirection,
        windStrength: scenario.windStrength,
        containment: scenario.containment,
        anxiety: scenario.publicAnxiety,
        cells: scenario.cells,
        zonePolygons: toZonePolygons(scenario.cells),
        assetSlots: [
          { id: "slot_crew", type: "crew", x: 40, y: 330 },
          { id: "slot_water", type: "water", x: 120, y: 330 },
          { id: "slot_firebreak", type: "firebreak", x: 200, y: 330 },
          { id: "slot_roadblock", type: "roadblock", x: 280, y: 330 },
        ],
        dragTargets: toDragTargets(scenario.cells).map((target) => ({
          zoneId: target.zoneId,
          accepts: [...target.accepts],
          x: target.x,
          y: target.y,
          radius: target.radius,
        })),
        terrainLayers: toTerrainLayers(scenario.cells),
        roadGraph: toRoadGraph(scenario.cells),
        riverPaths: toRiverPaths(),
        landmarkSprites: toLandmarkSprites(scenario.cells),
        treeClusters: toTreeClusters(scenario.cells),
        fireFrontContours: toFireFrontContours(scenario.cells),
        windField: toWindField(scenario.windDirection, scenario.windStrength),
        toolDropZones: toToolDropZones(scenario.cells),
        windVector: toWindVector(scenario.windDirection, scenario.windStrength),
        heatFieldSeed: Math.max(1, Math.round(scenario.containment * 100 + scenario.publicAnxiety)),
      },
    });

    pushPanel({
      id: "fire_ops_console",
      kind: "role-scoped",
      title: "Fire Ops Console",
      subtitle: "Deploy and suppression",
      priority: 3,
      visualPriority: 84,
      renderMode: "svg",
      interactionMode: "diegetic-control",
      overlayTextLevel: "supporting",
      fxProfile: "cinematic",
      ambientLoopMs: 2400,
      hoverDepthPx: 5,
      materialPreset: "ops-card",
      locked: withLock("fire_ops_console"),
      payload: {
        waterBombsAvailable: scenario.waterBombsAvailable,
        burningZoneIds: burningZoneIds(scenario.cells),
        note: "Prioritize severe fire clusters with high fuel reserves.",
      },
    });

    pushPanel({
      id: "police_ops_console",
      kind: "role-scoped",
      title: "Police Ops Console",
      subtitle: "Evacuation and access control",
      priority: 4,
      visualPriority: 82,
      renderMode: "svg",
      interactionMode: "diegetic-control",
      overlayTextLevel: "supporting",
      fxProfile: "cinematic",
      ambientLoopMs: 2600,
      hoverDepthPx: 5,
      materialPreset: "ops-card",
      locked: withLock("police_ops_console"),
      payload: {
        evacuationZoneIds: scenario.cells.filter((cell) => cell.evacuated).map((cell) => cell.id),
        blockedZoneIds: scenario.cells.filter((cell) => cell.hasPoliceUnit).map((cell) => cell.id),
        note: "Secure evacuation paths for dense population corridors.",
      },
    });

    pushPanel({
      id: "public_info_console",
      kind: "role-scoped",
      title: "Public Info Console",
      subtitle: "Advisories and rumor pressure",
      priority: 5,
      visualPriority: 80,
      renderMode: "svg",
      interactionMode: "diegetic-control",
      overlayTextLevel: "supporting",
      fxProfile: "cinematic",
      ambientLoopMs: 2300,
      hoverDepthPx: 4,
      materialPreset: "ops-card",
      locked: withLock("public_info_console"),
      payload: {
        advisories: scenario.publicAdvisories,
        anxiety: scenario.publicAnxiety,
        cadenceHint: scenario.publicAnxiety > 55 ? "Increase advisory cadence now." : "Maintain update rhythm.",
      },
    });

    pushPanel({
      id: "incident_command_console",
      kind: "role-scoped",
      title: "Incident Command Console",
      subtitle: "Strategic command layer",
      priority: 6,
      visualPriority: 78,
      renderMode: "svg",
      interactionMode: "diegetic-control",
      overlayTextLevel: "supporting",
      fxProfile: "cinematic",
      ambientLoopMs: 2200,
      hoverDepthPx: 4,
      materialPreset: "ops-card",
      locked: withLock("incident_command_console"),
      payload: {
        containment: scenario.containment,
        strategicObjectives: args.state.objectives.map((objective) => objective.description),
        topRisks: [
          `Public anxiety: ${scenario.publicAnxiety}%`,
          `Severe fire sectors: ${scenario.cells.filter((cell) => cell.fireLevel >= 60).length}`,
        ],
      },
    });

    if (isGm) {
      panelMap.gm_orchestrator = {
        id: "gm_orchestrator",
        kind: "gm-only",
        title: "GM Orchestrator",
        subtitle: "Access and role simulation controls",
        priority: 90,
        visualPriority: 74,
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
          cameraTargets: scenario.cells.map((cell) => ({
            id: `cam_${cell.id}`,
            label: cell.zoneName,
            x: 0.16 + cell.x * 0.28,
            y: 0.2 + cell.y * 0.28,
            urgency: Math.min(1, cell.fireLevel / 100),
          })),
          riskHotspots: scenario.cells
            .filter((cell) => cell.fireLevel > 45)
            .map((cell) => ({
              id: `risk_${cell.id}`,
              x: 0.16 + cell.x * 0.28,
              y: 0.2 + cell.y * 0.28,
              severity: Math.min(1, cell.fireLevel / 100),
              label: `${cell.zoneName} ${cell.fireLevel}%`,
            })),
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
        subtitle: "Post-incident review",
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
