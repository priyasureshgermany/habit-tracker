"use strict";
/* ==========================================================================
   HABITS — scheduling, streaks and rates, plus the Today and Habits screens.

   Frequencies come in two shapes:
     fixed     daily · on chosen weekdays · every N days — a day is either due or not
     flexible  N times a week · N times a month — any day can count, until the quota is met
   ========================================================================== */

const FLEX = { weekly:1, monthly:1 };
const PARTS = [
  { id:"morning", name:"Morning", icon:"🌅" },
  { id:"afternoon", name:"Afternoon", icon:"☀️" },
  { id:"evening", name:"Evening", icon:"🌙" },
  { id:"any", name:"Any time", icon:"⏳" }
];
const WD = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function hTarget(h){ return h.kind === "check" ? 1 : Math.max(1, num(h.target, 1)); }
function logOf(h, iso){ const m = state.logs[h.id]; return m ? m[iso] : undefined; }
function valOf(h, iso){ const l = logOf(h, iso); return l ? num(l.v, 0) : 0; }
function isDone(h, iso){ return valOf(h, iso) >= hTarget(h); }
function isSkip(h, iso){ const l = logOf(h, iso); return !!(l && l.skip); }
function fracOf(h, iso){ return clamp(valOf(h, iso) / hTarget(h), 0, 1); }
function setLog(h, iso, patch){
  const m = state.logs[h.id] || (state.logs[h.id] = {});
  const cur = Object.assign({}, m[iso] || {}, patch);
  if (!(num(cur.v, 0) > 0)) delete cur.v;
  if (!cur.skip) delete cur.skip;
  if (!cur.note) delete cur.note;
  if (Object.keys(cur).length) m[iso] = cur; else delete m[iso];
  if (!Object.keys(m).length) delete state.logs[h.id];
}
function activeOn(h, iso){ return iso >= h.start && !(h.end && iso > h.end); }
function isFlex(h){ return !!FLEX[h.freq.type]; }

/** For a fixed schedule: is iso one of its days? */
function scheduledOn(h, iso){
  if (!activeOn(h, iso)) return false;
  const f = h.freq;
  if (f.type === "daily") return true;
  if (f.type === "weekdays") return (f.days || []).indexOf(dateOf(iso).getDay()) >= 0;
  if (f.type === "interval") return dayDiff(h.start, iso) % Math.max(1, num(f.every, 1)) === 0;
  return true;
}
function periodRange(h, iso){
  if (h.freq.type === "weekly"){ const a = mondayOf(iso); return [a, addDays(a, 6)]; }
  return [monthStart(iso), monthEnd(iso)];
}
function quota(h){ return Math.max(1, num(h.freq.times, 1)); }
/** Days in iso's period, up to and including `upto`, on which the habit was done. */
function periodDone(h, iso, upto){
  const [a, b] = periodRange(h, iso);
  let n = 0;
  for (let d = a; d <= b && d <= (upto || b); d = addDays(d, 1)) if (activeOn(h, d) && isDone(h, d)) n++;
  return n;
}
/** Should this habit be offered on iso's list? */
function dueOn(h, iso){
  if (h.archived || !activeOn(h, iso)) return false;
  if (!isFlex(h)) return scheduledOn(h, iso);
  /* A flexible habit stays on the list until its quota is met — and on the
     day that met it, so the tick does not vanish as it is made. */
  return isDone(h, iso) || periodDone(h, iso) < quota(h);
}

/* ---------- one predicate for every rate ----------
   What one habit-day contributes: {done, exp}. Every rate the app shows — the
   ring, the reports, the bars, the per-habit figures — is a sum of these, so a
   total and the buckets it is made of cannot drift apart.

   Today, and a flexible period still running, are neutral: what is done counts,
   what is not yet done is not held against you. */
function contribution(h, iso, today){
  today = today || todayISO();
  if (h.archived && iso > (h.archivedOn || today)) return { done:0, exp:0 };
  if (!activeOn(h, iso) || iso > today) return { done:0, exp:0 };
  if (!isFlex(h)){
    if (!scheduledOn(h, iso) || isSkip(h, iso)) return { done:0, exp:0 };
    const f = fracOf(h, iso);
    return { done:f, exp: iso === today ? f : 1 };
  }
  const [a, b] = periodRange(h, iso);
  const q = quota(h);
  let done = 0;
  if (isDone(h, iso) && periodDone(h, iso, iso) <= q) done = 1;
  let exp = done;
  /* Misses land on the period's last day, once it has passed. */
  if (iso === b && b < today){
    let start = a < h.start ? h.start : a;
    const got = Math.min(q, periodDone(h, iso, b));
    /* A period the habit only joined part-way through asks for a fair share. */
    const len = dayDiff(a, b) + 1, have = dayDiff(start, b) + 1;
    const want = have < len ? Math.ceil(q * have / len) : q;
    exp += Math.max(0, want - got);
  }
  return { done, exp };
}
function rateOver(habits, from, to){
  const today = todayISO();
  let done = 0, exp = 0;
  habits.forEach(h => {
    for (let d = from; d <= to; d = addDays(d, 1)){
      const c = contribution(h, d, today); done += c.done; exp += c.exp;
    }
  });
  return { done, exp, rate: exp ? done / exp : 0 };
}

/* ---------- streaks ---------- */
function streakOf(h){
  const today = todayISO();
  if (!isFlex(h)){
    let d = today, n = 0, guard = 0;
    if (scheduledOn(h, d) && !isDone(h, d)) d = addDays(d, -1);   /* today isn't over */
    while (d >= h.start && guard++ < 4000){
      if (scheduledOn(h, d) && !isSkip(h, d)){
        if (isDone(h, d)) n++; else break;
      }
      d = addDays(d, -1);
    }
    return { n, unit: "day" };
  }
  let n = 0, guard = 0;
  let p = periodRange(h, today);
  if (periodDone(h, today) >= quota(h)) n++;
  p = periodRange(h, addDays(p[0], -1));
  while (p[1] >= h.start && guard++ < 600){
    if (periodDone(h, p[1]) >= quota(h)) n++; else break;
    p = periodRange(h, addDays(p[0], -1));
  }
  return { n, unit: h.freq.type === "weekly" ? "week" : "month" };
}
function bestStreakOf(h){
  const today = todayISO();
  let best = 0, run = 0;
  if (!isFlex(h)){
    for (let d = h.start; d <= today; d = addDays(d, 1)){
      if (!scheduledOn(h, d) || isSkip(h, d)) continue;
      if (isDone(h, d)){ run++; best = Math.max(best, run); }
      else if (d !== today) run = 0;
    }
    return best;
  }
  let p = periodRange(h, h.start);
  while (p[0] <= today){
    if (periodDone(h, p[1]) >= quota(h)){ run++; best = Math.max(best, run); }
    else if (p[1] < today) run = 0;
    p = periodRange(h, addDays(p[1], 1));
  }
  return best;
}
function totalDone(h){
  const m = state.logs[h.id] || {};
  return Object.keys(m).filter(d => isDone(h, d)).length;
}

function freqText(h){
  const f = h.freq;
  if (f.type === "daily") return "Every day";
  if (f.type === "weekdays"){
    const d = (f.days || []).slice().sort();
    if (d.length === 7) return "Every day";
    if (d.join() === "1,2,3,4,5") return "Weekdays";
    if (d.join() === "0,6") return "Weekends";
    return d.map(i => WD[i]).join(", ");
  }
  if (f.type === "weekly") return quota(h) + "× a week";
  if (f.type === "monthly") return quota(h) + "× a month";
  if (f.type === "interval") return "Every " + num(f.every, 2) + " days";
  return "";
}
function targetText(h){
  if (h.kind === "check") return h.quit ? "Stay clear" : "";
  return fmtN(hTarget(h)) + " " + (h.unit || (h.kind === "time" ? "min" : ""));
}
function activeHabits(){ return state.habits.filter(h => !h.archived).sort((a, b) => (a.order || 0) - (b.order || 0)); }
/** Today's score for the ring: fixed, due habits share it equally. */
function dayScore(iso){
  const due = activeHabits().filter(h => dueOn(h, iso) && !isSkip(h, iso));
  const done = due.filter(h => isDone(h, iso)).length;
  const sum = due.reduce((s, h) => s + fracOf(h, iso), 0);
  return { due: due.length, done, frac: due.length ? sum / due.length : 0 };
}

/* ==========================================================================
   TODAY
   ========================================================================== */
let selDay = todayISO();

function greeting(){
  const h = new Date().getHours();
  return h < 5 ? "Good night" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function habitRowHTML(h, iso){
  const done = isDone(h, iso), skip = isSkip(h, iso);
  const st = streakOf(h);
  const v = valOf(h, iso);
  let ctl;
  if (h.kind === "check"){
    ctl = '<button class="check" data-act="tick" aria-label="Mark done">' + ico("check", 3) + "</button>";
  }else{
    ctl = '<div class="stepper"><button data-act="minus" aria-label="Less">−</button>' +
      '<button class="sv" data-act="set">' + fmtN(v) + "<small>/ " + fmtN(hTarget(h)) + " " + esc(h.unit || "") + "</small></button>" +
      '<button class="plus" data-act="plus" aria-label="More">+</button></div>';
  }
  const flexNote = isFlex(h) ? '<span>' + periodDone(h, iso) + "/" + quota(h) + (h.freq.type === "weekly" ? " this week" : " this month") + "</span>" : "";
  return '<div class="hrow' + (done ? " done" : "") + (skip ? " skip" : "") + '" data-id="' + h.id + '" style="--hc:' + h.color + '">' +
    '<div class="hfill" style="width:' + (fracOf(h, iso) * 100) + '%"></div>' +
    '<div class="hico">' + esc(h.icon) + "</div>" +
    '<div class="grow" data-act="open"><div class="hname">' + esc(h.name) + "</div>" +
    '<div class="hmeta">' + (skip ? "<span>Skipped</span>" : "") +
    (st.n ? '<span class="streak">' + ico("flame") .replace("<svg", '<svg width="13" height="13"') + st.n + "</span>" : "") +
    (targetText(h) ? "<span>" + esc(targetText(h)) + "</span>" : "") + flexNote + "</div></div>" + ctl + "</div>";
}

function bindHabitRows(root, iso, after){
  $$(".hrow", root).forEach(row => {
    const h = state.habits.find(x => x.id === row.dataset.id);
    if (!h) return;
    row.addEventListener("click", async (e) => {
      const a = e.target.closest("[data-act]");
      const act = a ? a.dataset.act : "open";
      const before = dayScore(iso);
      if (act === "open"){ openHabitDetail(h); return; }
      if (act === "tick") setLog(h, iso, { v: isDone(h, iso) ? 0 : 1, skip:false });
      else if (act === "plus" || act === "minus"){
        const t = hTarget(h);
        /* Big targets (steps, ml) step in sensible chunks rather than ones. */
        const step = t >= 2000 ? 1000 : t >= 200 ? 50 : (h.kind === "time" && t >= 10) ? 5 : 1;
        setLog(h, iso, { v: Math.max(0, valOf(h, iso) + (act === "plus" ? step : -step)), skip:false });
      }else if (act === "set"){
        const n = await askNumber(h.name, valOf(h, iso) || "", (h.unit || "Amount") + " — target " + fmtN(hTarget(h)));
        if (n == null) return;
        setLog(h, iso, { v: Math.max(0, n), skip:false });
      }
      if (navigator.vibrate) try{ navigator.vibrate(12); }catch(_){}
      save();
      const after2 = dayScore(iso);
      if (iso === todayISO() && after2.due && after2.done === after2.due && before.done < before.due){
        confetti(); toast("Every habit done today — brilliant! 🎉");
      }else if (isDone(h, iso) && act !== "minus"){
        const s = streakOf(h);
        if (s.n && [3, 7, 14, 21, 30, 50, 100, 365].indexOf(s.n) >= 0 && s.unit === "day"){ confetti(); toast(s.n + "-day streak on " + h.name + "! 🔥"); }
      }
      (after || rerender)();
    });
  });
}

function renderToday(){
  const v = $("#view-today");
  const today = todayISO();
  if (selDay > today) selDay = today;
  const name = firstName();
  const sc = dayScore(selDay);
  const q = QUOTES[(dateOf(today).getDate() + dateOf(today).getMonth() * 3) % QUOTES.length];

  /* the last 14 days and today, newest on the right */
  let strip = "";
  for (let i = 13; i >= 0; i--){
    const d = addDays(today, -i), s = dayScore(d);
    strip += '<button class="dchip' + (d === today ? " today" : "") + (d === selDay ? " sel" : "") + '" data-d="' + d + '">' +
      '<div class="dw">' + wdShort(d) + '</div><div class="dn">' + dateOf(d).getDate() + "</div>" +
      '<div class="dp"><i style="width:' + Math.round(s.frac * 100) + '%"></i></div></button>';
  }

  const habits = activeHabits().filter(h => dueOn(h, selDay));
  let list = "";
  if (!state.habits.length){
    list = '<div class="card empty"><div class="ei">🌱</div><b>Start your first habit</b>Small things, done daily, add up.<br><br>' +
      '<div class="btnrow"><button class="btn primary" id="tdAdd">' + ico("plus") + ' Add a habit</button></div>' +
      '<div class="btnrow" style="margin-top:10px"><button class="btn sm" id="tdDemo">Try it with sample data</button></div></div>';
  }else if (!habits.length){
    list = '<div class="card empty"><div class="ei">🌤️</div><b>Nothing due ' + (selDay === today ? "today" : "that day") + '</b>Enjoy the breather.</div>';
  }else{
    PARTS.forEach(p => {
      const hs = habits.filter(h => (h.part || "any") === p.id);
      if (!hs.length) return;
      const nd = hs.filter(h => isDone(h, selDay)).length;
      list += '<div class="sec-h">' + p.icon + " " + p.name + '<span class="more" style="color:var(--ink-3)">' + nd + "/" + hs.length + "</span></div>";
      list += hs.map(h => habitRowHTML(h, selDay)).join("");
    });
  }

  /* fitness snapshot */
  const wk = fitnessWeek(today);
  const cg = num(state.settings.cardioGoal, 150), sg = num(state.settings.strengthGoal, 2);
  /* diary snapshot */
  const todays = state.diary.filter(e => e.date === today);
  const lastMood = todays.length ? todays[todays.length - 1].mood : 0;

  v.innerHTML =
    '<div class="top"><div><div class="kicker">' + esc(fmtDay(today, { weekday:"long", day:"numeric", month:"long" })) + "</div>" +
    "<h1>" + greeting() + (name ? ", " + esc(name) : "") + "</h1></div>" +
    '<button class="iconbtn" id="tdRep" aria-label="Reports">' + ico("chart") + "</button></div>" +

    '<div class="hero"><div class="row" style="gap:16px"><div class="grow">' +
    '<div class="sub">' + (selDay === today ? "Today's habits" : esc(fmtDay(selDay))) + "</div>" +
    '<div class="big" style="margin:6px 0 4px">' + sc.done + '<span style="font-size:20px;opacity:.8"> / ' + sc.due + "</span></div>" +
    '<div class="sub">' + (sc.due === 0 ? "Nothing scheduled" : sc.done === sc.due ? "All done. You're on fire! 🔥" :
      sc.frac >= .5 ? "More than halfway there 💪" : sc.done ? "Good start. Keep going ✨" : "Let's make it a good one ✨") + "</div>" +
    '<div class="sub" style="margin-top:12px;font-size:12.5px;opacity:.85;font-style:italic">“' + esc(q[0]) + "” — " + esc(q[1]) + "</div>" +
    '</div><div class="ringwrap">' + ringBox(sc.frac, '<div><div style="font-size:24px;font-weight:800">' + Math.round(sc.frac * 100) + '%</div><div style="font-size:11px;opacity:.85">done</div></div>', { size:104, w:11 }) + "</div></div></div>" +

    '<div class="dstrip" id="tdStrip">' + strip + "</div>" +
    list +

    '<div class="sec-h">Fitness this week<button class="more" data-go="fitness">Open</button></div>' +
    '<div class="card"><div class="row" style="gap:14px">' +
    '<div style="width:74px;height:74px;flex:none">' + ringBox(wk.modMin / cg, '<div style="font-size:13px;font-weight:800">' + Math.round(wk.modMin) + '<div style="font-size:10px;color:var(--ink-3);font-weight:600">/ ' + cg + " min</div></div>",
      { size:74, w:8, track:"var(--surface-sunk)", c1:"var(--a1)", c2:"var(--a2)" }) + "</div>" +
    '<div class="grow"><div style="font-weight:700">' + (wk.modMin >= cg ? "Weekly cardio goal reached 🎉" : Math.max(0, Math.round(cg - wk.modMin)) + " active minutes to go") + "</div>" +
    '<div class="small muted">Strength days ' + wk.strengthDays + "/" + sg + " · " + fmtN(wk.kcal) + " kcal burned</div>" +
    '<div class="btnrow" style="margin-top:8px"><button class="btn sm" id="tdCardio">🚶 Log cardio</button><button class="btn sm" id="tdStrength">💪 Workout</button></div></div></div></div>' +

    '<div class="sec-h">Diary<button class="more" data-go="diary">Open</button></div>' +
    '<div class="card">' + (lastMood
      ? '<div class="row"><div style="font-size:34px">' + MOODS[lastMood - 1].face + '</div><div class="grow"><div style="font-weight:700">You felt ' + MOODS[lastMood - 1].name.toLowerCase() + " today</div>" +
        '<div class="small muted">' + plural(todays.length, "entry", "entries") + ' so far · tap a face to add another</div></div></div><div class="moods" style="margin-top:12px">'
      : '<div style="font-weight:700;margin-bottom:10px">How are you feeling today?</div><div class="moods">') +
    MOODS.map(m => '<button class="mood" data-mood="' + m.v + '" style="--mc:' + m.color + '"><span class="mf">' + m.face + '</span><span class="mn">' + m.name + "</span></button>").join("") +
    "</div></div>";

  bindHabitRows(v, selDay);
  $$(".dchip", v).forEach(b => b.addEventListener("click", () => { selDay = b.dataset.d; renderToday(); }));
  const strip2 = $("#tdStrip"); strip2.scrollLeft = strip2.scrollWidth;
  $$("[data-go]", v).forEach(b => b.addEventListener("click", () => go(b.dataset.go)));
  $$("[data-mood]", v).forEach(b => b.addEventListener("click", () => openDiaryEditor(null, { date: today, mood: +b.dataset.mood })));
  $("#tdRep").addEventListener("click", () => openReports());
  $("#tdCardio").addEventListener("click", () => openCardioPicker());
  $("#tdStrength").addEventListener("click", () => { fitTab = "routines"; go("fitness"); });
  const add = $("#tdAdd"); if (add) add.addEventListener("click", () => openHabitEditor());
  const demo = $("#tdDemo"); if (demo) demo.addEventListener("click", loadSampleData);
}
VIEWS.today = { render: renderToday, fab: () => openHabitEditor() };

/* ==========================================================================
   HABITS LIST
   ========================================================================== */
let habitsShowArchived = false;
function renderHabits(){
  const v = $("#view-habits");
  const today = todayISO();
  const list = state.habits.filter(h => !!h.archived === habitsShowArchived).sort((a, b) => (a.order || 0) - (b.order || 0));
  const act = activeHabits();
  const r30 = rateOver(act, addDays(today, -29), today);
  const bestNow = act.reduce((m, h) => { const s = streakOf(h); return s.unit === "day" && s.n > m.n ? { n:s.n, h } : m; }, { n:0, h:null });

  let rows = "";
  list.forEach(h => {
    let dots = "";
    for (let i = 6; i >= 0; i--){
      const d = addDays(today, -i);
      const cls = !activeOn(h, d) || (!isFlex(h) && !scheduledOn(h, d)) ? "off" : isDone(h, d) ? "on" : fracOf(h, d) > 0 ? "part" : "";
      dots += '<i class="' + cls + '" title="' + d + '"></i>';
    }
    const st = streakOf(h);
    const rr = rateOver([h], addDays(today, -29), today);
    rows += '<div class="hrow" data-id="' + h.id + '" style="--hc:' + h.color + '">' +
      '<div class="hico">' + esc(h.icon) + '</div><div class="grow" data-act="open"><div class="hname">' + esc(h.name) + "</div>" +
      '<div class="hmeta"><span>' + esc(freqText(h)) + "</span>" + (targetText(h) ? "<span>· " + esc(targetText(h)) + "</span>" : "") + "</div>" +
      '<div class="dots7">' + dots + "</div></div>" +
      '<div style="text-align:right;flex:none" data-act="open"><div class="streak" style="justify-content:flex-end">' + ico("flame").replace("<svg", '<svg width="14" height="14"') + st.n + "</div>" +
      '<div class="small muted">' + (rr.exp ? Math.round(rr.rate * 100) + "%" : "—") + "</div></div></div>";
  });

  v.innerHTML =
    '<div class="top"><div><div class="kicker">' + plural(act.length, "active habit") + "</div><h1>Habits</h1></div>" +
    '<button class="iconbtn grad" id="hbAdd" aria-label="Add habit">' + ico("plus", 2.4) + "</button></div>" +
    '<div class="stats"><div class="stat"><div class="v">' + (r30.exp ? Math.round(r30.rate * 100) : 0) + '<small>%</small></div><div class="l">Last 30 days</div></div>' +
    '<div class="stat"><div class="v" style="color:var(--flame)">' + bestNow.n + '<small> days</small></div><div class="l">Best streak now</div></div>' +
    '<div class="stat"><div class="v">' + fmtN(state.habits.reduce((s, h) => s + totalDone(h), 0)) + '</div><div class="l">Check-ins</div></div></div>' +
    '<div class="seg"><button data-a="0" class="' + (habitsShowArchived ? "" : "on") + '">Active</button><button data-a="1" class="' + (habitsShowArchived ? "on" : "") + '">Archived</button></div>' +
    (rows || '<div class="card empty"><div class="ei">' + (habitsShowArchived ? "🗄️" : "🌱") + "</div><b>" +
      (habitsShowArchived ? "No archived habits" : "No habits yet") + "</b>" + (habitsShowArchived ? "Habits you pause end up here." : "Tap + to add your first one.") + "</div>");

  $$(".hrow", v).forEach(r => r.addEventListener("click", () => {
    const h = state.habits.find(x => x.id === r.dataset.id); if (h) openHabitDetail(h);
  }));
  $$(".seg button", v).forEach(b => b.addEventListener("click", () => { habitsShowArchived = b.dataset.a === "1"; renderHabits(); }));
  $("#hbAdd").addEventListener("click", () => openHabitEditor());
}
VIEWS.habits = { render: renderHabits, fab: () => openHabitEditor() };

/* ==========================================================================
   HABIT DETAIL
   ========================================================================== */
function heatmapHTML(h, weeks){
  const today = todayISO();
  const start = addDays(mondayOf(today), -7 * (weeks - 1));
  let cells = "";
  for (let d = start; d <= addDays(mondayOf(today), 6); d = addDays(d, 1)){
    let bg = "var(--surface-sunk)";
    if (d <= today && activeOn(h, d)){
      const f = fracOf(h, d);
      if (f > 0) bg = "color-mix(in oklab," + h.color + " " + Math.round(30 + f * 70) + "%, var(--surface-sunk))";
    }else if (d > today) bg = "transparent";
    cells += '<i style="background:' + bg + '" title="' + d + '"></i>';
  }
  return '<div class="heat" style="grid-template-columns:repeat(' + weeks + ',1fr)">' + cells + "</div>";
}
function monthCalHTML(h, month){
  const today = todayISO();
  const a = monthStart(month), b = monthEnd(month);
  const lead = (dateOf(a).getDay() + 6) % 7;
  let out = '<div class="cal">' + ["Mo","Tu","We","Th","Fr","Sa","Su"].map(w => '<div class="cw">' + w + "</div>").join("");
  for (let i = 0; i < lead; i++) out += '<div class="cd blank"></div>';
  for (let d = a; d <= b; d = addDays(d, 1)){
    const f = fracOf(h, d), sk = isSkip(h, d), sch = isFlex(h) || scheduledOn(h, d);
    let st = "";
    if (f >= 1) st = "background:" + h.color + ";color:#fff";
    else if (f > 0) st = "background:color-mix(in oklab," + h.color + " 40%,var(--surface-2))";
    else if (!activeOn(h, d) || d > today || !sch) st = "opacity:.35";
    out += '<button class="cd' + (d === today ? " today" : "") + '" data-d="' + d + '" style="' + st + '"' + (d > today || !activeOn(h, d) ? " disabled" : "") + ">" +
      (sk ? "–" : dateOf(d).getDate()) + "</button>";
  }
  return out + "</div>";
}
function openHabitDetail(h){
  let month = monthStart(todayISO());
  const s = openSheet({ title: h.name, tall: true,
    foot: '<button class="btn" data-a="edit">' + ico("edit") + ' Edit</button><button class="btn" data-a="arch">' + (h.archived ? "Restore" : "Archive") + '</button><button class="btn danger" data-a="del">' + ico("trash") + "</button>",
    onClose: () => rerender() });
  function draw(){
    const today = todayISO();
    const st = streakOf(h), best = bestStreakOf(h);
    const r30 = rateOver([h], addDays(today, -29), today);
    const rAll = rateOver([h], h.start, today);
    s.body.innerHTML =
      '<div class="row" style="margin-bottom:14px"><div class="hico" style="--hc:' + h.color + ';width:56px;height:56px;font-size:28px;border-radius:18px">' + esc(h.icon) + "</div>" +
      '<div class="grow"><div style="font-weight:800;font-size:18px">' + esc(h.name) + '</div><div class="small muted">' + esc(freqText(h)) +
      (targetText(h) ? " · " + esc(targetText(h)) : "") + " · since " + esc(fmtDay(h.start, { day:"numeric", month:"short", year:"numeric" })) + "</div></div></div>" +
      (h.why ? '<div class="infobox">💡 <b>Why:</b> ' + esc(h.why) + "</div>" : "") +
      '<div class="stats two"><div class="stat"><div class="v" style="color:var(--flame)">' + st.n + "<small> " + st.unit + (st.n === 1 ? "" : "s") + '</small></div><div class="l">Current streak</div></div>' +
      '<div class="stat"><div class="v">' + best + "<small> " + st.unit + (best === 1 ? "" : "s") + '</small></div><div class="l">Best streak</div></div>' +
      '<div class="stat"><div class="v">' + (r30.exp ? Math.round(r30.rate * 100) : 0) + '<small>%</small></div><div class="l">Last 30 days</div></div>' +
      '<div class="stat"><div class="v">' + (rAll.exp ? Math.round(rAll.rate * 100) : 0) + '<small>%</small></div><div class="l">All time · ' + totalDone(h) + " done</div></div></div>" +
      '<div class="card"><h3>Last 6 months</h3>' + heatmapHTML(h, 26) + "</div>" +
      '<div class="card"><div class="rangebar"><button class="iconbtn" data-m="-1">' + ico("left") + '</button><div class="rl">' + esc(fmtMonth(month)) +
      '</div><button class="iconbtn" data-m="1"' + (month >= monthStart(today) ? " disabled style=\"opacity:.4\"" : "") + ">" + ico("right") + "</button></div>" +
      monthCalHTML(h, month) + '<div class="note">Tap a day to change it. ' + (h.kind === "check" ? "Tapping cycles through done, skipped and not done." : "You'll be asked for the amount.") + "</div></div>";
    $$("[data-m]", s.body).forEach(b => b.addEventListener("click", () => {
      const n = addMonths(month, +b.dataset.m); if (n <= monthStart(today)){ month = n; draw(); }
    }));
    $$(".cal .cd[data-d]", s.body).forEach(b => b.addEventListener("click", async () => {
      const d = b.dataset.d;
      if (h.kind === "check"){
        /* not done → done → skipped → not done */
        if (isDone(h, d)) setLog(h, d, { v:0, skip:true });
        else if (isSkip(h, d)) setLog(h, d, { v:0, skip:false });
        else setLog(h, d, { v:1, skip:false });
      }else{
        const n = await askNumber(fmtDay(d), valOf(h, d) || "", (h.unit || "Amount") + " — target " + fmtN(hTarget(h)) + " (0 clears)");
        if (n == null) return;
        setLog(h, d, { v: Math.max(0, n), skip:false });
      }
      save(); draw();
    }));
  }
  draw();
  $('[data-a="edit"]', s.el).addEventListener("click", () => openHabitEditor(h, () => { s.setTitle(h.name); draw(); }));
  $('[data-a="arch"]', s.el).addEventListener("click", () => {
    h.archived = !h.archived;
    if (h.archived) h.archivedOn = todayISO(); else delete h.archivedOn;
    save(); s.close(); toast(h.archived ? "Archived — your history is kept" : "Back in your list");
  });
  $('[data-a="del"]', s.el).addEventListener("click", () => {
    if (!confirm("Delete “" + h.name + "” and its whole history? Archiving keeps the history instead.")) return;
    state.habits = state.habits.filter(x => x !== h);
    delete state.logs[h.id];
    save(); s.close(); toast("Habit deleted");
  });
}

/* ==========================================================================
   HABIT EDITOR
   ========================================================================== */
function openHabitEditor(existing, after){
  const isNew = !existing;
  const h = normHabit(existing ? JSON.parse(JSON.stringify(existing)) : { order: state.habits.length });
  const s = openSheet({ title: isNew ? "New habit" : "Edit habit", tall: true,
    foot: '<button class="btn" data-a="cancel">Cancel</button><button class="btn primary" data-a="save">' + ico("check") + (isNew ? " Create habit" : " Save") + "</button>" });

  function seg(name, opts, cur){
    return '<div class="seg" data-seg="' + name + '">' + opts.map(o => '<button type="button" data-v="' + o[0] + '" class="' + (String(cur) === String(o[0]) ? "on" : "") + '">' + o[1] + "</button>").join("") + "</div>";
  }
  function draw(){
    const f = h.freq;
    s.body.innerHTML =
      (isNew ? '<div class="field"><span>Quick start</span><div class="hscroll">' +
        HABIT_TEMPLATES.map((t, i) => '<button class="chip" data-tpl="' + i + '">' + t.icon + " " + esc(t.name) + "</button>").join("") + "</div></div>" : "") +
      '<div class="row" style="margin-bottom:14px"><div class="hico" style="--hc:' + h.color + ';width:56px;height:56px;font-size:28px;border-radius:18px">' + esc(h.icon) + "</div>" +
      '<input class="input grow" id="heName" placeholder="e.g. Drink water" value="' + esc(isNew && h.name === "New habit" ? "" : h.name) + '" maxlength="60"></div>' +
      '<div class="field"><span>Icon</span><div class="emojis">' + HABIT_ICONS.map(e => '<button type="button" data-ic="' + e + '" class="' + (e === h.icon ? "on" : "") + '">' + e + "</button>").join("") + "</div></div>" +
      '<div class="field"><span>Colour</span><div class="swatches">' + HABIT_COLORS.map(c => '<button type="button" class="sw' + (c === h.color ? " on" : "") + '" data-col="' + c + '" style="background:' + c + '"></button>').join("") + "</div></div>" +
      '<div class="field"><span>Category</span><div class="chips">' + HABIT_CATEGORIES.map(c => '<button type="button" class="chip' + (c.id === h.cat ? " on" : "") + '" data-cat="' + c.id + '">' + c.icon + " " + c.name + "</button>").join("") + "</div></div>" +
      '<div class="field"><span>Goal</span>' + seg("goal", [["build","✅ Build a habit"],["quit","🚫 Break a habit"]], h.quit ? "quit" : "build") + "</div>" +
      '<div class="field"><span>How do you track it?</span>' + seg("kind", [["check","Yes / No"],["count","Count"],["time","Minutes"]], h.kind) +
      (h.kind !== "check" ? '<div class="two"><label><input class="input" id="heTarget" type="number" inputmode="decimal" min="1" value="' + esc(h.target) + '"></label>' +
        '<label><input class="input" id="heUnit" placeholder="' + (h.kind === "time" ? "min" : "glasses, pages…") + '" value="' + esc(h.kind === "time" ? (h.unit || "min") : h.unit) + '"></label></div><div class="note">Daily target and its unit</div>' : "") + "</div>" +
      '<div class="field"><span>How often?</span>' + seg("freq", [["daily","Daily"],["weekdays","Days"],["weekly","Weekly"],["monthly","Monthly"],["interval","Every N"]], f.type) +
      (f.type === "weekdays" ? '<div class="wdays">' + [1,2,3,4,5,6,0].map(d => '<button type="button" data-wd="' + d + '" class="' + ((f.days || []).indexOf(d) >= 0 ? "on" : "") + '">' + WD[d].slice(0, 2) + "</button>").join("") + "</div>" : "") +
      (f.type === "weekly" || f.type === "monthly" ? '<div class="row"><input class="input" id="heTimes" type="number" min="1" max="' + (f.type === "weekly" ? 7 : 31) + '" style="width:90px" value="' + esc(f.times) + '"><span class="muted">times a ' + (f.type === "weekly" ? "week, on any days" : "month, on any days") + "</span></div>" : "") +
      (f.type === "interval" ? '<div class="row"><span class="muted">Every</span><input class="input" id="heEvery" type="number" min="2" max="60" style="width:90px" value="' + esc(f.every) + '"><span class="muted">days, from the start date</span></div>' : "") + "</div>" +
      '<div class="field"><span>Time of day</span>' + seg("part", PARTS.map(p => [p.id, p.icon + " " + p.name.replace("Any time", "Any")]), h.part) + "</div>" +
      '<div class="two"><label class="field"><span>Reminder</span><input class="input" id="heRem" type="time" value="' + esc(h.reminder) + '"></label>' +
      '<label class="field"><span>Start date</span><input class="input" id="heStart" type="date" value="' + esc(h.start) + '"></label></div>' +
      '<label class="field"><span>Why does it matter to you?</span><input class="input" id="heWhy" placeholder="e.g. To have energy for my family" value="' + esc(h.why) + '" maxlength="140"></label>' +
      (h.reminder && !state.settings.reminders ? '<div class="note">Reminders are switched off. Turn them on under More → Settings → Reminders.</div>' : "");
    bind();
  }
  function grab(){
    const g = (id) => { const e = $("#" + id, s.body); return e ? e.value : null; };
    if (g("heName") != null) h.name = g("heName").trim() || h.name;
    if (g("heTarget") != null) h.target = Math.max(1, num(g("heTarget"), 1));
    if (g("heUnit") != null) h.unit = g("heUnit").trim();
    if (g("heTimes") != null) h.freq.times = clamp(Math.round(num(g("heTimes"), 1)), 1, h.freq.type === "weekly" ? 7 : 31);
    if (g("heEvery") != null) h.freq.every = clamp(Math.round(num(g("heEvery"), 2)), 2, 60);
    if (g("heRem") != null) h.reminder = g("heRem");
    if (g("heStart") != null && g("heStart")) h.start = g("heStart");
    if (g("heWhy") != null) h.why = g("heWhy").trim();
  }
  function bind(){
    $$("[data-tpl]", s.body).forEach(b => b.addEventListener("click", () => {
      const t = HABIT_TEMPLATES[+b.dataset.tpl];
      Object.assign(h, { name:t.name, icon:t.icon, color:t.color, cat:t.cat, kind:t.kind, target:t.target || 1, unit:t.unit || (t.kind === "time" ? "min" : ""), quit:!!t.quit, part:t.part });
      h.freq = Object.assign({ type:"daily", days:[1,2,3,4,5], times:3, every:2 }, t.freq || {});
      draw();
    }));
    $$("[data-ic]", s.body).forEach(b => b.addEventListener("click", () => { grab(); h.icon = b.dataset.ic; draw(); }));
    $$("[data-col]", s.body).forEach(b => b.addEventListener("click", () => { grab(); h.color = b.dataset.col; draw(); }));
    $$("[data-cat]", s.body).forEach(b => b.addEventListener("click", () => { grab(); h.cat = b.dataset.cat; draw(); }));
    $$("[data-wd]", s.body).forEach(b => b.addEventListener("click", () => {
      grab(); const d = +b.dataset.wd, a = h.freq.days || (h.freq.days = []);
      const i = a.indexOf(d); if (i >= 0){ if (a.length > 1) a.splice(i, 1); } else a.push(d);
      draw();
    }));
    $$("[data-seg]", s.body).forEach(sg => $$("button", sg).forEach(b => b.addEventListener("click", () => {
      grab();
      const k = sg.dataset.seg, v = b.dataset.v;
      if (k === "goal") h.quit = v === "quit";
      if (k === "kind"){ h.kind = v; if (v === "time" && !h.unit) h.unit = "min"; if (v === "check") h.target = 1; else if (h.target <= 1) h.target = v === "time" ? 15 : 5; }
      if (k === "freq") h.freq.type = v;
      if (k === "part") h.part = v;
      draw();
    })));
  }
  draw();
  setTimeout(() => { const n = $("#heName", s.body); if (n && isNew) n.focus(); }, 340);
  $('[data-a="cancel"]', s.el).addEventListener("click", () => s.close());
  $('[data-a="save"]', s.el).addEventListener("click", () => {
    grab();
    const nm = $("#heName", s.body).value.trim();
    if (!nm){ toast("Give the habit a name"); $("#heName", s.body).focus(); return; }
    h.name = nm;
    if (h.kind === "check"){ h.target = 1; h.unit = ""; }
    if (isNew) state.habits.push(h);
    else Object.assign(existing, h);
    save(); s.close();
    toast(isNew ? "Habit created — you've got this! 💪" : "Saved");
    if (after) after(); else rerender();
    scheduleReminders();
  });
}
