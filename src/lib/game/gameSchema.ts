import type { Game } from "@/types/game";
import { PRODUCT_IDS } from "@/types/game";

/**
 * Structural check that a parsed JSON blob actually matches the current
 * multi-product Game shape — guards against stale/incompatible data (e.g.
 * the single-product model this app used before products existed, or any
 * future reshape). There's no version tag on Game (see docs/DATA_MODEL.md's
 * open questions); this checks the one field that's changed shape so far.
 * Shared by both persistence layers: src/lib/game/storage.ts (solo,
 * localStorage) and src/lib/server/gameStore.ts (multiplayer, server-side).
 */
export function isCompatibleGame(value: unknown): value is Game {
  const g = value as Game | null | undefined;
  const products = g?.players?.[0]?.companyStates?.[0]?.products;
  return !!products && PRODUCT_IDS.every((id) => id in products);
}
