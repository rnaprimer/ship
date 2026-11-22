import type { SavedPosition } from "@/game/types";

const URL_PATH = "/api/me/position";

/**
 * Sends the player's position to the server. Regular saves use fetch with
 * keepalive; the final save as the page goes away uses sendBeacon, which the
 * browser delivers even after unload. Failures are ignored: the server keeps
 * the last good position and validates every save.
 */
export function sendPosition(position: SavedPosition, final: boolean): void {
  const body = JSON.stringify({
    mapId: position.mapId,
    mapVersion: position.mapVersion,
    x: position.x,
    y: position.y,
    direction: position.direction,
  });
  if (final && typeof navigator.sendBeacon === "function") {
    if (navigator.sendBeacon(URL_PATH, new Blob([body], { type: "application/json" }))) return;
  }
  fetch(URL_PATH, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(
    () => {},
  );
}
