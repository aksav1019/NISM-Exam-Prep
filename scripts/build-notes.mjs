// Builds standalone, printable colourful notes (notes/<id>.html) and PDFs (downloads/<id>-notes.pdf)
// Usage: node scripts/build-notes.mjs [--no-pdf] [id ...]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const noPdf = args.includes("--no-pdf");
const exams = JSON.parse(fs.readFileSync(path.join(root, "data/exams.json"), "utf8"));
const only = args.filter(a => !a.startsWith("--"));
const PAL = ["#7c3aed", "#ec4899", "#f97316", "#10b981", "#0ea5e9", "#eab308", "#ef4444", "#14b8a6", "#8b5cf6", "#d946ef", "#2563eb", "#84cc16", "#f43f5e", "#06b6d4"];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");

function page(e, n) {
  const p = n.pattern || {};
  const ch = n.chapters.map((c, i) => {
    const col = PAL[i % PAL.length];
    return `<section class="chap" style="--hc:${col}">
      <header><div class="num">${c.emoji}</div><div><small>Chapter ${c.no} · Weight: ${esc(c.weight)}</small><h2>${esc(c.title)}</h2></div></header>
      <p class="sum">${md(c.summary)}</p>
      <div class="story"><b>Make it stick</b>${md(c.story)}</div>
      <ol class="kp">${c.keyPoints.map(k => `<li>${md(k)}</li>`).join("")}</ol>
      ${(c.mustRemember || []).length ? `<div class="mr">${c.mustRemember.map(m => `<div><small>${esc(m.label)}</small><b>${esc(m.value)}</b></div>`).join("")}</div>` : ""}
      <div class="co"><div class="tip"><b>🎯 Exam tip</b>${md(c.examTip)}</div><div class="trap"><b>⚠️ Trap</b>${md(c.trap)}</div></div>
    </section>`;
  }).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(e.code)} Study Notes</title>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Plus+Jakarta+Sans:wght@400;600;700&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
<style>
:root{--c1:${e.c1};--c2:${e.c2};--ink:#1b1534;--muted:#5e587a;--soft:#f3f0ff;--line:#e6e1f5}
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;background:#fff;color:var(--ink);font:13.5px/1.55 "Plus Jakarta Sans",system-ui,sans-serif}
.wrap{max-width:900px;margin:0 auto;padding:24px}
h1,h2,h3{font-family:"Bricolage Grotesque",sans-serif;margin:0;line-height:1.15}
.cover{border-radius:24px;padding:34px;color:#fff;background:linear-gradient(130deg,var(--c1),var(--c2));position:relative;overflow:hidden}
.cover::after{content:"${e.icon}";position:absolute;right:20px;top:6px;font-size:120px;opacity:.2}
.cover small{letter-spacing:.1em;text-transform:uppercase;font-weight:700;opacity:.9}
.cover h1{font-size:36px;margin:8px 0}
.cover p{max-width:640px;margin:6px 0 0;font-size:14.5px}
.box{border:1px solid var(--line);border-radius:18px;padding:16px 18px;margin-top:16px;break-inside:avoid}
.box h3{font-size:18px;margin-bottom:8px;color:var(--c1)}
.kv{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.kv div{background:var(--soft);border-radius:12px;padding:10px}
.kv b{display:block;font:800 18px "Bricolage Grotesque";color:var(--c1)} .kv span{font-size:11.5px;color:var(--muted)}
ul{margin:6px 0 0;padding-left:18px}
.chap{margin-top:22px;border:1px solid var(--line);border-radius:20px;padding:0 0 14px;overflow:hidden;break-inside:auto}
.chap header{display:flex;gap:12px;align-items:center;padding:14px 16px;background:linear-gradient(110deg,color-mix(in srgb,var(--hc) 18%,#fff),#fff);border-bottom:1px solid var(--line);break-after:avoid}
.chap .num{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;font-size:22px;background:var(--hc);flex:none}
.chap small{color:var(--muted);font-weight:700;font-size:11.5px}
.chap h2{font-size:20px}
.chap > *:not(header){margin-left:16px;margin-right:16px}
.sum{font-size:14.5px;margin-top:12px}
.story{border-left:5px solid var(--hc);background:color-mix(in srgb,var(--hc) 9%,#fff);padding:9px 13px;border-radius:0 12px 12px 0;break-inside:avoid}
.story b,.co b{display:block;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--hc)}
.kp{margin-top:10px;padding-left:0;list-style:none;counter-reset:k;display:grid;grid-template-columns:1fr 1fr;gap:7px}
.kp li{counter-increment:k;position:relative;background:var(--soft);border-radius:10px;padding:7px 10px 7px 32px;break-inside:avoid}
.kp li::before{content:counter(k);position:absolute;left:8px;top:7px;width:18px;height:18px;border-radius:6px;background:var(--hc);color:#fff;font-size:10.5px;font-weight:800;display:grid;place-items:center}
.mr{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.mr div{border:1.5px solid color-mix(in srgb,var(--hc) 45%,#fff);border-radius:10px;padding:5px 9px;break-inside:avoid}
.mr small{display:block;font-size:10.5px;color:var(--muted)} .mr b{font-size:13px}
.co{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
.co div{border-radius:12px;padding:9px 12px;break-inside:avoid}
.co .tip{background:#dcfce7} .co .tip b{color:#15803d} .co .trap{background:#fee2e2} .co .trap b{color:#b91c1c}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.f{border:1px solid var(--line);border-top:4px solid var(--c1);border-radius:12px;padding:10px 12px;break-inside:avoid}
.f code{display:block;font-family:"JetBrains Mono",monospace;background:var(--soft);padding:6px 8px;border-radius:8px;margin:5px 0;white-space:pre-wrap;font-size:12px}
.nums{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}
.nums div{border:1px solid var(--line);border-radius:10px;padding:7px 10px;break-inside:avoid}
.nums b{display:block;color:var(--c2);font:800 15px "Bricolage Grotesque"} .nums span{font-size:11.5px;color:var(--muted)}
table{width:100%;border-collapse:collapse} td{border-bottom:1px solid var(--line);padding:5px 6px;vertical-align:top} td:first-child{font-weight:700;width:28%}
.qr{columns:2;column-gap:14px;padding-left:18px} .qr li{margin-bottom:5px;break-inside:avoid}
.pb{break-before:page}
.bar{display:flex;gap:8px;justify-content:flex-end;margin-bottom:10px}
.bar button,.bar a{font:700 13px "Plus Jakarta Sans";padding:8px 14px;border-radius:10px;border:0;background:linear-gradient(135deg,var(--c1),var(--c2));color:#fff;text-decoration:none;cursor:pointer}
@media (max-width:640px){.qr{columns:1}.kp,.grid,.co{grid-template-columns:1fr}.nums,.kv{grid-template-columns:1fr 1fr}.wrap{padding:16px}}
@media print{.bar{display:none}.wrap{padding:0}@page{margin:12mm}}
</style></head><body><div class="wrap">
<div class="bar"><a href="../index.html#/exam/${e.id}">← Back to site</a><button onclick="print()">🖨️ Print / Save as PDF</button></div>
<div class="cover"><small>NISM ${esc(e.code)} · ${esc(n.workbookVersion || "")} workbook · Study notes</small><h1>${esc(e.name)}</h1><p>${md(n.tagline)}</p><p style="opacity:.9">${md(n.eli5)}</p></div>
<div class="box"><h3>📋 Exam pattern</h3><div class="kv"><div><b>${esc(p.totalMarks ?? "—")}</b><span>Total marks</span></div><div><b>${esc(p.durationMin ?? "—")} min</b><span>Duration</span></div><div><b>${esc(p.passPct ?? "—")}%</b><span>Pass mark</span></div><div><b style="font-size:13px">${esc(p.negative || "—")}</b><span>Negative marking</span></div></div>
<p style="margin:8px 0 0">${esc(p.totalQuestions || "")}${p.notes ? " · " + esc(p.notes) : ""}</p></div>
<div class="box"><h3>👥 Who needs it</h3><ul>${n.whoNeeds.map(x => `<li>${md(x)}</li>`).join("")}</ul></div>
<div class="box"><h3>🧭 Exam strategy</h3><ul>${n.examStrategy.map(x => `<li>${md(x)}</li>`).join("")}</ul></div>
${ch}
${(n.formulas || []).length ? `<div class="box pb"><h3>🧮 Formulas</h3><div class="grid">${n.formulas.map(f => `<div class="f"><b>${esc(f.name)}</b><code>${esc(f.formula)}</code><small>${md(f.example)}</small></div>`).join("")}</div></div>` : ""}
<div class="box"><h3>🔢 Numbers to remember</h3><div class="nums">${n.numbersToRemember.map(x => `<div><b>${esc(x.value)}</b><span>${esc(x.label)}</span></div>`).join("")}</div></div>
<div class="box"><h3>📖 Glossary</h3><table>${n.glossary.map(x => `<tr><td>${esc(x.term)}</td><td>${md(x.meaning)}</td></tr>`).join("")}</table></div>
<div class="box"><h3>⚡ Quick revision: the night before</h3><ol class="qr">${n.quickRevision.map(x => `<li>${md(x)}</li>`).join("")}</ol></div>
<div class="box"><h3>🗓️ ${esc(n.studyPlan.totalDays)}-day study plan (${esc(n.studyPlan.hoursPerDay)} h/day)</h3>${n.studyPlan.phases.map(ph => `<p style="margin:8px 0 2px"><b>Days ${esc(ph.days)}: ${esc(ph.focus)}</b></p><ul>${ph.tasks.map(t => `<li>${md(t)}</li>`).join("")}</ul>`).join("")}</div>
<p style="color:var(--muted);font-size:11.5px;margin-top:18px">Independent study notes prepared from the official NISM workbook. Verify against the latest workbook on nism.ac.in.</p>
</div></body></html>`;
}

let browser = null;
if (!noPdf) { const { chromium } = await import("playwright"); browser = await chromium.launch(); }
for (const e of exams) {
  if (only.length && !only.includes(e.id)) continue;
  const f = path.join(root, "data", e.id, "notes.json");
  if (!fs.existsSync(f)) { console.log("skip", e.id); continue; }
  const n = JSON.parse(fs.readFileSync(f, "utf8"));
  const out = path.join(root, "notes", `${e.id}.html`);
  fs.writeFileSync(out, page(e, n));
  if (browser) {
    const pg = await browser.newPage();
    const fdir = process.env.FONT_DIR; // optional: node_modules/@fontsource dir, for offline PDF builds
    if (fdir) await pg.route(/fonts\.googleapis\.com/, r => {
      const ff = (fam, slug, w) => w.map(x => `@font-face{font-family:"${fam}";font-weight:${x};src:url("file://${fdir}/${slug}/files/${slug}-latin-${x}-normal.woff2") format("woff2")}`).join("");
      r.fulfill({ contentType: "text/css", body: ff("Plus Jakarta Sans", "plus-jakarta-sans", [400, 600, 700]) + ff("Bricolage Grotesque", "bricolage-grotesque", [700, 800]) + ff("JetBrains Mono", "jetbrains-mono", [500]) });
    });
    await pg.goto("file://" + out, { waitUntil: "networkidle" }).catch(() => {});
    await pg.pdf({ path: path.join(root, "downloads", `${e.id}-notes.pdf`), format: "A4", printBackground: true, margin: { top: "12mm", bottom: "12mm", left: "10mm", right: "10mm" } });
    await pg.close();
  }
  console.log("built", e.id);
}
if (browser) await browser.close();
