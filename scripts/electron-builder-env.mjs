// The build tools (electron-builder, @electron/get) read HTTPS_PROXY and
// HTTP_PROXY from the environment, not Windows' system proxy setting. When
// those env vars are unset — e.g. a terminal that does not export them —
// fill them in from the system's proxy so artifact downloads still go through
// it. If the system proxy is off, the script does nothing and the child
// process inherits whatever the shell already has.

import { execSync } from "node:child_process";

if (process.platform === "win32") {
  const hasProxy = [process.env.HTTPS_PROXY, process.env.HTTP_PROXY].some(
    (v) => v && v.trim(),
  );
  if (!hasProxy) {
    try {
      const out = execSync(
        "powershell -NoProfile -Command \"Get-ItemProperty 'HKCU:\\\\Software\\\\Microsoft\\\\Windows\\\\CurrentVersion\\\\Internet Settings' | Select-Object -ExpandProperty ProxyServer\"",
        { encoding: "utf8" },
      ).trim();
      const proxy = out
        ? out.startsWith("http")
          ? out
          : `http://${out}`
        : null;
      if (proxy) {
        process.env.HTTPS_PROXY ??= proxy;
        process.env.HTTP_PROXY ??= proxy;
      }
    } catch {
      // No system proxy configured, or PowerShell not found — leave as is.
    }
  }
}
