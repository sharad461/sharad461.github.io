// Charts, tabs and the passage list. Data comes from data.js.

const ROWS = ISSUES.map(([n, d, ok, m, quoted, paper, outside, staff, army]) =>
  ({ n, d, ok: !!ok, m, quoted, paper, outside, staff, army, uses: ok ? quoted + paper + outside + staff : 0 }));

const EVENTS = [
  ["2001-11-26", "Declared"],
  ["2003-01-30", "Withdrawn"],
  ["2003-08-28", "Declared again"],
  ["2005-02-01", "Takeover"],
];
const IN_FORCE = [["2001-11-26", "2003-01-30"], ["2003-08-28", "2005-09-02"]];
const START = Date.parse("2001-08-27"), END = Date.parse("2005-09-02");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const COLORS = { quoted: "blue", paper: "yellow", outside: "green", staff: "orange" };
const WHO_LABEL = { quoted: "Quoted or reported", paper: "Other newspaper", outside: "Reader or columnist", staff: "Staff" };

const pdf = (n, p) => `https://media.nepalitimes.com/issues/epapers/${n}.pdf` + (p ? `#page=${p}` : "");
const issuePage = n => `https://nepalitimes.com/issue/${n}`;
const fmt = d => { const [y, m, dd] = d.split("-"); return `${+dd} ${MONTHS[+m - 1]} ${y}`; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const NS = "http://www.w3.org/2000/svg";
function svgEl(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function text(parent, x, y, str, attrs = {}) {
  const t = svgEl("text", { x, y, ...attrs }, parent);
  t.textContent = str;
  return t;
}

// ---------- tooltip
const tip = document.getElementById("tip");
function showTip(html, ev) {
  tip.innerHTML = html;
  tip.hidden = false;
  const w = tip.offsetWidth, h = tip.offsetHeight;
  let x = ev.clientX + 14, y = ev.clientY + 14;
  if (x + w > innerWidth - 8) x = ev.clientX - w - 14;
  if (y + h > innerHeight - 8) y = ev.clientY - h - 14;
  tip.style.left = x + "px";
  tip.style.top = y + "px";
}
function hideTip() { tip.hidden = true; }

function addHit(parent, r, x, y, w, h, html) {
  const a = svgEl("a", { href: pdf(r.n), target: "_blank", rel: "noopener" }, parent);
  const rect = svgEl("rect", { class: "hit", x, y, width: w, height: h }, a);
  rect.addEventListener("mousemove", ev => showTip(html, ev));
  rect.addEventListener("mouseleave", hideTip);
}

// ---------- timeline
function drawTimeline() {
  const box = document.getElementById("tl");
  box.innerHTML = "";
  const W = box.clientWidth; if (!W) return;
  const narrow = W < 600;
  const H = narrow ? 240 : 300, m = { t: narrow ? 40 : 28, r: 4, b: 34, l: 26 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const x = d => m.l + (Date.parse(d) - START) / (END - START) * iw;
  const bw = Math.max(1.2, 7 * 864e5 / (END - START) * iw - 1);
  const vmax = Math.ceil(Math.max(...ROWS.map(r => r.uses)) / 5) * 5;
  const y = v => m.t + ih - v / vmax * ih;
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H }, box);

  for (const [a, b] of IN_FORCE) svgEl("rect", { class: "band", x: x(a), y: m.t, width: x(b) - x(a), height: ih }, svg);
  for (let v = 0; v <= vmax; v += 5) {
    if (v) svgEl("line", { class: "grid", x1: m.l, x2: W - m.r, y1: y(v), y2: y(v) }, svg);
    text(svg, m.l - 6, y(v) + 4, v, { "text-anchor": "end" });
  }
  for (let yr = 2002; yr <= 2005; yr++) text(svg, x(`${yr}-01-01`), H - 8, yr, { "text-anchor": "middle" });

  for (const r of ROWS) {
    if (!r.d) continue;
    if (!r.ok) { svgEl("rect", { class: "unread", x: x(r.d), y: m.t + ih + 6, width: bw, height: 4, rx: 1 }, svg); continue; }
    if (!r.uses) continue;
    svgEl("rect", { class: "bar", x: x(r.d), y: y(r.uses), width: bw, height: m.t + ih - y(r.uses), rx: Math.min(1.5, bw / 2) }, svg);
    if (r.staff) svgEl("rect", { class: "bar hot", x: x(r.d), y: y(r.uses), width: bw, height: Math.max(3, r.staff / vmax * ih), rx: Math.min(1.5, bw / 2) }, svg);
  }
  svgEl("line", { class: "base", x1: m.l, x2: W - m.r, y1: m.t + ih, y2: m.t + ih }, svg);

  const ev = svgEl("g", { class: "ev" }, svg);
  EVENTS.forEach(([d, label], i) => {
    const ex = x(d), ty = narrow ? 12 + (i % 2) * 15 : 14;
    svgEl("line", { x1: ex, x2: ex, y1: ty + 5, y2: m.t + ih }, ev);
    const end = ex > W * 0.8;
    text(ev, end ? ex - 4 : ex + 4, ty, label, { "text-anchor": end ? "end" : "start" });
  });

  for (const r of ROWS) {
    if (!r.d) continue;
    const html = `<b>#${r.n}</b> · ${fmt(r.d)}<br>` + (r.ok
      ? `${r.uses} use${r.uses === 1 ? "" : "s"} of "terrorist"<br>${r.m} mentions of the Maoists` + (r.staff ? `<br>${r.staff} by staff` : "")
      : "Unreadable");
    addHit(svg, r, x(r.d) - 1, m.t, bw + 2, ih + 14, html);
  }
}

// ---------- period row
document.getElementById("periods").innerHTML = PERIODS.map(p => `
  <div class="per${p.on ? " on" : ""}">
    <span class="name">${esc(p.name)}</span>
    <span class="range">${esc(p.range)}</span>
    <span class="ratio">1 in ${p.one_in}</span>
  </div>`).join("");

// ---------- who chart
(function drawWho() {
  const keys = ["quoted", "paper", "outside", "staff"];
  const max = Math.max(...PERIODS.map(p => p.uses));
  document.getElementById("whochart").innerHTML = PERIODS.map(p => {
    const segs = keys.filter(k => p[k] > 0).map(k => {
      const share = p[k] / p.uses * 100, abs = p[k] / max * 100;
      return `<div class="seg ${COLORS[k]}" style="width:${share}%;background:var(--${COLORS[k]})" title="${WHO_LABEL[k]}: ${p[k]}">${abs > 5 ? p[k] : ""}</div>`;
    }).join("");
    return `<div class="who-row">
      <div class="name">${esc(p.name)}<small>${esc(p.range)}</small></div>
      <div class="track"><div class="stack" style="width:calc(${p.uses / max * 100}% - 40px)">${segs}</div><span class="tot">${p.uses}</span></div>
    </div>`;
  }).join("");
})();

// ---------- passages
let filter = "all";
function renderQuotes() {
  const list = PASSAGES.filter(q => filter === "all" || q.period === filter);
  document.getElementById("quotes").innerHTML = list.map(q => {
    const body = esc(q.quote.replace(/^“([^“”]*)”$/, "$1")).replace(/\b(terrorists?)\b/gi, "<mark>$1</mark>");
    const links = [`<a href="${pdf(q.issue, q.page)}" target="_blank" rel="noopener">Print page</a>`,
      q.web ? `<a href="${q.web}" target="_blank" rel="noopener">Article</a>`
            : `<a href="${issuePage(q.issue)}" target="_blank" rel="noopener">Issue</a>`];
    return `<li>
      <div class="meta"><b>#${q.issue}</b><span>${fmt(q.date)}</span><span>${esc(q.head)}</span></div>
      <p class="q">“${body}”</p>
      <div class="meta"><span><i class="dot" style="background:var(--${COLORS[q.who]})"></i>${WHO_LABEL[q.who]}</span><span>${esc(q.by)}</span></div>
      <div class="links">${links.join("")}</div>
    </li>`;
  }).join("");
}
const filters = document.getElementById("filters");
filters.innerHTML = [["all", "All"], ...PERIODS.map(p => [p.id, p.name])]
  .map(([id, label]) => `<button data-f="${id}" aria-pressed="${id === filter}">${esc(label)}</button>`).join("");
filters.addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  filter = b.dataset.f;
  filters.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b));
  renderQuotes();
});
renderQuotes();

// ---------- army close-up
function drawArmy() {
  const box = document.getElementById("armychart");
  box.innerHTML = "";
  const W = box.clientWidth; if (!W) return;
  const narrow = W < 600;
  const rows = ROWS.filter(r => r.n >= 229 && r.n <= 244);
  const H = narrow ? 240 : 280, m = { t: 30, r: 4, b: 40, l: 26 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b, slot = iw / rows.length, bw = Math.min(32, slot * 0.64);
  const usual = 27, vmax = 30;
  const y = v => m.t + ih - v / vmax * ih;
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H }, box);

  for (let v = 0; v <= vmax; v += 10) {
    if (v) svgEl("line", { class: "grid", x1: m.l, x2: W - m.r, y1: y(v), y2: y(v) }, svg);
    text(svg, m.l - 6, y(v) + 4, v, { "text-anchor": "end" });
  }
  svgEl("line", { class: "median", x1: m.l, x2: W - m.r, y1: y(usual), y2: y(usual) }, svg);
  text(svg, W - m.r, y(usual) - 6, `usual: ${usual}`, { "text-anchor": "end" });

  rows.forEach((r, i) => {
    const cx = m.l + slot * (i + 0.5), bx = cx - bw / 2, hot = r.n >= 233 && r.n <= 235;
    if (!r.ok) svgEl("rect", { class: "unread", x: bx, y: y(0) - 4, width: bw, height: 4, rx: 1 }, svg);
    else {
      svgEl("rect", { class: "bar" + (hot ? " hot" : ""), x: bx, y: y(r.army), width: bw, height: Math.max(1.5, y(0) - y(r.army)), rx: 2 }, svg);
      const t = text(svg, cx, y(r.army) - 5, r.army, { "text-anchor": "middle" });
      t.style.fontWeight = "600"; t.style.fill = hot ? "var(--orange)" : "var(--ink)";
    }
    if (!narrow || i % 2 === 0 || hot) text(svg, cx, H - 22, "#" + r.n, { "text-anchor": "middle" });
  });
  const seen = new Set();
  rows.forEach((r, i) => {
    const k = r.d.slice(0, 7); if (seen.has(k)) return; seen.add(k);
    text(svg, m.l + slot * (i + 0.5), H - 6, `${MONTHS[+k.slice(5) - 1]} ${k.slice(0, 4)}`, { "text-anchor": "middle" });
  });
  svgEl("line", { class: "base", x1: m.l, x2: W - m.r, y1: y(0), y2: y(0) }, svg);

  const xT = m.l + slot * rows.findIndex(r => r.n === 233);
  const ev = svgEl("g", { class: "ev" }, svg);
  svgEl("line", { x1: xT, x2: xT, y1: 18, y2: y(0) }, ev);
  text(ev, xT + 4, 14, "1 Feb 2005");

  rows.forEach((r, i) => addHit(svg, r, m.l + slot * i, m.t, slot, ih + 20,
    `<b>#${r.n}</b> · ${fmt(r.d)}<br>` + (r.ok ? `"army" + "military": ${r.army}` : "Unreadable")));
}

// ---------- tabs
const TABS = ["timeline", "who", "passages", "army"];
function show(id) {
  if (!TABS.includes(id)) id = "timeline";
  for (const t of TABS) {
    document.getElementById(t).hidden = t !== id;
    document.getElementById("tab-" + t).setAttribute("aria-selected", t === id);
  }
  hideTip();
  if (id === "timeline") drawTimeline();
  if (id === "army") drawArmy();
}
document.querySelector(".tabs").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  history.replaceState(null, "", "#" + b.dataset.tab);
  show(b.dataset.tab);
});
addEventListener("hashchange", () => show(location.hash.slice(1)));
let rt;
addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => show(location.hash.slice(1)), 100); });
show(location.hash.slice(1));
