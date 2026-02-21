import type {
  BushfireCell,
  BushfirePhaseId,
  BushfirePromptCardState,
  BushfireScenarioState,
  IncidentRole,
  WidgetDeckView,
  PlayerAction,
  RoomState,
  WidgetAccessRule,
  WidgetId,
  WidgetView,
} from "@incident/shared";
import type { GameModeEngine, ModeMutation, SeededRandom } from "./types";
import { newTimelineEvent } from "./helpers";

const TOTAL_DURATION_SEC = 13 * 60;
const TICK_SECONDS = 15;

const PHASE_ORDER: BushfirePhaseId[] = [
  "phase_1_monitor",
  "phase_2_escalation",
  "phase_3_crisis",
  "phase_4_catastrophe",
  "terminal_failed",
];

const PHASE_START_SEC: Record<BushfirePhaseId, number> = {
  phase_1_monitor: 0,
  phase_2_escalation: 180,
  phase_3_crisis: 420,
  phase_4_catastrophe: 660,
  terminal_failed: 780,
};

const BUSHFIRE_ROLE_LABELS: Record<IncidentRole, string> = {
  "Lead Coordinator": "Lead Coordinator",
  "Device Specialist": "Device Specialist",
  "Manual Analyst": "Manual Analyst",
  "Safety Officer": "Safety Officer",
  "Incident Controller": "Mayor",
  "Fire Operations SME": "Firefighter",
  "Police Operations SME": "Police Officer",
  "Public Information Officer": "Radio Host",
  Meteorologist: "Meteorologist",
  Observer: "Observer",
};

const PHASE_META: Record<Exclude<BushfirePhaseId, "terminal_failed">, {
  title: string;
  windDirection: BushfireScenarioState["windDirection"];
  windStrength: BushfireScenarioState["windStrength"];
  windKph: number;
  spreadMultiplier: number;
  approachMeters: number;
  panicBias: number;
  trafficBias: number;
  summary: string;
}> = {
  phase_1_monitor: {
    title: "Monitor",
    windDirection: "E",
    windStrength: 1,
    windKph: 10,
    spreadMultiplier: 0.85,
    approachMeters: 14,
    panicBias: 1.6,
    trafficBias: 0.8,
    summary: "Small brushfire near Eastern Ridge. Conditions currently manageable.",
  },
  phase_2_escalation: {
    title: "Escalation",
    windDirection: "W",
    windStrength: 3,
    windKph: 65,
    spreadMultiplier: 1.55,
    approachMeters: 58,
    panicBias: 3.4,
    trafficBias: 2.2,
    summary: "Dry front and sudden wind shift. Fire has jumped containment lines.",
  },
  phase_3_crisis: {
    title: "Crisis",
    windDirection: "W",
    windStrength: 3,
    windKph: 65,
    spreadMultiplier: 1.95,
    approachMeters: 124,
    panicBias: 5.2,
    trafficBias: 4.4,
    summary: "Heavy smoke, traffic congestion, and panic in eastern suburbs.",
  },
  phase_4_catastrophe: {
    title: "Catastrophe",
    windDirection: "W",
    windStrength: 3,
    windKph: 72,
    spreadMultiplier: 2.35,
    approachMeters: 248,
    panicBias: 7.2,
    trafficBias: 6.8,
    summary: "Firefront has reached town limits. Final emergency actions underway.",
  },
};

// Canonical prompt source:
// docs/game-modes/bushfire-command/gameplay-spec.md
const PROMPT_SCRIPT: Array<{
  id: string;
  phaseId: Exclude<BushfirePhaseId, "terminal_failed">;
  targetRole: BushfirePromptCardState["targetRole"];
  title: string;
  body: string;
}> = [
  {
    id: "p1_firefighter_move",
    phaseId: "phase_1_monitor",
    targetRole: "Fire Operations SME",
    title: "Field Update",
    body: "The fire has moved 5 meters, but it is still under control.",
  },
  {
    id: "p1_radio_rumor",
    phaseId: "phase_1_monitor",
    targetRole: "Public Information Officer",
    title: "Rumor Spike",
    body: "Callers report panic. A rumor claims the town water supply is destroyed.",
  },
  {
    id: "p2_meteo_shift",
    phaseId: "phase_2_escalation",
    targetRole: "Meteorologist",
    title: "Urgent Forecast",
    body: "Dry front arrived. Winds shifted West toward town, gusting to 65 km/h.",
  },
  {
    id: "p2_firefighter_jump",
    phaseId: "phase_2_escalation",
    targetRole: "Fire Operations SME",
    title: "Containment Breach",
    body: "Wind shift caused the fire to jump containment lines and accelerate toward eastern suburbs.",
  },
  {
    id: "p3_police_congestion",
    phaseId: "phase_3_crisis",
    targetRole: "Police Operations SME",
    title: "Traffic Crisis",
    body: "Main highway evacuation route is congested with minor accidents forming choke points.",
  },
  {
    id: "p3_mayor_visibility",
    phaseId: "phase_3_crisis",
    targetRole: "Incident Controller",
    title: "Mayor Brief",
    body: "Fire is within 500 meters of town edge and visibility is dropping due to heavy smoke.",
  },
  {
    id: "p4_firefighter_engulfed",
    phaseId: "phase_4_catastrophe",
    targetRole: "Fire Operations SME",
    title: "Catastrophic Spread",
    body: "The fire has now engulfed the town perimeter.",
  },
];

const ZONES = [
  "West Foothills",
  "Civic Center",
  "Eastern Ridge",
  "North Farms",
  "Main Highway",
  "Eastern Suburbs",
  "River Flats",
  "Reservoir",
  "South Estate",
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

const PANEL_DEFINITIONS: WidgetAccessRule[] = [
  { id: "mission_hud", kind: "shared", defaultRoles: ["Observer"] },
  { id: "town_map", kind: "shared", defaultRoles: ["Observer"] },
  { id: "fire_ops_console", kind: "role-scoped", defaultRoles: ["Fire Operations SME"] },
  { id: "police_ops_console", kind: "role-scoped", defaultRoles: ["Police Operations SME"] },
  { id: "public_info_console", kind: "role-scoped", defaultRoles: ["Public Information Officer"] },
  { id: "incident_command_console", kind: "role-scoped", defaultRoles: ["Incident Controller"] },
  { id: "weather_ops_console", kind: "role-scoped", defaultRoles: ["Meteorologist"] },
  { id: "role_briefing", kind: "role-scoped", defaultRoles: ["Observer"] },
  { id: "gm_orchestrator", kind: "gm-only", defaultRoles: [] },
  { id: "gm_prompt_deck", kind: "gm-only", defaultRoles: [] },
  { id: "fsm_editor", kind: "gm-only", defaultRoles: [] },
  { id: "debrief_replay", kind: "gm-only", defaultRoles: [] },
];

const DEFAULT_BY_ROLE: Record<IncidentRole, WidgetId[]> = {
  "Incident Controller": ["mission_hud", "town_map", "incident_command_console", "role_briefing"],
  "Fire Operations SME": ["mission_hud", "town_map", "fire_ops_console", "role_briefing"],
  "Police Operations SME": ["mission_hud", "town_map", "police_ops_console", "role_briefing"],
  "Public Information Officer": ["mission_hud", "town_map", "public_info_console", "role_briefing"],
  Meteorologist: ["mission_hud", "town_map", "weather_ops_console", "role_briefing"],
  "Lead Coordinator": ["mission_hud", "town_map", "role_briefing"],
  "Device Specialist": ["mission_hud", "town_map", "role_briefing"],
  "Manual Analyst": ["mission_hud", "town_map", "role_briefing"],
  "Safety Officer": ["mission_hud", "town_map", "role_briefing"],
  Observer: ["mission_hud", "town_map", "role_briefing"],
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function phaseIndex(phaseId: BushfirePhaseId): number {
  return PHASE_ORDER.indexOf(phaseId);
}

function phaseLabel(phaseId: BushfirePhaseId): string {
  if (phaseId === "terminal_failed") return "Terminal Failure";
  return PHASE_META[phaseId].title;
}

function phaseForElapsed(elapsedSec: number): BushfirePhaseId {
  if (elapsedSec < PHASE_START_SEC.phase_2_escalation) return "phase_1_monitor";
  if (elapsedSec < PHASE_START_SEC.phase_3_crisis) return "phase_2_escalation";
  if (elapsedSec < PHASE_START_SEC.phase_4_catastrophe) return "phase_3_crisis";
  if (elapsedSec < PHASE_START_SEC.terminal_failed) return "phase_4_catastrophe";
  return "terminal_failed";
}

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

function createCells(rng: SeededRandom): BushfireCell[] {
  return ZONES.map((zoneName, idx) => ({
    id: `cell_${idx + 1}`,
    x: idx % 3,
    y: Math.floor(idx / 3),
    zoneName,
    fireLevel: idx === 2 ? 32 : idx === 5 ? 14 : rng.nextInt(10),
    fuel: 65 + rng.nextInt(25),
    population: 80 + rng.nextInt(280),
    evacuated: false,
    hasFireCrew: false,
    hasPoliceUnit: false,
    hasFirebreak: false,
  }));
}

function createPromptDeck(rng: SeededRandom): BushfirePromptCardState[] {
  const byPhase = PHASE_ORDER.filter((phaseId) => phaseId !== "terminal_failed")
    .map((phaseId) => {
      const group = PROMPT_SCRIPT.filter((card) => card.phaseId === phaseId);
      const shuffled = [...group];
      for (let i = shuffled.length - 1; i > 0; i -= 1) {
        const j = rng.nextInt(i + 1);
        const tmp = shuffled[i];
        shuffled[i] = shuffled[j];
        shuffled[j] = tmp;
      }
      return shuffled;
    })
    .flat();

  return byPhase.map((card) => ({
    id: card.id,
    phaseId: card.phaseId,
    targetRole: card.targetRole,
    title: card.title,
    body: card.body,
    released: false,
    acknowledgedByPlayerIds: [],
  }));
}

function spreadFire(cells: BushfireCell[], windStrength: number, spreadMultiplier: number): BushfireCell[] {
  const next = cells.map((cell) => ({ ...cell }));
  for (const cell of next) {
    if (cell.fireLevel <= 0) {
      continue;
    }

    const growth = windStrength * 3 * spreadMultiplier + (cell.hasFirebreak ? -8 : 0) + (cell.hasFireCrew ? -10 : 0);
    cell.fireLevel = clamp(cell.fireLevel + growth, 0, 100);
    cell.fuel = clamp(cell.fuel - 6 * spreadMultiplier, 0, 100);

    if (cell.fireLevel > 35) {
      const neighbors = next.filter(
        (candidate) => Math.abs(candidate.x - cell.x) + Math.abs(candidate.y - cell.y) === 1,
      );

      for (const neighbor of neighbors) {
        const spread = Math.max(0, 4 + windStrength * 2 * spreadMultiplier - (neighbor.hasFirebreak ? 9 : 0));
        neighbor.fireLevel = clamp(Math.max(neighbor.fireLevel, neighbor.fireLevel + spread), 0, 100);
      }
    }
  }
  return next;
}

function containmentFromCells(cells: BushfireCell[]): number {
  const burning = cells.filter((cell) => cell.fireLevel > 0).length;
  const severe = cells.filter((cell) => cell.fireLevel >= 60).length;
  return clamp(100 - burning * 6 - severe * 7, 0, 100);
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
    const center = geometryForCell(cell).center;
    return {
      zoneId: cell.id,
      accepts: ["crew", "water", "firebreak", "roadblock"] as const,
      x: center.x,
      y: center.y,
      radius: 60,
    };
  });
}

function toTerrainLayers(cells: BushfireCell[]) {
  const allPolys = cells.map((cell) => geometryForCell(cell).polygon);
  const forest = allPolys.filter((_, idx) => idx % 2 === 0).map((poly) => scalePolygon(poly, 0.72));
  const urban = allPolys.filter((_, idx) => idx % 3 === 1).map((poly) => scalePolygon(poly, 0.42));

  return [
    {
      id: "grass",
      material: "grassland" as const,
      polygons: [[{ x: 8, y: 20 }, { x: 710, y: 22 }, { x: 708, y: 408 }, { x: 10, y: 404 }]],
      tint: "#4b8a45",
      elevation: 0.22,
    },
    {
      id: "forest",
      material: "forest" as const,
      polygons: forest,
      tint: "#2f6f3a",
      elevation: 0.38,
    },
    {
      id: "urban",
      material: "urban" as const,
      polygons: urban,
      tint: "#6f737b",
      elevation: 0.28,
    },
    {
      id: "water",
      material: "water" as const,
      polygons: [
        [{ x: 10, y: 332 }, { x: 212, y: 334 }, { x: 258, y: 398 }, { x: 10, y: 400 }],
        [{ x: 410, y: 316 }, { x: 512, y: 320 }, { x: 532, y: 382 }, { x: 426, y: 394 }],
      ],
      tint: "#2b72b0",
      elevation: 0.1,
    },
  ];
}

function toRoadGraph(cells: BushfireCell[]) {
  const centers = cells.map((cell) => geometryForCell(cell).center);
  const row0 = centers.slice(0, 3);
  const row1 = centers.slice(3, 6);
  const row2 = centers.slice(6, 9);
  return [
    { id: "road_row_0", points: row0, width: 9 },
    { id: "road_row_1", points: row1, width: 8 },
    { id: "road_row_2", points: row2, width: 8 },
    { id: "road_vertical_west", points: [row0[0], row1[0], row2[0]], width: 7 },
    { id: "road_vertical_mid", points: [row0[1], row1[1], row2[1]], width: 10 },
    { id: "road_vertical_east", points: [row0[2], row1[2], row2[2]], width: 8 },
  ];
}

function toRiverPaths() {
  return [
    { id: "river1", points: [{ x: 14, y: 324 }, { x: 144, y: 302 }, { x: 286, y: 322 }, { x: 418, y: 304 }, { x: 568, y: 328 }, { x: 706, y: 312 }], width: 26 },
    { id: "river2", points: [{ x: 470, y: 18 }, { x: 438, y: 94 }, { x: 452, y: 162 }, { x: 502, y: 236 }, { x: 510, y: 318 }], width: 12 },
  ];
}

function toLandmarkSprites(cells: BushfireCell[]) {
  return cells.slice(0, 6).map((cell, index) => {
    const center = geometryForCell(cell).center;
    const kinds = ["hospital", "school", "depot", "station"] as const;
    return {
      id: `landmark_${cell.id}`,
      kind: kinds[index % kinds.length],
      x: center.x - 30,
      y: center.y - 24,
      scale: 0.92 + (index % 3) * 0.04,
      assetId: `map-landmark-${index % 4}`,
    };
  });
}

function toTreeClusters(cells: BushfireCell[]) {
  return cells.map((cell) => {
    const center = geometryForCell(cell).center;
    return {
      id: `trees_${cell.id}`,
      x: center.x + (cell.x % 2 === 0 ? -26 : 24),
      y: center.y + (cell.y % 2 === 0 ? -22 : 20),
      radius: 18 + (cell.fuel / 100) * 10,
      density: Math.max(0.3, Math.min(0.95, cell.fuel / 100)),
    };
  });
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

  const nodes = [
    { id: "room:lobby", label: "Lobby", kind: "room-status" as const, active: state.status === "lobby", x: 0.1, y: 0.12 },
    { id: "room:running", label: "Running", kind: "room-status" as const, active: state.status === "running", x: 0.32, y: 0.12 },
    { id: "room:failed", label: "Failed", kind: "room-status" as const, active: state.status === "failed", x: 0.54, y: 0.12 },
    { id: "phase_1_monitor", label: "Phase 1 Monitor", kind: "phase" as const, active: scenario.phaseId === "phase_1_monitor", x: 0.1, y: 0.56 },
    { id: "phase_2_escalation", label: "Phase 2 Escalation", kind: "phase" as const, active: scenario.phaseId === "phase_2_escalation", x: 0.32, y: 0.56 },
    { id: "phase_3_crisis", label: "Phase 3 Crisis", kind: "phase" as const, active: scenario.phaseId === "phase_3_crisis", x: 0.54, y: 0.56 },
    { id: "phase_4_catastrophe", label: "Phase 4 Catastrophe", kind: "phase" as const, active: scenario.phaseId === "phase_4_catastrophe", x: 0.76, y: 0.56 },
    { id: "terminal_failed", label: "Terminal Failed", kind: "phase" as const, active: scenario.phaseId === "terminal_failed", x: 0.88, y: 0.86 },
  ];

  const transitions = [
    { id: "t_room_running", fromNodeId: "room:lobby", toNodeId: "room:running", label: "Force Running", actionPayload: "room-status:running" },
    { id: "t_room_failed", fromNodeId: "room:running", toNodeId: "room:failed", label: "Force Failed", actionPayload: "room-status:failed" },
    { id: "t_phase_1", fromNodeId: "room:running", toNodeId: "phase_1_monitor", label: "Set P1", actionPayload: "bushfire-phase:phase_1_monitor" },
    { id: "t_phase_2", fromNodeId: "room:running", toNodeId: "phase_2_escalation", label: "Set P2", actionPayload: "bushfire-phase:phase_2_escalation" },
    { id: "t_phase_3", fromNodeId: "room:running", toNodeId: "phase_3_crisis", label: "Set P3", actionPayload: "bushfire-phase:phase_3_crisis" },
    { id: "t_phase_4", fromNodeId: "room:running", toNodeId: "phase_4_catastrophe", label: "Set P4", actionPayload: "bushfire-phase:phase_4_catastrophe" },
    { id: "t_terminal", fromNodeId: "phase_4_catastrophe", toNodeId: "terminal_failed", label: "Trigger Terminal", actionPayload: "bushfire-state:terminal_failed" },
  ];

  return {
    mode: "bushfire-command" as const,
    currentNodeId: scenario.phaseId,
    nodes,
    transitions,
    hints: [
      `Phase: ${phaseLabel(scenario.phaseId)}`,
      `Distance to town: ${Math.round(scenario.distanceToTownMeters)}m`,
      `Wind: ${scenario.windDirection} ${scenario.windKph}km/h`,
      `Anxiety ${Math.round(scenario.publicAnxiety)} | Rumor ${Math.round(scenario.rumorPressure)}`,
    ],
  };
}

export class BushfireCommandMode implements GameModeEngine {
  initObjectives(_rng: SeededRandom): RoomState["objectives"] {
    return [
      {
        id: "fire_obj_1",
        description: "Issue meteorology forecast updates as phases escalate",
        requiredAction: "bushfire_issue_forecast",
        completed: false,
      },
      {
        id: "fire_obj_2",
        description: "Create defensive firebreaks on threatened sectors",
        requiredAction: "bushfire_create_firebreak",
        completed: false,
      },
      {
        id: "fire_obj_3",
        description: "Stabilize evacuation corridors and traffic flow",
        requiredAction: "bushfire_set_roadblock",
        completed: false,
      },
      {
        id: "fire_obj_4",
        description: "Broadcast public rumor corrections and calm advisories",
        requiredAction: "bushfire_issue_public_update",
        completed: false,
      },
    ];
  }

  initSummary(): string {
    return "The Valley emergency command is activated. Coordinate via Slack and execute actions through your role panels.";
  }

  initScenario(rng: SeededRandom): RoomState["scenario"] {
    return {
      type: "bushfire-command",
      timerSec: TOTAL_DURATION_SEC,
      phaseId: "phase_1_monitor",
      phaseIndex: 0,
      phaseStartedAtEpochMs: 0,
      elapsedSec: 0,
      windDirection: "E",
      windStrength: 1,
      windKph: 10,
      distanceToTownMeters: 2000,
      trafficCongestion: 8,
      smokeDensity: 10,
      rumorPressure: 12,
      forecastConfidence: 68,
      issuedForecasts: [],
      publicAnxiety: 18,
      containment: 78,
      waterBombsAvailable: 3,
      cells: createCells(rng),
      publicAdvisories: [],
      strategyNotes: ["Initial conditions are mild; prepare cross-agency coordination before wind shift."],
      promptDeck: createPromptDeck(rng),
    };
  }

  getWidgetDefinitions(): WidgetAccessRule[] {
    return PANEL_DEFINITIONS;
  }

  getDefaultWidgetAccessTemplate(role: IncidentRole): WidgetId[] {
    return DEFAULT_BY_ROLE[role] ?? ["mission_hud", "town_map", "role_briefing"];
  }

  getWidgetForAction(actionType: PlayerAction["type"]): WidgetId | undefined {
    const map: Partial<Record<PlayerAction["type"], WidgetId>> = {
      bushfire_deploy_fire_crew: "fire_ops_console",
      bushfire_drop_water: "fire_ops_console",
      bushfire_create_firebreak: "fire_ops_console",
      bushfire_set_roadblock: "police_ops_console",
      bushfire_issue_public_update: "public_info_console",
      bushfire_issue_forecast: "weather_ops_console",
      bushfire_ack_prompt: "role_briefing",
      gm_release_prompt: "gm_prompt_deck",
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
      issuedForecasts: [...scenario.issuedForecasts],
      promptDeck: scenario.promptDeck.map((card) => ({ ...card, acknowledgedByPlayerIds: [...card.acknowledgedByPlayerIds] })),
    };

    const targetCellId = String(action.payload?.cellId ?? "");
    const targetCell = next.cells.find((cell) => cell.id === targetCellId);
    const player = state.players.find((candidate) => candidate.id === action.playerId);

    const timelineAdds = [
      newTimelineEvent("status", `${action.playerId} executed ${action.type}`, now, action.playerId),
    ];

    let pressureDelta = 0;
    let scoreDelta = 0;
    let summary = "Valley command loop active.";

    switch (action.type) {
      case "bushfire_deploy_fire_crew": {
        if (!targetCell) {
          return { pressureDelta: 3, scoreDelta: -3, timelineAdds, summary: "Invalid crew target." };
        }
        targetCell.hasFireCrew = true;
        targetCell.fireLevel = clamp(targetCell.fireLevel - 14, 0, 100);
        pressureDelta -= 4;
        scoreDelta += 8;
        summary = `Fire crews deployed to ${targetCell.zoneName}.`;
        break;
      }
      case "bushfire_drop_water": {
        if (!targetCell || next.waterBombsAvailable <= 0) {
          return { pressureDelta: 4, scoreDelta: -4, timelineAdds, summary: "Water drop unavailable." };
        }
        next.waterBombsAvailable -= 1;
        targetCell.fireLevel = clamp(targetCell.fireLevel - 24, 0, 100);
        pressureDelta -= 5;
        scoreDelta += 10;
        summary = `Water drop landed on ${targetCell.zoneName}.`;
        break;
      }
      case "bushfire_create_firebreak": {
        if (!targetCell) {
          return { pressureDelta: 3, scoreDelta: -3, timelineAdds, summary: "Invalid firebreak target." };
        }
        targetCell.hasFirebreak = true;
        pressureDelta -= 3;
        scoreDelta += 7;
        summary = `Firebreak established at ${targetCell.zoneName}.`;
        break;
      }
      case "bushfire_set_roadblock": {
        if (!targetCell) {
          return { pressureDelta: 2, scoreDelta: -2, timelineAdds, summary: "Invalid roadblock target." };
        }
        targetCell.hasPoliceUnit = true;
        targetCell.evacuated = true;
        next.trafficCongestion = clamp(next.trafficCongestion - 6, 0, 100);
        pressureDelta -= 3;
        scoreDelta += 8;
        summary = `Roadblock and evacuation lane activated for ${targetCell.zoneName}.`;
        break;
      }
      case "bushfire_issue_public_update": {
        const template = String(action.payload?.template ?? "Emergency advisory issued.");
        next.publicAdvisories.push(template);
        const rumorCorrection = /water|rumor|false|verified|supply/i.test(template) ? 14 : 9;
        next.rumorPressure = clamp(next.rumorPressure - rumorCorrection, 0, 100);
        next.publicAnxiety = clamp(next.publicAnxiety - 12, 0, 100);
        pressureDelta -= 4;
        scoreDelta += 9;
        summary = "Public advisory broadcast delivered.";
        break;
      }
      case "bushfire_issue_forecast": {
        const forecastType = String(action.payload?.forecastType ?? "phase_update");
        next.issuedForecasts.push(`${phaseLabel(next.phaseId)}:${forecastType}`);
        next.forecastConfidence = clamp(next.forecastConfidence + 16, 0, 100);
        next.rumorPressure = clamp(next.rumorPressure - 6, 0, 100);
        pressureDelta -= 3;
        scoreDelta += 8;
        summary = "Meteorology forecast issued to command team.";
        break;
      }
      case "bushfire_ack_prompt": {
        const promptId = String(action.payload?.promptId ?? "");
        const prompt = next.promptDeck.find((card) => card.id === promptId);
        if (!prompt || !prompt.released || !player || prompt.targetRole !== player.role) {
          return { pressureDelta: 1, scoreDelta: -1, timelineAdds, summary: "Prompt acknowledgement rejected." };
        }
        if (!prompt.acknowledgedByPlayerIds.includes(player.id)) {
          prompt.acknowledgedByPlayerIds.push(player.id);
          pressureDelta -= 1;
          scoreDelta += 2;
          summary = `${BUSHFIRE_ROLE_LABELS[player.role]} acknowledged briefing prompt.`;
        }
        break;
      }
      case "gm_release_prompt": {
        const cardId = String(action.payload?.cardId ?? "");
        const card = next.promptDeck.find((candidate) => candidate.id === cardId);
        if (!card) {
          return { pressureDelta: 2, scoreDelta: -2, timelineAdds, summary: "Prompt card not found." };
        }
        if (card.released) {
          return { pressureDelta: 0, scoreDelta: 0, timelineAdds, summary: "Prompt card already released." };
        }
        if (phaseIndex(card.phaseId) > next.phaseIndex) {
          return { pressureDelta: 2, scoreDelta: -2, timelineAdds, summary: "Prompt card is locked to a later phase." };
        }
        card.released = true;
        card.releasedAtEpochMs = now;
        next.rumorPressure = clamp(next.rumorPressure + (card.targetRole === "Public Information Officer" ? 8 : 3), 0, 100);
        pressureDelta += 2;
        scoreDelta += 3;
        summary = `GM released briefing: ${card.title}.`;
        break;
      }
      default:
        break;
    }

    next.containment = containmentFromCells(next.cells);

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
      elapsedSec: scenario.elapsedSec + TICK_SECONDS,
      timerSec: Math.max(0, TOTAL_DURATION_SEC - (scenario.elapsedSec + TICK_SECONDS)),
      cells: scenario.cells.map((cell) => ({ ...cell })),
      publicAdvisories: [...scenario.publicAdvisories],
      strategyNotes: [...scenario.strategyNotes],
      issuedForecasts: [...scenario.issuedForecasts],
      promptDeck: scenario.promptDeck.map((card) => ({ ...card, acknowledgedByPlayerIds: [...card.acknowledgedByPlayerIds] })),
    };

    const timelineAdds: RoomState["timeline"] = [];
    const computedPhase = phaseForElapsed(next.elapsedSec);

    if (computedPhase !== next.phaseId) {
      next.phaseId = computedPhase;
      next.phaseIndex = phaseIndex(computedPhase);
      next.phaseStartedAtEpochMs = now;
      timelineAdds.push(newTimelineEvent("inject", `Scenario advanced to ${phaseLabel(computedPhase)}.`, now));
    }

    if (next.phaseId === "terminal_failed") {
      next.timerSec = 0;
      next.distanceToTownMeters = 0;
      next.smokeDensity = 100;
      next.publicAnxiety = clamp(Math.max(next.publicAnxiety, 95), 0, 100);
      next.containment = clamp(Math.min(next.containment, 8), 0, 100);
      next.strategyNotes = [...next.strategyNotes, "Terminal outcome: fire has engulfed The Valley."];
      return {
        replaceScenario: next,
        status: "failed",
        pressureDelta: 20,
        scoreDelta: -8,
        summary: "Phase 4 terminal outcome reached: the fire has engulfed The Valley.",
        timelineAdds: [...timelineAdds, newTimelineEvent("inject", "Fire has engulfed the town.", now)],
      };
    }

    const phase = PHASE_META[next.phaseId];
    next.windDirection = phase.windDirection;
    next.windStrength = phase.windStrength;
    next.windKph = phase.windKph;

    next.cells = spreadFire(next.cells, next.windStrength, phase.spreadMultiplier);

    const crewCoverage = next.cells.filter((cell) => cell.hasFireCrew).length;
    const firebreakCoverage = next.cells.filter((cell) => cell.hasFirebreak).length;
    const policeCoverage = next.cells.filter((cell) => cell.hasPoliceUnit).length;
    const severeZones = next.cells.filter((cell) => cell.fireLevel >= 60).length;

    const forecastMitigation = Math.round(Math.max(0, next.forecastConfidence - 55) / 12);
    const approach = Math.max(12, phase.approachMeters - (crewCoverage * 4 + firebreakCoverage * 6 + forecastMitigation));
    next.distanceToTownMeters = Math.max(0, next.distanceToTownMeters - approach);

    const congestionIncrease = phase.trafficBias + (next.phaseId === "phase_3_crisis" || next.phaseId === "phase_4_catastrophe" ? 2.4 : 0) - policeCoverage * 1.1;
    next.trafficCongestion = clamp(next.trafficCongestion + congestionIncrease, 0, 100);

    const advisoryStrength = Math.min(4, next.publicAdvisories.length);
    next.rumorPressure = clamp(next.rumorPressure + phase.panicBias * 0.85 - advisoryStrength * 1.15, 0, 100);

    next.forecastConfidence = clamp(next.forecastConfidence - 1.2 + (next.phaseId === "phase_1_monitor" ? 0.4 : 0), 0, 100);

    next.smokeDensity = clamp(
      next.smokeDensity + severeZones * 0.8 + phase.panicBias * 0.6 - advisoryStrength * 0.7,
      0,
      100,
    );

    const anxietyDelta =
      phase.panicBias +
      next.rumorPressure * 0.05 +
      next.trafficCongestion * 0.04 +
      next.smokeDensity * 0.03 -
      advisoryStrength * 1.1 -
      Math.max(0, (next.forecastConfidence - 70) * 0.03);
    next.publicAnxiety = clamp(next.publicAnxiety + anxietyDelta, 0, 100);

    next.containment = containmentFromCells(next.cells);

    const pressureDelta = Math.round(phase.panicBias + next.rumorPressure * 0.04 + next.trafficCongestion * 0.02);
    const scoreDelta = Math.round((crewCoverage + firebreakCoverage + policeCoverage) * 0.4 - severeZones * 0.7);

    return {
      replaceScenario: next,
      pressureDelta,
      scoreDelta,
      summary: phase.summary,
      timelineAdds: timelineAdds.length > 0
        ? timelineAdds
        : [
            newTimelineEvent(
              "inject",
              `${phase.title}: wind ${next.windDirection} ${next.windKph} km/h, distance ${Math.round(next.distanceToTownMeters)}m.`,
              now,
            ),
          ],
    };
  }

  buildWidgetDeck(args: {
    state: RoomState;
    viewer?: { id: string; role: IncidentRole; isGameMaster: boolean };
    effectiveRole: IncidentRole;
    widgetState: RoomState["widgetState"];
    roleOptions: IncidentRole[];
    debriefMetrics: {
      executionAccuracy: number;
      timingDiscipline: number;
      communicationDiscipline: number;
      overall: number;
    };
  }): WidgetDeckView {
    const scenario = args.state.scenario;
    if (scenario.type !== "bushfire-command") {
      throw new Error("invalid scenario");
    }

    const viewer = args.viewer;
    const isGm = Boolean(viewer?.isGameMaster);
    const granted = viewer ? args.widgetState.accessGrants[viewer.id] ?? this.getDefaultWidgetAccessTemplate(viewer.role) : [];
    const availableWidgetIds = isGm
      ? PANEL_DEFINITIONS.map((panel) => panel.id)
      : granted.filter(
          (widgetId) => widgetId !== "gm_orchestrator" && widgetId !== "gm_prompt_deck" && widgetId !== "fsm_editor" && widgetId !== "debrief_replay",
        );

    const panelMap: WidgetDeckView["widgetsById"] = {};
    const withLock = (id: WidgetId) => args.widgetState.widgetLocks[id] ?? { locked: false };

    const pushPanel = <K extends WidgetId>(panel: WidgetView<K>): void => {
      if (availableWidgetIds.includes(panel.id)) {
        panelMap[panel.id] = panel as never;
      }
    };

    const promptAcknowledgedByViewer = (card: BushfirePromptCardState): boolean => {
      if (!viewer) {
        return false;
      }
      return card.acknowledgedByPlayerIds.includes(viewer.id);
    };

    const visiblePrompts = (() => {
      if (isGm) {
        return scenario.promptDeck;
      }
      if (!viewer) {
        return [];
      }
      return scenario.promptDeck.filter((card) => card.released && card.targetRole === viewer.role);
    })();

    pushPanel({
      id: "mission_hud",
      kind: "shared",
      title: "Mission HUD",
      subtitle: `The Valley | ${phaseLabel(scenario.phaseId)}`,
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
        summary: `${PHASE_META[scenario.phaseId === "terminal_failed" ? "phase_4_catastrophe" : scenario.phaseId].summary} Distance ${Math.round(scenario.distanceToTownMeters)}m.`,
        slackReminder: "Coordinate strategic decisions in Slack before acting.",
      },
    });

    pushPanel({
      id: "town_map",
      kind: "shared",
      title: "The Valley Map",
      subtitle: `${phaseLabel(scenario.phaseId)} firefront`,
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
        heatFieldSeed: Math.max(1, Math.round(scenario.containment * 100 + scenario.publicAnxiety + scenario.phaseIndex * 17)),
      },
    });

    pushPanel({
      id: "fire_ops_console",
      kind: "role-scoped",
      title: "Fire Ops Console",
      subtitle: "Containment and suppression",
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
        note: scenario.phaseId === "phase_4_catastrophe"
          ? "Prioritize life safety corridors over asset protection."
          : "Prioritize severe sectors near Eastern Ridge and suburbs.",
      },
    });

    pushPanel({
      id: "police_ops_console",
      kind: "role-scoped",
      title: "Police Ops Console",
      subtitle: "Traffic and evacuation control",
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
        note: `Main Highway congestion index ${Math.round(scenario.trafficCongestion)}.`,
      },
    });

    pushPanel({
      id: "public_info_console",
      kind: "role-scoped",
      title: "Public Info Console",
      subtitle: "Broadcast and rumor control",
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
        cadenceHint: scenario.rumorPressure > 55 ? "Increase cadence and rumor debunks now." : "Maintain calm regular updates.",
      },
    });

    pushPanel({
      id: "incident_command_console",
      kind: "role-scoped",
      title: "Incident Command Console",
      subtitle: "Mayor strategic view",
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
          `Distance to town: ${Math.round(scenario.distanceToTownMeters)}m`,
          `Main Highway congestion: ${Math.round(scenario.trafficCongestion)}`,
          `Smoke density: ${Math.round(scenario.smokeDensity)}`,
        ],
      },
    });

    pushPanel({
      id: "weather_ops_console",
      kind: "role-scoped",
      title: "Weather Ops Console",
      subtitle: "Forecast and wind intelligence",
      priority: 7,
      visualPriority: 76,
      renderMode: "svg",
      interactionMode: "diegetic-control",
      overlayTextLevel: "supporting",
      fxProfile: "cinematic",
      ambientLoopMs: 2400,
      hoverDepthPx: 4,
      materialPreset: "ops-card",
      locked: withLock("weather_ops_console"),
      payload: {
        phaseId: scenario.phaseId,
        windDirection: scenario.windDirection,
        windStrength: scenario.windStrength,
        windKph: scenario.windKph,
        forecastConfidence: scenario.forecastConfidence,
        nextShiftHint: scenario.phaseId === "phase_1_monitor" ? "Potential sudden West shift expected." : "High volatility remains through crisis phases.",
        recommendation: scenario.forecastConfidence < 45 ? "Issue immediate forecast update." : "Maintain forecast cadence and monitor gust spikes.",
        issuedForecasts: scenario.issuedForecasts.slice(-6),
      },
    });

    pushPanel({
      id: "role_briefing",
      kind: "role-scoped",
      title: "Private Briefing",
      subtitle: "Role-targeted prompt inbox",
      priority: 8,
      visualPriority: 74,
      renderMode: "svg",
      interactionMode: "diegetic-control",
      overlayTextLevel: "supporting",
      fxProfile: "cinematic",
      ambientLoopMs: 2200,
      hoverDepthPx: 4,
      materialPreset: "ops-card",
      locked: withLock("role_briefing"),
      payload: {
        phaseId: scenario.phaseId,
        role: viewer?.role ?? args.effectiveRole,
        roleLabel: BUSHFIRE_ROLE_LABELS[viewer?.role ?? args.effectiveRole],
        prompts: visiblePrompts.map((card) => ({
          id: card.id,
          title: card.title,
          body: card.body,
          releasedAtEpochMs: card.releasedAtEpochMs,
          acknowledged: promptAcknowledgedByViewer(card),
          severity:
            card.phaseId === "phase_1_monitor"
              ? "low"
              : card.phaseId === "phase_2_escalation"
              ? "medium"
              : "high",
        })),
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
          accessByPlayer: args.widgetState.accessGrants,
          widgetLocks: args.widgetState.widgetLocks,
          simulatedRole: args.widgetState.gmSimulatedRole,
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
              label: `${cell.zoneName} ${Math.round(cell.fireLevel)}%`,
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

      panelMap.gm_prompt_deck = {
        id: "gm_prompt_deck",
        kind: "gm-only",
        title: "GM Prompt Deck",
        subtitle: "Release role-targeted cue cards",
        priority: 93,
        visualPriority: 72,
        renderMode: "svg",
        interactionMode: "drawer-control",
        overlayTextLevel: "dense",
        fxProfile: "cinematic",
        ambientLoopMs: 2800,
        hoverDepthPx: 3,
        materialPreset: "gm-deck",
        locked: withLock("gm_prompt_deck"),
        payload: {
          phaseId: scenario.phaseId,
          cards: scenario.promptDeck.map((card) => ({
            id: card.id,
            phaseId: card.phaseId,
            targetRole: card.targetRole,
            title: card.title,
            body: card.body,
            released: card.released,
            releasedAtEpochMs: card.releasedAtEpochMs,
            acknowledgementCount: card.acknowledgedByPlayerIds.length,
          })),
          releasableCardIds: scenario.promptDeck
            .filter((card) => !card.released && phaseIndex(card.phaseId) <= scenario.phaseIndex)
            .map((card) => card.id),
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
      availableWidgetIds: defaultOrder,
      widgetsById: panelMap,
      defaultOrder,
      gmSimulatedRole: args.widgetState.gmSimulatedRole,
    };
  }
}
