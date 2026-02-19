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

const ZONE_GEOMETRY = [
  {
    center: { x: 112, y: 88 },
    polygon: [
      { x: 38, y: 28 },
      { x: 176, y: 42 },
      { x: 201, y: 92 },
      { x: 170, y: 141 },
      { x: 72, y: 151 },
      { x: 28, y: 103 },
    ],
  },
  {
    center: { x: 356, y: 86 },
    polygon: [
      { x: 252, y: 34 },
      { x: 404, y: 24 },
      { x: 458, y: 72 },
      { x: 443, y: 140 },
      { x: 324, y: 148 },
      { x: 260, y: 94 },
    ],
  },
  {
    center: { x: 600, y: 90 },
    polygon: [
      { x: 506, y: 36 },
      { x: 670, y: 46 },
      { x: 696, y: 102 },
      { x: 654, y: 154 },
      { x: 548, y: 148 },
      { x: 502, y: 94 },
    ],
  },
  {
    center: { x: 118, y: 205 },
    polygon: [
      { x: 32, y: 144 },
      { x: 191, y: 152 },
      { x: 212, y: 220 },
      { x: 172, y: 274 },
      { x: 74, y: 282 },
      { x: 28, y: 226 },
    ],
  },
  {
    center: { x: 356, y: 210 },
    polygon: [
      { x: 248, y: 148 },
      { x: 430, y: 154 },
      { x: 468, y: 206 },
      { x: 430, y: 282 },
      { x: 302, y: 286 },
      { x: 240, y: 220 },
    ],
  },
  {
    center: { x: 600, y: 206 },
    polygon: [
      { x: 500, y: 150 },
      { x: 668, y: 156 },
      { x: 698, y: 222 },
      { x: 645, y: 286 },
      { x: 547, y: 282 },
      { x: 494, y: 222 },
    ],
  },
  {
    center: { x: 114, y: 326 },
    polygon: [
      { x: 40, y: 270 },
      { x: 174, y: 286 },
      { x: 200, y: 344 },
      { x: 150, y: 394 },
      { x: 66, y: 392 },
      { x: 26, y: 336 },
    ],
  },
  {
    center: { x: 356, y: 326 },
    polygon: [
      { x: 246, y: 286 },
      { x: 430, y: 286 },
      { x: 476, y: 342 },
      { x: 422, y: 398 },
      { x: 306, y: 394 },
      { x: 238, y: 340 },
    ],
  },
  {
    center: { x: 598, y: 326 },
    polygon: [
      { x: 504, y: 284 },
      { x: 678, y: 268 },
      { x: 706, y: 340 },
      { x: 666, y: 400 },
      { x: 546, y: 394 },
      { x: 494, y: 338 },
    ],
  },
];

function geometryForCell(cell: BushfireCell) {
  const idx = Math.max(0, Number.parseInt(cell.id.replace("cell_", ""), 10) - 1);
  return (
    ZONE_GEOMETRY[idx] ?? {
      center: { x: 120 + cell.x * 240, y: 90 + cell.y * 120 },
      polygon: [
        { x: 72 + cell.x * 240, y: 42 + cell.y * 120 },
        { x: 172 + cell.x * 240, y: 42 + cell.y * 120 },
        { x: 172 + cell.x * 240, y: 132 + cell.y * 120 },
        { x: 72 + cell.x * 240, y: 132 + cell.y * 120 },
      ],
    }
  );
}

function polygonCentroid(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) {
    return { x: 0, y: 0 };
  }
  const total = points.reduce(
    (acc, point) => ({
      x: acc.x + point.x,
      y: acc.y + point.y,
    }),
    { x: 0, y: 0 },
  );
  return { x: total.x / points.length, y: total.y / points.length };
}

function scalePolygon(points: Array<{ x: number; y: number }>, factor: number) {
  const center = polygonCentroid(points);
  return points.map((point) => ({
    x: center.x + (point.x - center.x) * factor,
    y: center.y + (point.y - center.y) * factor,
  }));
}

const PANEL_DEFINITIONS: ScenePanelAccessRule[] = [
  { id: "mission_hud", kind: "shared", defaultRoles: ["Observer"] },
  { id: "town_map", kind: "shared", defaultRoles: ["Observer"] },
  { id: "fire_ops_console", kind: "role-scoped", defaultRoles: ["Fire Operations SME"] },
  { id: "police_ops_console", kind: "role-scoped", defaultRoles: ["Police Operations SME"] },
  { id: "public_info_console", kind: "role-scoped", defaultRoles: ["Public Information Officer"] },
  { id: "incident_command_console", kind: "role-scoped", defaultRoles: ["Incident Controller"] },
  { id: "gm_orchestrator", kind: "gm-only", defaultRoles: [] },
  { id: "fsm_editor", kind: "gm-only", defaultRoles: [] },
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
  return cells.map((cell) => ({
    zoneId: cell.id,
    points: geometryForCell(cell).polygon,
  }));
}

function toDragTargets(cells: BushfireCell[]) {
  return cells.map((cell) => {
    const geometry = geometryForCell(cell);
    return {
      zoneId: cell.id,
      accepts: ["crew", "water", "firebreak", "roadblock"] as const,
      x: geometry.center.x,
      y: geometry.center.y,
      radius: 62,
    };
  });
}

function toTerrainLayers(cells: BushfireCell[]) {
  return [
    {
      id: "terrain_grassland",
      material: "grassland" as const,
      polygons: [
        [
          { x: 8, y: 20 },
          { x: 710, y: 22 },
          { x: 708, y: 408 },
          { x: 10, y: 404 },
        ],
      ],
      tint: "#4b8a45",
      elevation: 0.22,
    },
    {
      id: "terrain_forest",
      material: "forest" as const,
      polygons: cells.filter((cell) => cell.fuel > 62).map((cell) => scalePolygon(geometryForCell(cell).polygon, 0.9)),
      tint: "#2f6f3a",
      elevation: 0.38,
    },
    {
      id: "terrain_urban",
      material: "urban" as const,
      polygons: cells.filter((cell) => cell.population > 170).map((cell) => scalePolygon(geometryForCell(cell).polygon, 0.64)),
      tint: "#6f737b",
      elevation: 0.25,
    },
    {
      id: "terrain_asphalt",
      material: "asphalt" as const,
      polygons: cells
        .filter((cell) => cell.zoneName === "Town Center" || cell.zoneName === "Rail Junction")
        .map((cell) => scalePolygon(geometryForCell(cell).polygon, 0.48)),
      tint: "#4f5664",
      elevation: 0.34,
    },
    {
      id: "terrain_water",
      material: "water" as const,
      polygons: [
        [
          { x: 10, y: 332 },
          { x: 212, y: 334 },
          { x: 258, y: 398 },
          { x: 10, y: 400 },
        ],
        [
          { x: 410, y: 316 },
          { x: 512, y: 320 },
          { x: 532, y: 382 },
          { x: 426, y: 394 },
        ],
      ],
      tint: "#2b72b0",
      elevation: 0,
    },
  ];
}

function toRoadGraph(cells: BushfireCell[]) {
  const byGrid = new Map<string, BushfireCell>();
  for (const cell of cells) {
    byGrid.set(`${cell.x},${cell.y}`, cell);
  }

  const segments: Array<{ id: string; points: Array<{ x: number; y: number }>; width: number }> = [];
  for (const cell of cells) {
    const current = geometryForCell(cell).center;
    const right = byGrid.get(`${cell.x + 1},${cell.y}`);
    const down = byGrid.get(`${cell.x},${cell.y + 1}`);

    if (right) {
      const target = geometryForCell(right).center;
      const arc = cell.y % 2 === 0 ? -14 : 14;
      segments.push({
        id: `road_h_${cell.id}_${right.id}`,
        points: [
          { x: current.x, y: current.y },
          { x: (current.x + target.x) / 2, y: (current.y + target.y) / 2 + arc },
          { x: target.x, y: target.y },
        ],
        width: 9,
      });
    }

    if (down) {
      const target = geometryForCell(down).center;
      const arc = cell.x % 2 === 0 ? 12 : -10;
      segments.push({
        id: `road_v_${cell.id}_${down.id}`,
        points: [
          { x: current.x, y: current.y },
          { x: (current.x + target.x) / 2 + arc, y: (current.y + target.y) / 2 },
          { x: target.x, y: target.y },
        ],
        width: 8,
      });
    }
  }

  segments.push({
    id: "road_arterial_north",
    points: [
      { x: 30, y: 108 },
      { x: 230, y: 94 },
      { x: 468, y: 96 },
      { x: 698, y: 110 },
    ],
    width: 10,
  });
  segments.push({
    id: "road_arterial_south",
    points: [
      { x: 24, y: 296 },
      { x: 252, y: 286 },
      { x: 468, y: 300 },
      { x: 706, y: 286 },
    ],
    width: 11,
  });

  return segments;
}

function toRiverPaths() {
  return [
    {
      id: "river_main",
      points: [
        { x: 14, y: 324 },
        { x: 144, y: 302 },
        { x: 286, y: 322 },
        { x: 418, y: 304 },
        { x: 568, y: 328 },
        { x: 706, y: 312 },
      ],
      width: 26,
    },
    {
      id: "river_tributary",
      points: [
        { x: 470, y: 18 },
        { x: 438, y: 94 },
        { x: 452, y: 162 },
        { x: 502, y: 236 },
        { x: 510, y: 318 },
      ],
      width: 12,
    },
  ];
}

function toLandmarkSprites(cells: BushfireCell[]) {
  return cells.map((cell, idx) => {
    const center = geometryForCell(cell).center;
    return {
      id: `landmark_${cell.id}`,
      kind: (["hospital", "school", "depot", "station"][idx % 4] as "hospital" | "school" | "depot" | "station"),
      x: center.x + (idx % 2 === 0 ? -26 : 30),
      y: center.y + (idx % 3 === 0 ? -24 : 22),
      scale: 0.82 + ((idx + 1) % 3) * 0.12,
      assetId: `map-landmark-${idx % 4}`,
    };
  });
}

function toTreeClusters(cells: BushfireCell[]) {
  return cells
    .map((cell, idx) => {
      const center = geometryForCell(cell).center;
      return [
        {
          id: `trees_${cell.id}_a`,
          x: center.x - 42 + (idx % 2) * 14,
          y: center.y - 34 + (idx % 3) * 8,
          radius: 18 + (cell.fuel % 18),
          density: Math.max(0.2, Math.min(1, cell.fuel / 100)),
        },
        {
          id: `trees_${cell.id}_b`,
          x: center.x + 36 - (idx % 2) * 10,
          y: center.y + 28 - (idx % 3) * 6,
          radius: 14 + ((cell.fuel + 8) % 16),
          density: Math.max(0.18, Math.min(1, cell.fuel / 110)),
        },
      ];
    })
    .flat();
}

function toFireFrontContours(cells: BushfireCell[]) {
  return cells
    .filter((cell) => cell.fireLevel > 0)
    .map((cell) => {
      const center = geometryForCell(cell).center;
      const baseRadius = 16 + Math.round((cell.fireLevel / 100) * 26);
      const points: Array<{ x: number; y: number }> = [];
      const vertices = 8;
      for (let i = 0; i <= vertices; i += 1) {
        const angle = (Math.PI * 2 * i) / vertices;
        const wobble = 0.72 + (((i + cell.x * 2 + cell.y * 3) % 5) * 0.1);
        const x = center.x + Math.cos(angle) * baseRadius * wobble;
        const y = center.y + Math.sin(angle) * baseRadius * wobble * 0.82;
        points.push({ x, y });
      }
      return {
        id: `contour_${cell.id}`,
        points,
        intensity: Math.max(0.1, Math.min(1, cell.fireLevel / 100)),
        phase: (cell.x + cell.y) * 0.7 + cell.fireLevel / 24,
      };
    });
}

function toWindField(direction: BushfireScenarioState["windDirection"], strength: number) {
  const vector = toWindVector(direction, strength);
  const field: Array<{ x: number; y: number; dx: number; dy: number; strength: number }> = [];
  for (let y = 42; y <= 388; y += 48) {
    for (let x = 36; x <= 688; x += 72) {
      const turbulence = (((x * 13 + y * 7) % 11) - 5) * 0.03;
      field.push({
        x,
        y,
        dx: vector.dx + turbulence,
        dy: vector.dy - turbulence * 0.6,
        strength: Math.max(0.12, Math.min(1, strength / 3 + ((x + y) % 5) * 0.03)),
      });
    }
  }
  return field;
}

function toToolDropZones(cells: BushfireCell[]) {
  return cells
    .map((cell) => {
      const center = geometryForCell(cell).center;
      const cx = center.x;
      const cy = center.y;
      return [
        { id: `drop_crew_${cell.id}`, zoneId: cell.id, tool: "crew" as const, x: cx - 40, y: cy - 34, radius: 15 },
        { id: `drop_water_${cell.id}`, zoneId: cell.id, tool: "water" as const, x: cx + 38, y: cy - 34, radius: 15 },
        { id: `drop_firebreak_${cell.id}`, zoneId: cell.id, tool: "firebreak" as const, x: cx - 38, y: cy + 34, radius: 15 },
        { id: `drop_roadblock_${cell.id}`, zoneId: cell.id, tool: "roadblock" as const, x: cx + 40, y: cy + 34, radius: 15 },
      ];
    })
    .flat();
}

function buildBushfireFsmPayload(state: RoomState) {
  const scenario = state.scenario;
  if (scenario.type !== "bushfire-command") {
    throw new Error("invalid scenario");
  }

  const containmentBand = scenario.containment >= 75 ? "stable" : scenario.containment >= 45 ? "contested" : "critical";
  const anxietyBand = scenario.publicAnxiety >= 70 ? "high" : scenario.publicAnxiety >= 40 ? "elevated" : "controlled";

  const nodes = [
    { id: "room:lobby", label: "Lobby", kind: "room-status" as const, active: state.status === "lobby", x: 0.12, y: 0.18 },
    { id: "room:running", label: "Running", kind: "room-status" as const, active: state.status === "running", x: 0.36, y: 0.18 },
    { id: "room:resolved", label: "Resolved", kind: "room-status" as const, active: state.status === "resolved", x: 0.6, y: 0.18 },
    { id: "room:failed", label: "Failed", kind: "room-status" as const, active: state.status === "failed", x: 0.84, y: 0.18 },
    { id: "band:stable", label: "Containment Stable", kind: "metric-band" as const, active: containmentBand === "stable", x: 0.22, y: 0.62 },
    { id: "band:contested", label: "Containment Contested", kind: "metric-band" as const, active: containmentBand === "contested", x: 0.5, y: 0.62 },
    { id: "band:critical", label: "Containment Critical", kind: "metric-band" as const, active: containmentBand === "critical", x: 0.78, y: 0.62 },
  ];

  const transitions = [
    { id: "bf_room_running", fromNodeId: "room:lobby", toNodeId: "room:running", label: "Force Running", actionPayload: "room-status:running" },
    { id: "bf_room_resolved", fromNodeId: "room:running", toNodeId: "room:resolved", label: "Resolve", actionPayload: "room-status:resolved" },
    { id: "bf_room_failed", fromNodeId: "room:running", toNodeId: "room:failed", label: "Fail", actionPayload: "room-status:failed" },
    { id: "bf_band_stable", fromNodeId: "room:running", toNodeId: "band:stable", label: "Set Stable", actionPayload: "bushfire-band:stable" },
    { id: "bf_band_contested", fromNodeId: "room:running", toNodeId: "band:contested", label: "Set Contested", actionPayload: "bushfire-band:contested" },
    { id: "bf_band_critical", fromNodeId: "room:running", toNodeId: "band:critical", label: "Set Critical", actionPayload: "bushfire-band:critical" },
  ];

  const currentNodeId = nodes.find((node) => node.active)?.id ?? "room:running";
  return {
    mode: "bushfire-command" as const,
    currentNodeId,
    nodes,
    transitions,
    hints: [
      `Room status: ${state.status}`,
      `Containment: ${scenario.containment}% (${containmentBand})`,
      `Public anxiety: ${scenario.publicAnxiety}% (${anxietyBand})`,
    ],
  };
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
      gm_fsm_transition: "fsm_editor",
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
      : granted.filter((panelId) => panelId !== "gm_orchestrator" && panelId !== "fsm_editor" && panelId !== "debrief_replay");

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
          { id: "slot_crew", type: "crew", x: 668, y: 78 },
          { id: "slot_water", type: "water", x: 668, y: 138 },
          { id: "slot_firebreak", type: "firebreak", x: 668, y: 198 },
          { id: "slot_roadblock", type: "roadblock", x: 668, y: 258 },
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
        payload: buildBushfireFsmPayload(args.state),
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
