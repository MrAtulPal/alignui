import { access, readFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";

export type ServeOptions = {
  reportDir?: string;
  file?: string;
  host?: string;
  port?: number;
  open?: boolean;
};

export type StartedReportServer = {
  host: string;
  port: number;
  url: string;
  close: () => Promise<void>;
};

type ResolvedTargets = {
  rootDir: string;
  entryFile: string;
  entryName: string;
};

async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

function contentTypeFor(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".js") return "text/javascript; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".woff2") return "font/woff2";
  return "application/octet-stream";
}

async function resolveTargets(opts: ServeOptions): Promise<ResolvedTargets> {
  const file = opts.file ? path.resolve(opts.file) : undefined;
  const reportDir = opts.reportDir ? path.resolve(opts.reportDir) : undefined;

  if (file && reportDir) throw new Error("Use either --file or --report-dir, not both.");

  if (file) {
    if (!(await exists(file))) throw new Error(`Report file not found: ${file}`);
    return { rootDir: path.dirname(file), entryFile: file, entryName: path.basename(file) };
  }

  const dir = reportDir ?? path.resolve("report");
  const entryFile = path.join(dir, "index.html");
  if (!(await exists(entryFile))) throw new Error(`Report HTML not found: ${entryFile}`);
  return { rootDir: dir, entryFile, entryName: "index.html" };
}

function safeJoin(rootDir: string, reqPath: string, entryName: string): string | undefined {
  const decoded = decodeURIComponent(reqPath.split("?")[0] || "/");
  const relative = decoded === "/" ? entryName : decoded.replace(/^\/+/, "");
  const full = path.resolve(rootDir, relative);
  const relativeToRoot = path.relative(rootDir, full);
  if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) return undefined;
  return full;
}

async function openBrowser(url: string): Promise<void> {
  if (process.platform === "win32") {
    spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
    return;
  }
  if (process.platform === "darwin") {
    spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
    return;
  }
  spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
}

async function serveFile(rootDir: string, entryName: string, req: IncomingMessage, res: ServerResponse) {
  const target = safeJoin(rootDir, req.url || "/", entryName);
  if (!target) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Not Found");
    return;
  }

  try {
    const body = await readFile(target);
    res.statusCode = 200;
    res.setHeader("Content-Type", contentTypeFor(target));
    res.end(body);
  } catch {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Not Found");
  }
}

export async function startReportServer(opts: ServeOptions): Promise<StartedReportServer> {
  const host = opts.host ?? "127.0.0.1";
  const preferredPort = opts.port ?? 4173;
  const { rootDir, entryName } = await resolveTargets(opts);

  const server = createServer((req, res) => {
    void serveFile(rootDir, entryName, req, res);
  });

  const tryListen = (port: number) =>
    new Promise<number>((resolve, reject) => {
      const onError = (err: NodeJS.ErrnoException) => {
        server.off("listening", onListening);
        server.off("error", onError);
        if (err.code === "EADDRINUSE") resolve(-1);
        else reject(err);
      };
      const onListening = () => {
        server.off("error", onError);
        server.off("listening", onListening);
        resolve(port);
      };

      server.once("error", onError);
      server.once("listening", onListening);
      server.listen(port, host);
    });

  let port = preferredPort;
  for (;;) {
    const result = await tryListen(port);
    if (result !== -1) break;
    port += 1;
  }

  const url = `http://${host}:${port}/`;
  if (opts.open !== false) {
    try {
      await openBrowser(url);
    } catch {
      console.log(`Open browser manually: ${url}`);
    }
  }

  return {
    host,
    port,
    url,
    close: async () =>
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      })
  };
}

export async function waitForShutdown(server: StartedReportServer): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const onSignal = () => {
      process.off("SIGINT", onSignal);
      process.off("SIGTERM", onSignal);
      void server.close().then(resolve, reject);
    };

    process.once("SIGINT", onSignal);
    process.once("SIGTERM", onSignal);
  });
}
