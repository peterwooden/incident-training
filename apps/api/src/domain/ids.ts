const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomPart(length: number): string {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    const idx = Math.floor(Math.random() * ROOM_CODE_CHARS.length);
    out += ROOM_CODE_CHARS[idx];
  }
  return out;
}

export function createRoomCode(): string {
  return `${randomPart(3)}-${randomPart(3)}`;
}

export function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

export function createSecret(): string {
  return crypto.randomUUID();
}
