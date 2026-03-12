import type { Evaluation, ScanReport } from "@alignui/core";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderHtmlReport(report: ScanReport, evaluation: Evaluation): string {
  const data = { report, evaluation };
  const json = JSON.stringify(data).replace(/</g, "\\u003c");

  // Report is one HTML file plus ./assets/nunito-sans.woff2.
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>AlignUI - Compliance Report</title>
    <style>
      @font-face {
        font-family: "Nunito Sans";
        font-style: normal;
        font-weight: 200 1000;
        font-display: swap;
        src: url("./assets/nunito-sans.woff2") format("woff2");
      }

      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

      :root {
        --bg: #0e0f11;
        --surface: #161719;
        --surface-alt: #1e2024;
        --border: #2a2d33;
        --border-light: #222429;
        --ink: #f0f1f3;
        --ink-2: #a8aeba;
        --ink-3: #5a6070;
        --accent: #ff6b47;

        --pass-bg: rgba(45,170,95,0.14);
        --pass-text: #4ade80;
        --pass-dot: #2daa5f;

        --fail-bg: rgba(248,113,113,0.14);
        --fail-text: #f87171;
        --fail-dot: #f87171;

        --warn-bg: rgba(245,158,11,0.14);
        --warn-text: #fcd34d;
        --warn-dot: #f59e0b;

        --err-bg: rgba(224,54,106,0.14);
        --err-text: #f472b6;
        --err-dot: #e0366a;

        --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      }

      body {
        font-family: "Nunito Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: 12px; /* UX rule: keep text >= 12px */
        background: var(--bg);
        color: var(--ink);
        min-height: 100vh;
      }

      /* Header */
      header {
        background: #0a0b0d;
        color: #fff;
        padding: 0 48px;
        display: flex;
        align-items: stretch;
        gap: 0;
        border-bottom: 2px solid var(--accent);
        position: relative;
        overflow: hidden;
      }

      header::after {
        content: "COMPLIANCE";
        position: absolute;
        right: -20px;
        top: 50%;
        transform: translateY(-50%);
        font-weight: 900;
        font-size: 72px;
        color: rgba(255,255,255,0.03);
        letter-spacing: 8px;
        pointer-events: none;
        user-select: none;
        white-space: nowrap;
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 20px 0;
        border-right: 1px solid rgba(255,255,255,0.1);
        padding-right: 40px;
        margin-right: 40px;
        flex-shrink: 0;
      }

      .brand-avatar {
        width: 38px;
        height: 38px;
        background: var(--accent);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 900;
        font-size: 14px;
        color: #fff;
        flex-shrink: 0;
      }

      .brand-text { display: flex; flex-direction: column; gap: 2px; }
      .brand-name { font-size: 17px; font-weight: 800; color: #fff; letter-spacing: -0.3px; }
      .brand-sub {
        font-size: 12px;
        color: rgba(255,255,255,0.55);
        letter-spacing: 0.6px;
        text-transform: uppercase;
        font-weight: 600;
      }

      .header-stats {
        display: flex;
        align-items: stretch;
        gap: 0;
        flex: 1;
        min-width: 0;
      }

      .stat-block {
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding: 18px 32px;
        border-right: 1px solid rgba(255,255,255,0.08);
        min-width: 110px;
        transition: background 0.18s;
        cursor: default;
      }
      .stat-block:hover { background: rgba(255,255,255,0.04); }
      .stat-label {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: rgba(255,255,255,0.5);
        font-weight: 700;
        margin-bottom: 4px;
      }
      .stat-value {
        font-size: 28px;
        font-weight: 900;
        color: #fff;
        line-height: 1;
      }
      .stat-value.pass { color: var(--pass-text); }
      .stat-value.fail { color: var(--fail-text); }

      .verdict-block {
        display: flex;
        align-items: center;
        padding: 18px 32px;
        margin-left: auto;
        gap: 12px;
        flex-shrink: 0;
      }

      .verdict-badge {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        border-radius: 999px;
        padding: 8px 18px 8px 12px;
        border: 1px solid transparent;
      }

      .verdict-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
      }

      @keyframes pulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.25); }
        50% { box-shadow: 0 0 0 5px rgba(255,255,255,0); }
      }

      .verdict-text { font-size: 14px; font-weight: 900; }

      .verdict-pass {
        background: var(--pass-bg);
        border-color: rgba(74,222,128,0.28);
      }
      .verdict-pass .verdict-dot {
        background: var(--pass-text);
        animation: pulse 2.1s ease-in-out infinite;
      }
      .verdict-pass .verdict-text { color: var(--pass-text); }

      .verdict-fail {
        background: var(--fail-bg);
        border-color: rgba(248,113,113,0.28);
      }
      .verdict-fail .verdict-dot {
        background: var(--fail-text);
        animation: pulse 2.1s ease-in-out infinite;
      }
      .verdict-fail .verdict-text { color: var(--fail-text); }

      /* Meta bar */
      .meta-bar {
        background: var(--surface);
        border-bottom: 1px solid var(--border);
        padding: 12px 48px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 24px;
      }

      .meta-url {
        font-family: var(--mono);
        font-size: 12px;
        color: var(--ink-3);
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        overflow: hidden;
      }

      .meta-url-label {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        color: var(--ink-3);
        font-weight: 800;
        flex-shrink: 0;
      }

      .meta-url-value {
        color: var(--ink-2);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .meta-time {
        font-family: var(--mono);
        font-size: 12px;
        color: var(--ink-3);
        flex-shrink: 0;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .meta-sep {
        width: 1px;
        height: 14px;
        background: var(--border);
        flex-shrink: 0;
      }

      /* Main */
      main { padding: 32px 48px; }

      /* Toolbar */
      .toolbar {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 24px;
        flex-wrap: wrap;
      }

      .search-wrap {
        position: relative;
        flex: 1;
        min-width: 240px;
        max-width: 420px;
      }

      .search-icon {
        position: absolute;
        left: 14px;
        top: 50%;
        transform: translateY(-50%);
        color: var(--ink-3);
        pointer-events: none;
      }

      .search-input {
        width: 100%;
        height: 40px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 0 14px 0 40px;
        font-size: 13px;
        color: var(--ink);
        outline: none;
        transition: border-color 0.15s, box-shadow 0.15s;
      }
      .search-input::placeholder { color: var(--ink-3); }
      .search-input:focus {
        border-color: var(--accent);
        box-shadow: 0 0 0 3px rgba(255,107,71,0.12);
      }

      .filter-pills { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }

      .pill {
        height: 32px;
        padding: 0 14px;
        border-radius: 999px;
        border: 1.5px solid var(--border);
        background: var(--surface);
        font-size: 12px;
        font-weight: 800;
        cursor: pointer;
        transition: all 0.15s;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: var(--ink-2);
      }
      .pill:hover { border-color: var(--ink-3); }

      .pill.active-pass { background: var(--pass-bg); border-color: var(--pass-dot); color: var(--pass-text); }
      .pill.active-fail { background: var(--fail-bg); border-color: var(--fail-dot); color: var(--fail-text); }
      .pill.active-error { background: var(--err-bg); border-color: var(--err-dot); color: var(--err-text); }
      .pill.active-warn { background: var(--warn-bg); border-color: var(--warn-dot); color: var(--warn-text); }

      .pill-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
      }

      .count-badge {
        margin-left: auto;
        font-size: 12px;
        color: var(--ink-3);
        font-family: var(--mono);
        font-weight: 600;
        padding: 6px 12px;
        background: var(--surface-alt);
        border-radius: 8px;
      }

      /* Table */
      .table-wrap {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 6px 22px rgba(0,0,0,0.08);
      }

      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
      }

      thead {
        background: var(--surface-alt);
        border-bottom: 1px solid var(--border);
      }

      th {
        padding: 12px 16px;
        text-align: left;
        font-size: 12px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        color: var(--ink-3);
        white-space: nowrap;
      }

      th:not(:last-child) { border-right: 1px solid var(--border); }

      tbody tr {
        border-bottom: 1px solid var(--border-light);
        transition: background 0.12s;
      }
      tbody tr:last-child { border-bottom: none; }
      tbody tr:hover { background: rgba(255,255,255,0.03); }

      td {
        padding: 14px 16px;
        vertical-align: middle;
        color: var(--ink-2);
        line-height: 1.4;
      }

      td:not(:last-child) { border-right: 1px solid var(--border); }

      .status-cell { width: 84px; }

      .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        font-family: var(--mono);
        font-size: 12px;
        font-weight: 700;
        padding: 6px 10px;
        border-radius: 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .status-badge.pass { background: var(--pass-bg); color: var(--pass-text); }
      .status-badge.fail { background: var(--fail-bg); color: var(--fail-text); }
      .status-badge::before {
        content: "";
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: currentColor;
        opacity: 0.75;
      }

      .sev-badge {
        display: inline-flex;
        align-items: center;
        font-size: 12px;
        font-weight: 800;
        padding: 6px 10px;
        border-radius: 8px;
        text-transform: capitalize;
        letter-spacing: 0.2px;
      }
      .sev-badge.error { background: var(--err-bg); color: var(--err-text); border-left: 3px solid var(--err-dot); }
      .sev-badge.warn  { background: var(--warn-bg); color: var(--warn-text); border-left: 3px solid var(--warn-dot); }
      .sev-badge.info  { background: rgba(96,165,250,0.14); color: #93c5fd; border-left: 3px solid #60a5fa; }

      .selector-cell code {
        font-family: var(--mono);
        font-size: 12px;
        color: var(--accent);
        background: rgba(255,107,71,0.1);
        padding: 3px 7px;
        border-radius: 6px;
      }

      .prop-cell { font-family: var(--mono); font-size: 12px; color: var(--ink); font-weight: 600; }

      .token-cell .token-badge {
        font-family: var(--mono);
        font-size: 12px;
        background: rgba(139,92,246,0.16);
        color: #c4b5fd;
        padding: 3px 8px;
        border-radius: 6px;
        display: inline-block;
      }

      .json-cell {
        font-family: var(--mono);
        font-size: 12px;
        color: var(--ink-3);
        max-width: 360px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .actual-cell {
        font-family: var(--mono);
        font-size: 12px;
        color: var(--ink-2);
        font-weight: 700;
      }

      .details-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 7px 12px;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: transparent;
        font-size: 12px;
        font-weight: 800;
        color: var(--ink-3);
        cursor: pointer;
        transition: all 0.15s;
        white-space: nowrap;
      }
      .details-btn:hover {
        background: var(--surface-alt);
        color: var(--ink);
        border-color: var(--ink-3);
      }

      dialog {
        border: 1px solid var(--border);
        background: rgba(22,23,25,0.98);
        color: var(--ink);
        border-radius: 12px;
        padding: 0;
        width: min(820px, calc(100vw - 32px));
        box-shadow: 0 18px 80px rgba(0,0,0,0.45);
      }
      dialog::backdrop { background: rgba(0,0,0,0.55); }

      .dlg-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        padding: 14px 16px;
        border-bottom: 1px solid var(--border);
        background: rgba(30,32,36,0.6);
      }
      .dlg-title { font-size: 13px; font-weight: 900; }
      .dlg-close {
        appearance: none;
        border: 1px solid var(--border);
        background: transparent;
        color: var(--ink-2);
        border-radius: 10px;
        padding: 8px 10px;
        font-size: 12px;
        cursor: pointer;
      }
      .dlg-close:hover { background: var(--surface-alt); color: var(--ink); }
      .dlg-body { padding: 14px 16px; }
      .dlg-pre {
        font-family: var(--mono);
        font-size: 12px;
        color: var(--ink-2);
        white-space: pre-wrap;
        word-break: break-word;
        line-height: 1.45;
      }

      footer {
        padding: 18px 48px 28px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
      }

      .footer-note {
        font-size: 12px;
        color: var(--ink-3);
        font-family: var(--mono);
      }

      .score-bar {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .score-label { font-size: 12px; color: var(--ink-3); font-weight: 800; }

      .score-track {
        width: 140px;
        height: 6px;
        background: var(--border);
        border-radius: 999px;
        overflow: hidden;
      }

      .score-fill {
        height: 100%;
        width: 100%;
        background: linear-gradient(90deg, #2daa5f, #4ade80);
        border-radius: 999px;
        transform-origin: left;
        animation: fill-in 1s cubic-bezier(0.4,0,0.2,1) 0.35s both;
      }

      @keyframes fill-in {
        from { transform: scaleX(0); }
        to { transform: scaleX(1); }
      }

      .score-num { font-size: 14px; font-weight: 900; color: var(--pass-text); }

      @media (max-width: 980px) {
        header { padding: 0 16px; flex-wrap: wrap; }
        .brand { padding-right: 16px; margin-right: 16px; }
        .stat-block { padding: 14px 16px; min-width: 100px; }
        .meta-bar { padding: 12px 16px; flex-wrap: wrap; }
        main { padding: 22px 16px; }
        footer { padding: 18px 16px 26px; flex-wrap: wrap; justify-content: flex-start; }
        header::after { display: none; }
      }
    </style>
  </head>
  <body>
    <header>
      <div class="brand">
        <div class="brand-avatar">A</div>
        <div class="brand-text">
          <div class="brand-name">AlignUI</div>
          <div class="brand-sub">Compliance Report</div>
        </div>
      </div>

      <div class="header-stats">
        <div class="stat-block">
          <div class="stat-label">Score</div>
          <div class="stat-value" id="kpiScore">-</div>
        </div>
        <div class="stat-block">
          <div class="stat-label">Failed</div>
          <div class="stat-value" id="kpiFailed">-</div>
        </div>
        <div class="stat-block">
          <div class="stat-label">Passed</div>
          <div class="stat-value" id="kpiPassed">-</div>
        </div>
        <div class="stat-block">
          <div class="stat-label">Checks</div>
          <div class="stat-value" id="kpiTotal">-</div>
        </div>
      </div>

      <div class="verdict-block">
        <div class="verdict-badge" id="verdictBadge">
          <div class="verdict-dot" id="verdictDot"></div>
          <div class="verdict-text" id="verdictText"></div>
        </div>
      </div>
    </header>

    <div class="meta-bar">
      <div class="meta-url">
        <span class="meta-url-label">URL</span>
        <div class="meta-sep"></div>
        <span class="meta-url-value" id="metaUrlValue"></span>
      </div>
      <div class="meta-time" id="metaTime"></div>
    </div>

    <main>
      <div class="toolbar">
        <div class="search-wrap">
          <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input id="q" class="search-input" type="search" placeholder="Search selector, property, token..." />
        </div>

        <div class="filter-pills">
          <button class="pill active-pass" id="fPass" type="button">
            <span class="pill-dot" style="background:var(--pass-dot)"></span> Pass
          </button>
          <button class="pill active-fail" id="fFail" type="button">
            <span class="pill-dot" style="background:var(--fail-dot)"></span> Fail
          </button>
          <button class="pill active-error" id="fErr" type="button">
            <span class="pill-dot" style="background:var(--err-dot)"></span> Error
          </button>
          <button class="pill active-warn" id="fWarn" type="button">
            <span class="pill-dot" style="background:var(--warn-dot)"></span> Warn
          </button>
        </div>

        <div class="count-badge"><span id="shownCount">0</span> results</div>
      </div>

      <div class="table-wrap">
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
      </div>
    </main>

    <footer>
      <div class="footer-note">Generated by AlignUI</div>
      <div class="score-bar">
        <span class="score-label">Overall Score</span>
        <div class="score-track"><div class="score-fill" id="scoreFill"></div></div>
        <span class="score-num" id="scoreNum">-</span>
      </div>
    </footer>

    <dialog id="detailsDialog">
      <div class="dlg-head">
        <div class="dlg-title" id="dlgTitle">Details</div>
        <button class="dlg-close" id="dlgClose" type="button">Close</button>
      </div>
      <div class="dlg-body">
        <pre class="dlg-pre" id="dlgBody"></pre>
      </div>
    </dialog>

    <script id="__ALIGNUI_DATA__" type="application/json">${json}</script>
    <script>
      const data = JSON.parse(document.getElementById("__ALIGNUI_DATA__").textContent);
      const report = data.report;
      const evaluation = data.evaluation;

      const el = (id) => document.getElementById(id);
      const fmt = (v) => typeof v === "string" ? v : v === null ? "null" : JSON.stringify(v);

      el("kpiScore").textContent = String(report.summary.score);
      el("kpiFailed").textContent = String(report.summary.failed);
      el("kpiPassed").textContent = String(report.summary.passed);
      el("kpiTotal").textContent = String(report.summary.total);

      const pass = !!evaluation.pass;
      const verdictBadge = el("verdictBadge");
      const verdictText = el("verdictText");
      verdictBadge.classList.toggle("verdict-pass", pass);
      verdictBadge.classList.toggle("verdict-fail", !pass);
      verdictText.textContent = pass ? "All Passed" : "Needs Review";

      el("metaUrlValue").textContent = report.meta.url || "(none)";
      el("metaTime").textContent = String(report.meta.startedAt || "");

      const rowsEl = el("rows");
      const qEl = el("q");
      const fPass = el("fPass");
      const fFail = el("fFail");
      const fErr = el("fErr");
      const fWarn = el("fWarn");
      const shownCount = el("shownCount");

      const dlg = el("detailsDialog");
      const dlgClose = el("dlgClose");
      const dlgBody = el("dlgBody");
      const dlgTitle = el("dlgTitle");

      dlgClose.addEventListener("click", () => dlg.close());
      dlg.addEventListener("click", (e) => {
        // Click outside the dialog content closes it.
        const r = dlg.getBoundingClientRect();
        const inBox = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        if (!inBox) dlg.close();
      });

      const state = {
        showPass: true,
        showFail: true,
        showErr: true,
        showWarn: true,
        q: ""
      };

      function setPill(btn, activeClass, on) {
        btn.classList.toggle(activeClass, on);
      }

      function toggle(btn, key, activeClass) {
        state[key] = !state[key];
        setPill(btn, activeClass, state[key]);
        render();
      }

      fPass.addEventListener("click", () => toggle(fPass, "showPass", "active-pass"));
      fFail.addEventListener("click", () => toggle(fFail, "showFail", "active-fail"));
      fErr.addEventListener("click", () => toggle(fErr, "showErr", "active-error"));
      fWarn.addEventListener("click", () => toggle(fWarn, "showWarn", "active-warn"));
      qEl.addEventListener("input", () => { state.q = qEl.value.toLowerCase().trim(); render(); });

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

      function statusBadge(r) {
        const cls = r.pass ? "pass" : "fail";
        const txt = r.pass ? "Pass" : "Fail";
        return \`<span class="status-badge \${cls}">\${txt}</span>\`;
      }

      function severityBadge(r) {
        const sev = String(r.severity || "info");
        const cls = sev === "error" ? "error" : sev === "warn" ? "warn" : "info";
        const label = cls.charAt(0).toUpperCase() + cls.slice(1);
        return \`<span class="sev-badge \${cls}">\${label}</span>\`;
      }

      function rowHtml(r, idx) {
        const exp = fmt(r.expected);
        const details = String(r.details || "");
        const title = \`\${r.selector} \u2022 \${r.property}\`;
        const detPayload = escapeHtml(JSON.stringify({ selector: r.selector, property: r.property, token: r.token, expected: r.expected, actual: r.actual, details }, null, 2));
        return \`
          <tr data-i="\${idx}">
            <td class="status-cell">\${statusBadge(r)}</td>
            <td>\${severityBadge(r)}</td>
            <td class="selector-cell"><code>\${escapeHtml(String(r.selector || ""))}</code></td>
            <td class="prop-cell">\${escapeHtml(String(r.property || ""))}</td>
            <td class="token-cell"><span class="token-badge">\${escapeHtml(String(r.token || ""))}</span></td>
            <td class="json-cell" title="\${escapeHtml(exp)}">\${escapeHtml(exp)}</td>
            <td class="actual-cell" title="\${escapeHtml(String(r.actual ?? ""))}">\${escapeHtml(String(r.actual ?? ""))}</td>
            <td>
              <button class="details-btn" type="button" data-title="\${escapeHtml(title)}" data-details="\${detPayload}">
                View
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            </td>
          </tr>\`;
      }

      function wireDetails() {
        for (const btn of document.querySelectorAll(".details-btn")) {
          btn.addEventListener("click", () => {
            dlgTitle.textContent = btn.getAttribute("data-title") || "Details";
            dlgBody.textContent = btn.getAttribute("data-details") || "";
            dlg.showModal();
          });
        }
      }

      function render() {
        const filtered = report.results.filter(passesFilters);
        shownCount.textContent = String(filtered.length);
        rowsEl.innerHTML = filtered.map(rowHtml).join("");
        wireDetails();
      }

      // Score bar
      el("scoreNum").textContent = String(report.summary.score);
      const score = Number(report.summary.score || 0);
      el("scoreFill").style.transform = "scaleX(" + Math.max(0, Math.min(1, score / 100)) + ")";
      if (!pass) {
        el("scoreNum").style.color = "var(--fail-text)";
        el("scoreFill").style.background = "linear-gradient(90deg, #f87171, #fb7185)";
      }

      render();
    </script>
  </body>
</html>`;
}

