/**
 * The page runs exactly as it does in a browser — no Node access. This only
 * bridges the little the shell needs: a stamp so the UI can tell desktop from
 * web, and a one-way channel for the page to report its theme.
 */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("askbookDesktop", {
  platform: process.platform,
  version: process.env.npm_package_version ?? null,
  /** Called whenever the page's own theme changes; the main process repaints the title bar. */
  setTheme: (theme) => ipcRenderer.send("askbook:theme", theme),
});

// Windows keeps its window controls over the page's top strip; mark the document
// so CSS can move the app's own bar out from under them. macOS gets the same
// stamp for its traffic lights. Stamp now, then again once the element exists,
// so the first paint already carries the desktop layout.
const stamp = () => {
  const el = document.documentElement;
  if (!el) return;
  if (process.platform === "win32") el.classList.add("desktop-win");
  if (process.platform === "darwin") el.classList.add("desktop-mac");
};
stamp();
window.addEventListener("DOMContentLoaded", stamp);
