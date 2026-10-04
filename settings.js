"use strict";
/* ==========================================================================
   MORE — Reports, What's new, Settings (Profile, Goals, Appearance, Diary,
   Reminders, GitHub sync, Backup & restore, About), and the app's start-up.
   ========================================================================== */

function renderMore(){
  const v = $("#view-more");
  const waiting = GH.enabled ? ghChanges().length : 0;
  v.innerHTML =
    '<div class="top"><div><div class="kicker">Version ' + APP_VERSION + "</div><h1>More</h1></div></div>" +
    '<div class="tiles" style="margin-bottom:14px">' +
    '<button class="tile" id="mrRep"><div class="ti">📊</div><div class="tn">Reports</div><div class="ts">Habits, fitness, mood</div></button>' +
    '<button class="tile" id="mrNew"><div class="ti">✨</div><div class="tn">What\'s new</div><div class="ts">Release notes</div></button>' +
    /* Settings holds GitHub sync too, so it is the one way in. It spans the
       row, and says when there is something waiting to be pushed. */
    '<button class="tile" id="mrSet" style="grid-column:1/-1;flex-direction:row;align-items:center;gap:12px">' + (waiting ? '<span class="tdot"></span>' : "") +
    '<div class="ti">⚙️</div><div class="grow"><div class="tn">Settings</div><div class="ts">Profile, goals, theme, reminders, GitHub sync, backup' +
    (waiting ? ' · <b style="color:var(--flame)">' + waiting + " change" + (waiting === 1 ? "" : "s") + " to push</b>" : "") + '</div></div><span class="chev" style="color:var(--ink-3);font-size:18px">›</span></button>' +
    "</div>" +
    '<div class="card"><h3>📈 At a glance</h3><div class="stats" style="margin:0">' +
    '<div class="stat"><div class="v">' + activeHabits().length + '</div><div class="l">Habits</div></div>' +
    '<div class="stat"><div class="v">' + state.workouts.length + '</div><div class="l">Workouts</div></div>' +
    '<div class="stat"><div class="v">' + state.diary.length + '</div><div class="l">Diary entries</div></div></div></div>';
  $("#mrRep").addEventListener("click", () => openReports());
  $("#mrNew").addEventListener("click", openNotes);
  $("#mrSet").addEventListener("click", openSettings);
}
VIEWS.more = { render: renderMore, fab: null };

function openSettings(){
  const s = openSheet({ title: "Settings", tall: true });
  const items = [
    ["👤", "Profile", "Name, email, age, weight, height", openProfile],
    ["🎯", "Goals", "Weekly cardio, strength days, steps", openGoals],
    ["🎨", "Appearance", "Theme and colours", openAppearance],
    ["🎙️", "Diary", "Dictation language", openDiarySettings],
    ["🔔", "Reminders", state.settings.reminders ? "On" : "Off", openReminders],
    ["☁️", "GitHub sync", GH.enabled ? (ghChanges().length ? ghChanges().length + " change" + (ghChanges().length === 1 ? "" : "s") + " to push · " : "Up to date · ") + GH.repo : "Off", openGithub],
    ["💾", "Backup & restore", "Download, restore, start over", openBackup],
    ["ℹ️", "About & update", "Version " + APP_VERSION, openAbout]
  ];
  s.body.innerHTML = '<div class="list">' + items.map((it, i) => '<button class="li" data-i="' + i + '"><div class="lico">' + it[0] + '</div><div class="grow"><div class="lt">' + it[1] +
    '</div><div class="ls">' + esc(it[2]) + '</div></div><span class="chev">›</span></button>').join("") + "</div>";
  $$("[data-i]", s.body).forEach(b => b.addEventListener("click", () => items[+b.dataset.i][3]()));
}

/* ---------- Profile ---------- */
function openProfile(){
  const p = state.profile;
  const s = openSheet({ title: "Profile", back: true,
    body:
      '<label class="field"><span>Name</span><input class="input" id="pName" autocomplete="name" value="' + esc(p.name) + '" placeholder="Your name"></label>' +
      '<label class="field"><span>Email</span><input class="input" id="pEmail" type="email" autocomplete="email" value="' + esc(p.email) + '" placeholder="you@example.com"></label>' +
      '<div class="three"><label class="field"><span>Age</span><input class="input" id="pAge" type="number" inputmode="numeric" min="5" max="120" value="' + esc(p.age) + '"></label>' +
      '<label class="field"><span>Weight kg</span><input class="input" id="pW" type="number" inputmode="decimal" step="0.1" value="' + esc(p.weight) + '"></label>' +
      '<label class="field"><span>Height cm</span><input class="input" id="pH" type="number" inputmode="decimal" value="' + esc(p.height) + '"></label></div>' +
      '<div class="card" id="pBmi"></div>' +
      '<div class="note">Your weight and height are used for BMI and calorie estimates. Changing your weight here also adds it to your weight history.</div>',
    foot: '<button class="btn primary" data-a="save">' + ico("check") + " Save profile</button>" });
  const bmiBox = () => {
    const w = num($("#pW", s.body).value, 0), h = num($("#pH", s.body).value, 0) / 100;
    const b = (w > 0 && h > .5) ? w / (h * h) : 0, band = bmiBand(b);
    $("#pBmi", s.body).innerHTML = b ? '<div class="row"><div style="font-size:30px;font-weight:800;color:' + band.color + '">' + fmtN(b, 1) + '</div><div class="grow"><div style="font-weight:700">BMI · ' + band.name +
      '</div><div class="small muted">A healthy weight for your height is ' + fmtN(18.5 * h * h, 0) + "–" + fmtN(24.9 * h * h, 0) + " kg</div></div></div>" : '<div class="note">Enter weight and height to see your BMI.</div>';
  };
  $$("input", s.body).forEach(i => i.addEventListener("input", bmiBox));
  bmiBox();
  $('[data-a="save"]', s.el).addEventListener("click", () => {
    const email = $("#pEmail", s.body).value.trim();
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){ toast("That email doesn't look right"); return; }
    const oldW = num(p.weight, 0), newW = num($("#pW", s.body).value, 0);
    p.name = $("#pName", s.body).value.trim();
    p.email = email;
    p.age = $("#pAge", s.body).value.trim();
    p.height = $("#pH", s.body).value.trim();
    if (newW > 0 && newW !== oldW) logWeight(newW); else p.weight = $("#pW", s.body).value.trim();
    save(); s.close(); rerender(); toast("Profile saved" + (p.name ? ", " + firstName() : "") + " 👋");
  });
}

function openGoals(){
  const st = state.settings;
  const s = openSheet({ title: "Goals", back: true,
    body:
      '<label class="field"><span>Active minutes a week</span><input class="input" id="gC" type="number" min="10" value="' + esc(st.cardioGoal) + '"></label>' +
      '<div class="note" style="margin:-8px 0 14px">WHO: 150–300 min of moderate activity a week (vigorous counts double).</div>' +
      '<label class="field"><span>Strength days a week</span><input class="input" id="gS" type="number" min="1" max="7" value="' + esc(st.strengthGoal) + '"></label>' +
      '<div class="note" style="margin:-8px 0 14px">WHO: muscle-strengthening on 2 or more days a week.</div>' +
      '<label class="field"><span>Daily steps</span><input class="input" id="gSt" type="number" min="1000" step="500" value="' + esc(st.stepGoal) + '"></label>',
    foot: '<button class="btn primary" data-a="save">' + ico("check") + " Save goals</button>" });
  $('[data-a="save"]', s.el).addEventListener("click", () => {
    st.cardioGoal = Math.max(10, Math.round(num($("#gC", s.body).value, 150)));
    st.strengthGoal = clamp(Math.round(num($("#gS", s.body).value, 2)), 1, 7);
    st.stepGoal = Math.max(1000, Math.round(num($("#gSt", s.body).value, 8000)));
    save(); s.close(); rerender(); toast("Goals updated 🎯");
  });
}

/* ---------- Appearance (device-only: a theme is a preference of the screen, not of the book) ---------- */
const ACCENTS = [["", "Aurora", "#7C3AED", "#14B8A6"], ["ocean", "Ocean", "#2563EB", "#06B6D4"], ["sunset", "Sunset", "#E11D48", "#F59E0B"], ["forest", "Forest", "#047857", "#84CC16"], ["berry", "Berry", "#C026D3", "#6366F1"]];
function applyTheme(){
  let t = "", a = "";
  try{ t = localStorage.getItem("habits.theme") || ""; a = localStorage.getItem("habits.accent") || ""; }catch(e){}
  const root = document.documentElement;
  if (t) root.dataset.theme = t; else delete root.dataset.theme;
  if (a) root.dataset.accent = a; else delete root.dataset.accent;
  const dark = t === "dark" || (!t && matchMedia("(prefers-color-scheme: dark)").matches);
  $("#themeColorMeta").setAttribute("content", dark ? "#0E0C18" : "#F4F2FB");
}
function openAppearance(){
  const s = openSheet({ title: "Appearance", back: true });
  function draw(){
    let t = "", a = "";
    try{ t = localStorage.getItem("habits.theme") || ""; a = localStorage.getItem("habits.accent") || ""; }catch(e){}
    s.body.innerHTML =
      '<div class="field"><span>Theme</span><div class="seg">' + [["","Auto"],["light","☀️ Light"],["dark","🌙 Dark"]].map(o => '<button data-t="' + o[0] + '" class="' + (t === o[0] ? "on" : "") + '">' + o[1] + "</button>").join("") + "</div></div>" +
      '<div class="field"><span>Colour</span><div class="tiles">' + ACCENTS.map(x => '<button class="tile" data-a="' + x[0] + '" style="' + (a === x[0] ? "box-shadow:0 0 0 2px var(--ink)" : "") + '"><div style="height:44px;border-radius:12px;background:linear-gradient(135deg,' + x[2] + "," + x[3] + ')"></div><div class="tn">' + x[1] + "</div></button>").join("") + "</div></div>";
    $$("[data-t]", s.body).forEach(b => b.addEventListener("click", () => { try{ b.dataset.t ? localStorage.setItem("habits.theme", b.dataset.t) : localStorage.removeItem("habits.theme"); }catch(e){} applyTheme(); draw(); }));
    $$("[data-a]", s.body).forEach(b => b.addEventListener("click", () => { try{ b.dataset.a ? localStorage.setItem("habits.accent", b.dataset.a) : localStorage.removeItem("habits.accent"); }catch(e){} applyTheme(); draw(); }));
  }
  draw();
}

function openDiarySettings(){
  const s = openSheet({ title: "Diary", back: true,
    body: '<label class="field"><span>Dictation language</span><select class="input" id="dsLang">' + DICT_LANGS.map(l => '<option value="' + l[0] + '"' + (state.settings.dictLang === l[0] ? " selected" : "") + ">" + l[1] + "</option>").join("") + "</select></label>" +
      '<div class="note">Dictation uses your browser\'s speech recognition. Chrome and Safari support it. Voice notes are stored on this device and included in GitHub sync and full backups.</div>' +
      '<label class="field" style="margin-top:12px"><span>Daily diary reminder</span><input class="input" id="dsRem" type="time" value="' + esc(state.settings.diaryReminder) + '"></label>',
    foot: '<button class="btn primary" data-a="save">' + ico("check") + " Save</button>" });
  $('[data-a="save"]', s.el).addEventListener("click", () => {
    state.settings.dictLang = $("#dsLang", s.body).value;
    state.settings.diaryReminder = $("#dsRem", s.body).value;
    save(); s.close(); scheduleReminders(); toast("Saved");
  });
}

/* ==========================================================================
   REMINDERS — notifications while the app is open or in the background.
   A web app without a push server can't wake a closed app, and the panel
   says so rather than promising otherwise.
   ========================================================================== */
let remTimer = 0;
function scheduleReminders(){
  clearInterval(remTimer);
  if (!state.settings.reminders || !("Notification" in window) || Notification.permission !== "granted") return;
  const fire = async (key, title, body) => {
    try{ if (localStorage.getItem(key)) return; localStorage.setItem(key, "1"); }catch(e){ return; }
    try{
      const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
      if (reg && reg.showNotification) reg.showNotification(title, { body, icon:"icons/icon-192.png", badge:"icons/icon-192.png", tag:key });
      else new Notification(title, { body, icon:"icons/icon-192.png" });
    }catch(e){}
  };
  const check = () => {
    const now = nowHM(), d = todayISO();
    activeHabits().forEach(h => {
      if (h.reminder && h.reminder <= now && dueOn(h, d) && !isDone(h, d) && !isSkip(h, d))
        fire("habits.rem." + d + "." + h.id, h.icon + " " + h.name, h.why ? "Remember why: " + h.why : "A small step today keeps the streak alive 🔥");
    });
    const dr = state.settings.diaryReminder;
    if (dr && dr <= now && !entriesOn(d).length) fire("habits.rem." + d + ".diary", "📔 How was your day?", "Take a minute to write or record a note.");
  };
  check();
  remTimer = setInterval(check, 30000);
}
function openReminders(){
  const s = openSheet({ title: "Reminders", back: true });
  function draw(){
    const on = !!state.settings.reminders;
    const perm = ("Notification" in window) ? Notification.permission : "unsupported";
    const withRem = activeHabits().filter(h => h.reminder).sort((a, b) => a.reminder.localeCompare(b.reminder));
    s.body.innerHTML =
      '<div class="card row"><div class="grow"><div style="font-weight:700">Habit reminders</div><div class="small muted">' +
      (perm === "unsupported" ? "Notifications aren't supported in this browser." : perm === "denied" ? "Notifications are blocked. Allow them in your browser's site settings." : on ? "On" : "Off") +
      '</div></div><button class="toggle' + (on ? " on" : "") + '" id="rmT" aria-label="Reminders"></button></div>' +
      '<div class="infobox">🔔 Reminders appear while the app is open or running in the background. On iPhone, add the app to your Home Screen first (Share → Add to Home Screen). A closed web app can\'t be woken up, so use your phone\'s alarm for anything critical.</div>' +
      '<div class="sec-h">Habits with a reminder</div>' +
      (withRem.length ? '<div class="list">' + withRem.map(h => '<div class="li"><div class="lico">' + esc(h.icon) + '</div><div class="grow"><div class="lt">' + esc(h.name) + '</div><div class="ls">' + esc(freqText(h)) + '</div></div><b>' + esc(h.reminder) + "</b></div>").join("") + "</div>"
        : '<div class="note">None yet. Set a reminder time when you add or edit a habit.</div>') +
      (on ? '<button class="btn block" id="rmTest" style="margin-top:6px">Send a test notification</button>' : "");
    $("#rmT", s.body).addEventListener("click", async () => {
      if (!on){
        if (!("Notification" in window)){ toast("Not supported here"); return; }
        const p = await Notification.requestPermission();
        if (p !== "granted"){ toast("Permission wasn't given"); draw(); return; }
      }
      state.settings.reminders = !on; save(); scheduleReminders(); draw();
    });
    const t = $("#rmTest", s.body);
    if (t) t.addEventListener("click", async () => {
      try{
        const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
        if (reg && reg.showNotification) reg.showNotification("✨ Habit Tracker", { body:"Reminders are working. You've got this!", icon:"icons/icon-192.png" });
        else new Notification("✨ Habit Tracker", { body:"Reminders are working. You've got this!" });
      }catch(e){ toast("Couldn't show a notification"); }
    });
  }
  draw();
}

/* ==========================================================================
   BACKUP & RESTORE — a file you keep. Voice notes can ride along inside it.
   ========================================================================== */
async function backupWithAudio(){
  const out = JSON.parse(JSON.stringify(state));
  out.audioData = {};
  for (const e of state.diary) for (const c of (e.audio || [])){
    try{ const b = await AudioDB.get(c.id); if (b) out.audioData[c.id] = await blobToB64(b); }catch(_){}
  }
  return out;
}
async function importAudioData(p){
  if (!p || !p.audioData) return 0;
  let n = 0;
  const mimeOf = {};
  (p.diary || []).forEach(e => (e.audio || []).forEach(c => mimeOf[c.id] = c.mime));
  for (const id of Object.keys(p.audioData)){
    try{ await AudioDB.put(id, b64ToBlob(p.audioData[id], mimeOf[id])); n++; }catch(_){}
  }
  return n;
}
function downloadFile(name, text, type){
  const blob = new Blob([text], { type: type || "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
function bookCounts(p){
  const n = (k) => ((p && p[k]) || []).length;
  return n("habits") + " habits, " + n("workouts") + " workouts and " + n("diary") + " diary entries";
}
function openBackup(){
  const s = openSheet({ title: "Backup & restore", back: true,
    body:
      '<div class="card"><h3>💾 Download a backup</h3><div class="note" style="margin-bottom:10px">A single file with your habits, history, workouts, diary and profile. Keep it somewhere safe.</div>' +
      '<label class="row" style="margin-bottom:12px"><input type="checkbox" id="bkAudio" checked> <span class="small">Include voice notes (makes the file bigger)</span></label>' +
      '<button class="btn primary block" id="bkDl">Download backup</button></div>' +
      '<div class="card"><h3>📂 Restore</h3><div class="note" style="margin-bottom:10px">Replaces everything in the app with the backup file.</div>' +
      '<input type="file" id="bkFile" accept="application/json,.json" hidden><button class="btn block" id="bkPick">Choose a backup file…</button></div>' +
      '<div class="card"><h3>📄 Export as CSV</h3><div class="note" style="margin-bottom:10px">Habit check-ins, workouts and diary text in spreadsheet form.</div>' +
      '<div class="btnrow"><button class="btn sm" data-csv="habits">Habits</button><button class="btn sm" data-csv="workouts">Workouts</button><button class="btn sm" data-csv="diary">Diary</button></div></div>' +
      '<div class="card"><h3>🧪 Sample data</h3><div class="note" style="margin-bottom:10px">Fill the app with three weeks of made-up data to explore it. Replaces what is here.</div><button class="btn block" id="bkDemo">Load sample data</button></div>' +
      '<div class="card" style="border-color:var(--bad-soft)"><h3 style="color:var(--bad)">⚠️ Start over</h3><div class="note" style="margin-bottom:10px">Deletes every habit, workout, diary entry and voice note on this device. Your GitHub backup is not touched.</div><button class="btn danger block" id="bkWipe">Delete everything</button></div>' });
  $("#bkDl", s.body).addEventListener("click", async () => {
    const withAudio = $("#bkAudio", s.body).checked;
    const payload = withAudio ? await backupWithAudio() : state;
    downloadFile("habit-tracker-backup-" + todayISO() + ".json", JSON.stringify(payload, null, 1));
    toast("Backup downloaded");
  });
  $("#bkPick", s.body).addEventListener("click", () => $("#bkFile", s.body).click());
  $("#bkFile", s.body).addEventListener("change", async (ev) => {
    const f = ev.target.files[0]; if (!f) return;
    let p;
    try{ p = JSON.parse(await f.text()); }catch(e){ toast("That file isn't a backup"); return; }
    if (!p || !Array.isArray(p.habits)){ toast("That file isn't a Habit Tracker backup"); return; }
    if (!confirm("Restore this backup?\n\nIt holds " + bookCounts(p) + ".\n\nEverything in the app now is replaced.")) return;
    state = stateFromPayload(p);
    const n = await importAudioData(p);
    save(); s.close(); rerender(); toast("Restored" + (n ? " with " + n + " voice notes" : ""));
  });
  $$("[data-csv]", s.body).forEach(b => b.addEventListener("click", () => exportCSV(b.dataset.csv)));
  $("#bkDemo", s.body).addEventListener("click", () => { if (state.habits.length && !confirm("Replace what is here with sample data?")) return; loadSampleData(true); s.close(); });
  $("#bkWipe", s.body).addEventListener("click", async () => {
    const typed = prompt("This deletes everything on this device. Type DELETE to confirm.");
    if (typed !== "DELETE"){ toast("Nothing was deleted"); return; }
    try{ const keys = await AudioDB.keys(); for (const k of keys) await AudioDB.del(k); }catch(e){}
    const keepProfile = state.profile;
    state = stateBlank(); state.profile = keepProfile;
    save(); closeAllSheets(); go("today"); toast("Everything deleted. Your profile was kept.");
  });
}
function exportCSV(kind){
  const q = (v) => { const s = String(v == null ? "" : v); return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  let rows = [];
  if (kind === "habits"){
    rows.push(["Date","Habit","Value","Target","Unit","Done","Skipped"]);
    state.habits.forEach(h => Object.keys(state.logs[h.id] || {}).sort().forEach(d => rows.push([d, h.name, valOf(h, d), hTarget(h), h.unit, isDone(h, d) ? "yes" : "no", isSkip(h, d) ? "yes" : ""])));
  }else if (kind === "workouts"){
    rows.push(["Date","Type","Activity","Minutes","Intensity","Km","Steps","Sets","kcal"]);
    state.workouts.slice().sort((a, b) => a.date.localeCompare(b.date)).forEach(w => rows.push([w.date, w.type, workoutTitle(w).replace(/^\S+\s/, ""), w.min, w.intensity || "", w.km || "", w.steps || "", (w.sets || []).map(x => x.secs ? x.secs + "s" : (x.reps || "") + (x.kg ? "x" + x.kg + "kg" : "")).join(" "), Math.round(kcalOf(w))]));
  }else{
    rows.push(["Date","Time","Mood","Energy","Feelings","Text","Voice notes"]);
    state.diary.slice().sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).forEach(e => rows.push([e.date, e.time, e.mood ? MOODS[e.mood - 1].name : "", e.energy || "", (e.tags || []).join(", "), e.text, (e.audio || []).length]));
  }
  /* A byte-order mark so Excel reads the umlauts and emoji as they are. */
  downloadFile("habit-tracker-" + kind + "-" + todayISO() + ".csv", "﻿" + rows.map(r => r.map(q).join(",")).join("\r\n"), "text/csv");
  toast("CSV downloaded");
}

/* ==========================================================================
   GITHUB SYNC — manual on both sides, deliberately. An automatic write turns
   any local bug into remote data loss, so nothing is ever pushed unasked.

   The book goes to one JSON file; each voice note to its own file beside it
   (habit-audio/<id>), pushed once and never rewritten — a clip doesn't change.
   ========================================================================== */
const GH_REPO_RE = /^[\w.-]+\/[\w.-]+$/;
const GH = {
  get token(){ return localStorage.getItem("habits.gh.token") || ""; },
  set token(v){ localStorage.setItem("habits.gh.token", v); },
  get repo(){ return localStorage.getItem("habits.gh.repo") || ""; },
  set repo(v){ localStorage.setItem("habits.gh.repo", v); },
  get path(){ return localStorage.getItem("habits.gh.path") || "data/habit-tracker-backup.json"; },
  set path(v){ localStorage.setItem("habits.gh.path", v); },
  get enabled(){ return localStorage.getItem("habits.gh.enabled") === "1"; },
  set enabled(v){ localStorage.setItem("habits.gh.enabled", v ? "1" : "0"); },
  get lastSync(){ return localStorage.getItem("habits.gh.lastSync") || ""; },
  set lastSync(v){ localStorage.setItem("habits.gh.lastSync", v); }
};
const GH_SNAP = "habits.gh.snapshot", GH_AUDIO = "habits.gh.audioPushed";
function ghHeaders(token){
  return { "Authorization":"Bearer " + (token || GH.token), "Accept":"application/vnd.github+json", "X-GitHub-Api-Version":"2022-11-28" };
}
function ghUrl(path){ return "https://api.github.com/repos/" + GH.repo + "/contents/" + path.split("/").map(encodeURIComponent).join("/"); }
function ghAudioPath(id){ const dir = GH.path.indexOf("/") >= 0 ? GH.path.slice(0, GH.path.lastIndexOf("/") + 1) : ""; return dir + "habit-audio/" + id; }
function b64EncodeUtf8(s){ const bytes = new TextEncoder().encode(s); let bin = ""; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(bin); }
function b64DecodeUtf8(b){ const bin = atob(String(b).replace(/\s/g, "")); return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0))); }
function ghExplain(st){
  if (st === 401) return "Token rejected. It's wrong or has expired.";
  if (st === 403) return "The token can't write to that repository. Give it Contents: Read and write.";
  if (st === 404) return "Not found. Check the repository and path.";
  if (st === 409) return "Conflict. The file changed on GitHub; pull, then push again.";
  if (st === 422) return "GitHub refused it. Check the path.";
  return "GitHub returned an error (" + st + ").";
}
/* What this device holds that the last push did not, named — a signature per record. */
function ghFingerprint(){
  const sig = {};
  state.habits.forEach(h => sig["h" + h.id] = [h.name, JSON.stringify(h), JSON.stringify(state.logs[h.id] || {})].join("|"));
  state.workouts.forEach(w => sig["w" + w.id] = [workoutTitle(w).replace(/^\S+\s/, ""), JSON.stringify(w)].join("|"));
  state.diary.forEach(e => sig["d" + e.id] = [fmtDay(e.date), JSON.stringify(e)].join("|"));
  return { sig, misc: JSON.stringify([state.profile, state.settings, state.weighins]) };
}
function ghSaveSnapshot(){ try{ localStorage.setItem(GH_SNAP, JSON.stringify(ghFingerprint())); }catch(e){} }
const GH_KIND = { h:"Habit", w:"Workout", d:"Diary entry" };
function ghChanges(){
  if (!GH.enabled) return [];
  let snap = null;
  try{ snap = JSON.parse(localStorage.getItem(GH_SNAP) || "null"); }catch(e){}
  const now = ghFingerprint(), out = [];
  const nameOf = (s) => String(s).split("|")[0] || "Untitled";
  if (!snap || !snap.sig){
    Object.keys(now.sig).forEach(k => out.push({ kind: GH_KIND[k[0]], name: nameOf(now.sig[k]), how:"not backed up yet" }));
    return out;
  }
  Object.keys(now.sig).forEach(k => {
    if (snap.sig[k] == null) out.push({ kind: GH_KIND[k[0]], name: nameOf(now.sig[k]), how:"added" });
    else if (snap.sig[k] !== now.sig[k]) out.push({ kind: GH_KIND[k[0]], name: nameOf(now.sig[k]), how:"changed" });
  });
  Object.keys(snap.sig).forEach(k => { if (now.sig[k] == null) out.push({ kind: GH_KIND[k[0]], name: nameOf(snap.sig[k]), how:"removed" }); });
  if (snap.misc !== now.misc) out.push({ kind:"Settings", name:"Profile, goals and weight", how:"changed" });
  return out;
}
/** A push that would drop records from the backup has to be meant. */
function pushWarning(outgoing, existing){
  if (!existing) return "";
  const kinds = ["habits", "workouts", "diary"];
  let had = 0, has = 0; const lost = [];
  kinds.forEach(k => {
    const a = (existing[k] || []).length, b = (outgoing[k] || []).length;
    had += a; has += b; if (b < a) lost.push((a - b) + " " + k);
  });
  const logsBefore = Object.values(existing.logs || {}).reduce((s, m) => s + Object.keys(m).length, 0);
  const logsAfter = Object.values(outgoing.logs || {}).reduce((s, m) => s + Object.keys(m).length, 0);
  if (!had) return "";
  if (!has) return "This device is empty and the backup holds " + had + " records. Pushing would empty the backup.";
  if (logsBefore - logsAfter >= Math.max(5, logsBefore * .1)) return "This would remove " + (logsBefore - logsAfter) + " habit check-ins from the backup.";
  if (lost.length && (had - has) >= Math.max(3, Math.round(had * .1))) return "This would remove " + lost.join(", ") + " from the backup.";
  return "";
}
async function ghGetFile(path){
  const res = await fetch(ghUrl(path) + "?t=" + Date.now(), { headers: ghHeaders(), cache:"no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(ghExplain(res.status));
  return res.json();
}

function openGithub(){
  const s = openSheet({ title: "GitHub sync", back: true, tall: true });
  function draw(msg){
    const on = GH.enabled;
    const ch = on ? ghChanges() : [];
    s.body.innerHTML =
      '<div class="infobox">☁️ Keeps a copy of everything in a GitHub repository you own, so you can move between devices and never lose your streaks. <b>Use a private repository</b> because your diary is personal. Nothing is sent unless you press Push.</div>' +
      '<label class="field"><span>Personal access token</span><div class="row"><input class="input grow" id="ghTok" type="password" autocomplete="off" value="' + esc(GH.token) + '" placeholder="github_pat_…"><button class="iconbtn" id="ghEye" aria-label="Show">👁</button></div></label>' +
      '<div class="note" style="margin:-8px 0 12px">Create a fine-grained token at github.com → Settings → Developer settings, with access to just this repository and <b>Contents: Read and write</b>.</div>' +
      '<label class="field"><span>Repository</span><input class="input" id="ghRepo" value="' + esc(GH.repo) + '" placeholder="owner/private-repo"></label>' +
      '<label class="field"><span>File path</span><input class="input" id="ghPath" value="' + esc(GH.path) + '"></label>' +
      '<div class="btnrow"><button class="btn primary" id="ghSave">' + (on ? "Update settings" : "Save & turn on") + '</button>' + (on ? '<button class="btn" id="ghCheck">Check access</button>' : "") + "</div>" +
      '<div class="note" id="ghMsg" style="margin-top:10px">' + esc(msg || (on ? (ch.length ? ch.length + " change" + (ch.length === 1 ? " isn't" : "s aren't") + " in the backup yet." : "Up to date with " + GH.repo + ".") +
        (GH.lastSync ? " Last synced " + new Date(GH.lastSync).toLocaleString() + "." : "") : "Off. Everything stays on this device.")) + "</div>" +
      (on ? '<div class="btnrow" style="margin-top:6px"><button class="btn primary" id="ghPush">⬆ Push</button><button class="btn" id="ghPull">⬇ Pull</button></div>' +
        (ch.length ? '<div class="sec-h">Waiting to be pushed</div><div class="list">' + ch.slice(0, 30).map(c => '<div class="li"><div class="grow"><div class="lt">' + esc(c.name) + '</div><div class="ls">' + esc(c.kind) + '</div></div><span class="badge">' + esc(c.how) + "</span></div>").join("") + "</div>" : "") +
        '<button class="btn block" id="ghHist" style="margin-top:6px">History: restore an earlier copy</button>' +
        '<button class="btn danger block" id="ghOff" style="margin-top:10px">Turn sync off</button>' : "");
    bind();
  }
  const msg = (t) => { const m = $("#ghMsg", s.body); if (m) m.textContent = t; };
  function bind(){
    $("#ghEye", s.body).addEventListener("click", () => { const i = $("#ghTok", s.body); i.type = i.type === "password" ? "text" : "password"; });
    $("#ghSave", s.body).addEventListener("click", () => {
      const repo = $("#ghRepo", s.body).value.trim();
      if (!GH_REPO_RE.test(repo)){ toast("Repository should look like owner/repo"); return; }
      GH.token = $("#ghTok", s.body).value.trim(); GH.repo = repo;
      GH.path = $("#ghPath", s.body).value.trim().replace(/^\/+/, "") || "data/habit-tracker-backup.json";
      GH.enabled = !!GH.token;
      draw(GH.enabled ? "Saved. Press Check access to test the token." : "Saved. Add a token to turn sync on.");
    });
    const chk = $("#ghCheck", s.body);
    if (chk) chk.addEventListener("click", async () => {
      msg("Asking GitHub…");
      try{
        const res = await fetch("https://api.github.com/repos/" + GH.repo, { headers: ghHeaders() });
        if (!res.ok){ msg(ghExplain(res.status)); return; }
        const info = await res.json();
        if (!(info.permissions && info.permissions.push)){ msg("The token can read " + GH.repo + " but not write to it."); return; }
        msg("All set ✓ The token can write to " + GH.repo + (info.private ? " (private)." : ". ⚠️ This repository is PUBLIC, so anyone can read your diary. Use a private one."));
      }catch(e){ msg("Couldn't reach GitHub: " + e.message); }
    });
    const push = $("#ghPush", s.body);
    if (push) push.addEventListener("click", () => ghPush(msg).then(ok => ok && draw()));
    const pull = $("#ghPull", s.body);
    if (pull) pull.addEventListener("click", () => ghPull(msg).then(ok => ok && draw()));
    const hist = $("#ghHist", s.body);
    if (hist) hist.addEventListener("click", ghHistory);
    const off = $("#ghOff", s.body);
    if (off) off.addEventListener("click", () => { if (!confirm("Turn GitHub sync off? Everything on this device stays.")) return; GH.enabled = false; draw(); });
  }
  draw();
}

async function ghPush(msg){
  if (loadFailed){ msg("This device's data couldn't be read, so nothing will be pushed. Pull or restore first."); return false; }
  msg("Checking the backup on GitHub…");
  try{
    const cur = await ghGetFile(GH.path);
    let existing = null;
    if (cur){ try{ existing = JSON.parse(cur.encoding === "base64" && cur.content ? b64DecodeUtf8(cur.content) : await (await fetch(cur.download_url)).text()); }catch(_){} }
    const warn = pushWarning(state, existing);
    if (warn && !confirm(warn + "\n\nPush anyway?")){ msg("Nothing was pushed."); return false; }
    /* voice notes first, so the book never names a clip that isn't there */
    let pushed = {};
    try{ pushed = JSON.parse(localStorage.getItem(GH_AUDIO) || "{}"); }catch(_){}
    const clips = []; state.diary.forEach(e => (e.audio || []).forEach(c => clips.push(c)));
    let sent = 0;
    for (const c of clips){
      if (pushed[c.id]) continue;
      const blob = await AudioDB.get(c.id).catch(() => null);
      if (!blob) continue;
      msg("Uploading voice note " + (++sent) + "…");
      const path = ghAudioPath(c.id);
      const there = await ghGetFile(path).catch(() => null);
      if (!there){
        const r = await fetch(ghUrl(path), { method:"PUT", headers: ghHeaders(), body: JSON.stringify({ message:"Voice note " + c.id, content: await blobToB64(blob) }) });
        if (!r.ok){ msg("Voice note upload failed: " + ghExplain(r.status)); return false; }
      }
      pushed[c.id] = 1;
      try{ localStorage.setItem(GH_AUDIO, JSON.stringify(pushed)); }catch(_){}
    }
    msg("Pushing…");
    const body = { message: "Backup " + new Date().toISOString().slice(0, 16).replace("T", " "), content: b64EncodeUtf8(JSON.stringify(state, null, 1)) };
    if (cur && cur.sha) body.sha = cur.sha;
    const res = await fetch(ghUrl(GH.path), { method:"PUT", headers: ghHeaders(), body: JSON.stringify(body) });
    if (!res.ok){ msg(ghExplain(res.status)); return false; }
    GH.lastSync = new Date().toISOString(); ghSaveSnapshot();
    toast("Pushed to GitHub ☁️"); return true;
  }catch(e){ msg("Push failed: " + e.message); return false; }
}
async function applyPulled(p){
  state = stateFromPayload(p);
  save();
  /* fetch any voice note this device doesn't have yet */
  let got = 0;
  let pushed = {};
  try{ pushed = JSON.parse(localStorage.getItem(GH_AUDIO) || "{}"); }catch(_){}
  for (const e of state.diary) for (const c of (e.audio || [])){
    const have = await AudioDB.get(c.id).catch(() => null);
    if (have){ pushed[c.id] = 1; continue; }
    try{
      const f = await ghGetFile(ghAudioPath(c.id));
      if (!f) continue;
      let b64 = f.content;
      if (!b64 || f.encoding !== "base64"){
        const r = await fetch("https://api.github.com/repos/" + GH.repo + "/git/blobs/" + f.sha, { headers: ghHeaders() });
        b64 = (await r.json()).content;
      }
      await AudioDB.put(c.id, b64ToBlob(b64, c.mime)); pushed[c.id] = 1; got++;
    }catch(_){}
  }
  try{ localStorage.setItem(GH_AUDIO, JSON.stringify(pushed)); }catch(_){}
  return got;
}
async function ghPull(msg){
  msg("Pulling…");
  try{
    const f = await ghGetFile(GH.path);
    if (!f){ msg("There's no backup at " + GH.path + " yet. Push first."); return false; }
    const text = f.encoding === "base64" && f.content ? b64DecodeUtf8(f.content) : await (await fetch(f.download_url)).text();
    const p = JSON.parse(text);
    const empty = !(p.habits || []).length && !(p.workouts || []).length && !(p.diary || []).length;
    if (!confirm((empty ? "That backup is EMPTY. Pulling it would clear this device.\n\n" : "The backup holds " + bookCounts(p) + ".\n\n") + "Replace everything on this device with it?")){ msg("Left alone."); return false; }
    msg("Restoring…");
    const got = await applyPulled(p);
    loadFailed = false;
    GH.lastSync = new Date().toISOString(); ghSaveSnapshot();
    rerender(); toast("Pulled from GitHub" + (got ? " with " + got + " voice notes" : ""));
    return true;
  }catch(e){ msg("Pull failed: " + e.message); return false; }
}
async function ghHistory(){
  const s = openSheet({ title: "Backup history", back: true, body: '<div class="note">Looking…</div>' });
  try{
    const res = await fetch("https://api.github.com/repos/" + GH.repo + "/commits?path=" + encodeURIComponent(GH.path) + "&per_page=20", { headers: ghHeaders() });
    if (!res.ok){ s.body.innerHTML = '<div class="note warn">' + esc(ghExplain(res.status)) + "</div>"; return; }
    const list = await res.json();
    if (!list.length){ s.body.innerHTML = '<div class="note">No pushes yet.</div>'; return; }
    s.body.innerHTML = '<div class="note">Every push is kept. Tap one to restore that copy.</div><div class="list">' + list.map((c, i) =>
      '<button class="li" data-sha="' + esc(c.sha) + '"><div class="grow"><div class="lt">' + esc(new Date(c.commit.author.date).toLocaleString()) + '</div><div class="ls">' + (i ? esc(c.sha.slice(0, 7)) : "the latest") + '</div></div><span class="badge">' + (i ? "restore" : "current") + "</span></button>").join("") + "</div>";
    $$("[data-sha]", s.body).forEach(b => b.addEventListener("click", async () => {
      try{
        const r = await fetch(ghUrl(GH.path) + "?ref=" + encodeURIComponent(b.dataset.sha), { headers: ghHeaders() });
        if (!r.ok){ toast(ghExplain(r.status)); return; }
        const f = await r.json();
        const p = JSON.parse(f.encoding === "base64" && f.content ? b64DecodeUtf8(f.content) : await (await fetch(f.download_url)).text());
        if (!confirm("Restore this copy?\n\nIt holds " + bookCounts(p) + ".\n\nEverything on this device is replaced. Push afterwards to make it the latest backup.")) return;
        await applyPulled(p);
        closeAllSheets(); rerender(); toast("Restored that copy");
      }catch(e){ toast("Restore failed: " + e.message); }
    }));
  }catch(e){ s.body.innerHTML = '<div class="note warn">Couldn\'t reach GitHub.</div>'; }
}

/* ==========================================================================
   WHAT'S NEW · ABOUT · UPDATE
   ========================================================================== */
const RELEASE_KINDS = {
  fix: { label:"Fix", icon:'<path d="M14.7 6.3a4.5 4.5 0 00-6 5.9l-5.4 5.4a1.6 1.6 0 000 2.3l1.2 1.2a1.6 1.6 0 002.3 0l5.4-5.4a4.5 4.5 0 005.9-6l-2.7 2.7-2.4-.7-.7-2.4z"/>' },
  "new": { label:"New", icon:'<path d="M11 3.5l1.9 5.1 5.1 1.9-5.1 1.9L11 17.5l-1.9-5.1L4 10.5l5.1-1.9z"/>' },
  better: { label:"Better", icon:'<path d="M3.5 16.5l5-5 3.5 3.5 7-7.5"/><path d="M15 7.5h4.5V12"/>' }
};
function parseReleases(md){
  const out = [];
  String(md).split(/\r?\n/).forEach(line => {
    const h = line.match(/^##\s+(\S+)\s*—\s*(.+?)\s*$/);
    if (h){ out.push({ version:h[1], date:h[2], items:[] }); return; }
    const li = line.match(/^-\s+(.+?)\s*$/);
    if (!li || !out.length) return;
    const k = li[1].match(/^(fix|new|better):\s*(.+)$/);
    out[out.length - 1].items.push(k ? { kind:k[1], text:k[2] } : { kind:"better", text:li[1] });
  });
  return out;
}
async function openNotes(){
  const s = openSheet({ title: "What's new", tall: true, body: '<div class="note">Loading…</div>' });
  try{
    const res = await fetch("RELEASES.md?v=" + APP_VERSION, { cache:"no-store" });
    if (!res.ok) throw new Error(res.status);
    const rels = parseReleases(await res.text());
    s.body.innerHTML = rels.map(r => '<div class="relgroup"><div class="rel-h"><span class="rel-v' + (r.version === APP_VERSION ? " current" : "") + '">' + esc(r.version) + '</span><span class="rel-d">' +
      esc(r.date) + (r.version === APP_VERSION ? " · you're on this" : "") + '</span></div><ul class="rel-l">' + r.items.map(i => {
        const k = RELEASE_KINDS[i.kind] || RELEASE_KINDS.better;
        return '<li class="rel-i ' + i.kind + '"><span class="rel-k" title="' + k.label + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + k.icon + "</svg></span><span>" + esc(i.text) + "</span></li>";
      }).join("") + "</ul></div>").join("") || '<div class="note">No notes yet.</div>';
  }catch(e){ s.body.innerHTML = '<div class="note">Couldn\'t load the notes. They need the app to be served over http(s).</div>'; }
}
function openAbout(){
  const s = openSheet({ title: "About & update", back: true,
    body: '<div class="card" style="text-align:center"><img src="icons/icon-192.png" width="72" height="72" style="border-radius:18px" alt=""><div style="font-weight:800;font-size:18px;margin-top:8px">Habit Tracker</div>' +
      '<div class="muted small">Version ' + APP_VERSION + " · built " + APP_BUILT + '</div></div>' +
      '<div class="infobox">The app works offline and only changes when you press Update. Your data stays on this device, plus GitHub if you turn sync on.</div>' +
      '<div class="note" id="abMsg"></div><div class="btnrow"><button class="btn" id="abCheck">Check for update</button><button class="btn primary" id="abUpd">Update now</button></div>' });
  $("#abCheck", s.body).addEventListener("click", async () => {
    const m = $("#abMsg", s.body); m.textContent = "Checking…";
    try{
      const v = await (await fetch("version.json?t=" + Date.now(), { cache:"no-store" })).json();
      m.textContent = v.version === APP_VERSION ? "You're on the latest version (" + APP_VERSION + ")." : "Version " + v.version + " is available. Press Update now.";
    }catch(e){ m.textContent = "Couldn't check. Are you online?"; }
  });
  $("#abUpd", s.body).addEventListener("click", updateApp);
}
async function updateApp(){
  toast("Updating…");
  try{
    if (window.caches){ const keys = await caches.keys(); await Promise.all(keys.map(k => caches.delete(k))); }
    if (navigator.serviceWorker){ const regs = await navigator.serviceWorker.getRegistrations(); await Promise.all(regs.map(r => r.update().catch(() => r.unregister()))); }
  }catch(e){}
  location.reload();
}

/* ==========================================================================
   SAMPLE DATA — three weeks of a plausible routine, to explore the app with.
   ========================================================================== */
function loadSampleData(replace){
  if (state.habits.length && !replace) return;
  const today = todayISO(), start = addDays(today, -27);
  const keep = state.profile;
  state = stateBlank();
  state.profile = Object.assign({}, keep);
  if (!state.profile.weight){ state.profile.weight = "78"; state.profile.height = state.profile.height || "175"; }
  const mk = (t, extra) => normHabit(Object.assign({ name:t.name, icon:t.icon, color:t.color, cat:t.cat, kind:t.kind, target:t.target || 1, unit:t.unit || (t.kind === "time" ? "min" : ""), quit:!!t.quit, part:t.part, start, freq: Object.assign({ type:"daily", days:[1,2,3,4,5], times:3, every:2 }, t.freq || {}) }, extra || {}));
  const pick = (n) => HABIT_TEMPLATES.find(t => t.name === n);
  const hs = [mk(pick("Drink water")), mk(pick("Meditate"), { reminder:"07:30", why:"A calmer start to the day" }), mk(pick("Read")), mk(pick("Learn German")),
    mk(pick("Morning workout")), mk(pick("No sugar")), mk(pick("Call family"))];
  hs.forEach((h, i) => h.order = i);
  state.habits = hs;
  let seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  daysBetween(start, today).forEach((d, k) => {
    const good = rnd() < .55 + k / 80;
    hs.forEach(h => {
      if (d === today && rnd() < .5) return;
      if (isFlex(h)){ if (rnd() < .3) setLog(h, d, { v:1 }); return; }
      if (!scheduledOn(h, d)) return;
      const p = good ? .85 : .45;
      if (rnd() < p) setLog(h, d, { v: h.kind === "check" ? 1 : hTarget(h) });
      else if (h.kind !== "check" && rnd() < .6) setLog(h, d, { v: Math.round(hTarget(h) * (.3 + rnd() * .5)) });
    });
    if (rnd() < .6) state.workouts.push({ id: uid(), type:"cardio", ex: rnd() < .6 ? "walk" : rnd() < .5 ? "cycle" : "run", date:d, at:"18:00", min: [20, 30, 40, 45][Math.floor(rnd() * 4)], intensity: rnd() < .7 ? "moderate" : "vigorous", steps: Math.round(4000 + rnd() * 6000), km: Math.round((2 + rnd() * 6) * 10) / 10 });
    if (dateOf(d).getDay() % 3 === 1) state.workouts.push({ id: uid(), type:"routine", routine: ["flat", "arms", "legs", "full"][k % 4], date:d, at:"07:00", min: 15 + Math.round(rnd() * 15), done: 14, groups: [["abs"], ["biceps","triceps","shoulders"], ["thighs","glutes","calves"], ["thighs","chest","abs"]][k % 4] });
    if (rnd() < .7){
      const mood = clamp(Math.round(2.5 + rnd() * 2.5 + (good ? .5 : -.3)), 1, 5);
      state.diary.push({ id: uid(), date:d, time:"21:" + pad2(Math.floor(rnd() * 59)), mood, energy: clamp(mood - 1 + Math.round(rnd()), 1, 5),
        tags: [FEELINGS[Math.floor(rnd() * 9)], rnd() < .4 ? FEELINGS[9 + Math.floor(rnd() * 10)] : null].filter(Boolean),
        text: ["Good walk after work, felt clear-headed.", "Busy day. Skipped reading but did meditate.", "Called home, lovely chat with everyone.", "German class went well today!", "Tired, but glad I moved a bit.", "Productive morning, slow afternoon."][Math.floor(rnd() * 6)], audio: [] });
    }
    if (k % 7 === 0) state.weighins.push({ date:d, kg: Math.round((78.6 - k * .06 + rnd() * .4) * 10) / 10 });
  });
  save(); closeAllSheets(); go("today");
  toast("Sample data loaded. Have a look around! ✨");
}

/* ==========================================================================
   START
   ========================================================================== */
function boot(){
  load();
  applyTheme();
  matchMedia("(prefers-color-scheme: dark)").addEventListener && matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);
  $$(".tab").forEach(t => t.addEventListener("click", () => go(t.dataset.view)));
  $("#fab").addEventListener("click", () => { const v = VIEWS[currentView]; if (v && v.fab) v.fab(); });
  let start = "today";
  try{ start = localStorage.getItem("habits.view") || "today"; }catch(e){}
  go(start);
  if (loadFailed) toast("Your saved data couldn't be read (" + loadError + "). It has been kept aside.");
  scheduleReminders();
  /* a new day while the app sits open */
  let lastDay = todayISO();
  setInterval(() => { const d = todayISO(); if (d !== lastDay){ if (selDay === lastDay) selDay = d; lastDay = d; rerender(); } }, 60000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden){ const d = todayISO(); if (d !== lastDay){ if (selDay === lastDay) selDay = d; lastDay = d; } rerender(); } });
  if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) navigator.serviceWorker.register("sw.js").catch(() => {});
}
boot();
