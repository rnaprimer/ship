/**
 * Integer camera zoom: 2× on phones, 3× on desktop (Milestone 7: the ship is
 * now much larger than the characters, so the view shows more of it). Desktop windows
 * that are too small step down so you still see a useful slice of the ship,
 * and huge screens step up so the view never shows past the map edges
 * (open decks only: interiors are centred instead).
 */
export function pickZoom(viewW: number, viewH: number, isTouch: boolean, mapW: number, mapH: number, fill = true): number {
  let zoom = isTouch ? 2 : 3;
  if (!isTouch) {
    while (zoom > 2 && (viewW / zoom < 220 || viewH / zoom < 150)) zoom--;
  }
  // Interiors (fill = false) may sit centred in the window instead.
  if (!fill) return zoom;
  const minToFill = Math.ceil(Math.max(viewW / mapW, viewH / mapH));
  return Math.max(zoom, minToFill, 1);
}
