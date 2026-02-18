import bombChassis from "./bomb/chassis.svg";
import bombPcbMotif from "./bomb/pcb-motif.svg";
import bombScratches from "./bomb/scratches.svg";
import mapTerrainBase from "./map/terrain-base.svg";
import mapLandmarks from "./map/landmarks.svg";
import mapTreeSprite from "./map/tree-sprite.svg";
import mapWaterMask from "./map/water-mask.svg";
import paperNormal from "./textures/paper-normal.png";
import metalGrain from "./textures/metal-grain.png";
import smokeNoise from "./textures/smoke-noise.png";

export const visualAssetManifest = {
  "bomb-chassis-normal": bombChassis,
  "bomb-pcb-motif": bombPcbMotif,
  "bomb-scratches": bombScratches,
  "map-terrain-base": mapTerrainBase,
  "map-landmarks-sheet": mapLandmarks,
  "map-tree-sprite": mapTreeSprite,
  "map-water-mask": mapWaterMask,
  "paper-normal": paperNormal,
  "paper-crease": paperNormal,
  "manual-spread-blueprint": paperNormal,
  "manual-spread-opsdesk": paperNormal,
  "texture-metal-grain": metalGrain,
  "texture-smoke-noise": smokeNoise,
} as const;

export type VisualAssetId = keyof typeof visualAssetManifest;

export function getVisualAsset(assetId: string): string {
  return visualAssetManifest[assetId as VisualAssetId] ?? visualAssetManifest["paper-normal"];
}
