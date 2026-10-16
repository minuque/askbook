/**
 * Gloss desktop shell. The app is still the Next.js server — this process
 * only owns a window pointed at it, and in production starts that server
 * itself (forked as plain Node, so node:sqlite and wasm work unchanged).
 *
 * Dev: run `npm run dev` first, then `npm run electron:dev` — the window
 * attaches to the server you already have.
 */

const { app, BrowserWindow, ipcMain, shell } = require("electron");
const { fork } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");
const http = require("node:http");

/** Keep the title bar in step with the page's own theme. */
const THEME_CHROME = {
  paper: { bg: "#f6f3ec", fg: "#1d1b18" },
  sepia: { bg: "#f1e6cf", fg: "#33281b" },
  snow: { bg: "#fdfdfc", fg: "#141518" },
  night: { bg: "#151412", fg: "#e9e3d6" },
  ink: { bg: "#0f1319", fg: "#e3e8f0" },
};

const PORT = 3100;
const ORIGIN = `http://localhost:${PORT}`;
const dev = !app.isPackaged;

let server = null;
let quitting = false;

/** The Next.js server, only in a packaged build: `next start` in the app's own directory. */
function startServer() {
  const root = app.getAppPath();
  const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
  server = fork(nextBin, ["start", "-p", String(PORT), "-H", "127.0.0.1"], {
    cwd: root,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      GLOSS_DATA_DIR: app.getPath("userData"),
      PORT: String(PORT),
      HOSTNAME: "127.0.0.1",
    },
    stdio: ["ignore", "inherit", "inherit", "ipc"],
  });
  server.on("exit", (code) => {
    server = null;
    if (!quitting && code) app.exit(code ?? 1);
  });
}

/** One GET to the server: true once it answers. fetch hits a proxy env var here; http does not. */
function probe() {
  return new Promise((resolve) => {
    const req = http.get(ORIGIN, { timeout: 1200 }, (res) => {
      res.resume();
      resolve(res.statusCode < 500);
    });
    req.on("timeout", () => req.destroy());
    req.on("error", () => resolve(false));
  });
}

async function up() {
  return probe();
}

async function waitForServer() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (await up()) return true;
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

function makeWindow() {
  const icon = path.join(__dirname, "icon.png");
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 720,
    minHeight: 480,
    title: "Gloss",
    backgroundColor: "#f6f3ec",
    autoHideMenuBar: true,
    // A toolbar-height strip the page never uses; the system still draws the
    // window controls into it, painted to match the theme.
    ...(process.platform === "win32"
      ? { titleBarStyle: "hidden", titleBarOverlay: { color: "#f6f3ec", symbolColor: "#1d1b18", height: 40 } }
      : {}),
    ...(fs.existsSync(icon) ? { icon } : {}),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // preload needs require('electron')
      spellcheck: false,
    },
  });

  // The window only ever shows this app; anything else goes to the system browser.
  const ours = (url) => url.startsWith(ORIGIN) || url.startsWith("http://127.0.0.1:" + PORT);
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!ours(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (e, url) => {
    if (!ours(url)) {
      e.preventDefault();
      shell.openExternal(url);
    }
  });

  ipcMain.on("gloss:theme", (_e, theme) => {
    const c = THEME_CHROME[theme];
    if (c && !win.isDestroyed()) {
      win.setBackgroundColor(c.bg);
      if (process.platform === "win32") win.setTitleBarOverlay?.({ color: c.bg, symbolColor: c.fg, height: 40 });
    }
  });

  win.loadURL(ORIGIN);
}

app.whenReady().then(async () => {
  if (!(await up())) {
    if (!dev) startServer();
    if (!(await waitForServer())) {
      app.exit(1);
      return;
    }
  }
  makeWindow();
});

app.on("window-all-closed", () => app.quit());
app.on("before-quit", () => {
  quitting = true;
  server?.kill();
});
