import { createServices } from "../src/application/services";
import { MemoryObjectStore } from "../src/infrastructure/memory-object-store";

/** 固定時刻・連番IDでサービス一式を作る（例ベーステスト用） */
export function setup(nowIso = "2026-10-04T03:00:00Z") {
  const store = new MemoryObjectStore();
  let n = 0;
  let now = new Date(nowIso);
  const services = createServices(store, {
    now: () => now,
    newId: () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`,
  });
  return {
    store,
    services,
    setNow: (iso: string) => {
      now = new Date(iso);
    },
  };
}

export const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
export const GIF = new TextEncoder().encode("GIF89a....");
