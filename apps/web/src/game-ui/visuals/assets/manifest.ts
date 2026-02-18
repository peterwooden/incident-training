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
