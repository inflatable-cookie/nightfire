import type { NightfireBlock, NightfireDraftValue, NightfireValue } from "./types";

export function generateNightfireBlockId(): string {
  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  let timestamp = Date.now();
  for (let index = 5; index >= 0; index -= 1) {
    bytes[index] = timestamp & 0xff;
    timestamp = Math.floor(timestamp / 256);
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x70;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;

  const uuid = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

  return `nf_${uuid}`;
}

export function ensureNightfireBlockId(block: NightfireBlock): NightfireBlock {
  if (typeof block.id === "string" && block.id.trim().length > 0) {
    return block;
  }

  return {
    ...block,
    id: generateNightfireBlockId()
  };
}

export function ensureNightfireBlockIds<T extends NightfireDraftValue | NightfireValue>(value: T): T {
  const blocks = Array.isArray(value.blocks) ? value.blocks : [];
  return {
    ...value,
    blocks: blocks.map((block) => ensureNightfireBlockId(block))
  } as T;
}
