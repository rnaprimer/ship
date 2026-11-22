/**
 * Integer camera zoom: 3× on phones, 4× on desktop (PLAN §E). Desktop windows
 * that are too small step down so you still see a useful slice of the ship,
 * and huge screens step up so the view never shows past the map edges.
 */
export function pickZoom(viewW: number, viewH: number, isTouch: boolean, mapW: number, mapH: number): number {
  let zoom = isTouch ? 3 : 4;
  if (!isTouch) {
    while (zoom > 2 && (viewW / zoom < 220 || viewH / zoom < 150)) zoom--;
  }
  const minToFill = Math.ceil(Math.max(viewW / mapW, viewH / mapH));
  return Math.max(zoom, minToFill, 1);
}
