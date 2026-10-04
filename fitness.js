"use strict";
/* ==========================================================================
   FITNESS — cardio log, strength library, routines with a guided player.

   The weekly targets are the WHO's for adults: 150 min of moderate activity
   (vigorous minutes count double) and muscle strengthening on 2+ days.
   ========================================================================== */

let fitTab = "overview";
let fitMuscle = "abs";
const STRENGTH_MET = 5.0;   /* calisthenics / resistance training, moderate effort */

const cardioById = (id) => CARDIO.find(c => c.id === id);
const exById = (id) => EXERCISES.find(e => e.id === id);
const muscleById = (id) => MUSCLES.find(m => m.id === id);

/** Minutes that count toward the 150: moderate ×1, vigorous ×2, light not at all. */
function modMinutes(w){
  if (w.type !== "cardio") return 0;
  const m = num(w.min, 0);
  return w.intensity === "vigorous" ? m * 2 : w.intensity === "moderate" ? m : 0;
}
function kcalOf(w){
  if (num(w.kcal, 0) > 0) return num(w.kcal, 0);
  const kg = weightKg() || 70;
  if (w.type === "cardio"){
    const c = cardioById(w.ex); const met = c ? (c.met[w.intensity] || c.met[c.def]) : 5;
    return met * kg * num(w.min, 0) / 60;
  }
  return STRENGTH_MET * kg * num(w.min, 0) / 60;
}
function isStrength(w){ return w.type === "strength" || w.type === "routine"; }
function workoutsIn(from, to){ return state.workouts.filter(w => w.date >= from && w.date <= to); }
/** The week containing iso, Monday to Sunday. One filter for every figure in it. */
function fitnessWeek(iso){
  const a = mondayOf(iso), b = addDays(a, 6);
  const ws = workoutsIn(a, b);
  const days = {};
  ws.filter(isStrength).forEach(w => days[w.date] = 1);
  return {
    from: a, to: b, list: ws,
    modMin: ws.reduce((s, w) => s + modMinutes(w), 0),
    min: ws.reduce((s, w) => s + num(w.min, 0), 0),
    kcal: ws.reduce((s, w) => s + kcalOf(w), 0),
    strengthDays: Object.keys(days).length
  };
}
function stepsOn(iso){ return state.workouts.filter(w => w.date === iso).reduce((s, w) => s + num(w.steps, 0), 0); }

function workoutTitle(w){
  if (w.type === "cardio"){ const c = cardioById(w.ex); return (c ? c.icon + " " + c.name : "Cardio"); }
  if (w.type === "routine"){ const r = ROUTINES.find(x => x.id === w.routine); return (r ? r.icon + " " + r.name : "Workout"); }
  const e = exById(w.ex), m = e && muscleById(e.g);
  return (m ? m.icon + " " : "💪 ") + (e ? e.name : "Strength");
}
function workoutSub(w){
  const bits = [];
  if (w.type === "cardio"){
    bits.push(fmtN(w.min) + " min");
    if (num(w.km, 0)) bits.push(fmtN(w.km, 2) + " km");
    if (num(w.steps, 0)) bits.push(fmtN(w.steps) + " steps");
    bits.push(w.intensity);
  }else if (w.type === "routine"){
    bits.push(fmtN(w.min) + " min", plural(num(w.done, 0), "set"));
  }else{
    const sets = w.sets || [];
    bits.push(plural(sets.length, "set"));
    const reps = sets.reduce((s, x) => s + num(x.reps, 0), 0);
    if (reps) bits.push(reps + " reps");
    const kg = Math.max(0, ...sets.map(x => num(x.kg, 0)));
    if (kg) bits.push("up to " + fmtN(kg, 1) + " kg");
  }
  bits.push(fmtN(kcalOf(w)) + " kcal");
  return bits.join(" · ");
}

/* ---------- body map: a simple front figure, zones lit by muscle group ---------- */
function bodyMapSVG(zones){
  const on = (z) => zones.indexOf(z) >= 0 ? " on" : "";
  return '<svg class="bodymap" viewBox="0 0 120 250" aria-hidden="true">' +
    '<circle class="base" cx="60" cy="20" r="14"/>' +
    '<rect class="base" x="54" y="33" width="12" height="8" rx="3"/>' +
    '<path class="z' + on("sho") + '" d="M34 46 Q40 38 54 40 L52 54 Q40 54 34 60z"/><path class="z' + on("sho") + '" d="M86 46 Q80 38 66 40 L68 54 Q80 54 86 60z"/>' +
    '<path class="z' + on("che") + '" d="M53 44 L59 44 L59 70 Q46 72 40 64 L42 54z"/><path class="z' + on("che") + '" d="M67 44 L61 44 L61 70 Q74 72 80 64 L78 54z"/>' +
    '<path class="z' + on("bac") + '" d="M38 64 Q46 74 59 72 L59 76 Q46 78 39 72z" opacity=".9"/><path class="z' + on("bac") + '" d="M82 64 Q74 74 61 72 L61 76 Q74 78 81 72z" opacity=".9"/>' +
    '<rect class="z' + on("abs") + '" x="49" y="78" width="22" height="44" rx="6"/>' +
    '<path class="z' + on("obl") + '" d="M40 76 L47 79 L47 120 L42 118 Q38 98 40 76z"/><path class="z' + on("obl") + '" d="M80 76 L73 79 L73 120 L78 118 Q82 98 80 76z"/>' +
    '<path class="z' + on("bic") + '" d="M31 60 Q36 58 39 64 L37 92 Q31 94 28 90z"/><path class="z' + on("bic") + '" d="M89 60 Q84 58 81 64 L83 92 Q89 94 92 90z"/>' +
    '<path class="z' + on("tri") + '" d="M26 64 L30 61 L27 90 L23 88z"/><path class="z' + on("tri") + '" d="M94 64 L90 61 L93 90 L97 88z"/>' +
    '<path class="z' + on("fore") + '" d="M23 94 L36 96 L33 126 L24 126z"/><path class="z' + on("fore") + '" d="M97 94 L84 96 L87 126 L96 126z"/>' +
    '<circle class="base" cx="28" cy="133" r="5"/><circle class="base" cx="92" cy="133" r="5"/>' +
    '<path class="z' + on("glu") + '" d="M42 124 L78 124 Q80 136 76 142 L44 142 Q40 136 42 124z"/>' +
    '<path class="z' + on("thi") + '" d="M43 144 L58 144 L56 192 L46 192 Q40 168 43 144z"/><path class="z' + on("thi") + '" d="M77 144 L62 144 L64 192 L74 192 Q80 168 77 144z"/>' +
    '<path class="z' + on("cal") + '" d="M46 198 L56 198 L55 236 L48 236 Q44 216 46 198z"/><path class="z' + on("cal") + '" d="M74 198 L64 198 L65 236 L72 236 Q76 216 74 198z"/>' +
    "</svg>";
}

/* ==========================================================================
   VIEW
   ========================================================================== */
function renderFitness(){
  const v = $("#view-fitness");
  const tabs = [["overview","Overview"],["cardio","Cardio"],["strength","Strength"],["routines","Routines"]];
  v.innerHTML =
    '<div class="top"><div><div class="kicker">Move a little every day</div><h1>Fitness</h1></div>' +
    '<button class="iconbtn grad" id="ftAdd" aria-label="Log activity">' + ico("plus", 2.4) + "</button></div>" +
    '<div class="seg">' + tabs.map(t => '<button data-t="' + t[0] + '" class="' + (fitTab === t[0] ? "on" : "") + '">' + t[1] + "</button>").join("") + "</div>" +
    '<div id="ftBody"></div>';
  $$(".seg button", v).forEach(b => b.addEventListener("click", () => { fitTab = b.dataset.t; renderFitness(); }));
  $("#ftAdd").addEventListener("click", () => fitAdd());
  const body = $("#ftBody");
  if (fitTab === "overview") fitOverview(body);
  else if (fitTab === "cardio") fitCardio(body);
  else if (fitTab === "strength") fitStrength(body);
  else fitRoutines(body);
}
function fitAdd(){
  if (fitTab === "strength") return openStrengthLog(exById(EXERCISES.find(e => e.g === fitMuscle).id));
  openCardioPicker();
}
VIEWS.fitness = { render: renderFitness, fab: () => fitAdd() };

function fitOverview(body){
  const today = todayISO();
  const wk = fitnessWeek(today);
  const cg = num(state.settings.cardioGoal, 150), sg = num(state.settings.strengthGoal, 2), stg = num(state.settings.stepGoal, 8000);
  const tdW = state.workouts.filter(w => w.date === today);
  const tdMin = tdW.reduce((s, w) => s + num(w.min, 0), 0), tdKcal = tdW.reduce((s, w) => s + kcalOf(w), 0), tdSteps = stepsOn(today);
  const bmi = bmiOf(), band = bmiBand(bmi);
  const hM = num(state.profile.height, 0) / 100;

  /* this week's minutes, one bar per day */
  let bars = "";
  const days = daysBetween(wk.from, wk.to);
  const per = days.map(d => state.workouts.filter(w => w.date === d).reduce((s, w) => s + num(w.min, 0), 0));
  const mx = Math.max(30, ...per);
  days.forEach((d, i) => {
    const hgt = Math.round(per[i] / mx * 70);
    bars += '<g><rect x="' + (i * 44 + 8) + '" y="' + (80 - hgt) + '" width="28" height="' + Math.max(hgt, 2) + '" rx="7" fill="' + (per[i] ? "url(#fbg)" : "var(--surface-sunk)") + '"/>' +
      '<text x="' + (i * 44 + 22) + '" y="96" text-anchor="middle"' + (d === today ? ' style="fill:var(--accent)"' : "") + ">" + wdShort(d) + "</text>" +
      (per[i] ? '<text x="' + (i * 44 + 22) + '" y="' + (76 - hgt) + '" text-anchor="middle">' + Math.round(per[i]) + "</text>" : "") + "</g>";
  });

  const recent = state.workouts.slice().sort((a, b) => (b.date + (b.at || "")).localeCompare(a.date + (a.at || ""))).slice(0, 12);
  const kgs = state.weighins.slice().sort((a, b) => a.date.localeCompare(b.date));

  body.innerHTML =
    '<div class="hero"><div class="sub" style="margin-bottom:12px">This week · ' + esc(fmtDay(wk.from, { day:"numeric", month:"short" })) + " – " + esc(fmtDay(wk.to, { day:"numeric", month:"short" })) + "</div>" +
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">' +
    '<div style="text-align:center;min-width:0"><div style="width:100%;max-width:96px;aspect-ratio:1;margin:0 auto">' + ringBox(wk.modMin / cg, '<div><div style="font-size:20px;font-weight:800">' + Math.round(wk.modMin) + '</div><div style="font-size:10.5px;opacity:.85">of ' + cg + "</div></div>", { size:96, w:10 }) + '</div><div class="sub" style="margin-top:6px">Active min</div></div>' +
    '<div style="text-align:center;min-width:0"><div style="width:100%;max-width:96px;aspect-ratio:1;margin:0 auto">' + ringBox(wk.strengthDays / sg, '<div><div style="font-size:20px;font-weight:800">' + wk.strengthDays + '</div><div style="font-size:10.5px;opacity:.85">of ' + sg + " days</div></div>", { size:96, w:10 }) + '</div><div class="sub" style="margin-top:6px">Strength</div></div>' +
    '<div style="text-align:center;min-width:0"><div style="width:100%;max-width:96px;aspect-ratio:1;margin:0 auto">' + ringBox(Math.min(1, tdSteps / stg), '<div><div style="font-size:18px;font-weight:800">' + (tdSteps >= 1000 ? fmtN(tdSteps / 1000, 1) + "k" : tdSteps) + '</div><div style="font-size:10.5px;opacity:.85">steps today</div></div>', { size:96, w:10 }) + '</div><div class="sub" style="margin-top:6px">Steps</div></div>' +
    "</div></div>" +
    '<div class="stats"><div class="stat"><div class="v">' + fmtN(tdMin) + '<small> min</small></div><div class="l">Today</div></div>' +
    '<div class="stat"><div class="v">' + fmtN(tdKcal) + '<small> kcal</small></div><div class="l">Burned today</div></div>' +
    '<div class="stat"><div class="v">' + fmtN(wk.kcal) + '<small> kcal</small></div><div class="l">This week</div></div></div>' +
    '<div class="card"><h3>Minutes this week</h3><svg class="chart" viewBox="0 0 310 100"><defs><linearGradient id="fbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--a2)"/><stop offset="1" stop-color="var(--a1)"/></linearGradient></defs>' + bars + "</svg>" +
    '<div class="note">' + (wk.modMin >= cg ? "You've hit this week's WHO target. Fantastic work! 🎉" : "WHO recommends " + cg + " min of moderate activity a week, and vigorous minutes count double. " + Math.max(0, Math.round(cg - wk.modMin)) + " min to go.") + "</div></div>" +

    '<div class="card"><h3>⚖️ Body<button class="more" id="ftWeigh">Log weight</button></h3>' +
    (bmi ? '<div class="row"><div style="font-size:32px;font-weight:800;color:' + band.color + '">' + fmtN(bmi, 1) + '</div><div class="grow"><div style="font-weight:700">BMI · ' + band.name + '</div><div class="small muted">' +
      fmtN(weightKg(), 1) + " kg · " + fmtN(num(state.profile.height, 0)) + " cm · a healthy weight for your height is " + fmtN(18.5 * hM * hM, 0) + "–" + fmtN(24.9 * hM * hM, 0) + " kg</div></div></div>" +
      '<div class="bar" style="margin-top:10px;background:linear-gradient(90deg,#0EA5E9 0 18%,#10B981 18% 50%,#F59E0B 50% 75%,#EF4444 75%);height:8px;position:relative"><i style="position:absolute;left:' + clamp((bmi - 15) / 20 * 100, 0, 100) + '%;top:-4px;width:4px;height:16px;background:var(--ink);border-radius:2px"></i></div>'
      : '<div class="note">Add your height and weight under More → Settings → Profile to see your BMI and get more accurate calorie figures.</div>') +
    (kgs.length > 1 ? '<div style="margin-top:12px">' + lineChartSVG(kgs.map(w => ({ x:w.date, y:w.kg })), { h:90, unit:"kg" }) + "</div>" : "") + "</div>" +

    '<div class="sec-h">Recent activity</div>' +
    (recent.length ? '<div class="list">' + recent.map(w => '<button class="li" data-w="' + w.id + '"><div class="grow"><div class="lt">' + esc(workoutTitle(w)) + '</div><div class="ls">' +
      esc(fmtDay(w.date)) + " · " + esc(workoutSub(w)) + '</div></div><span class="chev">›</span></button>').join("") + "</div>"
      : '<div class="card empty"><div class="ei">🏃</div><b>No activity yet</b>Log a walk or try a routine. Every minute counts.</div>');

  $$("[data-w]", body).forEach(b => b.addEventListener("click", () => {
    const w = state.workouts.find(x => x.id === b.dataset.w); if (w) openWorkoutEdit(w);
  }));
  $("#ftWeigh").addEventListener("click", async () => {
    const n = await askNumber("Today's weight", weightKg() || "", "Kilograms");
    if (!n || n < 20 || n > 400){ if (n) toast("That weight looks off"); return; }
    logWeight(n); save(); renderFitness(); toast("Weight saved");
  });
}
function logWeight(kg){
  const d = todayISO();
  state.weighins = state.weighins.filter(w => w.date !== d);
  state.weighins.push({ date:d, kg: Math.round(kg * 10) / 10 });
  state.profile.weight = String(Math.round(kg * 10) / 10);
}

function fitCardio(body){
  body.innerHTML =
    '<div class="infobox">🌍 <b>Healthy-life target:</b> at least 150 min of moderate cardio a week (like brisk walking or easy cycling), or 75 min of vigorous (running, skipping). That\'s about 30 min, 5 days a week. Tap an activity to log it.</div>' +
    '<div class="tiles">' + CARDIO.map(c => '<button class="tile" data-c="' + c.id + '"><div class="ti">' + c.icon + '</div><div class="tn">' + esc(c.name) +
      '</div><div class="ts">' + esc(c.rec.split(".")[0]) + ".</div></button>").join("") + "</div>";
  $$("[data-c]", body).forEach(b => b.addEventListener("click", () => openCardioLog(cardioById(b.dataset.c))));
}

function fitStrength(body){
  const m = muscleById(fitMuscle) || MUSCLES[0];
  const list = EXERCISES.filter(e => e.g === m.id);
  body.innerHTML =
    '<div class="hscroll" style="margin-bottom:12px">' + MUSCLES.map(x => '<button class="chip' + (x.id === m.id ? " on" : "") + '" data-g="' + x.id + '">' + x.icon + " " + esc(x.name) + "</button>").join("") + "</div>" +
    '<div class="card"><div class="row" style="gap:14px;align-items:center"><div style="width:110px;flex:none">' + bodyMapSVG(m.zone) + "</div>" +
    '<div class="grow"><div style="font-size:20px;font-weight:800">' + m.icon + " " + esc(m.name) + '</div><div class="muted small" style="margin-bottom:8px">' + esc(m.sub) + " · " + plural(list.length, "exercise") + "</div>" +
    (m.id === "abs" ? '<div class="small" style="color:var(--ink-2)">Core work makes the muscles strong, but you can\'t burn fat from one spot. A flat stomach also needs regular cardio, enough sleep and less sugar. Combine this with the <b>Flat stomach</b> routine 3× a week.</div>'
      : '<div class="small" style="color:var(--ink-2)">Train each muscle group 2× a week with a rest day between. Choose a weight where the last 2 reps feel hard but your form stays clean.</div>') +
    "</div></div></div>" +
    list.map(e => '<div class="ex" data-e="' + e.id + '"><button class="ex-h"><div class="lico" style="width:42px;height:42px;border-radius:12px;display:grid;place-items:center;background:var(--accent-soft);font-size:20px">' + m.icon + "</div>" +
      '<div class="grow"><div class="ex-n">' + esc(e.name) + '</div><div class="ex-s">' + e.sets + " × " + (e.secs ? e.secs + " s" : e.reps + " reps") + " · " + esc(e.eq) + " · " + esc(e.lvl) + '</div></div><span class="chev">⌄</span></button>' +
      '<div class="ex-b"><div class="move" data-move="' + e.id + '"></div><ol>' + e.how.map(x => "<li>" + esc(x) + "</li>").join("") + '</ol><div class="tipbox">💡 ' + esc(e.tip) + "</div>" +
      '<button class="btn primary block" data-log="' + e.id + '">' + ico("plus") + " Log sets</button></div></div>").join("");
  $$("[data-g]", body).forEach(b => b.addEventListener("click", () => { fitMuscle = b.dataset.g; renderFitness(); }));
  $$(".ex-h", body).forEach(b => b.addEventListener("click", () => {
    b.parentElement.classList.toggle("open");
    mountMoves(b.parentElement);
  }));
  $$("[data-log]", body).forEach(b => b.addEventListener("click", () => openStrengthLog(exById(b.dataset.log))));
}

function fitRoutines(body){
  body.innerHTML =
    '<div class="infobox">⚡ Ready-made workouts with a timer that guides you set by set. Do 2–3 a week alongside your cardio.</div>' +
    ROUTINES.map(r => {
      const done = state.workouts.filter(w => w.routine === r.id).length;
      return '<div class="card" style="border-left:5px solid ' + r.color + '"><div class="row"><div style="font-size:32px">' + r.icon + '</div><div class="grow"><div style="font-weight:800;font-size:16px">' + esc(r.name) +
        '</div><div class="small muted">' + r.min + " min · " + esc(r.lvl) + " · " + plural(r.items.length, "exercise") + (done ? " · done " + done + "×" : "") + "</div></div>" +
        '<button class="btn primary sm" data-start="' + r.id + '">' + ico("play") + " Start</button></div>" +
        '<div class="small" style="color:var(--ink-2);margin:10px 0 8px">' + esc(r.about) + '</div><div class="chips">' +
        r.items.map(it => { const e = exById(it[0]); return '<span class="chip" style="font-size:12px;padding:5px 10px">' + esc(e ? e.name : it[0]) + " " + it[1] + "×" + (it[3] ? it[3] + "s" : it[2]) + "</span>"; }).join("") +
        "</div></div>";
    }).join("");
  $$("[data-start]", body).forEach(b => b.addEventListener("click", () => startRoutine(ROUTINES.find(r => r.id === b.dataset.start))));
}

/* ==========================================================================
   LOGGING SHEETS
   ========================================================================== */
function openCardioPicker(){
  const s = openSheet({ title:"Log cardio",
    body: '<div class="tiles">' + CARDIO.map(c => '<button class="tile" data-c="' + c.id + '"><div class="ti">' + c.icon + '</div><div class="tn">' + esc(c.name) + "</div></button>").join("") + "</div>" });
  $$("[data-c]", s.body).forEach(b => b.addEventListener("click", () => { s.close(); openCardioLog(cardioById(b.dataset.c)); }));
}

function openCardioLog(c, existing){
  const w = existing ? Object.assign({}, existing) : { id: uid(), type:"cardio", ex:c.id, date: todayISO(), at: nowHM(), min:30, intensity:c.def, km:"", steps:"", note:"" };
  c = c || cardioById(w.ex);
  const s = openSheet({ title: c.icon + " " + c.name, tall: true,
    foot: (existing ? '<button class="btn danger" data-a="del">' + ico("trash") + "</button>" : "") + '<button class="btn primary" data-a="save">' + ico("check") + " Save</button>" });
  function est(){ return Math.round(kcalOf(Object.assign({}, w, { kcal:0 }))); }
  function draw(){
    s.body.innerHTML = '<div class="move" data-move="cardio-' + c.id + '"></div>' +
      '<div class="infobox">' + esc(c.rec) + "</div>" +
      '<div class="two" style="margin-bottom:8px"><label class="field" style="margin:0"><span>Date</span><input class="input" id="cDate" type="date" max="' + todayISO() + '" value="' + esc(w.date) + '"></label>' +
      '<label class="field" style="margin:0"><span>Minutes</span><input class="input" id="cMin" type="number" inputmode="numeric" min="1" value="' + esc(w.min) + '"></label></div>' +
      '<div class="chips" style="margin:0 0 14px">' + [10, 15, 20, 30, 45, 60, 90].map(m => '<button class="chip' + (num(w.min) === m ? " on" : "") + '" data-min="' + m + '">' + m + " min</button>").join("") + "</div>" +
      '<div class="field"><span>Intensity</span><div class="seg">' + [["light","Light"],["moderate","Moderate"],["vigorous","Vigorous"]].map(o => '<button data-i="' + o[0] + '" class="' + (w.intensity === o[0] ? "on" : "") + '">' + o[1] + "</button>").join("") + "</div>" +
      '<div class="note" style="margin-top:-8px">' + (w.intensity === "light" ? "Light activity is good for you, but it doesn't count toward the 150-minute target." :
        w.intensity === "moderate" ? "Moderate: breathing faster, but you can still talk." : "Vigorous: you can only say a few words at a time. These minutes count double.") + "</div></div>" +
      ((c.dist || c.steps) ? '<div class="two">' + (c.dist ? '<label class="field"><span>Distance (km)</span><input class="input" id="cKm" type="number" inputmode="decimal" step="0.01" value="' + esc(w.km) + '"></label>' : "<div></div>") +
        (c.steps ? '<label class="field"><span>Steps</span><input class="input" id="cSteps" type="number" inputmode="numeric" value="' + esc(w.steps) + '"></label>' : "<div></div>") + "</div>" : "") +
      '<label class="field"><span>Note</span><input class="input" id="cNote" placeholder="How did it feel?" value="' + esc(w.note) + '"></label>' +
      '<div class="card row" style="margin:0"><div style="font-size:28px">🔥</div><div class="grow"><div style="font-weight:800;font-size:20px" id="cKcal">' + est() + ' kcal</div><div class="small muted">Estimated for ' + fmtN(weightKg() || 70, 1) + " kg" + (weightKg() ? "" : " (add your weight in Profile)") + "</div></div></div>" +
      '<div class="tipbox" style="margin-top:12px">💡 ' + esc(c.tip) + "</div>";
    const upd = () => {
      w.date = $("#cDate", s.body).value || w.date; w.min = num($("#cMin", s.body).value, 0);
      if ($("#cKm", s.body)) w.km = $("#cKm", s.body).value; if ($("#cSteps", s.body)) w.steps = $("#cSteps", s.body).value;
      w.note = $("#cNote", s.body).value; $("#cKcal", s.body).textContent = est() + " kcal";
    };
    $$("input", s.body).forEach(i => i.addEventListener("input", upd));
    $$("[data-min]", s.body).forEach(b => b.addEventListener("click", () => { upd(); w.min = +b.dataset.min; draw(); }));
    $$("[data-i]", s.body).forEach(b => b.addEventListener("click", () => { upd(); w.intensity = b.dataset.i; draw(); }));
    mountMoves(s.body);
  }
  draw();
  $('[data-a="save"]', s.el).addEventListener("click", () => {
    if (!(num(w.min) > 0)){ toast("How many minutes?"); return; }
    w.min = num(w.min); w.km = num(w.km, 0) || ""; w.steps = Math.round(num(w.steps, 0)) || "";
    delete w.kcal;
    if (existing) Object.assign(existing, w); else state.workouts.push(w);
    save(); s.close(); rerender();
    toast(existing ? "Saved" : "Nice work! " + fmtN(w.min) + " min of " + c.name.toLowerCase() + " logged 💪");
  });
  const del = $('[data-a="del"]', s.el);
  if (del) del.addEventListener("click", () => {
    if (!confirm("Delete this activity?")) return;
    state.workouts = state.workouts.filter(x => x !== existing); save(); s.close(); rerender(); toast("Deleted");
  });
}

function openStrengthLog(e, existing){
  e = e || exById(existing.ex);
  const w = existing ? JSON.parse(JSON.stringify(existing)) : { id: uid(), type:"strength", ex:e.id, g:e.g, date: todayISO(), at: nowHM(), min: Math.max(5, e.sets * 2), sets: [] };
  if (!w.sets.length) for (let i = 0; i < e.sets; i++) w.sets.push(e.secs ? { secs:e.secs } : { reps:e.reps, kg:"" });
  const last = state.workouts.filter(x => x.ex === e.id && x !== existing).sort((a, b) => b.date.localeCompare(a.date))[0];
  const s = openSheet({ title: e.name, tall: true,
    foot: (existing ? '<button class="btn danger" data-a="del">' + ico("trash") + "</button>" : "") + '<button class="btn primary" data-a="save">' + ico("check") + " Save workout</button>" });
  function draw(){
    s.body.innerHTML = '<div class="move" data-move="' + e.id + '"></div>' +
      '<div class="row" style="margin-bottom:12px"><div style="width:70px;flex:none">' + bodyMapSVG(muscleById(e.g).zone) + '</div><div class="grow small" style="color:var(--ink-2)">' +
      "<b>Recommended:</b> " + e.sets + " × " + (e.secs ? e.secs + " s" : e.reps + " reps") + "<br>" + esc(e.tip) +
      (last ? '<div class="muted" style="margin-top:6px">Last time (' + esc(fmtDay(last.date, { day:"numeric", month:"short" })) + "): " + esc(workoutSub(last)) + "</div>" : "") + "</div></div>" +
      '<div class="two"><label class="field"><span>Date</span><input class="input" id="sDate" type="date" max="' + todayISO() + '" value="' + esc(w.date) + '"></label>' +
      '<label class="field"><span>Total minutes</span><input class="input" id="sMin" type="number" min="1" value="' + esc(w.min) + '"></label></div>' +
      '<div class="field"><span>Sets</span>' + w.sets.map((x, i) => '<div class="row" style="margin-bottom:8px"><div class="badge" style="flex:none;white-space:nowrap;min-width:34px;text-align:center">' + (i + 1) + "</div>" +
        (e.secs ? '<input class="input" data-s="' + i + '" data-k="secs" type="number" min="1" value="' + esc(x.secs) + '" placeholder="sec"><span class="muted small">sec</span>'
          : '<input class="input" data-s="' + i + '" data-k="reps" type="number" min="1" value="' + esc(x.reps) + '" placeholder="reps"><span class="muted small">reps</span>' +
            (e.kg ? '<input class="input" data-s="' + i + '" data-k="kg" type="number" step="0.5" min="0" value="' + esc(x.kg) + '" placeholder="kg"><span class="muted small">kg</span>' : "")) +
        '<button class="iconbtn" data-rm="' + i + '" style="width:34px;height:34px">' + ico("close") + "</button></div>").join("") +
      '<button class="btn sm" id="sAdd">' + ico("plus") + " Add set</button></div>";
    $$("[data-s]", s.body).forEach(i => i.addEventListener("input", () => {
      const n = +i.dataset.s, k = i.dataset.k;
      w.sets[n][k] = i.value;
      /* a weight typed on one set carries down to the empty ones below it */
      if (k === "kg") for (let j = n + 1; j < w.sets.length; j++){
        const box = $('[data-s="' + j + '"][data-k="kg"]', s.body);
        if (box && (!box.value || box.dataset.auto)){ box.value = i.value; box.dataset.auto = "1"; w.sets[j].kg = i.value; }
      }
      delete i.dataset.auto;
    }));
    $$("[data-rm]", s.body).forEach(b => b.addEventListener("click", () => { if (w.sets.length > 1){ w.sets.splice(+b.dataset.rm, 1); draw(); } }));
    $("#sAdd", s.body).addEventListener("click", () => { w.sets.push(Object.assign({}, w.sets[w.sets.length - 1])); draw(); });
    $("#sDate", s.body).addEventListener("input", (ev) => w.date = ev.target.value || w.date);
    $("#sMin", s.body).addEventListener("input", (ev) => w.min = num(ev.target.value, 0));
    mountMoves(s.body);
  }
  draw();
  $('[data-a="save"]', s.el).addEventListener("click", () => {
    w.sets = w.sets.map(x => { const o = {}; ["reps","kg","secs"].forEach(k => { if (num(x[k], 0) > 0) o[k] = num(x[k]); }); return o; }).filter(x => Object.keys(x).length);
    if (!w.sets.length){ toast("Add at least one set"); return; }
    if (existing) Object.assign(existing, w); else state.workouts.push(w);
    save(); s.close(); rerender(); toast(existing ? "Saved" : "Strong work! " + e.name + " logged 💪");
  });
  const del = $('[data-a="del"]', s.el);
  if (del) del.addEventListener("click", () => {
    if (!confirm("Delete this workout?")) return;
    state.workouts = state.workouts.filter(x => x !== existing); save(); s.close(); rerender(); toast("Deleted");
  });
}

function openWorkoutEdit(w){
  if (w.type === "cardio") return openCardioLog(cardioById(w.ex), w);
  if (w.type === "strength") return openStrengthLog(exById(w.ex), w);
  const s = openSheet({ title: workoutTitle(w),
    body: '<div class="card"><div style="font-weight:700">' + esc(fmtDay(w.date, { weekday:"long", day:"numeric", month:"long" })) + '</div><div class="muted small">' + esc(workoutSub(w)) + "</div></div>",
    foot: '<button class="btn danger" data-a="del">' + ico("trash") + ' Delete</button><button class="btn" data-x="1">Close</button>' });
  $('.sheet-foot [data-x]', s.el).addEventListener("click", () => s.close());
  $('[data-a="del"]', s.el).addEventListener("click", () => {
    if (!confirm("Delete this workout?")) return;
    state.workouts = state.workouts.filter(x => x !== w); save(); s.close(); rerender(); toast("Deleted");
  });
}

/* ==========================================================================
   ROUTINE PLAYER — exercise, then rest, set by set. Timed holds count down;
   rep sets wait for "Done". The workout is saved with what was actually done.
   ========================================================================== */
function startRoutine(r){
  const steps = [];
  r.items.forEach(it => {
    const e = exById(it[0]); if (!e) return;
    for (let k = 1; k <= it[1]; k++) steps.push({ e, set:k, sets:it[1], reps:it[2], secs:it[3] });
  });
  let i = 0, phase = "ready", left = 5, timer = 0, started = Date.now(), doneSets = 0, paused = false;
  const s = openSheet({ title: r.icon + " " + r.name, tall: true,
    foot: '<button class="btn" data-a="skip">Skip</button><button class="btn primary" data-a="main">Start</button>',
    onClose: () => clearInterval(timer) });
  const beep = () => { try{ if (navigator.vibrate) navigator.vibrate(120);
    const ac = new (window.AudioContext || window.webkitAudioContext)(); const o = ac.createOscillator(); const g = ac.createGain();
    o.frequency.value = 880; o.connect(g); g.connect(ac.destination); g.gain.setValueAtTime(.15, ac.currentTime); g.gain.exponentialRampToValueAtTime(.001, ac.currentTime + .35);
    o.start(); o.stop(ac.currentTime + .36); }catch(_){} };
  function draw(){
    const st = steps[i];
    const total = phase === "rest" ? r.rest : phase === "ready" ? 5 : (st && st.secs) || 0;
    const frac = total ? left / total : 1;
    let center, label, mainBtn;
    if (phase === "finish"){
      const mins = Math.max(1, Math.round((Date.now() - started) / 60000));
      s.body.innerHTML = '<div class="player"><div style="font-size:64px">🏆</div><div class="pex">Workout complete!</div><div class="muted">' + doneSets + " sets in " + mins + " min. Brilliant effort!</div></div>";
      $('[data-a="main"]', s.el).innerHTML = ico("check") + " Save & finish";
      $('[data-a="skip"]', s.el).hidden = true;
      return;
    }
    if (phase === "ready"){ center = '<div class="ptime">' + left + '</div><div class="muted">Get ready</div>'; label = "Up first"; mainBtn = "Go now"; }
    else if (phase === "rest"){ center = '<div class="ptime">' + left + '</div><div class="muted">Rest</div>'; label = "Next up"; mainBtn = "Skip rest"; }
    else if (st.secs){ center = '<div class="ptime">' + left + '</div><div class="muted">seconds</div>'; label = "Hold it"; mainBtn = paused ? "Resume" : "Pause"; }
    else { center = '<div class="ptime">' + st.reps + '</div><div class="muted">reps</div>'; label = "Your set"; mainBtn = "Done ✓"; }
    const show = phase === "rest" ? steps[i] : st;
    s.body.innerHTML = '<div class="player"><div class="bar" style="margin-bottom:16px"><i style="width:' + (i / steps.length * 100) + '%"></i></div>' +
      '<div class="pring">' + ringSVG(phase === "work" && !st.secs ? 1 : frac, { size:220, w:14, track:"var(--surface-sunk)", c1:r.color, c2:"var(--a2)" }) + '<div class="pc">' + center + "</div></div>" +
      '<div class="muted small" style="margin-top:14px;text-transform:uppercase;font-weight:700;letter-spacing:.06em">' + label + "</div>" +
      '<div class="pex">' + esc(show.e.name) + '</div><div class="muted">Set ' + show.set + " of " + show.sets + " · " + (show.secs ? show.secs + " s" : show.reps + " reps") + "</div>" +
      '<div class="move" style="margin-top:12px" data-move="' + show.e.id + '"></div>' +
      '<div class="tipbox" style="text-align:left">💡 ' + esc(show.e.how[0]) + " " + esc(show.e.tip) + "</div></div>";
    $('[data-a="main"]', s.el).textContent = mainBtn;
    mountMoves(s.body);
  }
  function next(){
    if (phase === "work"){ doneSets++; i++; if (i >= steps.length){ phase = "finish"; clearInterval(timer); beep(); confetti(); draw(); return; } phase = "rest"; left = r.rest; }
    else { phase = "work"; left = steps[i].secs || 0; }
    beep(); draw();
  }
  timer = setInterval(() => {
    if (paused || phase === "finish") return;
    if (phase === "work" && !steps[i].secs) return;
    left--;
    if (left <= 0) next(); else draw();
  }, 1000);
  draw();
  $('[data-a="main"]', s.el).addEventListener("click", () => {
    if (phase === "finish"){
      const mins = Math.max(1, Math.round((Date.now() - started) / 60000));
      state.workouts.push({ id: uid(), type:"routine", routine:r.id, date: todayISO(), at: nowHM(), min: mins, done: doneSets,
        groups: Array.from(new Set(steps.slice(0, Math.max(doneSets, 1)).map(x => x.e.g))) });
      save(); s.close(); rerender(); toast("Workout saved. You're getting stronger! 💪");
      return;
    }
    if (phase === "work" && steps[i].secs){ paused = !paused; draw(); return; }
    next();
  });
  $('[data-a="skip"]', s.el).addEventListener("click", () => {
    if (phase === "work"){ i++; if (i >= steps.length){ phase = "finish"; clearInterval(timer); draw(); return; } phase = "rest"; left = r.rest; draw(); }
    else next();
  });
}
