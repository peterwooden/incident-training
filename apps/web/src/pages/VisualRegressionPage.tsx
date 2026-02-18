import type { BombDeviceConsolePayload, BombRulebookPayload, BushfireMapPayload } from "@incident/shared";
import { BombDeviceConsolePanel } from "../game-ui/panels/bomb/BombDeviceConsolePanel";
import { BombRulebookPanel } from "../game-ui/panels/bomb/BombRulebookPanel";
import { BushfireMapPanel } from "../game-ui/panels/bushfire/BushfireMapPanel";

const bombDeviceFixture: BombDeviceConsolePayload = {
  status: "armed",
  stageId: "wires",
  stageIndex: 0,
  totalStages: 3,
  stageTimerSec: 162,
  stageStatus: "active",
  completedStages: [],
  stageObjective: "Cut only the critical wires in analyst-confirmed order.",
  timerSec: 302,
  strikes: 1,
  maxStrikes: 3,
  stabilizeCharges: 2,
  wires: [
    { id: "wire_1", color: "red", isCut: false },
    { id: "wire_2", color: "blue", isCut: false },
    { id: "wire_3", color: "yellow", isCut: true },
    { id: "wire_4", color: "white", isCut: false },
    { id: "wire_5", color: "black", isCut: false },
  ],
  symbolModule: {
    availableSymbols: ["psi", "star", "lambda", "bolt", "eye"],
    enteredSequence: ["psi", "star"],
    precedenceOrder: ["sun", "psi", "star", "lambda", "bolt", "eye", "key", "spiral"],
  },
  memoryModule: {
    cue: 3,
    step: 2,
    totalSteps: 4,
    availableDigits: ["1", "2", "3", "4"],
    enteredSequence: ["2"],
  },
  wireAnchors: [
    { wireId: "wire_1", start: { x: 72, y: 48 }, end: { x: 508, y: 48 } },
    { wireId: "wire_2", start: { x: 72, y: 88 }, end: { x: 508, y: 88 } },
    { wireId: "wire_3", start: { x: 72, y: 128 }, end: { x: 508, y: 128 } },
    { wireId: "wire_4", start: { x: 72, y: 168 }, end: { x: 508, y: 168 } },
    { wireId: "wire_5", start: { x: 72, y: 208 }, end: { x: 508, y: 208 } },
  ],
  cuttableSegments: [
    { id: "seg_wire_1", wireId: "wire_1", start: { x: 180, y: 48 }, end: { x: 420, y: 48 }, thickness: 10 },
    { id: "seg_wire_2", wireId: "wire_2", start: { x: 180, y: 88 }, end: { x: 420, y: 88 }, thickness: 10 },
    { id: "seg_wire_3", wireId: "wire_3", start: { x: 180, y: 128 }, end: { x: 420, y: 128 }, thickness: 10 },
    { id: "seg_wire_4", wireId: "wire_4", start: { x: 180, y: 168 }, end: { x: 420, y: 168 }, thickness: 10 },
    { id: "seg_wire_5", wireId: "wire_5", start: { x: 180, y: 208 }, end: { x: 420, y: 208 }, thickness: 10 },
  ],
  moduleBounds: [
    { id: "wire_module", x: 28, y: 24, width: 510, height: 210 },
    { id: "glyph_module", x: 540, y: 24, width: 150, height: 120 },
    { id: "stability_module", x: 540, y: 150, width: 150, height: 82 },
  ],
  stateLights: [
    { id: "ok", x: 570, y: 196, color: "green", active: false },
    { id: "warn", x: 610, y: 196, color: "amber", active: true },
    { id: "danger", x: 650, y: 196, color: "red", active: false },
  ],
  symbolNodes: [
    { symbol: "psi", x: 659, y: 95, radius: 18 },
    { symbol: "star", x: 628, y: 137, radius: 18 },
    { symbol: "lambda", x: 578, y: 121, radius: 18 },
    { symbol: "bolt", x: 578, y: 69, radius: 18 },
    { symbol: "eye", x: 628, y: 53, radius: 18 },
  ],
  deviceSkin: {
    shellGradient: ["#1a283d", "#0a101a"],
    bezelDepth: 10,
    grimeAmount: 0.3,
    vignette: 0.5,
    reflectionStrength: 0.56,
    textureAssetId: "bomb-chassis-normal",
  },
  components: [
    { id: "display", type: "display", x: 548, y: 34, width: 132, height: 72, rotationDeg: 0, state: "active", valueLabel: "302s" },
    { id: "fuse", type: "fuse", x: 556, y: 124, width: 120, height: 18, rotationDeg: 0, state: "fault", valueLabel: "STRIKE 1" },
    { id: "cap", type: "capacitor", x: 428, y: 24, width: 42, height: 58, rotationDeg: 8, state: "idle", valueLabel: "220uF" },
  ],
  energyArcs: [
    { id: "arc_1", points: [{ x: 118, y: 48 }, { x: 260, y: 44 }, { x: 424, y: 48 }], intensity: 0.6, speed: 0.7, active: true },
    { id: "arc_2", points: [{ x: 118, y: 88 }, { x: 260, y: 84 }, { x: 424, y: 88 }], intensity: 0.4, speed: 0.9, active: true },
  ],
  lightRigs: [
    { id: "key", kind: "key", x: 0.2, y: 0.05, intensity: 0.8, color: "#d5e7ff" },
    { id: "fill", kind: "fill", x: 0.78, y: 0.14, intensity: 0.62, color: "#8cb9ff" },
    { id: "rim", kind: "rim", x: 0.54, y: 0.94, intensity: 0.7, color: "#ff9a72" },
  ],
  interactionRegions: [
    {
      id: "region_seg_wire_1",
      targetId: "wire_1",
      kind: "wire",
      shape: "line",
      cursor: "crosshair",
      enabled: true,
      affordance: "cut",
      line: { start: { x: 180, y: 48 }, end: { x: 420, y: 48 }, thickness: 18 },
    },
    {
      id: "region_symbol_psi",
      targetId: "psi",
      kind: "symbol",
      shape: "circle",
      cursor: "pointer",
      enabled: true,
      affordance: "press",
      circle: { center: { x: 659, y: 95 }, radius: 26 },
    },
    {
      id: "region_stabilizer",
      targetId: "stability_module",
      kind: "stabilizer",
      shape: "circle",
      cursor: "grab",
      enabled: true,
      affordance: "hold",
      circle: { center: { x: 615, y: 195 }, radius: 44 },
    },
  ],
  shakeIntensity: 0.22,
  diagnostics: ["Fixture diagnostics"],
};

const bombRulebookFixture: BombRulebookPayload = {
  stageId: "wires",
  stageTitle: "Wire Discipline",
  spreads: [
    {
      id: "fixture_spread_1",
      title: "Wire Taxonomy",
      spreadBackgroundAssetId: "manual-spread-blueprint",
      paperNormalAssetId: "paper-normal",
      creaseMapAssetId: "paper-crease",
      diagramAssets: [
        { id: "asset_wire", type: "wire", points: [{ x: 80, y: 72 }, { x: 180, y: 106 }, { x: 300, y: 76 }] },
      ],
      diagramLayers: [
        {
          id: "layer_bg",
          depth: "background",
          type: "safety",
          points: [{ x: 60, y: 120 }, { x: 708, y: 120 }, { x: 708, y: 310 }, { x: 60, y: 310 }],
          fill: "#ece2cc",
        },
      ],
      hotspots: [
        { id: "spot1", x: 70, y: 160, width: 530, height: 36, label: "Clause 1", detail: "Cut red then blue." },
      ],
      calloutPins: [{ id: "pin1", x: 610, y: 100, text: "Repeat-back mandatory" }],
      turnHintPath: [{ x: 690, y: 280 }, { x: 728, y: 292 }, { x: 712, y: 334 }],
    },
  ],
  activeSpreadId: "fixture_spread_1",
  pages: [{ id: "fixture_spread_1", title: "Wire Taxonomy", sections: ["Cut red then blue"] }],
  index: ["Wire Taxonomy"],
  hint: "Fixture hint",
};

const bushfireFixture: BushfireMapPayload = {
  windDirection: "E",
  windStrength: 2,
  containment: 61,
  anxiety: 38,
  cells: [
    { id: "cell_1", x: 0, y: 0, zoneName: "Riverbend", fireLevel: 18, fuel: 78, population: 124, evacuated: false, hasFireCrew: true, hasPoliceUnit: false, hasFirebreak: false },
    { id: "cell_2", x: 1, y: 0, zoneName: "Cedar Hill", fireLevel: 62, fuel: 82, population: 164, evacuated: false, hasFireCrew: false, hasPoliceUnit: true, hasFirebreak: false },
    { id: "cell_3", x: 2, y: 0, zoneName: "Town Center", fireLevel: 38, fuel: 71, population: 302, evacuated: true, hasFireCrew: false, hasPoliceUnit: true, hasFirebreak: true },
    { id: "cell_4", x: 0, y: 1, zoneName: "South Farms", fireLevel: 54, fuel: 86, population: 94, evacuated: false, hasFireCrew: false, hasPoliceUnit: false, hasFirebreak: false },
    { id: "cell_5", x: 1, y: 1, zoneName: "Rail Junction", fireLevel: 24, fuel: 69, population: 212, evacuated: false, hasFireCrew: false, hasPoliceUnit: false, hasFirebreak: false },
    { id: "cell_6", x: 2, y: 1, zoneName: "East Ridge", fireLevel: 16, fuel: 65, population: 188, evacuated: false, hasFireCrew: false, hasPoliceUnit: false, hasFirebreak: false },
    { id: "cell_7", x: 0, y: 2, zoneName: "Pine Valley", fireLevel: 8, fuel: 62, population: 82, evacuated: false, hasFireCrew: false, hasPoliceUnit: false, hasFirebreak: false },
    { id: "cell_8", x: 1, y: 2, zoneName: "Lakeside", fireLevel: 22, fuel: 64, population: 132, evacuated: false, hasFireCrew: false, hasPoliceUnit: false, hasFirebreak: false },
    { id: "cell_9", x: 2, y: 2, zoneName: "North Estate", fireLevel: 44, fuel: 76, population: 244, evacuated: false, hasFireCrew: false, hasPoliceUnit: false, hasFirebreak: false },
  ],
  zonePolygons: [
    { zoneId: "cell_1", points: [{ x: 38, y: 28 }, { x: 176, y: 42 }, { x: 201, y: 92 }, { x: 170, y: 141 }, { x: 72, y: 151 }, { x: 28, y: 103 }] },
    { zoneId: "cell_2", points: [{ x: 252, y: 34 }, { x: 404, y: 24 }, { x: 458, y: 72 }, { x: 443, y: 140 }, { x: 324, y: 148 }, { x: 260, y: 94 }] },
    { zoneId: "cell_3", points: [{ x: 506, y: 36 }, { x: 670, y: 46 }, { x: 696, y: 102 }, { x: 654, y: 154 }, { x: 548, y: 148 }, { x: 502, y: 94 }] },
    { zoneId: "cell_4", points: [{ x: 32, y: 144 }, { x: 191, y: 152 }, { x: 212, y: 220 }, { x: 172, y: 274 }, { x: 74, y: 282 }, { x: 28, y: 226 }] },
    { zoneId: "cell_5", points: [{ x: 248, y: 148 }, { x: 430, y: 154 }, { x: 468, y: 206 }, { x: 430, y: 282 }, { x: 302, y: 286 }, { x: 240, y: 220 }] },
    { zoneId: "cell_6", points: [{ x: 500, y: 150 }, { x: 668, y: 156 }, { x: 698, y: 222 }, { x: 645, y: 286 }, { x: 547, y: 282 }, { x: 494, y: 222 }] },
    { zoneId: "cell_7", points: [{ x: 40, y: 270 }, { x: 174, y: 286 }, { x: 200, y: 344 }, { x: 150, y: 394 }, { x: 66, y: 392 }, { x: 26, y: 336 }] },
    { zoneId: "cell_8", points: [{ x: 246, y: 286 }, { x: 430, y: 286 }, { x: 476, y: 342 }, { x: 422, y: 398 }, { x: 306, y: 394 }, { x: 238, y: 340 }] },
    { zoneId: "cell_9", points: [{ x: 504, y: 284 }, { x: 678, y: 268 }, { x: 706, y: 340 }, { x: 666, y: 400 }, { x: 546, y: 394 }, { x: 494, y: 338 }] },
  ],
  assetSlots: [
    { id: "slot_crew", type: "crew", x: 668, y: 78 },
    { id: "slot_water", type: "water", x: 668, y: 138 },
    { id: "slot_firebreak", type: "firebreak", x: 668, y: 198 },
    { id: "slot_roadblock", type: "roadblock", x: 668, y: 258 },
  ],
  dragTargets: [
    { zoneId: "cell_1", accepts: ["crew", "water", "firebreak", "roadblock"], x: 112, y: 88, radius: 62 },
    { zoneId: "cell_2", accepts: ["crew", "water", "firebreak", "roadblock"], x: 356, y: 86, radius: 62 },
    { zoneId: "cell_3", accepts: ["crew", "water", "firebreak", "roadblock"], x: 600, y: 90, radius: 62 },
    { zoneId: "cell_4", accepts: ["crew", "water", "firebreak", "roadblock"], x: 118, y: 205, radius: 62 },
    { zoneId: "cell_5", accepts: ["crew", "water", "firebreak", "roadblock"], x: 356, y: 210, radius: 62 },
    { zoneId: "cell_6", accepts: ["crew", "water", "firebreak", "roadblock"], x: 600, y: 206, radius: 62 },
    { zoneId: "cell_7", accepts: ["crew", "water", "firebreak", "roadblock"], x: 114, y: 326, radius: 62 },
    { zoneId: "cell_8", accepts: ["crew", "water", "firebreak", "roadblock"], x: 356, y: 326, radius: 62 },
    { zoneId: "cell_9", accepts: ["crew", "water", "firebreak", "roadblock"], x: 598, y: 326, radius: 62 },
  ],
  terrainLayers: [
    {
      id: "grass",
      material: "grassland",
      polygons: [[{ x: 8, y: 20 }, { x: 710, y: 22 }, { x: 708, y: 408 }, { x: 10, y: 404 }]],
      tint: "#4b8a45",
      elevation: 0.22,
    },
    {
      id: "forest",
      material: "forest",
      polygons: [
        [{ x: 50, y: 44 }, { x: 164, y: 54 }, { x: 180, y: 98 }, { x: 150, y: 132 }, { x: 82, y: 138 }, { x: 46, y: 100 }],
        [{ x: 260, y: 48 }, { x: 388, y: 40 }, { x: 434, y: 84 }, { x: 422, y: 128 }, { x: 336, y: 136 }, { x: 280, y: 90 }],
        [{ x: 46, y: 286 }, { x: 170, y: 302 }, { x: 192, y: 346 }, { x: 148, y: 382 }, { x: 78, y: 380 }, { x: 42, y: 336 }],
      ],
      tint: "#2f6f3a",
      elevation: 0.38,
    },
    {
      id: "urban",
      material: "urban",
      polygons: [
        [{ x: 312, y: 176 }, { x: 400, y: 182 }, { x: 422, y: 212 }, { x: 404, y: 252 }, { x: 332, y: 256 }, { x: 300, y: 220 }],
        [{ x: 566, y: 66 }, { x: 636, y: 72 }, { x: 656, y: 110 }, { x: 630, y: 134 }, { x: 576, y: 126 }, { x: 554, y: 98 }],
      ],
      tint: "#6f737b",
      elevation: 0.28,
    },
    {
      id: "water",
      material: "water",
      polygons: [
        [{ x: 10, y: 332 }, { x: 212, y: 334 }, { x: 258, y: 398 }, { x: 10, y: 400 }],
        [{ x: 410, y: 316 }, { x: 512, y: 320 }, { x: 532, y: 382 }, { x: 426, y: 394 }],
      ],
      tint: "#2b72b0",
      elevation: 0.1,
    },
  ],
  roadGraph: [
    { id: "road1", points: [{ x: 112, y: 88 }, { x: 234, y: 78 }, { x: 356, y: 86 }], width: 9 },
    { id: "road2", points: [{ x: 356, y: 86 }, { x: 476, y: 82 }, { x: 600, y: 90 }], width: 9 },
    { id: "road3", points: [{ x: 118, y: 205 }, { x: 230, y: 198 }, { x: 356, y: 210 }], width: 8 },
    { id: "road4", points: [{ x: 356, y: 210 }, { x: 474, y: 194 }, { x: 600, y: 206 }], width: 8 },
    { id: "road5", points: [{ x: 114, y: 326 }, { x: 234, y: 314 }, { x: 356, y: 326 }], width: 8 },
    { id: "road6", points: [{ x: 356, y: 326 }, { x: 476, y: 314 }, { x: 598, y: 326 }], width: 8 },
    { id: "road7", points: [{ x: 30, y: 108 }, { x: 230, y: 94 }, { x: 468, y: 96 }, { x: 698, y: 110 }], width: 10 },
    { id: "road8", points: [{ x: 24, y: 296 }, { x: 252, y: 286 }, { x: 468, y: 300 }, { x: 706, y: 286 }], width: 11 },
  ],
  riverPaths: [
    { id: "river1", points: [{ x: 14, y: 324 }, { x: 144, y: 302 }, { x: 286, y: 322 }, { x: 418, y: 304 }, { x: 568, y: 328 }, { x: 706, y: 312 }], width: 26 },
    { id: "river2", points: [{ x: 470, y: 18 }, { x: 438, y: 94 }, { x: 452, y: 162 }, { x: 502, y: 236 }, { x: 510, y: 318 }], width: 12 },
  ],
  landmarkSprites: [
    { id: "landmark1", kind: "hospital", x: 84, y: 64, scale: 0.92, assetId: "map-landmark-0" },
    { id: "landmark2", kind: "school", x: 388, y: 108, scale: 1.0, assetId: "map-landmark-1" },
    { id: "landmark3", kind: "depot", x: 574, y: 112, scale: 0.96, assetId: "map-landmark-2" },
    { id: "landmark4", kind: "station", x: 132, y: 230, scale: 0.94, assetId: "map-landmark-3" },
    { id: "landmark5", kind: "depot", x: 324, y: 234, scale: 0.9, assetId: "map-landmark-2" },
    { id: "landmark6", kind: "station", x: 626, y: 236, scale: 0.9, assetId: "map-landmark-3" },
  ],
  treeClusters: [
    { id: "trees1", x: 74, y: 60, radius: 26, density: 0.8 },
    { id: "trees2", x: 148, y: 112, radius: 20, density: 0.6 },
    { id: "trees3", x: 286, y: 64, radius: 20, density: 0.65 },
    { id: "trees4", x: 402, y: 128, radius: 22, density: 0.62 },
    { id: "trees5", x: 78, y: 318, radius: 24, density: 0.76 },
    { id: "trees6", x: 150, y: 358, radius: 18, density: 0.61 },
    { id: "trees7", x: 586, y: 316, radius: 22, density: 0.64 },
    { id: "trees8", x: 642, y: 360, radius: 18, density: 0.58 },
  ],
  fireFrontContours: [
    { id: "contour_cell_2", points: [{ x: 322, y: 68 }, { x: 344, y: 52 }, { x: 372, y: 60 }, { x: 386, y: 82 }, { x: 370, y: 108 }, { x: 344, y: 114 }, { x: 324, y: 98 }, { x: 318, y: 76 }, { x: 322, y: 68 }], intensity: 0.65, phase: 0.3 },
    { id: "contour_cell_4", points: [{ x: 82, y: 188 }, { x: 104, y: 170 }, { x: 136, y: 176 }, { x: 152, y: 198 }, { x: 142, y: 228 }, { x: 110, y: 236 }, { x: 84, y: 218 }, { x: 78, y: 198 }, { x: 82, y: 188 }], intensity: 0.55, phase: 0.9 },
    { id: "contour_cell_9", points: [{ x: 566, y: 300 }, { x: 592, y: 286 }, { x: 622, y: 292 }, { x: 636, y: 320 }, { x: 622, y: 344 }, { x: 592, y: 350 }, { x: 570, y: 334 }, { x: 560, y: 316 }, { x: 566, y: 300 }], intensity: 0.47, phase: 0.65 },
  ],
  windField: [
    { x: 42, y: 42, dx: 0.64, dy: -0.02, strength: 0.7 },
    { x: 114, y: 42, dx: 0.68, dy: -0.03, strength: 0.66 },
    { x: 186, y: 42, dx: 0.66, dy: 0.02, strength: 0.62 },
    { x: 258, y: 42, dx: 0.7, dy: -0.01, strength: 0.6 },
    { x: 330, y: 42, dx: 0.64, dy: 0.01, strength: 0.66 },
    { x: 402, y: 90, dx: 0.68, dy: 0.02, strength: 0.72 },
    { x: 474, y: 90, dx: 0.63, dy: -0.01, strength: 0.68 },
    { x: 546, y: 138, dx: 0.7, dy: 0.01, strength: 0.74 },
    { x: 618, y: 138, dx: 0.67, dy: 0.03, strength: 0.7 },
    { x: 114, y: 186, dx: 0.66, dy: -0.03, strength: 0.64 },
    { x: 186, y: 186, dx: 0.65, dy: 0.01, strength: 0.6 },
    { x: 258, y: 186, dx: 0.71, dy: 0.02, strength: 0.66 },
    { x: 330, y: 234, dx: 0.69, dy: -0.01, strength: 0.72 },
    { x: 402, y: 234, dx: 0.66, dy: 0.02, strength: 0.68 },
    { x: 474, y: 282, dx: 0.64, dy: -0.03, strength: 0.7 },
    { x: 546, y: 282, dx: 0.7, dy: 0.02, strength: 0.74 },
    { x: 618, y: 330, dx: 0.67, dy: 0.01, strength: 0.68 },
  ],
  toolDropZones: [
    { id: "drop_crew_cell_1", zoneId: "cell_1", tool: "crew", x: 72, y: 54, radius: 15 },
    { id: "drop_water_cell_1", zoneId: "cell_1", tool: "water", x: 150, y: 54, radius: 15 },
    { id: "drop_firebreak_cell_1", zoneId: "cell_1", tool: "firebreak", x: 74, y: 122, radius: 15 },
    { id: "drop_roadblock_cell_1", zoneId: "cell_1", tool: "roadblock", x: 152, y: 122, radius: 15 },
    { id: "drop_crew_cell_2", zoneId: "cell_2", tool: "crew", x: 316, y: 52, radius: 15 },
    { id: "drop_water_cell_2", zoneId: "cell_2", tool: "water", x: 394, y: 52, radius: 15 },
    { id: "drop_firebreak_cell_2", zoneId: "cell_2", tool: "firebreak", x: 318, y: 120, radius: 15 },
    { id: "drop_roadblock_cell_2", zoneId: "cell_2", tool: "roadblock", x: 396, y: 120, radius: 15 },
    { id: "drop_crew_cell_3", zoneId: "cell_3", tool: "crew", x: 560, y: 56, radius: 15 },
    { id: "drop_water_cell_3", zoneId: "cell_3", tool: "water", x: 638, y: 56, radius: 15 },
    { id: "drop_firebreak_cell_3", zoneId: "cell_3", tool: "firebreak", x: 562, y: 124, radius: 15 },
    { id: "drop_roadblock_cell_3", zoneId: "cell_3", tool: "roadblock", x: 640, y: 124, radius: 15 },
    { id: "drop_crew_cell_4", zoneId: "cell_4", tool: "crew", x: 78, y: 171, radius: 15 },
    { id: "drop_water_cell_4", zoneId: "cell_4", tool: "water", x: 156, y: 171, radius: 15 },
    { id: "drop_firebreak_cell_4", zoneId: "cell_4", tool: "firebreak", x: 80, y: 239, radius: 15 },
    { id: "drop_roadblock_cell_4", zoneId: "cell_4", tool: "roadblock", x: 158, y: 239, radius: 15 },
    { id: "drop_crew_cell_5", zoneId: "cell_5", tool: "crew", x: 316, y: 176, radius: 15 },
    { id: "drop_water_cell_5", zoneId: "cell_5", tool: "water", x: 394, y: 176, radius: 15 },
    { id: "drop_firebreak_cell_5", zoneId: "cell_5", tool: "firebreak", x: 318, y: 244, radius: 15 },
    { id: "drop_roadblock_cell_5", zoneId: "cell_5", tool: "roadblock", x: 396, y: 244, radius: 15 },
    { id: "drop_crew_cell_6", zoneId: "cell_6", tool: "crew", x: 560, y: 172, radius: 15 },
    { id: "drop_water_cell_6", zoneId: "cell_6", tool: "water", x: 638, y: 172, radius: 15 },
    { id: "drop_firebreak_cell_6", zoneId: "cell_6", tool: "firebreak", x: 562, y: 240, radius: 15 },
    { id: "drop_roadblock_cell_6", zoneId: "cell_6", tool: "roadblock", x: 640, y: 240, radius: 15 },
    { id: "drop_crew_cell_7", zoneId: "cell_7", tool: "crew", x: 74, y: 292, radius: 15 },
    { id: "drop_water_cell_7", zoneId: "cell_7", tool: "water", x: 152, y: 292, radius: 15 },
    { id: "drop_firebreak_cell_7", zoneId: "cell_7", tool: "firebreak", x: 76, y: 360, radius: 15 },
    { id: "drop_roadblock_cell_7", zoneId: "cell_7", tool: "roadblock", x: 154, y: 360, radius: 15 },
    { id: "drop_crew_cell_8", zoneId: "cell_8", tool: "crew", x: 316, y: 292, radius: 15 },
    { id: "drop_water_cell_8", zoneId: "cell_8", tool: "water", x: 394, y: 292, radius: 15 },
    { id: "drop_firebreak_cell_8", zoneId: "cell_8", tool: "firebreak", x: 318, y: 360, radius: 15 },
    { id: "drop_roadblock_cell_8", zoneId: "cell_8", tool: "roadblock", x: 396, y: 360, radius: 15 },
    { id: "drop_crew_cell_9", zoneId: "cell_9", tool: "crew", x: 558, y: 292, radius: 15 },
    { id: "drop_water_cell_9", zoneId: "cell_9", tool: "water", x: 636, y: 292, radius: 15 },
    { id: "drop_firebreak_cell_9", zoneId: "cell_9", tool: "firebreak", x: 560, y: 360, radius: 15 },
    { id: "drop_roadblock_cell_9", zoneId: "cell_9", tool: "roadblock", x: 638, y: 360, radius: 15 },
  ],
  windVector: { dx: 0.67, dy: 0.02 },
  heatFieldSeed: 6122,
};

export function VisualRegressionPage() {
  return (
    <main className="landing-shell">
      <section className="landing-hero">
        <p className="eyebrow">Visual Regression Fixtures</p>
        <h1>Hero Scene Snapshots</h1>
      </section>

      <section data-testid="fixture-bomb-device">
        <BombDeviceConsolePanel
          payload={bombDeviceFixture}
          locked={false}
          fxProfile="cinematic"
          ambientLoopMs={1800}
          hoverDepthPx={8}
          onCutWire={() => undefined}
          onPressSymbol={() => undefined}
          onStabilize={() => undefined}
        />
      </section>

      <section data-testid="fixture-bomb-manual">
        <BombRulebookPanel
          payload={bombRulebookFixture}
          currentPage={0}
          onChangePage={() => undefined}
          fxProfile="cinematic"
          ambientLoopMs={2300}
          hoverDepthPx={6}
        />
      </section>

      <section data-testid="fixture-bushfire-map">
        <BushfireMapPanel
          payload={bushfireFixture}
          locked={false}
          fxProfile="cinematic"
          ambientLoopMs={1700}
          hoverDepthPx={8}
          canUseFireTools
          canUsePoliceTools
          onDeployCrew={() => undefined}
          onDropWater={() => undefined}
          onCreateFirebreak={() => undefined}
          onSetRoadblock={() => undefined}
        />
      </section>
    </main>
  );
}
