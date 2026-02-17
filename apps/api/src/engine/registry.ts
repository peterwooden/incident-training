import type { GameMode } from "@incident/shared";
import type { GameModeEngine } from "./types";
import { BombDefusalMode } from "./bombDefusalMode";
import { BushfireCommandMode } from "./bushfireCommandMode";

const ENGINES: Record<GameMode, GameModeEngine> = {
  "bomb-defusal": new BombDefusalMode(),
  "bushfire-command": new BushfireCommandMode(),
};

export function getModeEngine(mode: GameMode): GameModeEngine {
  return ENGINES[mode];
}
