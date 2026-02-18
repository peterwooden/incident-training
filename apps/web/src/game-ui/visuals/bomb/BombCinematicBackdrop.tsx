import { getVisualAsset } from "../assets/manifest";

interface BombCinematicBackdropProps {
  grimeAmount: number;
  reflectionStrength: number;
}

export function BombCinematicBackdrop({ grimeAmount, reflectionStrength }: BombCinematicBackdropProps) {
  return (
    <>
      <img src={getVisualAsset("bomb-chassis-normal")} className="bomb-cinematic-shell" alt="" aria-hidden="true" />
      <img src={getVisualAsset("bomb-pcb-motif")} className="bomb-cinematic-pcb" alt="" aria-hidden="true" />
      <img
        src={getVisualAsset("bomb-scratches")}
        className="bomb-cinematic-scratches"
        alt=""
        aria-hidden="true"
        style={{ opacity: Math.max(0.08, Math.min(0.55, grimeAmount)) }}
      />
      <div
        className="bomb-cinematic-reflection"
        aria-hidden="true"
        style={{ opacity: Math.max(0.1, Math.min(0.8, reflectionStrength)) }}
      />
    </>
  );
}
