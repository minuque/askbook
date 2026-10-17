<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 验证桌面窗口的命中测试

`-webkit-app-region` 的命中测试只在真实 Electron 窗口上验证。渲染进程的合成点击（Playwright、CDP `Input.dispatchMouseEvent`）绕过浏览器进程的非客户区命中测试，测不出问题。

不要用用户正在使用的窗口。另起一个离屏实例，不抢焦点，不动鼠标：

- 窗口建在屏幕外：`x: -3000, y: -3000, width: 1280, height: 800, show: true`。用同一份 `electron/preload.cjs`，加载 dev server 上的真实 URL。
- 查命中结果用 `WM_NCHITTEST` 被动查询：`SendMessage(hwnd, 0x0084, 0, MAKELPARAM(x, y))`。`x, y` 是目标点的屏幕物理像素，由客户端原点（`ClientToScreen`）加 CSS 坐标乘 DPR 得到。`HTCLIENT` 表示页面收得到这个点击，`HTCAPTION` 表示窗口把它当标题栏，点击变成拖窗口。
- 先确认命中的是目标窗口：取 `WindowFromPoint` 的根窗口 PID。多个实例叠在一起时，结果可能来自另一个实例。
- 改 CSS 后重新加载页面。离屏窗口不重绘，拖拽区域列表不会自己更新。
- `ELECTRON_DEBUG_DRAGGABLE_REGIONS=1` 加 `--enable-logging=stderr` 会在 stderr 打印区域更新日志：发送的矩形数、命中区的矩形数与边界。只在未打包时生效。

## 拖拽区域

浏览器按树序处理区域清单：drag 矩形取并集，no-drag 矩形取差集。后出现的、压住某个控件的 drag 矩形会盖掉该控件的挖洞，控件就点不动了。所以顶栏内部只让栏本身带 `drag`，栏内任何盒子都不带（继承来的也算）。

`-webkit-app-region: none` 是显式 no-drag，仍然挖洞。要让子树不贡献区域，写 `initial`。
