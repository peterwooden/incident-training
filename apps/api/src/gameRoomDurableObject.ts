import { DurableObject } from "cloudflare:workers";
import type {
  ActionRequest,
  AssignRoleRequest,
  CreateRoomRequest,
  DebriefEvent,
  DebriefMetrics,
  GameEventEnvelope,
  IncidentRole,
  JoinRoomRequest,
  Player,
  PlayerAction,
  RoomState,
  RoomView,
  WidgetId,
  SetGmSimulatedRoleRequest,
  SetWidgetAccessRequest,
  SetWidgetLockRequest,
  StartGameRequest,
} from "@incident/shared";
import { ROOM_SCHEMA_VERSION } from "@incident/shared";
import { createId, createSecret } from "./domain/ids";
import { createSeededRandom, hashToSeed, snapshotCursor } from "./domain/rng";
import { isRoleAllowed, requiredRolesForMode, rolesForMode } from "./domain/roles";
import { getModeEngine } from "./engine/registry";
import type { ModeMutation } from "./engine/types";
import { newTimelineEvent } from "./engine/helpers";
import { json, parseJson } from "./infra/json";
import { createSseResponse, sendSseComment, sendSseEvent } from "./infra/sse";

const ROOM_STORAGE_KEY = "room-state";
const ALARM_INTERVAL_MS = 15_000;
const SUPPORTED_MODES = new Set(["bomb-defusal", "bushfire-command"]);
const BUSHFIRE_TOTAL_DURATION_SEC = 13 * 60;
const BUSHFIRE_PHASE_ORDER = [
  "phase_1_monitor",
  "phase_2_escalation",
  "phase_3_crisis",
  "phase_4_catastrophe",
  "terminal_failed",
] as const;
const BUSHFIRE_PHASE_INDEX: Record<(typeof BUSHFIRE_PHASE_ORDER)[number], number> = {
  phase_1_monitor: 0,
  phase_2_escalation: 1,
  phase_3_crisis: 2,
  phase_4_catastrophe: 3,
  terminal_failed: 4,
};
const BUSHFIRE_PHASE_START_SEC: Record<(typeof BUSHFIRE_PHASE_ORDER)[number], number> = {
  phase_1_monitor: 0,
  phase_2_escalation: 180,
  phase_3_crisis: 420,
  phase_4_catastrophe: 660,
  terminal_failed: 780,
};

interface ClientConnection {
  connectionId: string;
  playerId: string;
  writer: WritableStreamDefaultWriter<Uint8Array>;
  heartbeat: number;
}

function hasValidStateShape(stored: unknown): stored is RoomState {
  if (!stored || typeof stored !== "object") {
    return false;
  }

  const candidate = stored as Partial<RoomState>;
  return (
    candidate.schemaVersion === ROOM_SCHEMA_VERSION &&
    typeof candidate.mode === "string" &&
    SUPPORTED_MODES.has(candidate.mode) &&
    Boolean(candidate.scenario) &&
    Boolean(candidate.widgetState) &&
    Boolean(candidate.debriefLog)
  );
}

export class GameRoomDurableObject extends DurableObject {
  private roomState?: RoomState;
  private readonly clients = new Map<string, ClientConnection>();
  private readonly initialized: Promise<void>;

  constructor(ctx: DurableObjectState, env: any) {
    super(ctx, env);
    this.initialized = this.ctx.blockConcurrencyWhile(async () => {
      const stored = await this.ctx.storage.get(ROOM_STORAGE_KEY);
      if (!hasValidStateShape(stored)) {
        if (stored) {
          await this.ctx.storage.delete(ROOM_STORAGE_KEY);
        }
        this.roomState = undefined;
        return;
      }
      this.roomState = stored;
    });
  }

  async fetch(request: Request): Promise<Response> {
    await this.ensureLoaded();

    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "POST" && path === "/init") return this.handleInit(request);
    if (request.method === "POST" && path === "/join") return this.handleJoin(request);
    if (request.method === "POST" && path === "/start") return this.handleStart(request);
    if (request.method === "POST" && path === "/action") return this.handleAction(request);
    if (request.method === "POST" && path === "/assign-role") return this.handleAssignRole(request);
    if (request.method === "POST" && path === "/widget-access") return this.handleWidgetAccess(request);
    if (request.method === "POST" && path === "/widget-lock") return this.handleWidgetLock(request);
    if (request.method === "POST" && path === "/simulate-role") return this.handleSimulateRole(request);
    if (request.method === "GET" && path === "/state") return this.handleState(request);
    if (request.method === "GET" && path === "/events") return this.handleEvents(request);

    return json({ error: "Not found" }, 404);
  }

  async alarm(): Promise<void> {
    if (!this.roomState || this.roomState.status !== "running") {
      return;
    }

    const now = Date.now();
    const engine = getModeEngine(this.roomState.mode);
    this.applyMutation(engine.onTick(this.roomState, now), now);
    this.addDebriefEvent({
      type: "tick",
      message: "Simulation tick executed.",
      atEpochMs: now,
    });

    if (this.roomState.pressure >= 100) {
      this.roomState.status = "failed";
      this.roomState.endedAtEpochMs = now;
      this.roomState.timeline.push(newTimelineEvent("inject", "Team stress exceeded threshold.", now));
      this.addDebriefEvent({
        type: "system",
        message: "Scenario failed due to pressure threshold.",
        atEpochMs: now,
      });
    }

    await this.persist();
    await this.broadcastSnapshot();

    if (this.roomState.status === "running") {
      await this.ctx.storage.setAlarm(now + ALARM_INTERVAL_MS);
    }
  }

  private async ensureLoaded(): Promise<void> {
    await this.initialized;
  }

  private buildInitialAccessForWidget(player: Player, state: RoomState): WidgetId[] {
    const engine = getModeEngine(state.mode);
    return engine.getDefaultWidgetAccessTemplate(player.role);
  }

  private async handleInit(request: Request): Promise<Response> {
    if (this.roomState) {
      return json({ error: "Room is already initialized" }, 409);
    }

    const body = await parseJson<CreateRoomRequest>(request);
    const now = Date.now();
    const roomCode = request.headers.get("x-room-code") ?? "unknown";

    const gm: Player = {
      id: createId("player"),
      name: body.gmName,
      role: "Observer",
      isGameMaster: true,
    };

    const seed = hashToSeed(`${roomCode}:${now}:${crypto.randomUUID()}`);
    const rng = createSeededRandom(seed, 0);
    const engine = getModeEngine(body.mode);

    this.roomState = {
      schemaVersion: ROOM_SCHEMA_VERSION,
      roomCode,
      mode: body.mode,
      status: "lobby",
      createdAtEpochMs: now,
      pressure: 12,
      score: 0,
      players: [gm],
      objectives: engine.initObjectives(rng),
      timeline: [newTimelineEvent("system", "Room created by game master", now, gm.id)],
      publicSummary: engine.initSummary(),
      scenario: engine.initScenario(rng),
      widgetState: {
        accessGrants: {
          [gm.id]: engine.getDefaultWidgetAccessTemplate(gm.role),
        },
        widgetLocks: {},
      },
      debriefLog: [],
      seed,
      rngCursor: snapshotCursor(rng),
      gmSecret: createSecret(),
    };

    this.addDebriefEvent({
      type: "system",
      message: "Room initialized.",
      actorPlayerId: gm.id,
      atEpochMs: now,
    });

    await this.persist();

    return json({
      roomCode: this.roomState.roomCode,
      gmPlayerId: gm.id,
      gmSecret: this.roomState.gmSecret,
      state: this.toRoomView(gm.id),
      roleOptions: rolesForMode(this.roomState.mode),
    });
  }

  private pickRole(mode: RoomState["mode"], preferredRole?: JoinRoomRequest["preferredRole"]): JoinRoomRequest["preferredRole"] {
    if (preferredRole && isRoleAllowed(mode, preferredRole)) {
      return preferredRole;
    }
    return "Observer";
  }

  private async handleJoin(request: Request): Promise<Response> {
    if (!this.roomState) return json({ error: "Room is not initialized" }, 404);
    if (this.roomState.status !== "lobby") return json({ error: "Game has already started" }, 409);

    const body = await parseJson<JoinRoomRequest>(request);
    const role = this.pickRole(this.roomState.mode, body.preferredRole);

    const player: Player = {
      id: createId("player"),
      name: body.name,
      role: role ?? "Observer",
      isGameMaster: false,
    };

    this.roomState.players.push(player);
    this.roomState.widgetState.accessGrants[player.id] = this.buildInitialAccessForWidget(player, this.roomState);

    const now = Date.now();
    this.roomState.timeline.push(
      newTimelineEvent("system", `${player.name} joined as ${player.role}`, now, player.id),
    );
    this.addDebriefEvent({
      type: "system",
      message: `${player.name} joined as ${player.role}.`,
      actorPlayerId: player.id,
      atEpochMs: now,
    });

    await this.persist();
    await this.broadcastSnapshot();

    return json({
      playerId: player.id,
      state: this.toRoomView(player.id),
      roleOptions: rolesForMode(this.roomState.mode),
    });
  }

  private ensureGmSecret(secret: string | undefined): boolean {
    return Boolean(this.roomState && secret && secret === this.roomState.gmSecret);
  }

  private missingRequiredRoles(): IncidentRole[] {
    if (!this.roomState) {
      return [];
    }

    const required = requiredRolesForMode(this.roomState.mode);
    const present = new Set(this.roomState.players.filter((player) => !player.isGameMaster).map((player) => player.role));
    return required.filter((role) => !present.has(role));
  }

  private async handleStart(request: Request): Promise<Response> {
    if (!this.roomState) return json({ error: "Room is not initialized" }, 404);

    const body = await parseJson<StartGameRequest>(request);
    if (!this.ensureGmSecret(body.gmSecret)) return json({ error: "Unauthorized" }, 403);
    if (this.roomState.status !== "lobby") return json({ error: "Game already running" }, 409);

    const missingRoles = this.missingRequiredRoles();
    if (missingRoles.length > 0 && !body.forceStart) {
      return json({ error: "Missing required roles", missingRoles }, 409);
    }

    const now = Date.now();
    this.roomState.status = "running";
    this.roomState.startedAtEpochMs = now;
    this.roomState.timeline.push(
      newTimelineEvent("system", "Scenario started. Use Slack for communication.", now),
    );
    this.addDebriefEvent({
      type: "system",
      message: "Scenario started.",
      atEpochMs: now,
    });

    await this.persist();
    await this.ctx.storage.setAlarm(now + ALARM_INTERVAL_MS);
    await this.broadcastSnapshot();

    return json({ state: this.toRoomView() });
  }

  private allowedWidgetsForPlayer(player: Player): WidgetId[] {
    if (!this.roomState) {
      return [];
    }
    if (player.isGameMaster) {
      return getModeEngine(this.roomState.mode).getWidgetDefinitions().map((panel) => panel.id);
    }

    const explicit = this.roomState.widgetState.accessGrants[player.id];
    if (explicit?.length) {
      return explicit;
    }

    return getModeEngine(this.roomState.mode).getDefaultWidgetAccessTemplate(player.role);
  }

  private isWidgetLocked(widgetId: WidgetId): boolean {
    if (!this.roomState) {
      return false;
    }
    return this.roomState.widgetState.widgetLocks[widgetId]?.locked === true;
  }

  private async handleAction(request: Request): Promise<Response> {
    if (!this.roomState) return json({ error: "Room is not initialized" }, 404);
    if (this.roomState.status !== "running") return json({ error: "Game is not running" }, 409);

    const body = await parseJson<ActionRequest>(request);
    const player = this.roomState.players.find((candidate) => candidate.id === body.playerId);
    if (!player) return json({ error: "Invalid player" }, 403);

    const allowedWidgets = this.allowedWidgetsForPlayer(player);
    if (!allowedWidgets.includes(body.widgetId) && !player.isGameMaster) {
      return json({ error: "Widget access denied", widgetId: body.widgetId }, 403);
    }

    if (this.isWidgetLocked(body.widgetId)) {
      return json({ error: "Widget is locked", widgetId: body.widgetId }, 409);
    }

    const engine = getModeEngine(this.roomState.mode);
    const expectedWidget = engine.getWidgetForAction(body.actionType);
    if (expectedWidget && expectedWidget !== body.widgetId && !player.isGameMaster) {
      return json({ error: "Action does not belong to provided widget", expectedWidget }, 409);
    }

    const action: PlayerAction = {
      type: body.actionType,
      playerId: body.playerId,
      widgetId: body.widgetId,
      payload: body.payload,
    };

    const now = Date.now();
    if (action.type === "gm_fsm_transition") {
      if (!player.isGameMaster) {
        return json({ error: "Only game master can edit FSM state" }, 403);
      }
      const transitionId = String(action.payload?.transitionId ?? "");
      const applied = this.applyGmFsmTransition(transitionId, now);
      if (!applied) {
        return json({ error: "Invalid FSM transition payload", transitionId }, 409);
      }
    } else if (action.type === "gm_release_prompt" && !player.isGameMaster) {
      return json({ error: "Only game master can release prompts" }, 403);
    } else if (action.type === "bushfire_submit_status_update") {
      if (player.role !== "Public Information Officer") {
        return json({ error: "Only radio host can publish status feed updates" }, 403);
      }
      this.applyMutation(engine.onAction(this.roomState, action, now), now);
    } else {
      this.applyMutation(engine.onAction(this.roomState, action, now), now);
    }

    this.addDebriefEvent({
      type: "action",
      message: `${player.name} -> ${action.type}`,
      actorPlayerId: player.id,
      widgetId: action.widgetId,
      atEpochMs: now,
    });

    const statusAfterAction = (this.roomState as RoomState).status;
    if (statusAfterAction === "resolved") {
      this.roomState.endedAtEpochMs = now;
      this.roomState.timeline.push(newTimelineEvent("system", "Scenario resolved successfully.", now));
    }

    if (this.roomState.pressure >= 100 && statusAfterAction === "running") {
      this.roomState.status = "failed";
      this.roomState.endedAtEpochMs = now;
      this.roomState.timeline.push(
        newTimelineEvent("inject", "Command discipline collapsed under pressure.", now),
      );
      this.addDebriefEvent({
        type: "system",
        message: "Scenario failed from pressure saturation.",
        atEpochMs: now,
      });
    }

    if (this.roomState.status === "failed") {
      this.roomState.endedAtEpochMs = now;
    }

    await this.persist();
    await this.broadcastSnapshot();

    return json({ state: this.toRoomView(body.playerId) });
  }

  private applyGmFsmTransition(transitionId: string, now: number): boolean {
    if (!this.roomState || !transitionId.includes(":")) {
      return false;
    }

    const [kind, targetRaw] = transitionId.split(":");
    const target = targetRaw?.trim();
    if (!target) {
      return false;
    }

    if (kind === "room-status") {
      if (target !== "lobby" && target !== "running" && target !== "resolved" && target !== "failed") {
        return false;
      }
      this.roomState.status = target;
      if (target === "running" && !this.roomState.startedAtEpochMs) {
        this.roomState.startedAtEpochMs = now;
      }
      if (target === "resolved" || target === "failed") {
        this.roomState.endedAtEpochMs = now;
      } else {
        this.roomState.endedAtEpochMs = undefined;
      }
      this.roomState.timeline.push(newTimelineEvent("system", `GM FSM set room status -> ${target}`, now));
      return true;
    }

    if (this.roomState.scenario.type === "bomb-defusal") {
      const scenario = this.roomState.scenario;
      if (kind === "bomb-status") {
        if (target !== "armed" && target !== "defused" && target !== "exploded") {
          return false;
        }
        scenario.status = target;
        if (target === "defused") {
          this.roomState.status = "resolved";
          this.roomState.endedAtEpochMs = now;
        }
        if (target === "exploded") {
          this.roomState.status = "failed";
          this.roomState.endedAtEpochMs = now;
        }
        this.roomState.timeline.push(newTimelineEvent("system", `GM FSM set bomb status -> ${target}`, now));
        return true;
      }
      if (kind === "bomb-stage") {
        if (target !== "wires" && target !== "symbols" && target !== "memory") {
          return false;
        }
        const index = scenario.moduleQueue.findIndex((stageId) => stageId === target);
        if (index < 0) {
          return false;
        }
        scenario.stageId = target;
        scenario.stageIndex = index;
        scenario.stageStatus = "active";
        scenario.intermissionUntilEpochMs = undefined;
        scenario.stageTimerSec = target === "wires" ? 190 : target === "symbols" ? 170 : 150;
        this.roomState.timeline.push(newTimelineEvent("system", `GM FSM switched bomb stage -> ${target}`, now));
        return true;
      }
    }

    if (this.roomState.scenario.type === "bushfire-command") {
      const scenario = this.roomState.scenario;
      const setPhase = (phaseId: (typeof BUSHFIRE_PHASE_ORDER)[number]): void => {
        scenario.phaseId = phaseId;
        scenario.phaseIndex = BUSHFIRE_PHASE_INDEX[phaseId];
        scenario.phaseStartedAtEpochMs = now;
        scenario.elapsedSec = BUSHFIRE_PHASE_START_SEC[phaseId];
        scenario.timerSec = Math.max(0, BUSHFIRE_TOTAL_DURATION_SEC - scenario.elapsedSec);
      };

      if (kind === "bushfire-phase") {
        if (
          target !== "phase_1_monitor" &&
          target !== "phase_2_escalation" &&
          target !== "phase_3_crisis" &&
          target !== "phase_4_catastrophe"
        ) {
          return false;
        }
        setPhase(target);
        if (this.roomState.status === "failed") {
          this.roomState.status = "running";
          this.roomState.endedAtEpochMs = undefined;
        }
        this.roomState.timeline.push(newTimelineEvent("system", `GM FSM set bushfire phase -> ${target}`, now));
        return true;
      }

      if (kind === "bushfire-state") {
        if (target !== "terminal_failed") {
          return false;
        }
        setPhase("terminal_failed");
        scenario.distanceToTownMeters = 0;
        scenario.smokeDensity = 100;
        scenario.containment = Math.min(scenario.containment, 8);
        scenario.publicAnxiety = Math.max(scenario.publicAnxiety, 95);
        this.roomState.status = "failed";
        this.roomState.endedAtEpochMs = now;
        this.roomState.timeline.push(newTimelineEvent("system", "GM FSM triggered bushfire terminal failure", now));
        return true;
      }
    }

    return false;
  }

  private async handleAssignRole(request: Request): Promise<Response> {
    if (!this.roomState) return json({ error: "Room is not initialized" }, 404);
    if (this.roomState.status !== "lobby") return json({ error: "Role assignment closed after start" }, 409);

    const body = await parseJson<AssignRoleRequest>(request);
    if (!this.ensureGmSecret(body.gmSecret)) return json({ error: "Unauthorized" }, 403);
    if (!isRoleAllowed(this.roomState.mode, body.role)) return json({ error: "Role not allowed for mode" }, 409);

    const player = this.roomState.players.find((candidate) => candidate.id === body.playerId);
    if (!player) return json({ error: "Unknown player" }, 404);

    player.role = body.role;
    const engine = getModeEngine(this.roomState.mode);
    this.roomState.widgetState.accessGrants[player.id] = engine.getDefaultWidgetAccessTemplate(player.role);

    const now = Date.now();
    this.roomState.timeline.push(newTimelineEvent("system", `${player.name} assigned role ${player.role}`, now));
    this.addDebriefEvent({
      type: "role_assign",
      message: `Role set: ${player.name} -> ${player.role}`,
      actorPlayerId: player.id,
      atEpochMs: now,
    });

    await this.persist();
    await this.broadcastSnapshot();

    return json({ state: this.toRoomView() });
  }

  private async handleWidgetAccess(request: Request): Promise<Response> {
    if (!this.roomState) return json({ error: "Room is not initialized" }, 404);

    const body = await parseJson<SetWidgetAccessRequest>(request);
    if (!this.ensureGmSecret(body.gmSecret)) return json({ error: "Unauthorized" }, 403);

    const player = this.roomState.players.find((candidate) => candidate.id === body.playerId);
    if (!player) return json({ error: "Unknown player" }, 404);

    const existing = new Set(this.roomState.widgetState.accessGrants[player.id] ?? []);
    if (body.granted) {
      existing.add(body.widgetId);
    } else {
      existing.delete(body.widgetId);
    }
    this.roomState.widgetState.accessGrants[player.id] = [...existing];

    const now = Date.now();
    this.addDebriefEvent({
      type: "widget_access",
      message: `${body.granted ? "Granted" : "Revoked"} ${body.widgetId} for ${player.name}.`,
      actorPlayerId: player.id,
      widgetId: body.widgetId,
      atEpochMs: now,
    });

    await this.persist();
    await this.broadcastSnapshot();
    return json({ state: this.toRoomView() });
  }

  private async handleWidgetLock(request: Request): Promise<Response> {
    if (!this.roomState) return json({ error: "Room is not initialized" }, 404);

    const body = await parseJson<SetWidgetLockRequest>(request);
    if (!this.ensureGmSecret(body.gmSecret)) return json({ error: "Unauthorized" }, 403);

    this.roomState.widgetState.widgetLocks[body.widgetId] = {
      locked: body.locked,
      reason: body.reason,
      atEpochMs: Date.now(),
    };

    const now = Date.now();
    this.addDebriefEvent({
      type: "widget_lock",
      message: `${body.locked ? "Locked" : "Unlocked"} widget ${body.widgetId}.`,
      widgetId: body.widgetId,
      atEpochMs: now,
    });

    await this.persist();
    await this.broadcastSnapshot();
    return json({ state: this.toRoomView() });
  }

  private async handleSimulateRole(request: Request): Promise<Response> {
    if (!this.roomState) return json({ error: "Room is not initialized" }, 404);

    const body = await parseJson<SetGmSimulatedRoleRequest>(request);
    if (!this.ensureGmSecret(body.gmSecret)) return json({ error: "Unauthorized" }, 403);

    if (body.role && !isRoleAllowed(this.roomState.mode, body.role)) {
      return json({ error: "Role not allowed for this mode" }, 409);
    }

    this.roomState.widgetState.gmSimulatedRole = body.role;

    await this.persist();
    await this.broadcastSnapshot();
    return json({ state: this.toRoomView() });
  }

  private handleState(request: Request): Response {
    if (!this.roomState) return json({ error: "Room is not initialized" }, 404);

    const playerId = new URL(request.url).searchParams.get("playerId") ?? undefined;
    return json({ state: this.toRoomView(playerId) });
  }

  private handleEvents(request: Request): Response {
    if (!this.roomState) return json({ error: "Room is not initialized" }, 404);

    const playerId = new URL(request.url).searchParams.get("playerId") ?? createId("anon");
    const connectionId = createId("conn");

    return createSseResponse((writer, abortSignal) => {
      const heartbeat = setInterval(() => {
        void sendSseComment(writer, "heartbeat");
      }, 12_000);

      this.clients.set(connectionId, { connectionId, playerId, writer, heartbeat: heartbeat as unknown as number });
      void sendSseEvent(writer, { type: "snapshot", state: this.toRoomView(playerId) });

      abortSignal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        this.clients.delete(connectionId);
      });
    });
  }

  private applyMutation(mutation: ModeMutation, now: number): void {
    if (!this.roomState) return;

    if (mutation.pressureDelta !== undefined) {
      this.roomState.pressure = Math.max(0, Math.min(100, this.roomState.pressure + mutation.pressureDelta));
    }
    if (mutation.scoreDelta !== undefined) {
      this.roomState.score = Math.max(0, this.roomState.score + mutation.scoreDelta);
    }
    if (mutation.summary) {
      this.roomState.publicSummary = mutation.summary;
    }
    if (mutation.markObjectiveIdsComplete?.length) {
      const markSet = new Set(mutation.markObjectiveIdsComplete);
      this.roomState.objectives = this.roomState.objectives.map((objective) =>
        markSet.has(objective.id) ? { ...objective, completed: true } : objective,
      );
    }
    if (mutation.timelineAdds?.length) {
      this.roomState.timeline.push(...mutation.timelineAdds);
    }
    if (mutation.replaceScenario) {
      this.roomState.scenario = mutation.replaceScenario;
    }
    if (mutation.status) {
      this.roomState.status = mutation.status;
      if (mutation.status === "resolved" || mutation.status === "failed") {
        this.roomState.endedAtEpochMs = now;
      }
    }
    if (mutation.debriefAdds?.length) {
      this.roomState.debriefLog.push(...mutation.debriefAdds);
    }
  }

  private computeDebriefMetrics(): DebriefMetrics {
    if (!this.roomState) {
      return { executionAccuracy: 0, timingDiscipline: 0, communicationDiscipline: 0, overall: 0 };
    }

    const actionEvents = this.roomState.debriefLog.filter((event) => event.type === "action").length;
    const injectEvents = this.roomState.timeline.filter((event) => event.kind === "inject").length;
    const completedObjectives = this.roomState.objectives.filter((objective) => objective.completed).length;

    const executionAccuracy = Math.max(
      0,
      Math.min(100, Math.round((completedObjectives / Math.max(1, this.roomState.objectives.length)) * 100)),
    );

    const scenarioTimer = this.roomState.scenario.type === "bomb-defusal"
      ? this.roomState.scenario.timerSec
      : this.roomState.scenario.timerSec;
    const timingDiscipline = Math.max(0, Math.min(100, Math.round(scenarioTimer / 6)));

    const communicationDiscipline = Math.max(
      0,
      Math.min(100, Math.round(75 + actionEvents * 2 - injectEvents * 10 - this.roomState.pressure / 2)),
    );

    const overall = Math.round((executionAccuracy + timingDiscipline + communicationDiscipline) / 3);

    return {
      executionAccuracy,
      timingDiscipline,
      communicationDiscipline,
      overall,
    };
  }

  private toRoomView(playerId?: string): RoomView {
    if (!this.roomState) {
      throw new Error("Room not initialized");
    }

    const player = this.roomState.players.find((candidate) => candidate.id === playerId);
    const roleOptions = rolesForMode(this.roomState.mode);
    const effectiveRole = player?.isGameMaster
      ? this.roomState.widgetState.gmSimulatedRole ?? player.role
      : player?.role ?? "Observer";

    const engine = getModeEngine(this.roomState.mode);
    const widgetDeck = engine.buildWidgetDeck({
      state: this.roomState,
      viewer: player,
      effectiveRole,
      widgetState: this.roomState.widgetState,
      roleOptions,
      debriefMetrics: this.computeDebriefMetrics(),
    });

    const debriefEvents = player?.isGameMaster || this.roomState.status !== "running"
      ? this.roomState.debriefLog
      : [];

    return {
      roomCode: this.roomState.roomCode,
      mode: this.roomState.mode,
      status: this.roomState.status,
      createdAtEpochMs: this.roomState.createdAtEpochMs,
      startedAtEpochMs: this.roomState.startedAtEpochMs,
      endedAtEpochMs: this.roomState.endedAtEpochMs,
      pressure: this.roomState.pressure,
      score: this.roomState.score,
      players: this.roomState.players,
      objectives: this.roomState.objectives,
      timeline: this.roomState.timeline,
      publicSummary: this.roomState.publicSummary,
      widgetDeck,
      debrief: {
        events: debriefEvents,
        metrics: this.computeDebriefMetrics(),
      },
      yourPlayerId: playerId,
    };
  }

  private addDebriefEvent(input: {
    type: DebriefEvent["type"];
    message: string;
    atEpochMs: number;
    actorPlayerId?: string;
    widgetId?: WidgetId;
  }): void {
    if (!this.roomState) {
      return;
    }

    this.roomState.debriefLog.push({
      id: createId("debrief"),
      type: input.type,
      message: input.message,
      atEpochMs: input.atEpochMs,
      actorPlayerId: input.actorPlayerId,
      widgetId: input.widgetId,
      score: this.roomState.score,
      pressure: this.roomState.pressure,
    });
  }

  private async broadcastSnapshot(): Promise<void> {
    const failedConnections: string[] = [];

    for (const [connectionId, conn] of this.clients.entries()) {
      const envelope: GameEventEnvelope = {
        type: "snapshot",
        state: this.toRoomView(conn.playerId),
      };

      try {
        await sendSseEvent(conn.writer, envelope);
      } catch {
        failedConnections.push(connectionId);
      }
    }

    for (const connectionId of failedConnections) {
      const conn = this.clients.get(connectionId);
      if (conn) {
        clearInterval(conn.heartbeat);
      }
      this.clients.delete(connectionId);
    }
  }

  private async persist(): Promise<void> {
    if (this.roomState) {
      await this.ctx.storage.put(ROOM_STORAGE_KEY, this.roomState);
    }
  }
}
