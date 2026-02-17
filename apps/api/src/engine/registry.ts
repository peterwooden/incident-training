import type { GameMode } from "@incident/shared";
import type { GameModeEngine } from "./types";
import { SevEscalationMode } from "./sevEscalationMode";
import { CommsCrisisMode } from "./commsCrisisMode";

const ENGINES: Record<GameMode, GameModeEngine> = {
  "sev-escalation": new SevEscalationMode(),
  "comms-crisis": new CommsCrisisMode(),
};

export function getModeEngine(mode: GameMode): GameModeEngine {
  return ENGINES[mode];
}
