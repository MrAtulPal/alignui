import type { Evaluation, ScanReport } from "@alignui/core";

export function renderHtmlReport(
  report: ScanReport,
  evaluation: Evaluation,
  opts?: { fontWoff2Base64?: string }
): string {
  const data = { report, evaluation };
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  const fontFace = opts?.fontWoff2Base64
    ? `@font-face {
        font-family: "Nunito Sans";
        font-style: normal;
        font-weight: 200 1000;
        font-display: swap;
        src: url("data:font/woff2;base64,${opts.fontWoff2Base64}") format("woff2");
      }`
    : "";

  // Keep it dependency-free: one self-contained HTML file (optionally with embedded font).
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>AlignUI Report</title>
    <style>
      ${fontFace}

      :root {
        --bg: #0b0c10;
        --panel: #12141c;
        --panel2: #0f1118;
        --text: #e8eaf2;
        --muted: #a7acc2;
        --border: rgba(255,255,255,0.08);
        --good: #2ad48f;
        --bad: #ff4d4d;
        --warn: #ffb020;
        --chip: rgba(255,255,255,0.08);
        --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        --sans: "Nunito Sans", ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial,
          "Apple Color Emoji", "Segoe UI Emoji";
      }

      * { box-sizing: border-box; }
      html, body { height: 100%; }

      body {
        margin: 0;
        font-family: var(--sans);
        font-size: 12px; /* UX rule: keep text >= 12px */
        background: radial-gradient(1200px 600px at 10% -10%, rgba(80,125,255,0.25), transparent 60%),
                    radial-gradient(900px 500px at 90% 10%, rgba(255,115,80,0.18), transparent 55%),
                    var(--bg);
        color: var(--text);
      }

      .app {
        height: 100%;
        display: grid;
        grid-template-rows: auto auto 1fr;
      }

      .topbar {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        padding: 14px 16px;
        border-bottom: 1px solid var(--border);
        background: linear-gradient(180deg, rgba(255,255,255,0.03), transparent 55%), var(--panel2);
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 240px;
      }

      .logo {
        width: 34px;
        height: 34px;
        border-radius: 10px;
        border: 1px solid var(--border);
        background: radial-gradient(16px 16px at 30% 25%, rgba(80,125,255,0.75), rgba(80,125,255,0.0)),
                    radial-gradient(18px 18px at 80% 80%, rgba(255,115,80,0.55), rgba(255,115,80,0.0)),
                    rgba(255,255,255,0.03);
        display: grid;
        place-items: center;
      }

      .logo svg { width: 18px; height: 18px; opacity: 0.95; }

      .brandName {
        font-weight: 800;
        letter-spacing: 0.3px;
        line-height: 1.1;
        font-size: 14px;
      }

      .brandSub {
        margin-top: 3px;
        color: var(--muted);
        font-weight: 500;
        line-height: 1.2;
      }

      .topRight {
        display: flex;
        align-items: flex-start;
        justify-content: flex-end;
        gap: 12px;
        flex-wrap: wrap;
      }

      .status {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 10px;
        border-radius: 12px;
        border: 1px solid var(--border);
        background: rgba(255,255,255,0.03);
      }
      .dot { width: 10px; height: 10px; border-radius: 50%; }

      .kpi {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }
      .card {
        border: 1px solid var(--border);
        background: rgba(255,255,255,0.03);
        border-radius: 12px;
        padding: 10px 10px;
        min-width: 120px;
      }
      .card .label { color: var(--muted); font-size: 12px; }
      .card .value { font-size: 20px; font-weight: 700; margin-top: 4px; }

      .subbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 10px 16px;
        border-bottom: 1px solid var(--border);
        background: rgba(18, 20, 28, 0.65);
        backdrop-filter: blur(10px);
      }

      .row {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        align-items: center;
      }

      .chip {
        border: 1px solid var(--border);
        background: var(--chip);
        color: var(--text);
        border-radius: 999px;
        padding: 6px 10px;
        font-size: 12px;
        cursor: pointer;
        user-select: none;
      }
      .chip[aria-pressed="true"] { outline: 2px solid rgba(80,125,255,0.6); }

      input[type="search"] {
        width: min(520px, 64vw);
        border: 1px solid var(--border);
        background: rgba(0,0,0,0.25);
        color: var(--text);
        padding: 10px 10px;
        border-radius: 12px;
        outline: none;
        font-size: 12px;
      }
      input[type="search"]::placeholder { color: rgba(231,235,255,0.45); }

      .meta {
        font-family: var(--mono);
        font-size: 12px;
        color: var(--muted);
      }

      .metaStack {
        display: flex;
        gap: 10px;
        align-items: baseline;
        flex-wrap: wrap;
        justify-content: flex-end;
      }

      .main {
        padding: 14px 16px;
        overflow: auto;
      }

      table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        border: 1px solid var(--border);
        background: rgba(255,255,255,0.02);
        border-radius: 12px;
        overflow: hidden;
      }

      thead th {
        position: sticky;
        top: 0;
        background: rgba(18,20,28,0.96);
        backdrop-filter: blur(10px);
        border-bottom: 1px solid var(--border);
        padding: 10px 10px;
        text-align: left;
        font-size: 12px;
        color: var(--muted);
        z-index: 1;
      }

      tbody td {
        border-bottom: 1px solid rgba(255,255,255,0.05);
        padding: 10px 10px;
        font-size: 13px;
        vertical-align: top;
      }

      tbody tr:last-child td { border-bottom: 0; }

      .badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-family: var(--mono);
        font-size: 12px;
        padding: 5px 8px;
        border-radius: 999px;
        border: 1px solid var(--border);
        background: rgba(0,0,0,0.2);
      }
      .b-pass { color: var(--good); }
      .b-fail { color: var(--bad); }
      .b-warn { color: var(--warn); }

      .mono { font-family: var(--mono); }
      .muted { color: var(--muted); }

      @media (max-width: 960px) {
        .topbar { align-items: flex-start; }
        input[type="search"] { width: 100%; }
        .subbar { align-items: flex-start; flex-direction: column; }
        .metaStack { justify-content: flex-start; }
      }
    </style>
  </head>
  <body>
    <div class="app">
      <header class="topbar">
        <div class="brand">
          <div class="logo" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M6.5 17.5L12 6.5L17.5 17.5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
              <path d="M8.7 13h6.6" stroke="white" stroke-width="2" stroke-linecap="round"></path>
            </svg>
          </div>
          <div>
            <div class="brandName">AlignUI</div>
            <div class="brandSub">Compliance report</div>
          </div>
        </div>

        <div class="topRight">
          <div id="status" class="status">
            <span class="dot" id="statusDot"></span>
            <span id="statusText"></span>
          </div>

          <div class="kpi">
            <div class="card">
              <div class="label">Score</div>
              <div class="value" id="kpiScore">-</div>
            </div>
            <div class="card">
              <div class="label">Failed</div>
              <div class="value" id="kpiFailed">-</div>
            </div>
            <div class="card">
              <div class="label">Passed</div>
              <div class="value" id="kpiPassed">-</div>
            </div>
            <div class="card">
              <div class="label">Checks</div>
              <div class="value" id="kpiTotal">-</div>
            </div>
          </div>
        </div>
      </header>

      <section class="subbar">
        <div class="row">
          <input id="q" type="search" placeholder="Search selector, property, token..." />
          <div class="row">
            <button class="chip" id="fPass" aria-pressed="true" type="button">Pass</button>
            <button class="chip" id="fFail" aria-pressed="true" type="button">Fail</button>
            <button class="chip" id="fErr" aria-pressed="true" type="button">Error</button>
            <button class="chip" id="fWarn" aria-pressed="true" type="button">Warn</button>
          </div>
        </div>
        <div class="metaStack">
          <div class="meta" id="metaLine"></div>
          <div class="meta"><span id="shownCount">0</span> shown</div>
        </div>
      </section>

      <main class="main">
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Severity</th>
              <th>Selector</th>
              <th>Property</th>
              <th>Token</th>
              <th>Expected</th>
              <th>Actual</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody id="rows"></tbody>
        </table>
      </main>
    </div>

    <script id="__ALIGNUI_DATA__" type="application/json">${json}</script>
    <script>
      const data = JSON.parse(document.getElementById("__ALIGNUI_DATA__").textContent);
      const report = data.report;
      const evaluation = data.evaluation;

      const el = (id) => document.getElementById(id);
      const fmt = (v) => typeof v === "string" ? v : v === null ? "null" : JSON.stringify(v);

      const statusDot = el("statusDot");
      const statusText = el("statusText");
      const pass = !!evaluation.pass;
      statusDot.style.background = pass ? "var(--good)" : "var(--bad)";
      statusText.textContent = pass ? "Pass" : "Fail";

      el("kpiScore").textContent = String(report.summary.score);
      el("kpiFailed").textContent = String(report.summary.failed);
      el("kpiPassed").textContent = String(report.summary.passed);
      el("kpiTotal").textContent = String(report.summary.total);

      el("metaLine").textContent = "URL: " + (report.meta.url || "(none)") + " | startedAt: " + report.meta.startedAt;

      const rowsEl = el("rows");
      const qEl = el("q");
      const fPass = el("fPass");
      const fFail = el("fFail");
      const fErr = el("fErr");
      const fWarn = el("fWarn");
      const shownCount = el("shownCount");

      const state = {
        showPass: true,
        showFail: true,
        showErr: true,
        showWarn: true,
        q: ""
      };

      function toggle(btn, key) {
        state[key] = !state[key];
        btn.setAttribute("aria-pressed", state[key] ? "true" : "false");
        render();
      }

      fPass.addEventListener("click", () => toggle(fPass, "showPass"));
      fFail.addEventListener("click", () => toggle(fFail, "showFail"));
      fErr.addEventListener("click", () => toggle(fErr, "showErr"));
      fWarn.addEventListener("click", () => toggle(fWarn, "showWarn"));
      qEl.addEventListener("input", () => { state.q = qEl.value.toLowerCase().trim(); render(); });

      function rowHtml(r) {
        const status = r.pass ? "PASS" : "FAIL";
        const statusCls = r.pass ? "b-pass" : "b-fail";
        const sevCls = r.severity === "warn" ? "b-warn" : "";
        return \`
          <tr>
            <td><span class="badge \${statusCls}">\${status}</span></td>
            <td><span class="badge \${sevCls}">\${r.severity}</span></td>
            <td class="mono">\${escapeHtml(String(r.selector || ""))}</td>
            <td class="mono">\${escapeHtml(String(r.property || ""))}</td>
            <td class="mono muted">\${escapeHtml(String(r.token || ""))}</td>
            <td class="mono">\${escapeHtml(fmt(r.expected))}</td>
            <td class="mono">\${escapeHtml(String(r.actual))}</td>
            <td class="muted">\${escapeHtml(String(r.details || ""))}</td>
          </tr>\`;
      }

      function escapeHtml(s) {
        return String(s)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");
      }

      function passesFilters(r) {
        if (r.pass && !state.showPass) return false;
        if (!r.pass && !state.showFail) return false;
        if (r.severity === "error" && !state.showErr) return false;
        if (r.severity === "warn" && !state.showWarn) return false;
        if (state.q) {
          const hay = (r.selector + " " + r.property + " " + r.token + " " + (r.details || "")).toLowerCase();
          if (!hay.includes(state.q)) return false;
        }
        return true;
      }

      function render() {
        const filtered = report.results.filter(passesFilters);
        shownCount.textContent = String(filtered.length);
        rowsEl.innerHTML = filtered.map(rowHtml).join("");
      }

      render();
    </script>
  </body>
</html>`;
}
