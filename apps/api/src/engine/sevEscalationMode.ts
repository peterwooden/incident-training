import type { PlayerAction, RoomState } from "@incident/shared";
import type { GameModeEngine, ModeMutation } from "./types";
import { newTimelineEvent } from "./helpers";

const REQUIRED_SEQUENCE = [
  "acknowledge_incident",
  "open_bridge",
  "escalate_vendor",
  "publish_update",
  "stabilize_service",
  "declare_resolved",
] as const;

export class SevEscalationMode implements GameModeEngine {
  initObjectives(): RoomState["objectives"] {
    return REQUIRED_SEQUENCE.map((action, idx) => ({
      id: `obj_${idx + 1}`,
      description: `Complete ${action.replaceAll("_", " ")}`,
      requiredAction: action,
      completed: false,
    }));
  }

  initSummary(): string {
    return "SEV-1: API error rates are climbing. Keep calm, coordinate roles, and sequence the response.";
  }

  onAction(state: RoomState, action: PlayerAction, now: number): ModeMutation {
    const timelineAdds = [
      newTimelineEvent("status", `${action.playerId} performed ${action.type}`, now, action.playerId),
    ];

    const nextObjective = state.objectives.find((obj) => !obj.completed);
    if (!nextObjective) {
      return { timelineAdds };
    }

    if (action.type === nextObjective.requiredAction) {
      const isFinal = nextObjective.requiredAction === "declare_resolved";
      return {
        timelineAdds,
        scoreDelta: 15,
        pressureDelta: -5,
        markObjectiveIdsComplete: [nextObjective.id],
        summary: `Good execution. Next: ${state.objectives.find((obj) => !obj.completed && obj.id !== nextObjective.id)?.description ?? "Wrap up"}.`,
        status: isFinal ? "resolved" : undefined,
      };
    }

    return {
      timelineAdds: [
        ...timelineAdds,
        newTimelineEvent("inject", "Out-of-sequence move increased confusion across teams.", now),
      ],
      pressureDelta: 8,
      scoreDelta: -5,
      summary: "Misalignment detected. Re-center on roles and ordered response steps.",
    };
  }

  onTick(state: RoomState, now: number): ModeMutation {
    if (state.status !== "running") {
      return {};
    }

    const elapsedMs = now - (state.startedAtEpochMs ?? now);
    const elapsedMinutes = Math.floor(elapsedMs / 60000);

    if (elapsedMinutes >= 9 && state.status === "running") {
      return {
        status: "failed",
        pressureDelta: 20,
        timelineAdds: [newTimelineEvent("inject", "Customer impact persisted too long. Incident marked failed.", now)],
        summary: "Timebox exceeded. Debrief on escalation speed and comms discipline.",
      };
    }

    if (elapsedMinutes > 0 && elapsedMinutes % 2 === 0) {
      return {
        pressureDelta: 2,
        timelineAdds: [
          newTimelineEvent("inject", "New customer region now reporting latency spikes.", now),
        ],
      };
    }

    return { pressureDelta: 1 };
  }
}
