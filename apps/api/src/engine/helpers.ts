import type { TimelineEvent } from "@incident/shared";
import { createId } from "../domain/ids";

export function newTimelineEvent(
  kind: TimelineEvent["kind"],
  message: string,
  atEpochMs: number,
  byPlayerId?: string,
): TimelineEvent {
  return {
    id: createId("ev"),
    kind,
    message,
    atEpochMs,
    byPlayerId,
  };
}
