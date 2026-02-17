import { DurableObject } from "cloudflare:workers";
import type {
  ActionRequest,
  CreateRoomRequest,
  GameEventEnvelope,
  JoinRoomRequest,
  Player,
  PlayerAction,
  RoomState,
  RoomView,
  StartGameRequest,
} from "@incident/shared";
import { createId, createSecret } from "./domain/ids";
import { defaultRoleForMode, isRoleAllowed, rolesForMode } from "./domain/roles";
import { getModeEngine } from "./engine/registry";
import type { ModeMutation } from "./engine/types";
import { newTimelineEvent } from "./engine/helpers";
import { json, parseJson } from "./infra/json";
import { createSseResponse, sendSseComment, sendSseEvent } from "./infra/sse";

const ROOM_STORAGE_KEY = "room-state";
const ALARM_INTERVAL_MS = 15_000;

interface ClientConnection {
  playerId: string;
  writer: WritableStreamDefaultWriter<Uint8Array>;
  heartbeat: number;
}

export class GameRoomDurableObject extends DurableObject {
  private roomState?: RoomState;
  private readonly clients = new Map<string, ClientConnection>();
  private readonly initialized: Promise<void>;

  constructor(ctx: DurableObjectState, env: any) {
    super(ctx, env);
    this.initialized = this.ctx.blockConcurrencyWhile(async () => {
      this.roomState = (await this.ctx.storage.get<RoomState>(ROOM_STORAGE_KEY)) ?? undefined;
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

    if (this.roomState.pressure >= 100) {
      this.roomState.status = "failed";
      this.roomState.endedAtEpochMs = now;
      this.roomState.timeline.push(
        newTimelineEvent("inject", "Team stress exceeded limits. Scenario ended.", now),
      );
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

  private async handleInit(request: Request): Promise<Response> {
    if (this.roomState) {
      return json({ error: "Room is already initialized" }, 409);
    }

    const body = await parseJson<CreateRoomRequest>(request);
    const now = Date.now();

    const gm: Player = {
      id: createId("player"),
      name: body.gmName,
      role: defaultRoleForMode(body.mode),
      isGameMaster: true,
    };

    const engine = getModeEngine(body.mode);
    this.roomState = {
      roomCode: request.headers.get("x-room-code") ?? "unknown",
      mode: body.mode,
      status: "lobby",
      createdAtEpochMs: now,
      pressure: 15,
      score: 0,
      players: [gm],
      objectives: engine.initObjectives(),
      timeline: [newTimelineEvent("system", "Room created by game master", now, gm.id)],
      publicSummary: engine.initSummary(),
      scenario: engine.initScenario(),
      gmSecret: createSecret(),
    };

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
    const all = rolesForMode(mode);
    return all.includes("Observer") ? "Observer" : all[0];
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
    this.roomState.timeline.push(
      newTimelineEvent("system", `${player.name} joined as ${player.role}`, Date.now(), player.id),
    );

    await this.persist();
    await this.broadcastSnapshot();

    return json({
      playerId: player.id,
      state: this.toRoomView(player.id),
      roleOptions: rolesForMode(this.roomState.mode),
    });
  }

  private async handleStart(request: Request): Promise<Response> {
    if (!this.roomState) return json({ error: "Room is not initialized" }, 404);

    const body = await parseJson<StartGameRequest>(request);
    if (body.gmSecret !== this.roomState.gmSecret) return json({ error: "Unauthorized" }, 403);
    if (this.roomState.status !== "lobby") return json({ error: "Game already running" }, 409);

    const now = Date.now();
    this.roomState.status = "running";
    this.roomState.startedAtEpochMs = now;
    this.roomState.timeline.push(
      newTimelineEvent("system", "Scenario started. Use Slack for communication.", now),
    );

    await this.persist();
    await this.ctx.storage.setAlarm(now + ALARM_INTERVAL_MS);
    await this.broadcastSnapshot();

    return json({ state: this.toRoomView() });
  }

  private async handleAction(request: Request): Promise<Response> {
    if (!this.roomState) return json({ error: "Room is not initialized" }, 404);
    if (this.roomState.status !== "running") return json({ error: "Game is not running" }, 409);

    const body = await parseJson<ActionRequest>(request);
    const player = this.roomState.players.find((candidate) => candidate.id === body.playerId);
    if (!player) return json({ error: "Invalid player" }, 403);

    const action: PlayerAction = {
      type: body.actionType,
      playerId: body.playerId,
      payload: body.payload,
    };

    const now = Date.now();
    const engine = getModeEngine(this.roomState.mode);
    this.applyMutation(engine.onAction(this.roomState, action, now), now);

    const statusAfterAction = (this.roomState as RoomState).status;

    if (statusAfterAction === "resolved") {
      this.roomState.endedAtEpochMs = now;
      this.roomState.timeline.push(newTimelineEvent("system", "Scenario resolved successfully.", now));
    }

    if (this.roomState.pressure >= 100 && statusAfterAction === "running") {
      this.roomState.status = "failed";
      this.roomState.endedAtEpochMs = now;
      this.roomState.timeline.push(
        newTimelineEvent("inject", "Command breakdown under stress threshold breach.", now),
      );
    }

    if (this.roomState.status === "failed") {
      this.roomState.endedAtEpochMs = now;
    }

    await this.persist();
    await this.broadcastSnapshot();

    return json({ state: this.toRoomView(body.playerId) });
  }

  private handleState(request: Request): Response {
    if (!this.roomState) return json({ error: "Room is not initialized" }, 404);

    const playerId = new URL(request.url).searchParams.get("playerId") ?? undefined;
    return json({ state: this.toRoomView(playerId) });
  }

  private handleEvents(request: Request): Response {
    if (!this.roomState) return json({ error: "Room is not initialized" }, 404);

    const playerId = new URL(request.url).searchParams.get("playerId") ?? createId("anon");

    return createSseResponse((writer, abortSignal) => {
      const heartbeat = setInterval(() => {
        void sendSseComment(writer, "heartbeat");
      }, 12_000);

      this.clients.set(playerId, { playerId, writer, heartbeat: heartbeat as unknown as number });
      void sendSseEvent(writer, { type: "snapshot", state: this.toRoomView(playerId) });

      abortSignal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        this.clients.delete(playerId);
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
  }

  private toRoomView(playerId?: string): RoomView {
    if (!this.roomState) {
      throw new Error("Room not initialized");
    }

    const player = this.roomState.players.find((candidate) => candidate.id === playerId);
    const engine = getModeEngine(this.roomState.mode);

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
      scenario: engine.toScenarioView(this.roomState, player),
      yourPlayerId: playerId,
    };
  }

  private async broadcastSnapshot(): Promise<void> {
    const failedClients: string[] = [];

    for (const [connectionId, conn] of this.clients.entries()) {
      const envelope: GameEventEnvelope = {
        type: "snapshot",
        state: this.toRoomView(conn.playerId),
      };

      try {
        await sendSseEvent(conn.writer, envelope);
      } catch {
        failedClients.push(connectionId);
      }
    }

    for (const connectionId of failedClients) {
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
