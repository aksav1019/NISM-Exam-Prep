/* NISM Exam Prep — static single-page app (no build step). */
(() => {
"use strict";
const $app = document.getElementById("app");
const cache = {};
let EXAMS = [], BYID = {};
let timerHandle = null;

/* ---------- utils ---------- */
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
const L = "ABCD";
const store = {
  get(k, d) { try { const v = localStorage.getItem("nism:" + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem("nism:" + k, JSON.stringify(v)); } catch { } },
  del(k) { try { localStorage.removeItem("nism:" + k); } catch { } }
};
async function getJSON(path) {
  if (cache[path]) return cache[path];
  const r = await fetch(path, { cache: "no-cache" });
  if (!r.ok) throw new Error(path + " " + r.status);
  return (cache[path] = await r.json());
}
const notesOf = id => getJSON(`data/${id}/notes.json`);
const mockOf = (id, n) => getJSON(`data/${id}/mock-${n}.json`);
async function allMocks(id) { return Promise.all([1, 2, 3, 4, 5, 6, 7].map(n => mockOf(id, n).catch(() => null))); }
function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function shuffle(a, r) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const fmtT = s => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ":" : "") + String(m).padStart(2, "0") + ":" + String(x).padStart(2, "0"); };
const setVars = (el, e) => { el.style.setProperty("--c1", e.c1); el.style.setProperty("--c2", e.c2); };
const PAL = ["#7c3aed", "#ec4899", "#f97316", "#10b981", "#0ea5e9", "#eab308", "#ef4444", "#14b8a6", "#8b5cf6", "#d946ef", "#2563eb", "#84cc16", "#f43f5e", "#06b6d4"];
const results = () => store.get("results", []);
const passedSet = () => new Set(store.get("passed", ["va"]));

/* ---------- theme ---------- */
const themeBtn = document.getElementById("themeBtn");
const applyTheme = t => { if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; };
applyTheme(store.get("theme", null));
themeBtn.onclick = () => {
  const cur = document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  const nxt = cur === "dark" ? "light" : "dark"; applyTheme(nxt); store.set("theme", nxt);
};

/* ---------- router ---------- */
async function route() {
  clearInterval(timerHandle); timerHandle = null;
  const h = location.hash.replace(/^#\/?/, "");
  const [path, qs] = h.split("?");
  const p = path.split("/").filter(Boolean);
  const q = new URLSearchParams(qs || "");
  document.querySelectorAll("[data-nav]").forEach(a => a.classList.toggle("on", a.dataset.nav === (p[0] || "home")));
  document.body.style.removeProperty("--c1"); document.body.style.removeProperty("--c2");
  try {
    if (!p.length) return home();
    if (p[0] === "exam" && p[1]) {
      const e = BYID[p[1]]; if (!e) return notFound();
      setVars(document.body, e);
      if (p[2] === "test") return runner(e, p[3], q.get("mode") || "exam");
      if (p[2] === "result") return resultView(e, p[3], q.get("f") || "all");
      return examPage(e, p[2] || "overview");
    }
    if (p[0] === "plan") return roadmap();
    if (p[0] === "strategy") return strategy();
    if (p[0] === "updates") return updates();
    if (p[0] === "progress") return progress();
    notFound();
  } catch (err) {
    console.error(err);
    $app.innerHTML = `<div class="panel empty">Couldn't load this page (${esc(err.message)}). <a href="#/">Back home</a></div>`;
  }
  window.scrollTo(0, 0);
}
const notFound = () => { $app.innerHTML = `<div class="panel empty">Page not found. <a href="#/">Go home</a></div>`; };

/* ---------- home ---------- */
async function home() {
  const metas = await Promise.all(EXAMS.map(e => notesOf(e.id).catch(() => null)));
  const res = results(); const passed = passedSet();
  const groups = {};
  EXAMS.forEach((e, i) => { (groups[e.group] = groups[e.group] || []).push([e, metas[i]]); });
  const totalQ = metas.filter(Boolean).length * 185;
  $app.innerHTML = `
  <section class="hero">
    <div class="blob">🎓</div>
    <div class="eyebrow" style="color:#fde68a">2026 workbooks · 13 certifications</div>
    <h1>Learn it once. Pass it well.</h1>
    <p>Colourful notes for every chapter, CBT-style mock tests with real timing and negative marking, and a study roadmap for Investment Adviser, Research Analyst, AIF, SIF, PMS, Derivatives and Retirement Adviser.</p>
    <div class="stats">
      <span class="pill">📚 ${EXAMS.length} exams</span>
      <span class="pill">📝 ${EXAMS.length * 7} mock tests</span>
      <span class="pill">❓ ${totalQ.toLocaleString("en-IN")}+ questions</span>
      <span class="pill">⬇️ Downloadable notes</span>
    </div>
    <div style="margin-top:22px;display:flex;gap:10px;flex-wrap:wrap">
      <a class="btn wh" href="#/plan">🗺️ See my exam roadmap</a>
      <a class="btn gh" href="#/strategy">🧠 How to prepare</a>
    </div>
  </section>
  ${Object.entries(groups).map(([g, list]) => `
    <div class="groupttl">${esc(g)}</div>
    <div class="grid">${list.map(([e, n]) => examCard(e, n, res, passed)).join("")}</div>`).join("")}
  `;
  document.querySelectorAll(".ecard").forEach(el => setVars(el, BYID[el.dataset.id]));
}
function examCard(e, n, res, passed) {
  const mine = res.filter(r => r.exam === e.id);
  const done = new Set(mine.map(r => r.test)).size;
  const best = mine.length ? Math.max(...mine.map(r => r.pct)) : null;
  const p = n?.pattern || {};
  return `<a class="ecard" data-id="${e.id}" href="#/exam/${e.id}">
    <div style="display:flex;gap:12px;align-items:center"><div class="ic">${e.icon}</div>
    <div><div class="code">NISM ${esc(e.code)}</div><h3>${esc(e.name)}</h3></div></div>
    <div class="tag">${esc(n?.tagline || "Content coming soon")}</div>
    <div class="meta">
      ${p.durationMin ? `<span class="chip">⏱ ${p.durationMin} min</span>` : ""}
      ${p.totalMarks ? `<span class="chip">🎯 ${p.totalMarks} marks</span>` : ""}
      ${p.passPct ? `<span class="chip g">Pass ${p.passPct}%</span>` : ""}
      ${n ? `<span class="chip ${n.simulator?.negativeFraction ? "b" : "g"}">${n.simulator?.negativeFraction ? "−" + Math.round(n.simulator.negativeFraction * 100) + "% negative" : "No negative"}</span>` : ""}
      ${passed.has(e.id) ? `<span class="chip g">✅ Passed</span>` : ""}
    </div>
    <div class="bar"><i style="width:${done / 7 * 100}%"></i></div>
    <div class="tag">${done}/7 mocks attempted${best != null ? ` · best ${best}%` : ""}</div>
  </a>`;
}

/* ---------- exam page ---------- */
const TABS = [["overview", "Overview"], ["notes", "Study Notes"], ["formulas", "Formulas & Numbers"], ["revise", "Flashcards & Revision"], ["plan", "Study Plan"], ["mocks", "Mock Tests"]];
async function examPage(e, tab) {
  const n = await notesOf(e.id);
  const head = `<section class="ehead">
    <div class="code">NISM ${esc(e.code)} · ${esc(n.workbookVersion || "")} workbook</div>
    <h1>${e.icon} ${esc(e.name)}</h1>
    <p>${esc(n.tagline)}</p>
    <div class="acts">
      <a class="btn wh" href="#/exam/${e.id}/mocks">📝 Mock tests</a>
      <a class="btn gh" href="downloads/${e.id}-notes.pdf" download>⬇️ Notes PDF</a>
      <a class="btn gh" href="notes/${e.id}.html" target="_blank" rel="noopener">🖨️ Printable notes</a>
    </div>
    <nav class="tabs">${TABS.map(([k, v]) => `<a href="#/exam/${e.id}/${k}" class="${k === tab ? "on" : ""}">${v}</a>`).join("")}</nav>
  </section>`;
  let body = "";
  if (tab === "overview") body = overview(e, n);
  else if (tab === "notes") body = notesView(e, n);
  else if (tab === "formulas") body = formulasView(n);
  else if (tab === "revise") body = reviseView(n);
  else if (tab === "plan") body = planView(n);
  else if (tab === "mocks") body = await mocksView(e, n);
  $app.innerHTML = head + body;
  if (tab === "notes") wireNotes();
  if (tab === "revise") wireFlash(n);
  if (tab === "overview") wirePassed(e);
}
function patternTable(p) {
  return `<div class="kv">
    <div><b>${esc(p.totalMarks ?? "—")}</b><span>Total marks</span></div>
    <div><b>${esc(p.durationMin ?? "—")}<small style="font-size:13px"> min</small></b><span>Duration</span></div>
    <div><b>${esc(p.passPct ?? "—")}%</b><span>Pass mark</span></div>
    <div><b style="font-size:16px">${esc(p.negative || "—")}</b><span>Negative marking</span></div>
  </div>
  ${(p.structure || []).length ? `<table class="tb" style="margin-top:14px"><tr><th>Section</th><th>Count</th><th>Marks each</th><th>Total</th></tr>
  ${p.structure.map(s => `<tr><td>${esc(s.type)}</td><td>${esc(s.count)}</td><td>${esc(s.marksEach)}</td><td>${esc(s.total)}</td></tr>`).join("")}</table>` : ""}
  <p style="font-size:14px;color:var(--muted);margin:12px 0 0">${esc(p.totalQuestions || "")}${p.validity ? ` · Certificate validity: ${esc(p.validity)}` : ""}</p>
  ${p.notes ? `<p style="font-size:14px;margin:6px 0 0">💡 ${esc(p.notes)}</p>` : ""}`;
}
function overview(e, n) {
  const g = cache["data/guide.json"]?.exams?.[e.id] || {};
  return `<div class="cols">
    <div style="display:grid;gap:18px">
      <div class="panel"><div class="eyebrow">In plain English</div><h2>What is this certification?</h2><p class="summary">${md(n.eli5)}</p>
        <h4 style="margin-top:16px">Who needs it</h4><ul class="tick">${(n.whoNeeds || []).map(x => `<li>${md(x)}</li>`).join("")}</ul></div>
      <div class="panel"><div class="eyebrow">Why it matters for you</div><p style="margin:.4em 0 0">${md(n.careerValue)}</p></div>
      <div class="panel"><div class="eyebrow">Chapter map</div><h3>${n.chapters.length} chapters</h3>
        <table class="tb">${n.chapters.map((c, i) => `<tr><td style="width:36px">${c.emoji}</td><td><a href="#/exam/${e.id}/notes" data-jump="ch${c.no}">${c.no}. ${esc(c.title)}</a></td><td><span class="chip" style="background:${PAL[i % PAL.length]}22;color:${PAL[i % PAL.length]}">${esc(c.weight)}</span></td></tr>`).join("")}</table></div>
    </div>
    <div style="display:grid;gap:18px;align-content:start">
      <div class="panel"><div class="eyebrow">Exam pattern</div><h3>How the paper looks</h3>${patternTable(n.pattern || {})}</div>
      ${Object.keys(g).length ? `<div class="panel"><div class="eyebrow">Practical details</div>
        <table class="tb">${[["Fee", g.fee], ["Mode", g.mode], ["Validity", g.validity], ["Renewal", g.renewal], ["Required for", g.requiredFor], ["Eligibility", g.eligibility]].filter(r => r[1]).map(r => `<tr><th style="width:96px">${r[0]}</th><td>${esc(r[1])}</td></tr>`).join("")}</table>
        ${(g.recentChanges || []).length ? `<h4 style="margin-top:12px">Recent changes</h4><ul class="tick">${g.recentChanges.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
        ${g.officialUrl ? `<p><a href="${esc(g.officialUrl)}" target="_blank" rel="noopener">Official NISM page ↗</a></p>` : ""}</div>` : ""}
      <div class="panel"><div class="eyebrow">Exam strategy</div><ul class="tick">${(n.examStrategy || []).map(x => `<li>${md(x)}</li>`).join("")}</ul></div>
      <div class="panel"><label style="display:flex;gap:10px;align-items:center;font-weight:700"><input type="checkbox" id="passedBox" style="width:20px;height:20px"> I've passed this exam</label>
      <p style="font-size:13px;color:var(--muted);margin:6px 0 0">Ticks it off on your roadmap (saved in this browser).</p></div>
    </div></div>`;
}
function wirePassed(e) {
  const b = document.getElementById("passedBox"); if (!b) return;
  b.checked = passedSet().has(e.id);
  b.onchange = () => { const s = passedSet(); b.checked ? s.add(e.id) : s.delete(e.id); store.set("passed", [...s]); };
  document.querySelectorAll("[data-jump]").forEach(a => a.onclick = () => store.set("jump", a.dataset.jump));
}
function notesView(e, n) {
  return `<div class="notes-tools">
      <input class="search" id="nsearch" placeholder="🔎 Search the notes (e.g. 'fee', 'crore', 'Sharpe')…">
      <button class="btn sm" id="expandAll">Expand all</button><button class="btn sm" id="collapseAll">Collapse all</button>
      <a class="btn sm pri" href="downloads/${e.id}-notes.pdf" download>⬇️ PDF</a>
    </div>
    <div class="toc">${n.chapters.map(c => `<a href="javascript:void 0" data-go="ch${c.no}">${c.emoji} ${c.no}</a>`).join("")}</div>
    ${n.chapters.map((c, i) => chapterCard(c, i)).join("")}`;
}
function chapterCard(c, i) {
  const col = PAL[i % PAL.length];
  return `<article class="chap ${i > 1 ? "closed" : ""}" id="ch${c.no}" style="--hc:${col}">
    <header><div class="num">${c.emoji}</div><div><div class="sub">Chapter ${c.no} · Weight: ${esc(c.weight)}</div><h3>${esc(c.title)}</h3></div><span class="caret">▾</span></header>
    <div class="body">
      <div class="summary">${md(c.summary)}</div>
      <div class="story"><b>Make it stick</b>${md(c.story)}</div>
      <ul class="kp">${(c.keyPoints || []).map((k, j) => `<li data-n="${j + 1}">${md(k)}</li>`).join("")}</ul>
      ${(c.mustRemember || []).length ? `<div><div class="eyebrow" style="color:${col};margin-bottom:6px">Must remember</div><div class="mr">${c.mustRemember.map(m => `<div><small>${esc(m.label)}</small><b>${esc(m.value)}</b></div>`).join("")}</div></div>` : ""}
      <div class="callouts"><div class="co tip"><b>🎯 Exam tip</b>${md(c.examTip)}</div><div class="co trap"><b>⚠️ Trap</b>${md(c.trap)}</div></div>
    </div></article>`;
}
function wireNotes() {
  document.querySelectorAll(".chap > header").forEach(h => h.onclick = () => h.parentElement.classList.toggle("closed"));
  document.getElementById("expandAll").onclick = () => document.querySelectorAll(".chap").forEach(c => c.classList.remove("closed"));
  document.getElementById("collapseAll").onclick = () => document.querySelectorAll(".chap").forEach(c => c.classList.add("closed"));
  document.querySelectorAll("[data-go]").forEach(a => a.onclick = () => { const el = document.getElementById(a.dataset.go); el.classList.remove("closed"); el.scrollIntoView({ behavior: "smooth", block: "start" }); });
  const s = document.getElementById("nsearch");
  s.oninput = () => {
    const t = s.value.trim().toLowerCase();
    document.querySelectorAll(".chap").forEach(c => {
      if (!t) { c.style.display = ""; c.querySelectorAll("li,.mr div").forEach(x => x.style.opacity = ""); return; }
      const hit = c.textContent.toLowerCase().includes(t);
      c.style.display = hit ? "" : "none"; if (hit) c.classList.remove("closed");
      c.querySelectorAll(".kp li,.mr div").forEach(x => x.style.opacity = x.textContent.toLowerCase().includes(t) ? "1" : ".35");
    });
  };
  const j = store.get("jump", null);
  if (j) { store.del("jump"); const el = document.getElementById(j); if (el) { el.classList.remove("closed"); setTimeout(() => el.scrollIntoView({ block: "start" }), 50); } }
}
function formulasView(n) {
  const f = n.formulas || [];
  return `<div class="sec"><div><div class="eyebrow">Toolkit</div><h2>Formulas</h2></div><p>${f.length ? "Every examinable formula, with a worked example." : "This exam is mostly regulatory: focus on the numbers below."}</p></div>
  <div class="grid">${f.map(x => `<div class="fcard"><b>${esc(x.name)}</b><div class="f">${esc(x.formula)}</div><div class="ex">✏️ ${md(x.example)}</div></div>`).join("")}</div>
  <div class="sec"><div><div class="eyebrow">Memorise</div><h2>Numbers to remember</h2></div></div>
  <div class="numgrid">${(n.numbersToRemember || []).map(x => `<div><b>${esc(x.value)}</b><span>${esc(x.label)}</span></div>`).join("")}</div>
  <div class="sec"><div><div class="eyebrow">Vocabulary</div><h2>Glossary</h2></div></div>
  <div class="panel"><table class="tb">${(n.glossary || []).map(x => `<tr><th style="width:30%;text-transform:none;letter-spacing:0;font-size:14px;color:var(--ink)">${esc(x.term)}</th><td>${md(x.meaning)}</td></tr>`).join("")}</table></div>`;
}
function reviseView(n) {
  return `<div class="sec"><div><div class="eyebrow">Active recall</div><h2>Flashcards</h2></div>
    <div class="dlrow"><button class="btn sm" data-deck="num">🔢 Numbers</button><button class="btn sm" data-deck="glo">📖 Glossary</button><button class="btn sm" data-deck="for">🧮 Formulas</button></div></div>
  <div class="flash" id="flash"><div class="inner"><div class="face front" id="ff"></div><div class="face back" id="fb"></div></div></div>
  <div class="fnav"><button class="btn sm" id="fprev">◀ Prev</button><span id="fpos" class="mono"></span><button class="btn sm" id="fnext">Next ▶</button><button class="btn sm" id="fshuf">🔀 Shuffle</button></div>
  <p style="text-align:center;color:var(--muted);font-size:13px">Tap the card to flip. Say the answer out loud before you flip.</p>
  <div class="sec"><div><div class="eyebrow">Night before the exam</div><h2>Quick revision: ${(n.quickRevision || []).length} one-liners</h2></div></div>
  <div class="panel"><ul class="kp" style="--hc:var(--c1)">${(n.quickRevision || []).map((x, i) => `<li data-n="${i + 1}">${md(x)}</li>`).join("")}</ul></div>`;
}
function wireFlash(n) {
  const decks = {
    num: (n.numbersToRemember || []).map(x => [x.label, x.value]),
    glo: (n.glossary || []).map(x => [x.term, x.meaning]),
    for: (n.formulas || []).map(x => [x.name, x.formula + (x.example ? "\n\n" + x.example : "")])
  };
  let deck = decks.num.length ? decks.num : decks.glo, i = 0;
  const fl = document.getElementById("flash");
  const show = () => { if (!deck.length) { document.getElementById("ff").textContent = "No cards in this deck"; return; } fl.classList.remove("flip"); document.getElementById("ff").textContent = deck[i][0]; document.getElementById("fb").textContent = deck[i][1]; document.getElementById("fpos").textContent = `${i + 1} / ${deck.length}`; };
  fl.onclick = () => fl.classList.toggle("flip");
  document.getElementById("fprev").onclick = () => { i = (i - 1 + deck.length) % deck.length; show(); };
  document.getElementById("fnext").onclick = () => { i = (i + 1) % deck.length; show(); };
  document.getElementById("fshuf").onclick = () => { deck = shuffle(deck, rng(Date.now())); i = 0; show(); };
  document.querySelectorAll("[data-deck]").forEach(b => b.onclick = () => { deck = decks[b.dataset.deck]; i = 0; show(); });
  show();
}
function planView(n) {
  const sp = n.studyPlan || {};
  return `<div class="sec"><div><div class="eyebrow">Your schedule</div><h2>${esc(sp.totalDays)}-day plan · ${esc(sp.hoursPerDay)} h/day</h2></div><p>Adjust the pace, keep the order.</p></div>
  <div class="tl">${(sp.phases || []).map((ph, i) => `<div class="st" data-n="${i + 1}"><div class="panel"><div class="eyebrow">Days ${esc(ph.days)}</div><h3>${esc(ph.focus)}</h3><ul class="tick">${(ph.tasks || []).map(t => `<li>${md(t)}</li>`).join("")}</ul></div></div>`).join("")}</div>`;
}
function mockMeta(n, m) {
  const marks = m.questions.reduce((s, q) => s + (q.marks || 1), 0);
  const total = n.pattern?.totalMarks || n.simulator.questions;
  const mins = Math.max(10, Math.round(n.simulator.durationMin * marks / total / 5) * 5);
  return { marks, mins, count: m.questions.length };
}
async function mocksView(e, n) {
  const ms = await allMocks(e.id);
  const res = results().filter(r => r.exam === e.id);
  const best = t => { const r = res.filter(x => x.test === t); return r.length ? Math.max(...r.map(x => x.pct)) : null; };
  const pool = ms.filter(Boolean).reduce((s, m) => s + m.questions.length, 0);
  const sim = n.simulator, neg = sim.negativeFraction;
  const card = (m, i) => { if (!m) return ""; const mm = mockMeta(n, m), b = best(`mock-${i + 1}`); return `<div class="mcard ${m.level === "tough" ? "tough" : ""}">
      <div style="display:flex;justify-content:space-between;align-items:center"><span class="chip ${m.level === "tough" ? "b" : "g"}">${m.level === "tough" ? "🔥 Tough" : "🌱 Easy"}</span>${b != null ? `<span class="chip ${b >= sim.passPct ? "g" : "w"}">Best ${b}%</span>` : ""}</div>
      <h4>${esc(m.title)}</h4><p>${esc(m.blurb || "")}</p>
      <p>${mm.count} questions · ${mm.marks} marks · ${mm.mins} min</p>
      <div class="row"><a class="btn sm pri" href="#/exam/${e.id}/test/mock-${i + 1}?mode=exam">⏱ Exam mode</a><a class="btn sm" href="#/exam/${e.id}/test/mock-${i + 1}?mode=learn">💡 Learn mode</a></div></div>`; };
  const past = res.slice(-8).reverse();
  return `<div class="sec"><div><div class="eyebrow">Practice</div><h2>7 mock tests + full-length simulator</h2></div>
    <p>Exam mode = timed, negative marking, results at the end. Learn mode = instant feedback with hints.</p></div>
  <div class="mgrid">
    <div class="mcard full"><span class="chip">🏁 Full-length · real pattern</span><h4>Exam-day simulator</h4>
      <p>${Math.min(sim.questions, pool)} questions drawn from all ${pool} in the bank, ${sim.durationMin} min, pass ${sim.passPct}%, ${neg ? "−" + Math.round(neg * 100) + "% per wrong answer" : "no negative marking"}. New mix every attempt.</p>
      <div class="row"><a class="btn sm wh" href="#/exam/${e.id}/test/full?mode=exam">Start simulator</a></div></div>
    ${ms.slice(0, 5).map(card).join("")}
  </div>
  <div class="groupttl">Challenge papers</div>
  <div class="mgrid">${ms.slice(5).map((m, i) => card(m, i + 5)).join("")}</div>
  ${past.length ? `<div class="sec"><h2>Recent attempts</h2></div><div class="panel"><table class="tb"><tr><th>Test</th><th>Mode</th><th>Score</th><th>When</th><th></th></tr>
  ${past.map(r => `<tr><td>${esc(r.title)}</td><td>${r.mode === "learn" ? "Learn" : "Exam"}</td><td><span class="chip ${r.passed ? "g" : "b"}">${r.pct}%</span></td><td>${new Date(r.at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</td><td><a href="#/exam/${e.id}/result/${r.id}">Review →</a></td></tr>`).join("")}</table></div>` : ""}`;
}

/* ---------- test runner ---------- */
async function buildFull(e, n) {
  const ms = (await allMocks(e.id)).filter(Boolean);
  const all = ms.flatMap(m => m.questions);
  const r = rng(Date.now());
  const singles = shuffle(all.filter(q => !q.case), r);
  const groups = {}; all.filter(q => q.case).forEach(q => (groups[q.case] = groups[q.case] || []).push(q));
  const caseItemsWanted = (n.pattern?.structure || []).filter(s => /case/i.test(s.type)).reduce((s, x) => s + (Number(x.count) || 0), 0);
  const target = n.simulator.questions;
  let caseQs = []; for (const g of shuffle(Object.values(groups), r)) { if (caseQs.length >= caseItemsWanted) break; caseQs = caseQs.concat(g); }
  const pick = singles.slice(0, Math.max(0, target - caseQs.length)).concat(caseQs);
  return pick.map(q => q.id);
}
async function runner(e, testId, mode) {
  const n = await notesOf(e.id);
  const ms = (await allMocks(e.id)).filter(Boolean);
  const byId = {}; ms.forEach(m => m.questions.forEach(q => byId[q.id] = q));
  const key = `attempt:${e.id}:${testId}:${mode}`;
  let st = store.get(key, null);
  if (st && (!st.order.every(id => byId[id]))) st = null;
  if (!st) {
    let order, title, mins;
    if (testId === "full") {
      order = await buildFull(e, n);
      title = "Full-length simulator";
      const marks = order.reduce((s, id) => s + (byId[id].marks || 1), 0);
      const total = n.pattern?.totalMarks || n.simulator.questions;
      mins = marks >= total * 0.95 ? n.simulator.durationMin : Math.round(n.simulator.durationMin * marks / total);
    } else {
      const m = ms.find(x => x.id === testId); if (!m) return notFound();
      order = m.questions.map(q => q.id); title = m.title; mins = mockMeta(n, m).mins;
    }
    st = { title, order, ans: {}, marked: [], seen: [], cur: 0, start: Date.now(), end: Date.now() + mins * 60000, mins };
    if (mode === "exam") return confirmStart(e, n, testId, mode, st, key);
  }
  store.set(key, st);
  renderRunner(e, n, testId, mode, st, key, byId);
}
function confirmStart(e, n, testId, mode, st, key) {
  const neg = n.simulator.negativeFraction;
  $app.innerHTML = `<div class="panel" style="max-width:720px;margin:20px auto">
    <div class="eyebrow">NISM ${esc(e.code)} · ${esc(st.title)}</div><h2>Instructions</h2>
    <div class="kv" style="margin:12px 0"><div><b>${st.order.length}</b><span>Questions</span></div><div><b>${st.mins}</b><span>Minutes</span></div><div><b>${n.simulator.passPct}%</b><span>To pass</span></div><div><b>${neg ? "−" + Math.round(neg * 100) + "%" : "0"}</b><span>Per wrong answer</span></div></div>
    <ul class="tick">
      <li>The timer starts when you click <b>Start</b>; the test auto-submits at 00:00.</li>
      <li><b>Save &amp; Next</b> records your answer. <b>Mark for Review</b> flags it (purple). Marked + answered questions <b>are</b> evaluated.</li>
      <li>Caselet questions show the case above the question and carry the marks shown.</li>
      <li>${neg ? `A wrong answer costs ${Math.round(neg * 100)}% of that question's marks. Unanswered = 0. Guess only when you can eliminate options.` : "There's no negative marking, so answer every question."}</li>
      <li>Refreshing the page resumes your attempt with the clock still running. A calculator is available (🧮).</li>
    </ul>
    <div style="display:flex;gap:10px;margin-top:16px"><button class="btn pri" id="go">Start test</button><a class="btn" href="#/exam/${e.id}/mocks">Back</a></div></div>`;
  document.getElementById("go").onclick = () => { st.start = Date.now(); st.end = Date.now() + st.mins * 60000; store.set(key, st); route(); };
}
function renderRunner(e, n, testId, mode, st, key, byId) {
  const learn = mode === "learn";
  const draw = () => {
    const q = byId[st.order[st.cur]];
    const a = st.ans[q.id];
    const revealed = learn && a != null;
    const caseHtml = q.case ? `<div class="case"><b>Case study</b>${md(q.case)}</div>` : "";
    document.getElementById("qarea").innerHTML = `${caseHtml}
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><span class="chip">Q ${st.cur + 1} of ${st.order.length}</span><span class="chip">${q.marks || 1} mark${(q.marks || 1) > 1 ? "s" : ""}</span><span class="chip ${q.difficulty === "hard" ? "b" : q.difficulty === "medium" ? "w" : "g"}">${q.difficulty}</span>${q.numeric ? `<span class="chip i">🧮 numerical</span>` : ""}<span class="chip">Ch ${q.chapter}</span></div>
      <div class="qtext">${md(q.q)}</div>
      ${q.options.map((o, i) => {
        let cls = "opt"; if (a === i) cls += " sel";
        if (revealed) { if (i === q.answer) cls += " right"; else if (a === i) cls += " wrong"; }
        return `<button class="${cls}" data-i="${i}"><span class="l">${L[i]}</span><span>${md(o)}${revealed ? `<span class="h">${md(q.hints[i])}</span>` : ""}</span></button>`;
      }).join("")}
      ${revealed ? `<div class="feedback"><b>${a === q.answer ? "✅ Correct!" : "❌ Not quite. Answer: " + L[q.answer]}</b><br>${md(q.explanation)}</div>` : ""}
      <div class="qact">
        <button class="btn" id="prev" ${st.cur === 0 ? "disabled" : ""}>◀ Previous</button>
        <button class="btn" id="clr">Clear response</button>
        <button class="btn mark" id="mk">${st.marked.includes(q.id) ? "Unmark" : "Mark for review"} &amp; next</button>
        <button class="btn save" id="nx">Save &amp; next ▶</button>
      </div>`;
    if (!st.seen.includes(q.id)) st.seen.push(q.id);
    document.querySelectorAll(".opt").forEach(b => b.onclick = () => { if (revealed) return; st.ans[q.id] = +b.dataset.i; save(); draw(); });
    document.getElementById("prev").onclick = () => { st.cur--; save(); draw(); };
    document.getElementById("clr").onclick = () => { if (revealed) return; delete st.ans[q.id]; save(); draw(); };
    document.getElementById("mk").onclick = () => { const i = st.marked.indexOf(q.id); i < 0 ? st.marked.push(q.id) : st.marked.splice(i, 1); next(); };
    document.getElementById("nx").onclick = next;
    pal();
  };
  const next = () => { if (st.cur < st.order.length - 1) st.cur++; save(); draw(); };
  const save = () => store.set(key, st);
  const pal = () => {
    let a = 0, mk = 0, na = 0;
    document.getElementById("palgrid").innerHTML = st.order.map((id, i) => {
      const ans = st.ans[id] != null, m = st.marked.includes(id), seen = st.seen.includes(id);
      let c = "pb"; if (m && ans) c += " mka"; else if (m) c += " mk"; else if (ans) c += " ans"; else if (seen) c += " na";
      if (ans) a++; if (m) mk++; if (seen && !ans) na++;
      if (i === st.cur) c += " cur";
      return `<button class="${c}" data-j="${i}">${i + 1}</button>`;
    }).join("");
    document.getElementById("pcount").innerHTML = `<span class="chip g">${a} answered</span> <span class="chip b">${na} not answered</span> <span class="chip" style="background:#7c3aed22;color:#7c3aed">${mk} marked</span>`;
    document.querySelectorAll(".pb").forEach(b => b.onclick = () => { st.cur = +b.dataset.j; save(); draw(); });
  };
  $app.innerHTML = `<div class="cbt-top"><b>${e.icon} ${esc(e.short)} · ${esc(st.title)}</b><span class="chip ${learn ? "i" : "w"}">${learn ? "💡 Learn mode" : "⏱ Exam mode"}</span>
      <span style="margin-left:auto" class="timer" id="timer"></span><button class="btn sm" id="calcBtn">🧮</button><button class="btn sm pri" id="submit">Submit</button></div>
    <div class="cbt"><div class="qbox" id="qarea"></div>
      <aside class="pal"><b>Question palette</b><div id="pcount" style="margin-top:6px;display:flex;gap:4px;flex-wrap:wrap"></div><div class="palgrid" id="palgrid"></div>
        <div class="legend"><span><i style="background:#16a34a"></i>Answered</span><span><i style="background:#ef4444"></i>Not answered</span><span><i style="background:#7c3aed"></i>Marked</span><span><i style="background:var(--soft);border:1px solid var(--line)"></i>Not visited</span></div></aside></div>`;
  const tick = () => {
    const el = document.getElementById("timer"); if (!el) return clearInterval(timerHandle);
    if (learn) { el.textContent = "⏱ " + fmtT((Date.now() - st.start) / 1000); return; }
    const left = (st.end - Date.now()) / 1000; el.textContent = fmtT(left); el.classList.toggle("low", left < 300);
    if (left <= 0) { clearInterval(timerHandle); finish(); }
  };
  const finish = () => {
    const r = scoreAttempt(e, n, testId, mode, st, byId);
    store.del(key); const all = results(); all.push(r); store.set("results", all.slice(-300));
    location.hash = `#/exam/${e.id}/result/${r.id}`;
  };
  document.getElementById("submit").onclick = () => {
    const un = st.order.filter(id => st.ans[id] == null).length, mk = st.marked.length;
    const m = document.createElement("div"); m.className = "modal";
    m.innerHTML = `<div class="panel"><h3>Submit the test?</h3><p>${st.order.length - un} answered · ${un} unanswered · ${mk} marked for review.</p><div style="display:flex;gap:10px"><button class="btn pri" id="yes">Yes, submit</button><button class="btn" id="no">Keep going</button></div></div>`;
    document.body.appendChild(m);
    m.querySelector("#no").onclick = () => m.remove(); m.querySelector("#yes").onclick = () => { m.remove(); clearInterval(timerHandle); finish(); };
  };
  document.getElementById("calcBtn").onclick = toggleCalc;
  draw(); tick(); timerHandle = setInterval(tick, 1000);
}
function toggleCalc() {
  const ex = document.querySelector(".calc"); if (ex) return ex.remove();
  const c = document.createElement("div"); c.className = "calc panel";
  c.innerHTML = `<div style="display:flex;justify-content:space-between;margin-bottom:6px"><b>Calculator</b><button class="btn sm" id="cx">✕</button></div><input id="cin" placeholder="e.g. 100000*(1.08)^5"><div id="cout" class="mono" style="margin-top:8px;font-size:18px"></div><small style="color:var(--muted)">Supports + − * / ^ ( ) and %</small>`;
  document.body.appendChild(c);
  c.querySelector("#cx").onclick = () => c.remove();
  const inp = c.querySelector("#cin"); inp.focus();
  inp.oninput = () => { const s = inp.value.replace(/\^/g, "**").replace(/(\d+(\.\d+)?)%/g, "($1/100)"); if (!/^[\d+\-*/().\s*]*$/.test(s)) { c.querySelector("#cout").textContent = "…"; return; } try { const v = Function(`"use strict";return (${s || 0})`)(); c.querySelector("#cout").textContent = Number.isFinite(v) ? "= " + (+v.toFixed(6)).toLocaleString("en-IN", { maximumFractionDigits: 6 }) : "…"; } catch { c.querySelector("#cout").textContent = "…"; } };
}
function scoreAttempt(e, n, testId, mode, st, byId) {
  const neg = n.simulator.negativeFraction || 0;
  let score = 0, total = 0, correct = 0, wrong = 0, skipped = 0; const perCh = {}, perDiff = {};
  st.order.forEach(id => {
    const q = byId[id], mk = q.marks || 1, a = st.ans[id]; total += mk;
    const c = perCh[q.chapter] = perCh[q.chapter] || { t: 0, c: 0, w: 0, s: 0 };
    const d = perDiff[q.difficulty] = perDiff[q.difficulty] || { t: 0, c: 0, w: 0, s: 0 };
    c.t++; d.t++;
    if (a == null) { skipped++; c.s++; d.s++; }
    else if (a === q.answer) { correct++; score += mk; c.c++; d.c++; }
    else { wrong++; score -= mk * neg; c.w++; d.w++; }
  });
  score = Math.round(score * 100) / 100;
  const pct = Math.max(0, Math.round(score / total * 1000) / 10);
  return { id: Date.now().toString(36), exam: e.id, test: testId, title: st.title, mode, at: Date.now(), timeSec: Math.round((Math.min(Date.now(), st.end) - st.start) / 1000), score, total, pct, passed: pct >= n.simulator.passPct, correct, wrong, skipped, perCh, perDiff, order: st.order, ans: st.ans, marked: st.marked, neg };
}

/* ---------- results ---------- */
async function resultView(e, rid, filter) {
  const n = await notesOf(e.id);
  const r = results().find(x => x.id === rid); if (!r) return notFound();
  const ms = (await allMocks(e.id)).filter(Boolean);
  const byId = {}; ms.forEach(m => m.questions.forEach(q => byId[q.id] = q));
  const ch = Object.fromEntries(n.chapters.map(c => [c.no, c]));
  const color = r.passed ? (r.pct >= 75 ? "#16a34a" : "#0ea5e9") : "#ef4444";
  const weak = Object.entries(r.perCh).map(([k, v]) => [k, v, v.c / v.t]).sort((a, b) => a[2] - b[2]).filter(x => x[2] < 0.6).slice(0, 4);
  const attempted = r.correct + r.wrong;
  const rows = r.order.map((id, i) => [i, byId[id]]).filter(([, q]) => q).filter(([, q]) => {
    const a = r.ans[q.id]; if (filter === "wrong") return a != null && a !== q.answer; if (filter === "skipped") return a == null; if (filter === "marked") return r.marked.includes(q.id); return true;
  });
  $app.innerHTML = `<div class="panel"><div class="score">
      <div class="ring" style="--p:${r.pct};--rc:${color}"><div><b>${r.pct}%</b><small>${r.score} / ${r.total}</small></div></div>
      <div><div class="eyebrow">${esc(e.code)} · ${esc(r.title)} · ${r.mode === "learn" ? "Learn mode" : "Exam mode"}</div>
        <div class="verdict" style="color:${color}">${r.passed ? (r.pct >= 75 ? "🏆 Excellent: exam-ready on this set!" : "✅ Passed. Keep pushing toward 75%+") : "📚 Not yet. Here's your recovery plan"}</div>
        <div class="dlrow" style="margin:10px 0"><span class="chip g">✔ ${r.correct} correct</span><span class="chip b">✘ ${r.wrong} wrong</span><span class="chip w">○ ${r.skipped} skipped</span><span class="chip">🎯 accuracy ${attempted ? Math.round(r.correct / attempted * 100) : 0}%</span><span class="chip">⏱ ${fmtT(r.timeSec)}</span>${r.neg && r.wrong ? `<span class="chip b">−${(r.wrong * r.neg).toFixed(2)} lost to negatives</span>` : ""}</div>
        <p style="margin:0;color:var(--muted)">Pass mark ${n.simulator.passPct}%. Aim for 75%+ in mocks to walk in with a safety margin.</p>
        <div class="dlrow" style="margin-top:12px"><a class="btn pri" href="#/exam/${e.id}/test/${r.test}?mode=${r.mode}">↻ Retake</a><a class="btn" href="#/exam/${e.id}/mocks">All mocks</a><a class="btn" href="#/exam/${e.id}/notes">Open notes</a></div></div></div></div>
  <div class="cols">
    <div class="panel"><h3>Chapter-wise performance</h3>${Object.entries(r.perCh).sort((a, b) => a[0] - b[0]).map(([k, v]) => { const p = Math.round(v.c / v.t * 100); return `<div class="hbar"><span>${ch[k]?.emoji || ""} ${k}. ${esc(ch[k]?.title || "")}</span><div class="t"><i style="width:${p}%;background:${p >= 75 ? "#16a34a" : p >= 60 ? "#0ea5e9" : p >= 40 ? "#f59e0b" : "#ef4444"}"></i></div><b>${v.c}/${v.t}</b></div>`; }).join("")}</div>
    <div class="panel"><h3>What to do next</h3>${weak.length ? `<ul class="tick">${weak.map(([k, , p]) => `<li>Re-read <b>Ch ${k}: ${esc(ch[k]?.title || "")}</b> (${Math.round(p * 100)}%). Focus on its "Must remember" box and trap.</li>`).join("")}<li>Redo the wrong answers below in Learn mode and read every hint.</li></ul>` : `<p>No weak chapters in this paper 🎉 Move to the next mock or the full-length simulator.</p>`}
    <h4 style="margin-top:14px">By difficulty</h4>${["easy", "medium", "hard"].filter(d => r.perDiff[d]).map(d => { const v = r.perDiff[d]; return `<div class="hbar"><span>${d}</span><div class="t"><i style="width:${v.c / v.t * 100}%;background:var(--c1)"></i></div><b>${v.c}/${v.t}</b></div>`; }).join("")}</div>
  </div>
  <div class="sec"><h2>Answer review</h2><div class="dlrow">${[["all", "All"], ["wrong", "Wrong"], ["skipped", "Skipped"], ["marked", "Marked"]].map(([k, v]) => `<a class="btn sm ${filter === k ? "pri" : ""}" href="#/exam/${e.id}/result/${r.id}?f=${k}">${v}</a>`).join("")}</div></div>
  ${rows.map(([i, q]) => { const a = r.ans[q.id]; const cls = a == null ? "s" : a === q.answer ? "c" : "w"; return `<div class="rev ${cls}">
    ${q.case ? `<div class="case"><b>Case study</b>${md(q.case)}</div>` : ""}
    <div class="dlrow"><span class="chip">Q${i + 1}</span><span class="chip">Ch ${q.chapter}</span><span class="chip">${q.difficulty}</span>${a == null ? `<span class="chip w">Skipped</span>` : a === q.answer ? `<span class="chip g">Correct</span>` : `<span class="chip b">Wrong</span>`}</div>
    <div class="qtext" style="font-size:16px">${md(q.q)}</div>
    ${q.options.map((o, j) => `<div class="opt ${j === q.answer ? "right" : a === j ? "wrong" : ""}" style="cursor:default"><span class="l">${L[j]}</span><span>${md(o)}<span class="h">${md(q.hints[j])}</span></span></div>`).join("")}
    <div class="feedback">💡 ${md(q.explanation)}</div></div>`; }).join("") || `<div class="panel empty">Nothing in this filter.</div>`}`;
}

/* ---------- global pages ---------- */
async function guide() { try { return await getJSON("data/guide.json"); } catch { return {}; } }
async function roadmapData() { try { return await getJSON("data/roadmap.json"); } catch { return null; } }
async function roadmap() {
  const rm = await roadmapData(); const passed = passedSet();
  if (!rm) { $app.innerHTML = `<div class="panel empty">Roadmap coming soon.</div>`; return; }
  $app.innerHTML = `<section class="hero" style="background:radial-gradient(900px 400px at 0% 0%,#10b981 0%,transparent 60%),radial-gradient(900px 500px at 100% 0%,#0ea5e9 0%,transparent 55%),#0c4a6e"><div class="blob">🗺️</div>
    <div class="eyebrow" style="color:#bbf7d0">Your personal roadmap</div><h1>${esc(rm.title)}</h1><p>${md(rm.intro)}</p></section>
  <div class="tl" style="margin-top:30px">${rm.steps.map((s, i) => { const e = BYID[s.id]; return `<div class="st" data-n="${i + 1}" style="--c1:${e?.c1 || "#7c3aed"};--c2:${e?.c2 || "#ec4899"}"><div class="panel">
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span class="eyebrow">${esc(s.phase)}</span><span class="chip">⏳ ${esc(s.weeks)}</span>${passed.has(s.id) ? `<span class="chip g">✅ Done</span>` : ""}</div>
    <h3 style="margin-top:6px">${e ? `${e.icon} <a href="#/exam/${e.id}">NISM ${esc(e.code)}: ${esc(e.name)}</a>` : esc(s.name)}</h3>
    <p style="margin:0">${md(s.why)}</p></div></div>`; }).join("")}</div>
  ${rm.skip?.length ? `<div class="sec"><h2>Park these for now</h2></div><div class="grid">${rm.skip.map(s => { const e = BYID[s.id]; return `<div class="panel"><h4>${e ? e.icon + " " + esc(e.code) + ": " + esc(e.name) : esc(s.id)}</h4><p style="margin:0">${md(s.why)}</p></div>`; }).join("")}</div>` : ""}
  ${rm.weekly ? `<div class="sec"><h2>A sustainable weekly rhythm</h2></div><div class="panel"><ul class="tick">${rm.weekly.map(x => `<li>${md(x)}</li>`).join("")}</ul></div>` : ""}`;
}
async function strategy() {
  const g = await guide();
  $app.innerHTML = `<section class="hero" style="background:radial-gradient(900px 400px at 0% 0%,#f97316 0%,transparent 60%),radial-gradient(900px 500px at 100% 0%,#eab308 0%,transparent 55%),#7c2d12"><div class="blob">🧠</div>
    <div class="eyebrow" style="color:#fef08a">Researched playbook</div><h1>How to prepare and pass NISM exams</h1><p>What actually works: workbook-first study, active recall, mock-test loops and disciplined negative-marking tactics.</p></section>
  <div class="cols"><div class="panel"><h2>The method</h2>${(g.prepStrategy || []).map((s, i) => `<div style="margin:14px 0"><h4><span class="chip" style="background:${PAL[i % PAL.length]};color:#fff">${i + 1}</span> ${esc(s.title)}</h4><p style="margin:0">${md(s.detail)}</p></div>`).join("")}</div>
  <div style="display:grid;gap:18px;align-content:start">
    <div class="panel"><h3>➖ Negative marking: when to guess</h3><p>${md(g.negativeMarkingPolicy || "")}</p></div>
    <div class="panel"><h3>🚫 Why people fail</h3><ul class="tick">${(g.whyPeopleFail || []).map(x => `<li>${md(x)}</li>`).join("")}</ul></div>
    <div class="panel"><h3>🔗 Syllabus overlaps you can exploit</h3><ul class="tick">${(g.overlaps || []).map(o => `<li><b>${o.exams.map(id => BYID[id]?.short || id).join(" ↔ ")}</b>: ${md(o.detail)}</li>`).join("")}</ul></div>
  </div></div>`;
}
async function updates() {
  const g = await guide();
  $app.innerHTML = `<section class="hero" style="background:radial-gradient(900px 400px at 0% 0%,#ef4444 0%,transparent 60%),radial-gradient(900px 500px at 100% 0%,#d946ef 0%,transparent 55%),#4c0519"><div class="blob">📣</div>
    <div class="eyebrow" style="color:#fecdd3">Read before you book</div><h1>Exam day rules &amp; important notifications</h1><p>Updated ${esc(g.updated || "")}. Always re-check nism.ac.in before your exam date.</p></section>
  <div class="sec"><h2>📣 Important notifications</h2></div>
  <div class="grid">${(g.notifications || []).map(x => `<div class="panel"><div class="dlrow"><span class="chip w">${esc(x.date || "Ongoing")}</span>${(x.affects || []).map(id => `<span class="chip">${esc(BYID[id]?.short || id)}</span>`).join("")}</div><h4 style="margin-top:8px">${esc(x.title)}</h4><p style="margin:0;font-size:14.5px">${md(x.detail)}</p>${x.source ? `<p style="margin:6px 0 0;font-size:13px"><a href="${esc(x.source)}" target="_blank" rel="noopener">Source ↗</a></p>` : ""}</div>`).join("")}</div>
  <div class="sec"><h2>🪪 Exam-day rules &amp; logistics</h2></div>
  <div class="panel"><table class="tb">${(g.examDayRules || []).map(x => `<tr><th style="width:26%;text-transform:none;letter-spacing:0;font-size:14px;color:var(--ink)">${esc(x.title)}</th><td>${md(x.detail)}</td></tr>`).join("")}</table></div>
  <div class="sec"><h2>💳 Fees, validity &amp; who must hold each certificate</h2></div>
  <div class="panel" style="overflow-x:auto"><table class="tb"><tr><th>Exam</th><th>Fee</th><th>Validity / renewal</th><th>Required for</th></tr>${EXAMS.map(e => { const x = g.exams?.[e.id] || {}; return `<tr><td><a href="#/exam/${e.id}">${e.icon} ${esc(e.code)}</a><br><small>${esc(e.name)}</small></td><td>${esc(x.fee || "—")}</td><td>${esc(x.validity || "—")}${x.renewal ? `<br><small>${esc(x.renewal)}</small>` : ""}</td><td><small>${esc(x.requiredFor || "—")}</small></td></tr>`; }).join("")}</table></div>
  <div class="sec"><h2>Sources</h2></div><div class="panel"><ul class="tick">${(g.sources || []).map(s => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a></li>`).join("")}</ul></div>`;
}
async function progress() {
  const res = results(); const passed = passedSet();
  const rows = EXAMS.map(e => {
    const mine = res.filter(r => r.exam === e.id && r.mode === "exam");
    const cells = ["mock-1", "mock-2", "mock-3", "mock-4", "mock-5", "mock-6", "mock-7", "full"].map(t => { const r = mine.filter(x => x.test === t); if (!r.length) return `<td style="color:var(--muted)">·</td>`; const b = Math.max(...r.map(x => x.pct)); return `<td><span class="chip ${r.some(x => x.passed) ? "g" : "b"}">${b}</span></td>`; }).join("");
    return `<tr><td><a href="#/exam/${e.id}/mocks">${e.icon} ${esc(e.short)}</a>${passed.has(e.id) ? " ✅" : ""}</td>${cells}</tr>`;
  }).join("");
  $app.innerHTML = `<div class="sec"><div><div class="eyebrow">Saved in this browser</div><h2>My progress</h2></div><p>Best exam-mode score (%) per paper. Green = passed.</p></div>
    <div class="panel" style="overflow-x:auto"><table class="tb"><tr><th>Exam</th>${[1, 2, 3, 4, 5, 6, 7].map(i => `<th>M${i}</th>`).join("")}<th>Full</th></tr>${rows}</table></div>
    <div class="dlrow" style="margin-top:16px"><button class="btn" id="exp">⬇️ Export progress</button><label class="btn">⬆️ Import<input type="file" id="imp" accept=".json" hidden></label><button class="btn" id="rst">Reset all</button></div>`;
  document.getElementById("exp").onclick = () => { const b = new Blob([JSON.stringify({ results: results(), passed: [...passedSet()] })], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "nism-progress.json"; a.click(); };
  document.getElementById("imp").onchange = ev => { const f = ev.target.files[0]; if (!f) return; f.text().then(t => { const d = JSON.parse(t); store.set("results", d.results || []); store.set("passed", d.passed || []); route(); }); };
  document.getElementById("rst").onclick = () => { if (confirm("Delete all saved attempts?")) { store.set("results", []); route(); } };
}

/* ---------- boot ---------- */
(async () => {
  EXAMS = await getJSON("data/exams.json");
  EXAMS.forEach(e => BYID[e.id] = e);
  guide();
  window.addEventListener("hashchange", route);
  route();
})();
})();
