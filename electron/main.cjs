/**
 * askbook desktop shell. The app is still the Next.js server — this process
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

// On this machine Chromium's GPU process fails to launch inside its sandbox
// (error 18, "GPU process isn't usable") and Electron kills the app on the
// spot. `--disable-gpu-sandbox` lifts just that one process out of the
// sandbox so it can start and use the real GPU for compositing; the renderer
// and network sandboxes stay on. `enable-unsafe-swiftshader` keeps a
// software rasteriser available for the cases a real GPU is absent.
app.commandLine.appendSwitch("disable-gpu-sandbox");
app.commandLine.appendSwitch("enable-unsafe-swiftshader");

let server = null;
let quitting = false;

/** The Next.js standalone server, only in a packaged build. The build emits a
 * self-contained `.next/standalone/` with a compiled `server.js` and just the
 * runtime deps, so we fork it directly instead of `next start`. It's the same
 * production server `next start` runs, minus the CLI wrapper. */
function startServer() {
  const root = app.getAppPath();
  const serverPath = path.join(root, "server.js");
  server = fork(serverPath, {
    cwd: root,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      ASKBOOK_DATA_DIR: app.getPath("userData"),
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
    title: "askbook",
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
      // Chromium calls a window behind another one "hidden" and freezes its
      // animation clock. Books come off the shelf on that clock, so a reader
      // who puts one back while the window is covered would watch it stop
      // mid-flight. This app is one window whose whole job is that motion.
      backgroundThrottling: false,
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

  ipcMain.on("askbook:theme", (_e, theme) => {
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
