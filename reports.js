"use strict";
/* ==========================================================================
   REPORTS — habits, fitness and diary over a week, a month or a year.

   Every total here is the sum of its own buckets: each figure comes from one
   per-item function (contribution, kcalOf, modMinutes …) summed over the
   range, and each bar sums the same function over its slice of that range.
   ========================================================================== */

/** pts: [{x:label, y:number}] → a smooth area line. */
function lineChartSVG(pts, opt){
  opt = opt || {};
  const W = 320, H = opt.h || 120, P = 22;
  if (!pts.length) return "";
  const ys = pts.map(p => p.y);
  let lo = opt.min != null ? opt.min : Math.min(...ys), hi = opt.max != null ? opt.max : Math.max(...ys);
  if (hi - lo < 1e-9){ hi += 1; lo -= 1; }
  const pad = opt.min != null ? 0 : (hi - lo) * .15; lo -= pad; hi += pad;
  const X = (i) => P + (pts.length === 1 ? (W - 2 * P) / 2 : i * (W - 2 * P) / (pts.length - 1));
  const Y = (v) => 8 + (H - 30) * (1 - (v - lo) / (hi - lo));
  let d = "";
  pts.forEach((p, i) => {
    if (!i){ d = "M" + X(0) + " " + Y(p.y); return; }
    const x0 = X(i - 1), y0 = Y(pts[i - 1].y), x1 = X(i), y1 = Y(p.y), cx = (x0 + x1) / 2;
    d += " C" + cx + " " + y0 + " " + cx + " " + y1 + " " + x1 + " " + y1;
  });
  const id = "l" + Math.random().toString(36).slice(2, 7);
  const lab = (i) => pts.length <= 8 || i === 0 || i === pts.length - 1 || i % Math.ceil(pts.length / 6) === 0;
  return '<svg class="chart" viewBox="0 0 ' + W + " " + H + '"><defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--a1)" stop-opacity=".35"/><stop offset="1" stop-color="var(--a1)" stop-opacity="0"/></linearGradient>' +
    '<linearGradient id="' + id + 's" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="var(--a1)"/><stop offset="1" stop-color="var(--a2)"/></linearGradient></defs>' +
    '<line class="grid" x1="' + P + '" x2="' + (W - P) + '" y1="' + Y(hi - pad) + '" y2="' + Y(hi - pad) + '"/><line class="grid" x1="' + P + '" x2="' + (W - P) + '" y1="' + Y(lo + pad) + '" y2="' + Y(lo + pad) + '"/>' +
    '<text x="2" y="' + (Y(hi - pad) + 3) + '">' + fmtN(hi - pad, 1) + '</text><text x="2" y="' + (Y(lo + pad) + 3) + '">' + fmtN(lo + pad, 1) + "</text>" +
    (pts.length > 1 ? '<path d="' + d + " L" + X(pts.length - 1) + " " + (H - 22) + " L" + X(0) + " " + (H - 22) + 'Z" fill="url(#' + id + ')"/>' : "") +
    '<path d="' + d + '" fill="none" stroke="url(#' + id + 's)" stroke-width="2.5" stroke-linecap="round"/>' +
    pts.map((p, i) => '<circle cx="' + X(i) + '" cy="' + Y(p.y) + '" r="' + (pts.length > 40 ? 0 : 3.2) + '" fill="var(--surface)" stroke="var(--a1)" stroke-width="2"/>' +
      (lab(i) ? '<text x="' + X(i) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(opt.label ? opt.label(p.x) : String(p.x).slice(5)) + "</text>" : "")).join("") + "</svg>";
}

/** bars: [{label, value, color?, title?}] with an optional dashed goal line. */
function barChartSVG(bars, opt){
  opt = opt || {};
  const W = 320, H = opt.h || 130, top = 14, bottom = 20;
  const max = Math.max(opt.max || 0, opt.goal || 0, ...bars.map(b => b.value), 1e-9);
  const slot = (W - 4) / Math.max(1, bars.length), bw = Math.min(30, slot * .64);
  const Y = (v) => top + (H - top - bottom) * (1 - v / max);
  const every = Math.ceil(bars.length / 12);
  let out = '<svg class="chart" viewBox="0 0 ' + W + " " + H + '"><defs><linearGradient id="bgr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--a2)"/><stop offset="1" stop-color="var(--a1)"/></linearGradient></defs>' +
    '<line class="grid" x1="0" x2="' + W + '" y1="' + Y(0) + '" y2="' + Y(0) + '"/>';
  bars.forEach((b, i) => {
    const x = 2 + i * slot + (slot - bw) / 2, h = Math.max(b.value > 0 ? 2 : 0, Y(0) - Y(b.value));
    out += '<rect x="' + x + '" y="' + (Y(0) - h) + '" width="' + bw + '" height="' + h + '" rx="' + Math.min(6, bw / 3) + '" fill="' + (b.color || "url(#bgr)") + '"><title>' + esc(b.title || (b.label + ": " + fmtN(b.value, 1))) + "</title></rect>";
    if (opt.values && b.value > 0 && bars.length <= 12) out += '<text x="' + (x + bw / 2) + '" y="' + (Y(0) - h - 4) + '" text-anchor="middle">' + esc(opt.fmt ? opt.fmt(b.value) : fmtN(b.value)) + "</text>";
    if (i % every === 0) out += '<text x="' + (x + bw / 2) + '" y="' + (H - 5) + '" text-anchor="middle">' + esc(b.label) + "</text>";
  });
  if (opt.goal) out += '<line class="goal" x1="0" x2="' + W + '" y1="' + Y(opt.goal) + '" y2="' + Y(opt.goal) + '"/><text x="' + (W - 2) + '" y="' + (Y(opt.goal) - 4) + '" text-anchor="end" style="fill:var(--flame)">goal ' + fmtN(opt.goal) + "</text>";
  return out + "</svg>";
}
function hbarsHTML(rows, opt){
  opt = opt || {};
  const max = Math.max(opt.max || 0, ...rows.map(r => r.value), 1e-9);
  return rows.map(r => '<div class="hbar"><div class="hl">' + esc(r.label) + '</div><div class="bar"><i style="width:' + (r.value / max * 100) + "%" + (r.color ? ";background:" + r.color : "") +
    '"></i></div><div class="hv">' + esc(r.text != null ? r.text : fmtN(r.value)) + "</div></div>").join("");
}

/* ---------- ranges and their buckets ---------- */
function reportRange(kind, anchor){
  if (kind === "week"){ const a = mondayOf(anchor); return { from:a, to:addDays(a, 6), label: fmtDay(a, { day:"numeric", month:"short" }) + " – " + fmtDay(addDays(a, 6), { day:"numeric", month:"short", year:"numeric" }) }; }
  if (kind === "month") return { from: monthStart(anchor), to: monthEnd(anchor), label: fmtMonth(anchor) };
  const y = anchor.slice(0, 4);
  return { from: y + "-01-01", to: y + "-12-31", label: y };
}
/** Buckets partition [from, to] exactly — no day in two, none left out. */
function reportBuckets(kind, r){
  if (kind === "week") return daysBetween(r.from, r.to).map(d => ({ from:d, to:d, label: wdShort(d) }));
  if (kind === "month") return daysBetween(r.from, r.to).map(d => ({ from:d, to:d, label: String(dateOf(d).getDate()) }));
  const out = [];
  for (let m = r.from; m <= r.to; m = addMonths(m, 1)) out.push({ from:m, to:monthEnd(m), label: dateOf(m).toLocaleDateString(undefined, { month:"short" }).slice(0, 3) });
  return out;
}

let repKind = "month", repAnchor = todayISO(), repTab = "habits";

function openReports(){
  const s = openSheet({ title: "Reports", tall: true });
  function draw(){
    const today = todayISO();
    const r = reportRange(repKind, repAnchor);
    const canNext = r.to < today;
    s.body.innerHTML =
      '<div class="seg">' + [["week","Week"],["month","Month"],["year","Year"]].map(k => '<button data-k="' + k[0] + '" class="' + (repKind === k[0] ? "on" : "") + '">' + k[1] + "</button>").join("") + "</div>" +
      '<div class="rangebar"><button class="iconbtn" data-n="-1">' + ico("left") + '</button><div class="rl">' + esc(r.label) + '</div><button class="iconbtn" data-n="1"' + (canNext ? "" : ' disabled style="opacity:.4"') + ">" + ico("right") + "</button></div>" +
      '<div class="hscroll" style="margin-bottom:14px">' + [["habits","✅ Habits"],["fitness","🏃 Fitness"],["diary","📔 Diary"]].map(t => '<button class="chip' + (repTab === t[0] ? " on" : "") + '" data-t="' + t[0] + '">' + t[1] + "</button>").join("") + "</div>" +
      '<div id="repBody"></div>';
    $$("[data-k]", s.body).forEach(b => b.addEventListener("click", () => { repKind = b.dataset.k; draw(); }));
    $$("[data-t]", s.body).forEach(b => b.addEventListener("click", () => { repTab = b.dataset.t; draw(); }));
    $$("[data-n]", s.body).forEach(b => b.addEventListener("click", () => {
      const n = +b.dataset.n;
      repAnchor = repKind === "week" ? addDays(repAnchor, 7 * n) : repKind === "month" ? addMonths(repAnchor, n) : (+repAnchor.slice(0, 4) + n) + "-06-01";
      if (repAnchor > today) repAnchor = today;
      draw();
    }));
    const body = $("#repBody", s.body);
    const b = reportBuckets(repKind, r);
    if (repTab === "habits") repHabits(body, r, b);
    else if (repTab === "fitness") repFitness(body, r, b);
    else repDiary(body, r, b);
  }
  draw();
}

function repHabits(body, r, buckets){
  const today = todayISO();
  const hs = state.habits.filter(h => h.start <= r.to);
  if (!hs.length){ body.innerHTML = '<div class="card empty"><div class="ei">📊</div><b>No habits yet</b>Add a habit and your progress will show up here.</div>'; return; }
  const tot = rateOver(hs, r.from, r.to);
  const series = buckets.map(bk => { const x = rateOver(hs, bk.from, bk.to); return { label: bk.label, value: x.exp ? x.rate * 100 : 0, done:x.done, exp:x.exp, title: bk.label + ": " + (x.exp ? Math.round(x.rate * 100) + "%" : "nothing due") }; });
  /* the guard from the tracker: the buckets must add up to the total */
  const sd = series.reduce((s, x) => s + x.done, 0), se = series.reduce((s, x) => s + x.exp, 0);
  if (Math.abs(sd - tot.done) > 1e-6 || Math.abs(se - tot.exp) > 1e-6) console.warn("report buckets disagree with total", sd, tot.done, se, tot.exp);

  let perfect = 0, checkins = 0;
  daysBetween(r.from, r.to < today ? r.to : today).forEach(d => {
    /* Perfect by the same rule as the percentage: everything that day asked
       for, done. Today only counts once it is actually finished. */
    let done = 0, exp = 0;
    hs.forEach(h => { const c = contribution(h, d, today); done += c.done; exp += c.exp; if (isDone(h, d)) checkins++; });
    const sc = d === today ? dayScore(d) : null;
    if (sc ? (sc.due && sc.done === sc.due) : (exp > 0 && done >= exp - 1e-9)) perfect++;
  });
  /* by weekday, Monday first */
  const wd = [1,2,3,4,5,6,0].map(k => {
    let done = 0, exp = 0;
    daysBetween(r.from, r.to).forEach(d => { if (dateOf(d).getDay() !== k) return; hs.forEach(h => { const c = contribution(h, d, today); done += c.done; exp += c.exp; }); });
    return { label: WD[k].slice(0, 2), value: exp ? done / exp * 100 : 0 };
  });
  const bestWd = wd.reduce((m, x) => x.value > m.value ? x : m, { value:-1 });
  const per = hs.map(h => { const x = rateOver([h], r.from, r.to); return { h, rate:x.rate, exp:x.exp }; }).filter(x => x.exp > 0).sort((a, b) => b.rate - a.rate);

  body.innerHTML =
    '<div class="hero"><div class="row" style="gap:16px"><div class="ringwrap">' + ringBox(tot.rate, '<div style="font-size:24px;font-weight:800">' + Math.round(tot.rate * 100) + "%</div>", { size:104, w:11 }) + "</div>" +
    '<div class="grow"><div class="sub">Completion</div><div style="font-size:20px;font-weight:800;margin:4px 0">' + (tot.rate >= .8 ? "Outstanding consistency! 🌟" : tot.rate >= .6 ? "Solid progress 💪" : tot.rate >= .3 ? "Building momentum ✨" : tot.exp ? "Every day is a fresh start 🌱" : "Nothing due yet") + "</div>" +
    '<div class="sub">' + fmtN(tot.done, 1) + " of " + fmtN(tot.exp, 1) + " scheduled check-ins</div></div></div></div>" +
    '<div class="stats"><div class="stat"><div class="v">' + checkins + '</div><div class="l">Check-ins</div></div><div class="stat"><div class="v">' + perfect + '</div><div class="l">Perfect days</div></div>' +
    '<div class="stat"><div class="v">' + (bestWd.value > 0 ? bestWd.label : "—") + '</div><div class="l">Best weekday</div></div></div>' +
    '<div class="card"><h3>' + (repKind === "year" ? "Each month" : "Each day") + '</h3>' + barChartSVG(series, { max:100, values: repKind === "week", fmt: v => Math.round(v) + "%" }) + "</div>" +
    '<div class="card"><h3>By weekday</h3>' + barChartSVG(wd, { max:100, values:true, fmt: v => Math.round(v) + "%", h:110 }) + "</div>" +
    '<div class="card"><h3>Per habit</h3>' + (per.length ? hbarsHTML(per.map(x => ({ label: x.h.icon + " " + x.h.name, value: x.rate * 100, text: Math.round(x.rate * 100) + "%", color: x.h.color })), { max:100 }) : '<div class="note">Nothing was due in this range.</div>') + "</div>";
}

function repFitness(body, r, buckets){
  const ws = workoutsIn(r.from, r.to);
  const sum = (arr, f) => arr.reduce((s, w) => s + f(w), 0);
  const min = sum(ws, w => num(w.min, 0)), kcal = sum(ws, kcalOf), mod = sum(ws, modMinutes);
  const km = sum(ws, w => num(w.km, 0)), steps = sum(ws, w => num(w.steps, 0));
  const sDays = new Set(ws.filter(isStrength).map(w => w.date)).size;
  const cardioMin = sum(ws.filter(w => w.type === "cardio"), w => num(w.min, 0));
  /* active minutes per bucket; a year shows months, so a weekly goal line only fits the week view */
  const series = buckets.map(bk => ({ label: bk.label, value: sum(ws.filter(w => w.date >= bk.from && w.date <= bk.to), w => num(w.min, 0)) }));
  if (Math.abs(series.reduce((s, x) => s + x.value, 0) - min) > 1e-6) console.warn("fitness buckets disagree with total");
  /* WHO minutes, week by week — the target is weekly, so this is where it means something */
  const weeks = [];
  for (let a = mondayOf(r.from); a <= r.to; a = addDays(a, 7)) weeks.push(fitnessWeek(a));
  const cg = num(state.settings.cardioGoal, 150);
  const metWeeks = weeks.filter(w => w.from <= todayISO() && w.modMin >= cg).length;

  const byAct = {};
  ws.filter(w => w.type === "cardio").forEach(w => { byAct[w.ex] = (byAct[w.ex] || 0) + num(w.min, 0); });
  const byMuscle = {};
  ws.forEach(w => {
    if (w.type === "strength") byMuscle[w.g] = (byMuscle[w.g] || 0) + (w.sets || []).length;
    if (w.type === "routine") (w.groups || []).forEach(g => byMuscle[g] = (byMuscle[g] || 0) + Math.max(1, Math.round(num(w.done, 0) / Math.max(1, (w.groups || []).length))));
  });
  const kgs = state.weighins.filter(w => w.date >= r.from && w.date <= r.to).sort((a, b) => a.date.localeCompare(b.date));

  if (!ws.length && !kgs.length){ body.innerHTML = '<div class="card empty"><div class="ei">🏃</div><b>No activity in this range</b>Log a walk or a workout and it shows up here.</div>'; return; }
  body.innerHTML =
    '<div class="stats"><div class="stat"><div class="v">' + fmtN(min) + '<small> min</small></div><div class="l">Active</div></div>' +
    '<div class="stat"><div class="v">' + fmtN(kcal) + '<small> kcal</small></div><div class="l">Burned</div></div>' +
    '<div class="stat"><div class="v">' + ws.length + '</div><div class="l">Sessions</div></div>' +
    '<div class="stat"><div class="v">' + fmtN(cardioMin) + '<small> min</small></div><div class="l">Cardio</div></div>' +
    '<div class="stat"><div class="v">' + sDays + '<small> days</small></div><div class="l">Strength</div></div>' +
    '<div class="stat"><div class="v">' + (km ? fmtN(km, 1) + "<small> km</small>" : steps ? fmtN(steps) : "—") + '</div><div class="l">' + (km ? "Distance" : "Steps") + "</div></div></div>" +
    '<div class="card"><h3>Active minutes</h3>' + barChartSVG(series, { values: repKind !== "month" }) + "</div>" +
    '<div class="card"><h3>WHO target, week by week</h3>' + barChartSVG(weeks.map(w => ({ label: dateOf(w.from).getDate() + "/" + (dateOf(w.from).getMonth() + 1), value: w.modMin, color: w.modMin >= cg ? "var(--good)" : undefined })), { goal: cg, values: weeks.length <= 6, h: 120 }) +
    '<div class="note">' + metWeeks + " of " + weeks.filter(w => w.from <= todayISO()).length + " weeks reached " + cg + " moderate-equivalent minutes.</div></div>" +
    (Object.keys(byAct).length ? '<div class="card"><h3>Cardio by activity</h3>' + hbarsHTML(Object.keys(byAct).sort((a, b) => byAct[b] - byAct[a]).map(k => { const c = cardioById(k); return { label: (c ? c.icon + " " + c.name : k), value: byAct[k], text: fmtN(byAct[k]) + " min" }; })) + "</div>" : "") +
    (Object.keys(byMuscle).length ? '<div class="card"><h3>Strength by muscle group (sets)</h3>' + hbarsHTML(Object.keys(byMuscle).sort((a, b) => byMuscle[b] - byMuscle[a]).map(k => { const m = muscleById(k); return { label: (m ? m.icon + " " + m.name : k), value: byMuscle[k] }; })) + "</div>" : "") +
    (kgs.length ? '<div class="card"><h3>⚖️ Weight</h3>' + lineChartSVG(kgs.map(w => ({ x:w.date, y:w.kg })), { h:110 }) +
      (kgs.length > 1 ? '<div class="note">' + (kgs[kgs.length - 1].kg - kgs[0].kg >= 0 ? "+" : "") + fmtN(kgs[kgs.length - 1].kg - kgs[0].kg, 1) + " kg over this range</div>" : "") + "</div>" : "");
}

function repDiary(body, r, buckets){
  const es = state.diary.filter(e => e.date >= r.from && e.date <= r.to);
  if (!es.length){ body.innerHTML = '<div class="card empty"><div class="ei">📔</div><b>No diary entries in this range</b>A line a day is plenty.</div>'; return; }
  const moods = es.filter(e => e.mood);
  const avg = moods.length ? moods.reduce((s, e) => s + e.mood, 0) / moods.length : 0;
  const days = new Set(es.map(e => e.date)).size;
  const pts = [];
  buckets.forEach(bk => {
    const ms = moods.filter(e => e.date >= bk.from && e.date <= bk.to);
    if (ms.length) pts.push({ x: bk.label, y: ms.reduce((s, e) => s + e.mood, 0) / ms.length });
  });
  const dist = MOODS.map(m => ({ label: m.face + " " + m.name, value: moods.filter(e => e.mood === m.v).length, color: m.color }));
  const tags = {};
  es.forEach(e => (e.tags || []).forEach(t => tags[t] = (tags[t] || 0) + 1));
  const topTags = Object.keys(tags).sort((a, b) => tags[b] - tags[a]).slice(0, 10);
  /* Does keeping habits go with feeling better? Days at 80%+ against the rest. */
  const hi = [], lo = [];
  Array.from(new Set(moods.map(e => e.date))).forEach(d => {
    const sc = dayScore(d); if (!sc.due) return;
    (sc.frac >= .8 ? hi : lo).push(dayMood(d));
  });
  const mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
  const voice = es.reduce((s, e) => s + (e.audio || []).length, 0);

  body.innerHTML =
    '<div class="stats"><div class="stat"><div class="v">' + es.length + '</div><div class="l">Entries</div></div>' +
    '<div class="stat"><div class="v">' + (avg ? moodOf(avg).face + " <small>" + fmtN(avg, 1) + "</small>" : "—") + '</div><div class="l">Average mood</div></div>' +
    '<div class="stat"><div class="v">' + days + '<small> days</small></div><div class="l">Written' + (voice ? " · 🎙️ " + voice : "") + "</div></div></div>" +
    (pts.length ? '<div class="card"><h3>Mood over time</h3>' + lineChartSVG(pts, { min:1, max:5, h:130, label: x => x }) + "</div>" : "") +
    (moods.length ? '<div class="card"><h3>How you felt</h3>' + hbarsHTML(dist.slice().reverse()) + "</div>" : "") +
    (hi.length && lo.length ? '<div class="card"><h3>💡 Habits and mood</h3><div class="row" style="gap:12px"><div class="grow" style="text-align:center"><div style="font-size:30px">' + moodOf(mean(hi)).face + '</div><div class="small muted">Days with 80%+ habits done<br><b>' + fmtN(mean(hi), 1) + "</b> avg mood</div></div>" +
      '<div class="grow" style="text-align:center"><div style="font-size:30px">' + moodOf(mean(lo)).face + '</div><div class="small muted">Other days<br><b>' + fmtN(mean(lo), 1) + "</b> avg mood</div></div></div>" +
      '<div class="note">' + (mean(hi) > mean(lo) + .2 ? "You tend to feel better on days you keep your habits. Keep it up!" : "No clear link yet. Keep logging and a pattern will show.") + "</div></div>" : "") +
    (topTags.length ? '<div class="card"><h3>Feelings you named most</h3><div class="chips">' + topTags.map(t => '<span class="chip">' + esc(t) + ' <span class="badge">' + tags[t] + "</span></span>").join("") + "</div></div>" : "");
}
