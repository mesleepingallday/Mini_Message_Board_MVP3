const fs = require("node:fs");
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]
  );
const status = process.env.TEST_JOB_RESULT || "unknown";
const sha = (process.env.GH_SHA || "local").slice(0, 12);
const run = process.env.GH_RUN_ID || "local";
fs.mkdirSync("public-report", { recursive: true });
fs.writeFileSync(
  "public-report/index.html",
  `<!doctype html><html lang="vi"><meta charset="utf-8">
<title>MVP 3 CI</title><body><h1>Mini Message Board MVP 3</h1>
<p>Trạng thái: ${esc(status)}</p><p>Commit: ${esc(sha)}</p>
<p>Run ID: ${esc(run)}</p><p>Chi tiết xem Actions Artifacts.</p>
</body></html>`
);
