import bombScratches from "./bomb/scratches.svg";
import mapLandmarks from "./map/landmarks.svg";
import mapTreeSprite from "./map/tree-sprite.svg";
import mapWaterMask from "./map/water-mask.svg";
import paperNormal from "./textures/paper-normal.png";
import metalGrain from "./textures/metal-grain.png";
import smokeNoise from "./textures/smoke-noise.png";
import generatedBombChassisHero from "./generated/bomb-chassis-hero.png";
import generatedBombPcbOverlay from "./generated/bomb-pcb-overlay.png";
import generatedBushfireTownBase from "./generated/bushfire-town-base-v2.png";
import generatedManualDeskBg from "./generated/manual-desk-bg.png";

export const visualAssetManifest = {
  "bomb-chassis-normal": generatedBombChassisHero,
  "bomb-pcb-motif": generatedBombPcbOverlay,
  "bomb-scratches": bombScratches,
  "map-terrain-base": generatedBushfireTownBase,
  "firefront-monitor-low": generatedBushfireTownBase,
  "firefront-monitor-med": generatedBushfireTownBase,
  "firefront-monitor-high": generatedBushfireTownBase,
  "firefront-escalation-low": generatedBushfireTownBase,
  "firefront-escalation-med": generatedBushfireTownBase,
  "firefront-escalation-high": generatedBushfireTownBase,
  "firefront-crisis-low": generatedBushfireTownBase,
  "firefront-crisis-med": generatedBushfireTownBase,
  "firefront-crisis-high": generatedBushfireTownBase,
  "firefront-catastrophe-low": generatedBushfireTownBase,
  "firefront-catastrophe-med": generatedBushfireTownBase,
  "firefront-catastrophe-high": generatedBushfireTownBase,
  "firefront-terminal-high": generatedBushfireTownBase,
  "firefront-overlay-phase_1_monitor": generatedBushfireTownBase,
  "firefront-overlay-phase_2_escalation": generatedBushfireTownBase,
  "firefront-overlay-phase_3_crisis": generatedBushfireTownBase,
  "firefront-overlay-phase_4_catastrophe": generatedBushfireTownBase,
  "firefront-overlay-terminal_failed": generatedBushfireTownBase,
  "map-landmarks-sheet": mapLandmarks,
  "map-tree-sprite": mapTreeSprite,
  "map-water-mask": mapWaterMask,
  "paper-normal": paperNormal,
  "paper-crease": paperNormal,
  "manual-spread-blueprint": generatedManualDeskBg,
  "manual-spread-opsdesk": generatedManualDeskBg,
  "texture-metal-grain": metalGrain,
  "texture-smoke-noise": smokeNoise,
} as const;

export type VisualAssetId = keyof typeof visualAssetManifest;

export function getVisualAsset(assetId: string): string {
  return visualAssetManifest[assetId as VisualAssetId] ?? visualAssetManifest["paper-normal"];
}
