import { DurableObject } from "cloudflare:workers";
import type {
  ActionRequest,
  CreateRoomRequest,
  GameEventEnvelope,
  JoinRoomRequest,
  Player,
  PlayerAction,
  RoomState,
  StartGameRequest,
} from "@incident/shared";
import { createId, createSecret } from "./domain/ids";
import { getModeEngine } from "./engine/registry";
import type { ModeMutation } from "./engine/types";
import { json, parseJson } from "./infra/json";
import { createSseResponse, sendSseComment, sendSseEvent } from "./infra/sse";
import { newTimelineEvent } from "./engine/helpers";

const ROOM_STORAGE_KEY = "room-state";
const ALARM_INTERVAL_MS = 30_000;

interface ClientConnection {
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

    if (request.method === "POST" && path === "/init") {
      return this.handleInit(request);
    }
    if (request.method === "POST" && path === "/join") {
      return this.handleJoin(request);
    }
    if (request.method === "POST" && path === "/start") {
      return this.handleStart(request);
    }
    if (request.method === "POST" && path === "/action") {
      return this.handleAction(request);
    }
    if (request.method === "GET" && path === "/state") {
      return this.handleState();
    }
    if (request.method === "GET" && path === "/events") {
      return this.handleEvents(request);
    }

    return json({ error: "Not found" }, 404);
  }

  async alarm(): Promise<void> {
    if (!this.roomState || this.roomState.status !== "running") {
      return;
    }

    const now = Date.now();
    const engine = getModeEngine(this.roomState.mode);
    this.applyMutation(engine.onTick(this.roomState, now));
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
      role: "IC",
      isGameMaster: true,
    };

    this.roomState = {
      roomCode: request.headers.get("x-room-code") ?? "unknown",
      mode: body.mode,
      status: "lobby",
      createdAtEpochMs: now,
      pressure: 20,
      score: 0,
      players: [gm],
      objectives: getModeEngine(body.mode).initObjectives(now),
      timeline: [newTimelineEvent("system", "Room created by game master", now, gm.id)],
      publicSummary: getModeEngine(body.mode).initSummary(),
      gmSecret: createSecret(),
    };

    await this.persist();

    return json({
      roomCode: this.roomState.roomCode,
      gmPlayerId: gm.id,
      gmSecret: this.roomState.gmSecret,
      state: this.publicState(),
    });
  }

  private async handleJoin(request: Request): Promise<Response> {
    if (!this.roomState) {
      return json({ error: "Room is not initialized" }, 404);
    }
    if (this.roomState.status !== "lobby") {
      return json({ error: "Game has already started" }, 409);
    }

    const body = await parseJson<JoinRoomRequest>(request);
    const player: Player = {
      id: createId("player"),
      name: body.name,
      role: body.preferredRole ?? "Observer",
      isGameMaster: false,
    };

    this.roomState.players.push(player);
    this.roomState.timeline.push(
      newTimelineEvent("system", `${player.name} joined as ${player.role}`, Date.now(), player.id),
    );

    await this.persist();
    await this.broadcastSnapshot();

    return json({ playerId: player.id, state: this.publicState() });
  }

  private async handleStart(request: Request): Promise<Response> {
    if (!this.roomState) {
      return json({ error: "Room is not initialized" }, 404);
    }

    const body = await parseJson<StartGameRequest>(request);
    if (body.gmSecret !== this.roomState.gmSecret) {
      return json({ error: "Unauthorized" }, 403);
    }
    if (this.roomState.status !== "lobby") {
      return json({ error: "Game already running" }, 409);
    }

    const now = Date.now();
    this.roomState.status = "running";
    this.roomState.startedAtEpochMs = now;
    this.roomState.timeline.push(newTimelineEvent("system", "Scenario started", now));

    await this.persist();
    await this.ctx.storage.setAlarm(now + ALARM_INTERVAL_MS);
    await this.broadcastSnapshot();

    return json({ state: this.publicState() });
  }

  private async handleAction(request: Request): Promise<Response> {
    if (!this.roomState) {
      return json({ error: "Room is not initialized" }, 404);
    }
    const currentStatus = this.roomState.status;
    if (currentStatus !== "running") {
      return json({ error: "Game is not running" }, 409);
    }

    const body = await parseJson<ActionRequest>(request);
    const player = this.roomState.players.find((p) => p.id === body.playerId);
    if (!player) {
      return json({ error: "Invalid player" }, 403);
    }

    const action: PlayerAction = {
      type: body.actionType,
      playerId: body.playerId,
      payload: body.payload,
    };

    const now = Date.now();
    const engine = getModeEngine(this.roomState.mode);
    this.applyMutation(engine.onAction(this.roomState, action, now));

    if (this.roomState.pressure >= 100 && this.roomState.status === "running") {
      this.roomState.status = "failed";
      this.roomState.endedAtEpochMs = now;
      this.roomState.timeline.push(
        newTimelineEvent("inject", "Pressure reached 100. Incident control collapsed.", now),
      );
    }
    if (this.roomState.status === "resolved") {
      this.roomState.endedAtEpochMs = now;
      this.roomState.timeline.push(
        newTimelineEvent("system", "Incident resolved successfully.", now),
      );
    }

    await this.persist();
    await this.broadcastSnapshot();

    return json({ state: this.publicState() });
  }

  private handleState(): Response {
    if (!this.roomState) {
      return json({ error: "Room is not initialized" }, 404);
    }

    return json({ state: this.publicState() });
  }

  private handleEvents(request: Request): Response {
    if (!this.roomState) {
      return json({ error: "Room is not initialized" }, 404);
    }

    const playerId = new URL(request.url).searchParams.get("playerId") ?? createId("anon");

    return createSseResponse((writer, abortSignal) => {
      const heartbeat = setInterval(() => {
        void sendSseComment(writer, "heartbeat");
      }, 15_000);

      this.clients.set(playerId, { writer, heartbeat: heartbeat as unknown as number });

      void sendSseEvent(writer, { type: "snapshot", state: this.publicState() });

      abortSignal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        this.clients.delete(playerId);
      });
    });
  }

  private applyMutation(mutation: ModeMutation): void {
    if (!this.roomState) {
      return;
    }

    if (mutation.pressureDelta) {
      this.roomState.pressure = Math.max(0, Math.min(100, this.roomState.pressure + mutation.pressureDelta));
    }
    if (mutation.scoreDelta) {
      this.roomState.score = Math.max(0, this.roomState.score + mutation.scoreDelta);
    }
    if (mutation.summary) {
      this.roomState.publicSummary = mutation.summary;
    }
    if (mutation.markObjectiveIdsComplete?.length) {
      const markSet = new Set(mutation.markObjectiveIdsComplete);
      this.roomState.objectives = this.roomState.objectives.map((obj) =>
        markSet.has(obj.id) ? { ...obj, completed: true } : obj,
      );
    }
    if (mutation.timelineAdds?.length) {
      this.roomState.timeline.push(...mutation.timelineAdds);
    }
    if (mutation.status) {
      this.roomState.status = mutation.status;
      if (mutation.status === "resolved" || mutation.status === "failed") {
        this.roomState.endedAtEpochMs = Date.now();
      }
    }
  }

  private publicState(): RoomState {
    if (!this.roomState) {
      throw new Error("Room not initialized");
    }
    return {
      ...this.roomState,
      gmSecret: "***",
    };
  }

  private async broadcastSnapshot(): Promise<void> {
    const state = this.publicState();
    const envelope: GameEventEnvelope = { type: "snapshot", state };

    const failedClients: string[] = [];
    for (const [playerId, conn] of this.clients.entries()) {
      try {
        await sendSseEvent(conn.writer, envelope);
      } catch {
        failedClients.push(playerId);
      }
    }

    for (const playerId of failedClients) {
      const conn = this.clients.get(playerId);
      if (conn) {
        clearInterval(conn.heartbeat);
      }
      this.clients.delete(playerId);
    }
  }

  private async persist(): Promise<void> {
    if (this.roomState) {
      await this.ctx.storage.put(ROOM_STORAGE_KEY, this.roomState);
    }
  }
}
