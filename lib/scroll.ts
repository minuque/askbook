/**
 * Where the page scrolls.
 *
 * In the browser that is the document. The desktop shell scrolls a div
 * (.scroll-root, in the root layout) instead, in a box that starts below the
 * window's title bar, so the page's scrollbar is never covered by the window
 * buttons drawn into the top-right corner (see the desktop-win block in
 * globals.css). It is a div rather than the body because Windows paints a
 * native scrollbar on the body, with a track no stylesheet can remove.
 *
 * Everything that reads or moves the page's scroll position goes through here,
 * so both cases behave the same.
 *
 * Browser only: every caller runs in an effect or an event handler, never
 * during a server render.
 */

/** The element the page scrolls in. */
export function scrollRoot(): HTMLElement {
  const html = document.documentElement;
  if (html.classList.contains("desktop-win")) {
    const root = document.querySelector<HTMLElement>(".scroll-root");
    if (root) return root;
  }
  return html;
}

/** How far down the page is scrolled, in px. */
export function scrollY(): number {
  return scrollRoot().scrollTop;
}

/** How much further the page can scroll, in px. */
export function scrollMax(): number {
  const el = scrollRoot();
  return el.scrollHeight - el.clientHeight;
}

/** The visible height of the scroll area, in px. */
export function viewportH(): number {
  return scrollRoot().clientHeight;
}

/** Scroll to an offset, in px. */
export function scrollTo(top: number, behavior: ScrollBehavior = "auto"): void {
  scrollRoot().scrollTo({ top, behavior });
}

/** Move the page by a delta, in px, without animation. */
export function scrollBy(delta: number): void {
  scrollRoot().scrollBy({ top: delta, behavior: "instant" });
}

/** Where an element sits, in scroll-area coordinates: what its bounding rect's top would be at scroll 0. */
export function offsetOf(el: Element): number {
  const root = scrollRoot();
  // The document's own top edge is the viewport's, at any scroll position; a
  // scroll box moves with the page.
  const rootTop = root === document.documentElement ? 0 : root.getBoundingClientRect().top;
  return el.getBoundingClientRect().top + scrollY() - rootTop;
}

/** Run `fn` on every scroll of the page. Returns the unsubscribe. */
export function onScroll(fn: () => void): () => void {
  // A scroll event does not bubble. The document's scroll fires at the document
  // and reaches a window listener; a div's fires on the div and stops there, so
  // the desktop shell's scroll box needs its own listener.
  const root = scrollRoot();
  if (root === document.documentElement) {
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }
  root.addEventListener("scroll", fn, { passive: true });
  return () => root.removeEventListener("scroll", fn);
}
