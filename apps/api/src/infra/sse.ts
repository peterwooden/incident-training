import type { GameEventEnvelope } from "@incident/shared";

const encoder = new TextEncoder();

export function createSseResponse(
  onOpen: (writer: WritableStreamDefaultWriter<Uint8Array>, abort: AbortSignal) => void,
): Response {
  const stream = new TransformStream<Uint8Array, Uint8Array>();
  const writer = stream.writable.getWriter();
  const abortController = new AbortController();

  onOpen(writer, abortController.signal);

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

export async function sendSseEvent(
  writer: WritableStreamDefaultWriter<Uint8Array>,
  event: GameEventEnvelope,
): Promise<void> {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  await writer.write(encoder.encode(payload));
}

export async function sendSseComment(
  writer: WritableStreamDefaultWriter<Uint8Array>,
  comment: string,
): Promise<void> {
  await writer.write(encoder.encode(`: ${comment}\n\n`));
}
