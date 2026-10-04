"use strict";
/* ==========================================================================
   DIARY — a few lines a day, typed, dictated or spoken as a voice note.
   Voice notes live in IndexedDB (AudioDB); an entry only lists their ids.
   ========================================================================== */

let diaryMonth = monthStart(todayISO());
let diaryDay = "";          /* a tapped day filters the list; "" shows the month */

function moodOf(v){ return MOODS[clamp(Math.round(v), 1, 5) - 1]; }
function entriesOn(iso){ return state.diary.filter(e => e.date === iso).sort((a, b) => (a.time || "").localeCompare(b.time || "")); }
function dayMood(iso){
  const es = entriesOn(iso).filter(e => e.mood);
  return es.length ? es.reduce((s, e) => s + e.mood, 0) / es.length : 0;
}
function diaryStreak(){
  let d = todayISO(), n = 0;
  if (!entriesOn(d).length) d = addDays(d, -1);
  while (entriesOn(d).length && n < 5000){ n++; d = addDays(d, -1); }
  return n;
}

function entryCardHTML(e){
  const m = e.mood ? moodOf(e.mood) : null;
  return '<button class="entry" data-e="' + e.id + '"><div class="eh">' + (m ? '<span class="eface">' + m.face + "</span>" : "") +
    '<div class="grow"><div style="font-weight:700">' + esc(fmtDay(e.date, { weekday:"long", day:"numeric", month:"short" })) + '</div><div class="small muted">' + esc(e.time || "") +
    (m ? " · " + m.name : "") + (e.energy ? " · energy " + "⚡".repeat(e.energy) : "") + ((e.audio || []).length ? " · 🎙️ " + e.audio.length : "") + "</div></div></div>" +
    (e.text ? '<div class="et">' + esc(e.text) + "</div>" : "") +
    ((e.tags || []).length ? '<div class="chips" style="margin-top:8px">' + e.tags.map(t => '<span class="chip" style="padding:3px 9px;font-size:12px">' + esc(t) + "</span>").join("") + "</div>" : "") +
    "</button>";
}

function renderDiary(){
  const v = $("#view-diary");
  const today = todayISO();
  const a = diaryMonth, b = monthEnd(diaryMonth);
  const inMonth = state.diary.filter(e => e.date >= a && e.date <= b);
  const moods = inMonth.filter(e => e.mood);
  const avg = moods.length ? moods.reduce((s, e) => s + e.mood, 0) / moods.length : 0;

  const lead = (dateOf(a).getDay() + 6) % 7;
  let cal = '<div class="cal">' + ["Mo","Tu","We","Th","Fr","Sa","Su"].map(w => '<div class="cw">' + w + "</div>").join("");
  for (let i = 0; i < lead; i++) cal += '<div class="cd blank"></div>';
  for (let d = a; d <= b; d = addDays(d, 1)){
    const es = entriesOn(d), dm = dayMood(d), m = dm ? moodOf(dm) : null;
    const hasAudio = es.some(e => (e.audio || []).length);
    cal += '<button class="cd' + (es.length ? " has" : "") + (d === today ? " today" : "") + (d === diaryDay ? " sel" : "") + '" data-d="' + d + '"' +
      (m ? ' style="background:' + m.color + '"' : es.length ? ' style="background:var(--accent)"' : "") + (d > today ? " disabled" : "") + ">" +
      (m ? '<span class="em">' + m.face + "</span>" : dateOf(d).getDate()) + (hasAudio ? '<span class="mic">🎙️</span>' : "") + "</button>";
  }
  cal += "</div>";

  const shown = (diaryDay ? entriesOn(diaryDay) : inMonth).slice().sort((x, y) => (y.date + y.time).localeCompare(x.date + x.time));

  v.innerHTML =
    '<div class="top"><div><div class="kicker">' + (diaryStreak() ? "🔥 " + plural(diaryStreak(), "day") + " in a row" : "Your thoughts, day by day") + "</div><h1>Diary</h1></div>" +
    '<button class="iconbtn grad" id="dyAdd" aria-label="New entry">' + ico("plus", 2.4) + "</button></div>" +
    '<div class="stats"><div class="stat"><div class="v">' + inMonth.length + '</div><div class="l">Entries</div></div>' +
    '<div class="stat"><div class="v">' + (avg ? moodOf(avg).face : "—") + '</div><div class="l">Average mood</div></div>' +
    '<div class="stat"><div class="v">' + new Set(inMonth.map(e => e.date)).size + '<small> days</small></div><div class="l">Written</div></div></div>' +
    '<div class="card"><div class="rangebar"><button class="iconbtn" data-m="-1">' + ico("left") + '</button><div class="rl">' + esc(fmtMonth(a)) +
    '</div><button class="iconbtn" data-m="1"' + (a >= monthStart(today) ? ' disabled style="opacity:.4"' : "") + ">" + ico("right") + "</button></div>" + cal +
    '<div class="legend">' + MOODS.map(m => '<span><i style="background:' + m.color + '"></i>' + m.name + "</span>").join("") + "</div></div>" +
    '<div class="sec-h">' + (diaryDay ? esc(fmtDay(diaryDay, { weekday:"long", day:"numeric", month:"long" })) : "This month") +
    (diaryDay ? '<button class="more" id="dyAll">Show month</button>' : "") + "</div>" +
    (shown.length ? shown.map(entryCardHTML).join("") :
      '<div class="card empty"><div class="ei">📔</div><b>' + (diaryDay ? "Nothing written that day" : "No entries yet") + "</b>" +
      esc(PROMPTS[dateOf(today).getDate() % PROMPTS.length]) + '<br><br><button class="btn primary" id="dyFirst">' + ico("edit") + " Write" + (diaryDay ? " for that day" : " today's entry") + "</button></div>");

  $$("[data-m]", v).forEach(btn => btn.addEventListener("click", () => {
    const n = addMonths(diaryMonth, +btn.dataset.m); if (n <= monthStart(today)){ diaryMonth = n; diaryDay = ""; renderDiary(); }
  }));
  $$(".cal .cd[data-d]", v).forEach(btn => btn.addEventListener("click", () => {
    const d = btn.dataset.d;
    diaryDay = diaryDay === d ? "" : d;
    renderDiary();
  }));
  $$("[data-e]", v).forEach(btn => btn.addEventListener("click", () => {
    const e = state.diary.find(x => x.id === btn.dataset.e); if (e) openDiaryEditor(e);
  }));
  $("#dyAdd").addEventListener("click", () => openDiaryEditor(null, { date: diaryDay || today }));
  const f = $("#dyFirst"); if (f) f.addEventListener("click", () => openDiaryEditor(null, { date: diaryDay || today }));
  const all = $("#dyAll"); if (all) all.addEventListener("click", () => { diaryDay = ""; renderDiary(); });
}
VIEWS.diary = { render: renderDiary, fab: () => openDiaryEditor(null, { date: diaryDay || todayISO() }) };

/* ==========================================================================
   EDITOR
   ========================================================================== */
const DICT_LANGS = [["", "Phone's language"], ["en-GB", "English (UK)"], ["en-US", "English (US)"], ["en-IN", "English (India)"], ["de-DE", "Deutsch"], ["ta-IN", "தமிழ்"]];

function openDiaryEditor(existing, preset){
  const isNew = !existing;
  const e = existing ? JSON.parse(JSON.stringify(existing)) :
    Object.assign({ id: uid(), date: todayISO(), time: nowHM(), mood: 0, energy: 0, tags: [], text: "", audio: [] }, preset || {});
  const recordedHere = [];        /* clips made in this sitting — dropped again on Cancel */
  const removedHere = [];         /* clips deleted in this sitting — only really deleted on Save */
  let prompt = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
  let rec = null, recChunks = [], recStart = 0, recTimer = 0, recStream = null, analyser = null, rafId = 0;
  let dict = null, saved = false;
  const urls = [];

  const s = openSheet({ title: isNew ? "New entry" : "Diary entry", tall: true,
    foot: (isNew ? "" : '<button class="btn danger" data-a="del">' + ico("trash") + "</button>") + '<button class="btn primary" data-a="save">' + ico("check") + " Save entry</button>",
    onClose: () => {
      stopRec(true); stopDict();
      urls.forEach(u => URL.revokeObjectURL(u));
      if (!saved) recordedHere.forEach(id => AudioDB.del(id).catch(() => {}));
    } });

  function draw(){
    const text = $("#dText", s.body) ? $("#dText", s.body).value : e.text;
    e.text = text;
    s.body.innerHTML =
      '<div class="two"><label class="field"><span>Date</span><input class="input" id="dDate" type="date" max="' + todayISO() + '" value="' + esc(e.date) + '"></label>' +
      '<label class="field"><span>Time</span><input class="input" id="dTime" type="time" value="' + esc(e.time) + '"></label></div>' +
      '<div class="field"><span>How are you feeling?</span><div class="moods">' + MOODS.map(m => '<button class="mood' + (e.mood === m.v ? " on" : "") + '" data-mood="' + m.v + '" style="--mc:' + m.color + '"><span class="mf">' + m.face + '</span><span class="mn">' + m.name + "</span></button>").join("") + "</div></div>" +
      '<div class="field"><span>Energy</span><div class="seg" style="margin:0">' + [1,2,3,4,5].map(n => '<button data-en="' + n + '" class="' + (e.energy === n ? "on" : "") + '">' + "⚡".repeat(n > 3 ? 1 : 1) + n + "</button>").join("") + "</div></div>" +
      '<div class="field"><span>Feelings</span><div class="chips">' + FEELINGS.map(f => '<button class="chip' + (e.tags.indexOf(f) >= 0 ? " on" : "") + '" data-tag="' + esc(f) + '">' + esc(f) + "</button>").join("") + "</div></div>" +
      '<div class="field"><span>Write</span><div class="row" style="margin-bottom:8px"><div class="small muted grow" id="dPrompt">✨ ' + esc(prompt) + "</div>" +
      '<button class="iconbtn" id="dShuffle" style="width:34px;height:34px" aria-label="Another prompt">' + ico("shuffle") + "</button></div>" +
      '<textarea class="input" id="dText" placeholder="Type here, or tap the microphone to speak…">' + esc(e.text) + "</textarea>" +
      '<div class="row" style="margin-top:8px"><button class="btn sm" id="dDict">' + ico("mic") + ' <span>Dictate</span></button><span class="small muted grow" id="dDictNote"></span></div></div>' +
      '<div class="field"><span>Voice note</span><div class="rec"><button class="recbtn" id="dRec" aria-label="Record">' + ico("mic") + '</button><div class="meter" id="dMeter">' + "<i></i>".repeat(28) +
      '</div><div style="font-weight:800;font-variant-numeric:tabular-nums;min-width:44px;text-align:right" id="dRecT">0:00</div></div><div id="dClips"></div></div>';
    bind(); drawClips();
  }
  async function drawClips(){
    const box = $("#dClips", s.body); if (!box) return;
    box.innerHTML = "";
    for (const c of e.audio){
      const row = document.createElement("div");
      row.className = "clip";
      row.innerHTML = '<span>🎙️</span><span class="small muted">' + fmtDur(c.dur || 0) + '</span><span class="grow small muted">loading…</span><button class="iconbtn" style="width:34px;height:34px" aria-label="Delete clip">' + ico("trash") + "</button>";
      box.appendChild(row);
      $("button", row).addEventListener("click", () => {
        if (!confirm("Delete this voice note?")) return;
        e.audio = e.audio.filter(x => x.id !== c.id);
        if (recordedHere.indexOf(c.id) >= 0) AudioDB.del(c.id).catch(() => {}); else removedHere.push(c.id);
        drawClips();
      });
      try{
        const blob = await AudioDB.get(c.id);
        const slot = row.querySelector(".grow");
        if (!blob){ slot.textContent = "Not on this device. Pull from GitHub to fetch it."; continue; }
        const u = URL.createObjectURL(blob); urls.push(u);
        const au = document.createElement("audio"); au.controls = true; au.src = u; au.preload = "metadata";
        slot.replaceWith(au);
      }catch(err){ row.querySelector(".grow").textContent = "Could not load"; }
    }
  }
  function bind(){
    $("#dDate", s.body).addEventListener("input", ev => e.date = ev.target.value || e.date);
    $("#dTime", s.body).addEventListener("input", ev => e.time = ev.target.value);
    $("#dText", s.body).addEventListener("input", ev => e.text = ev.target.value);
    $$("[data-mood]", s.body).forEach(b => b.addEventListener("click", () => {
      const v = +b.dataset.mood; e.mood = e.mood === v ? 0 : v;
      $$("[data-mood]", s.body).forEach(x => x.classList.toggle("on", +x.dataset.mood === e.mood));
    }));
    $$("[data-en]", s.body).forEach(b => b.addEventListener("click", () => {
      const v = +b.dataset.en; e.energy = e.energy === v ? 0 : v;
      $$("[data-en]", s.body).forEach(x => x.classList.toggle("on", +x.dataset.en === e.energy));
    }));
    $$("[data-tag]", s.body).forEach(b => b.addEventListener("click", () => {
      const t = b.dataset.tag, i = e.tags.indexOf(t);
      if (i >= 0) e.tags.splice(i, 1); else e.tags.push(t);
      b.classList.toggle("on", i < 0);
    }));
    $("#dShuffle", s.body).addEventListener("click", () => {
      let p; do { p = PROMPTS[Math.floor(Math.random() * PROMPTS.length)]; } while (p === prompt && PROMPTS.length > 1);
      prompt = p; $("#dPrompt", s.body).textContent = "✨ " + p;
    });
    $("#dDict", s.body).addEventListener("click", () => dict ? stopDict() : startDict());
    $("#dRec", s.body).addEventListener("click", () => rec ? stopRec() : startRec());
  }

  /* ---------- dictation: the browser's own speech recognition ---------- */
  function startDict(){
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const note = $("#dDictNote", s.body);
    if (!SR){ note.textContent = "Dictation isn't available in this browser. Your keyboard's microphone key works too."; return; }
    const ta = $("#dText", s.body);
    const base = ta.value ? ta.value.replace(/\s*$/, " ") : "";
    let finalText = "";
    dict = new SR();
    dict.lang = state.settings.dictLang || navigator.language || "en-GB";
    dict.continuous = true; dict.interimResults = true;
    dict.onresult = (ev) => {
      let interim = "";
      for (let k = ev.resultIndex; k < ev.results.length; k++){
        const r = ev.results[k];
        if (r.isFinal) finalText += r[0].transcript.trim() + " "; else interim += r[0].transcript;
      }
      ta.value = base + finalText + interim; e.text = ta.value;
    };
    dict.onerror = (ev) => { note.textContent = ev.error === "not-allowed" ? "Microphone permission was refused." : "Dictation stopped (" + ev.error + ")."; };
    dict.onend = () => { dict = null; const b = $("#dDict span", s.body); if (b) b.textContent = "Dictate"; $("#dDict", s.body) && $("#dDict", s.body).classList.remove("primary"); };
    try{ dict.start(); }catch(err){ note.textContent = "Couldn't start dictation."; dict = null; return; }
    $("#dDict span", s.body).textContent = "Stop";
    $("#dDict", s.body).classList.add("primary");
    note.textContent = "Listening… (" + (DICT_LANGS.find(l => l[0] === state.settings.dictLang) || DICT_LANGS[0])[1] + ")";
  }
  function stopDict(){ if (dict){ try{ dict.stop(); }catch(_){} dict = null; } }

  /* ---------- voice note: MediaRecorder into IndexedDB ---------- */
  async function startRec(){
    if (!navigator.mediaDevices || !window.MediaRecorder){ toast("Recording isn't supported in this browser"); return; }
    try{ recStream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch(err){ toast("Microphone permission is needed to record"); return; }
    const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg"].find(m => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) || "";
    rec = new MediaRecorder(recStream, mime ? { mimeType: mime } : undefined);
    recChunks = [];
    rec.ondataavailable = ev => { if (ev.data && ev.data.size) recChunks.push(ev.data); };
    rec.onstop = async () => {
      const dur = (Date.now() - recStart) / 1000;
      const type = (rec && rec.mimeType) || mime || "audio/webm";
      const blob = new Blob(recChunks, { type });
      rec = null;
      if (rec === null && s.closed) return;
      if (blob.size < 200){ toast("That recording was empty"); return; }
      const id = "a" + uid();
      try{ await AudioDB.put(id, blob); }catch(err){ toast("Couldn't store the recording"); return; }
      recordedHere.push(id);
      e.audio.push({ id, dur: Math.round(dur), mime: type.split(";")[0] });
      drawClips();
      toast("Voice note added");
    };
    recStart = Date.now();
    try{ rec.start(250); }
    catch(err){
      rec.onstop = null; rec = null;
      recStream.getTracks().forEach(t => t.stop()); recStream = null;
      toast("Couldn't start recording on this device");
      return;
    }
    $("#dRec", s.body).classList.add("on");
    $("#dRec", s.body).innerHTML = ico("stop");
    recTimer = setInterval(() => { const t = $("#dRecT", s.body); if (t) t.textContent = fmtDur((Date.now() - recStart) / 1000); }, 250);
    try{
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const src = ac.createMediaStreamSource(recStream);
      analyser = ac.createAnalyser(); analyser.fftSize = 64; src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const bars = $$("#dMeter i", s.body);
      const tick = () => {
        if (!analyser) return;
        analyser.getByteFrequencyData(data);
        bars.forEach((b, k) => { b.style.height = (4 + (data[k % data.length] / 255) * 26) + "px"; b.style.background = "#EF4444"; });
        rafId = requestAnimationFrame(tick);
      };
      tick();
      analyser._ac = ac;
    }catch(_){}
  }
  function stopRec(discard){
    clearInterval(recTimer); cancelAnimationFrame(rafId);
    if (analyser && analyser._ac) analyser._ac.close().catch(() => {});
    analyser = null;
    if (rec){
      if (discard){ rec.ondataavailable = null; rec.onstop = null; }
      try{ rec.stop(); }catch(_){}
      if (discard) rec = null;
    }
    if (recStream){ recStream.getTracks().forEach(t => t.stop()); recStream = null; }
    const b = $("#dRec", s.body);
    if (b){ b.classList.remove("on"); b.innerHTML = ico("mic"); }
    $$("#dMeter i", s.body).forEach(x => { x.style.height = "4px"; x.style.background = ""; });
  }

  draw();
  $('[data-a="save"]', s.el).addEventListener("click", () => {
    if (rec){ toast("Stop the recording first"); return; }
    stopDict();
    e.text = ($("#dText", s.body).value || "").trim();
    if (!e.text && !e.mood && !e.audio.length && !e.tags.length){ toast("Write something, pick a mood or record a note"); return; }
    if (isNew) state.diary.push(e); else Object.assign(existing, e);
    removedHere.forEach(id => AudioDB.del(id).catch(() => {}));
    saved = true;
    save(); s.close(); rerender();
    toast(isNew ? "Saved. Thanks for checking in with yourself 💜" : "Saved");
  });
  const del = $('[data-a="del"]', s.el);
  if (del) del.addEventListener("click", () => {
    if (!confirm("Delete this diary entry" + ((existing.audio || []).length ? " and its voice notes" : "") + "?")) return;
    (existing.audio || []).forEach(c => AudioDB.del(c.id).catch(() => {}));
    state.diary = state.diary.filter(x => x !== existing);
    saved = true; save(); s.close(); rerender(); toast("Entry deleted");
  });
}
