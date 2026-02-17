import type { PlayerAction, RoomState } from "@incident/shared";
import type { GameModeEngine, ModeMutation } from "./types";
import { newTimelineEvent } from "./helpers";

const REQUIRED_SEQUENCE = [
  "assign_role",
  "acknowledge_incident",
  "publish_update",
  "escalate_vendor",
  "publish_update",
  "declare_resolved",
] as const;

export class CommsCrisisMode implements GameModeEngine {
  initObjectives(): RoomState["objectives"] {
    return REQUIRED_SEQUENCE.map((action, idx) => ({
      id: `comms_obj_${idx + 1}`,
      description: `Execute ${action.replaceAll("_", " ")}`,
      requiredAction: action,
      completed: false,
    }));
  }

  initSummary(): string {
    return "Comms crisis: contradictory internal updates are causing panic. Stabilize message flow.";
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
        scoreDelta: 12,
        pressureDelta: -4,
        markObjectiveIdsComplete: [nextObjective.id],
        summary: "Message alignment improving. Keep a single source of truth.",
        status: isFinal ? "resolved" : undefined,
      };
    }

    const isPublishingTooEarly = action.type === "publish_update";
    return {
      timelineAdds: [
        ...timelineAdds,
        newTimelineEvent(
          "inject",
          isPublishingTooEarly
            ? "Premature public update triggered customer confusion."
            : "Cross-team contradiction detected.",
          now,
        ),
      ],
      pressureDelta: 7,
      scoreDelta: -6,
      summary: "Conflicting information is increasing incident pressure.",
    };
  }

  onTick(state: RoomState, now: number): ModeMutation {
    if (state.status !== "running") {
      return {};
    }

    const elapsedMs = now - (state.startedAtEpochMs ?? now);
    if (elapsedMs > 8 * 60000) {
      return {
        status: "failed",
        pressureDelta: 15,
        timelineAdds: [
          newTimelineEvent("inject", "Leadership escalated due to inconsistent communication.", now),
        ],
        summary: "Scenario failed. Debrief ownership of internal/external comms.",
      };
    }

    if (Math.floor(elapsedMs / 60000) % 3 === 0) {
      return {
        pressureDelta: 2,
        timelineAdds: [
          newTimelineEvent("inject", "Social media rumors are spreading. Clarify status quickly.", now),
        ],
      };
    }

    return { pressureDelta: 1 };
  }
}
