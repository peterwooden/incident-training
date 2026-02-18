import type { BombDeviceConsolePayload, BombRulebookPayload, BushfireMapPayload } from "@incident/shared";
import { BombDeviceConsolePanel } from "../game-ui/panels/bomb/BombDeviceConsolePanel";
import { BombRulebookPanel } from "../game-ui/panels/bomb/BombRulebookPanel";
import { BushfireMapPanel } from "../game-ui/panels/bushfire/BushfireMapPanel";

const bombDeviceFixture: BombDeviceConsolePayload = {
  status: "armed",
  timerSec: 302,
  strikes: 1,
  maxStrikes: 3,
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
    { zoneId: "cell_1", points: [{ x: 20, y: 20 }, { x: 230, y: 20 }, { x: 230, y: 112 }, { x: 20, y: 112 }] },
    { zoneId: "cell_2", points: [{ x: 250, y: 20 }, { x: 460, y: 20 }, { x: 460, y: 112 }, { x: 250, y: 112 }] },
    { zoneId: "cell_3", points: [{ x: 480, y: 20 }, { x: 690, y: 20 }, { x: 690, y: 112 }, { x: 480, y: 112 }] },
    { zoneId: "cell_4", points: [{ x: 20, y: 130 }, { x: 230, y: 130 }, { x: 230, y: 222 }, { x: 20, y: 222 }] },
    { zoneId: "cell_5", points: [{ x: 250, y: 130 }, { x: 460, y: 130 }, { x: 460, y: 222 }, { x: 250, y: 222 }] },
    { zoneId: "cell_6", points: [{ x: 480, y: 130 }, { x: 690, y: 130 }, { x: 690, y: 222 }, { x: 480, y: 222 }] },
    { zoneId: "cell_7", points: [{ x: 20, y: 240 }, { x: 230, y: 240 }, { x: 230, y: 332 }, { x: 20, y: 332 }] },
    { zoneId: "cell_8", points: [{ x: 250, y: 240 }, { x: 460, y: 240 }, { x: 460, y: 332 }, { x: 250, y: 332 }] },
    { zoneId: "cell_9", points: [{ x: 480, y: 240 }, { x: 690, y: 240 }, { x: 690, y: 332 }, { x: 480, y: 332 }] },
  ],
  assetSlots: [
    { id: "slot_crew", type: "crew", x: 44, y: 332 },
    { id: "slot_water", type: "water", x: 120, y: 332 },
    { id: "slot_firebreak", type: "firebreak", x: 196, y: 332 },
    { id: "slot_roadblock", type: "roadblock", x: 272, y: 332 },
  ],
  dragTargets: [
    { zoneId: "cell_2", accepts: ["crew", "water", "firebreak", "roadblock"], x: 356, y: 66, radius: 50 },
    { zoneId: "cell_4", accepts: ["crew", "water", "firebreak", "roadblock"], x: 126, y: 176, radius: 50 },
    { zoneId: "cell_9", accepts: ["crew", "water", "firebreak", "roadblock"], x: 586, y: 286, radius: 50 },
  ],
  terrainLayers: [
    { id: "grass", material: "grassland", polygons: [[{ x: 10, y: 10 }, { x: 700, y: 10 }, { x: 700, y: 350 }, { x: 10, y: 350 }]], tint: "#4b8a45", elevation: 0.2 },
  ],
  roadGraph: [
    { id: "road1", points: [{ x: 20, y: 176 }, { x: 690, y: 176 }], width: 8 },
    { id: "road2", points: [{ x: 356, y: 20 }, { x: 356, y: 332 }], width: 7 },
  ],
  riverPaths: [{ id: "river1", points: [{ x: 10, y: 300 }, { x: 200, y: 280 }, { x: 430, y: 304 }, { x: 700, y: 286 }], width: 22 }],
  landmarkSprites: [
    { id: "landmark1", kind: "hospital", x: 82, y: 60, scale: 0.9, assetId: "map-landmark-0" },
    { id: "landmark2", kind: "station", x: 522, y: 264, scale: 0.9, assetId: "map-landmark-1" },
  ],
  treeClusters: [
    { id: "trees1", x: 124, y: 92, radius: 24, density: 0.8 },
    { id: "trees2", x: 604, y: 148, radius: 20, density: 0.6 },
  ],
  fireFrontContours: [
    { id: "contour_cell_2", points: [{ x: 310, y: 46 }, { x: 342, y: 36 }, { x: 380, y: 54 }, { x: 360, y: 86 }, { x: 326, y: 82 }, { x: 310, y: 46 }], intensity: 0.65, phase: 0.3 },
    { id: "contour_cell_4", points: [{ x: 86, y: 156 }, { x: 126, y: 138 }, { x: 164, y: 170 }, { x: 134, y: 196 }, { x: 90, y: 180 }, { x: 86, y: 156 }], intensity: 0.55, phase: 0.9 },
  ],
  windField: [
    { x: 80, y: 80, dx: 0.7, dy: 0, strength: 0.7 },
    { x: 240, y: 120, dx: 0.7, dy: 0.1, strength: 0.65 },
    { x: 420, y: 220, dx: 0.7, dy: -0.1, strength: 0.72 },
    { x: 620, y: 300, dx: 0.65, dy: 0.05, strength: 0.68 },
  ],
  toolDropZones: [
    { id: "drop_crew_cell_2", zoneId: "cell_2", tool: "crew", x: 320, y: 36, radius: 14 },
    { id: "drop_water_cell_2", zoneId: "cell_2", tool: "water", x: 392, y: 36, radius: 14 },
    { id: "drop_firebreak_cell_2", zoneId: "cell_2", tool: "firebreak", x: 320, y: 96, radius: 14 },
    { id: "drop_roadblock_cell_2", zoneId: "cell_2", tool: "roadblock", x: 392, y: 96, radius: 14 },
  ],
  windVector: { dx: 0.7, dy: 0.02 },
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
