import { GameRoomDurableObject } from "./gameRoomDurableObject";
import { handleHttp, type Env } from "./routes/http";

export { GameRoomDurableObject };

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handleHttp(request, env);
  },
} satisfies ExportedHandler<Env>;
