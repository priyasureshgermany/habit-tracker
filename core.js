"use strict";
/* ==========================================================================
   CORE — helpers, dates, state, sheets, toast, router, rings, confetti, audio
   store. Every other script builds on these names; none of them redefines one.
   ========================================================================== */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c =>
  ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[c]);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const num = (v, d = 0) => { const n = parseFloat(String(v).replace(",", ".")); return Number.isFinite(n) ? n : d; };
const fmtN = (n, dp = 0) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: dp, minimumFractionDigits: 0 });
const plural = (n, one, many) => n + " " + (n === 1 ? one : (many || one + "s"));

/* ---------- dates: everything is a local "YYYY-MM-DD" string ---------- */
const pad2 = (n) => String(n).padStart(2, "0");
function isoOf(d){ return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
function dateOf(iso){ const p = String(iso).split("-").map(Number); return new Date(p[0], p[1] - 1, p[2]); }
function todayISO(){ return isoOf(new Date()); }
function addDays(iso, n){ const d = dateOf(iso); d.setDate(d.getDate() + n); return isoOf(d); }
/** b − a in whole days; rounding absorbs the hour a clock change adds or takes. */
function dayDiff(a, b){ return Math.round((dateOf(b) - dateOf(a)) / 864e5); }
/** Monday of the week containing iso (ISO weeks start on Monday). */
function mondayOf(iso){ const d = dateOf(iso); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return isoOf(d); }
function monthStart(iso){ return iso.slice(0, 8) + "01"; }
function monthEnd(iso){ const d = dateOf(monthStart(iso)); d.setMonth(d.getMonth() + 1); d.setDate(0); return isoOf(d); }
function addMonths(iso, n){ const d = dateOf(monthStart(iso)); d.setMonth(d.getMonth() + n); return isoOf(d); }
function daysBetween(a, b){ const out = []; for (let d = a; d <= b; d = addDays(d, 1)) out.push(d); return out; }
function fmtDay(iso, o){ return dateOf(iso).toLocaleDateString(undefined, o || { weekday:"short", day:"numeric", month:"short" }); }
function fmtMonth(iso){ return dateOf(iso).toLocaleDateString(undefined, { month:"long", year:"numeric" }); }
function wdShort(iso){ return dateOf(iso).toLocaleDateString(undefined, { weekday:"short" }).slice(0, 2); }
function nowHM(){ const d = new Date(); return pad2(d.getHours()) + ":" + pad2(d.getMinutes()); }
function fmtDur(sec){ sec = Math.round(sec); return Math.floor(sec / 60) + ":" + pad2(sec % 60); }

/* ==========================================================================
   STATE — one constructor for every way a book arrives (load, pull, restore,
   import). A second copy of this literal is how fields get silently dropped.
   ========================================================================== */
const STORE = "habits.state";

function stateBlank(){
  return {
    schema: 1,
    profile: { name:"", email:"", age:"", weight:"", height:"" },
    settings: { cardioGoal:150, strengthGoal:2, stepGoal:8000, dictLang:"", reminders:false, diaryReminder:"" },
    habits: [],
    logs: {},          /* habitId → { iso → { v:number, skip?:true, note?:string } } */
    workouts: [],      /* { id, date, type:"cardio"|"strength"|"routine", … } */
    diary: [],         /* { id, date, time, mood, energy, tags[], text, audio:[{id,dur,mime}] } */
    weighins: []       /* { date, kg } */
  };
}
function stateFromPayload(p){
  const b = stateBlank();
  if (!p || typeof p !== "object") return b;
  const arr = (x) => Array.isArray(x) ? x : [];
  const obj = (x) => (x && typeof x === "object" && !Array.isArray(x)) ? x : {};
  return {
    schema: 1,
    profile: Object.assign(b.profile, obj(p.profile)),
    settings: Object.assign(b.settings, obj(p.settings)),
    habits: arr(p.habits).map(normHabit),
    logs: obj(p.logs),
    workouts: arr(p.workouts).filter(w => w && w.date),
    diary: arr(p.diary).filter(e => e && e.date).map(e => Object.assign({ tags:[], audio:[], text:"" }, e)),
    weighins: arr(p.weighins).filter(w => w && w.date && w.kg > 0)
  };
}
function normHabit(h){
  h = h || {};
  return Object.assign({
    id: uid(), name: "New habit", icon: "✨", color: "#8B5CF6", cat: "other",
    kind: "check", target: 1, unit: "", quit: false, part: "any", reminder: "",
    start: todayISO(), end: "", why: "", archived: false, order: 0
  }, h, {
    freq: Object.assign({ type:"daily", days:[1,2,3,4,5], times:3, every:2 }, h.freq || {})
  });
}

let state = stateBlank();
let loadFailed = false, loadError = "";
function load(){
  try{
    const raw = localStorage.getItem(STORE);
    state = raw ? stateFromPayload(JSON.parse(raw)) : stateBlank();
  }catch(e){
    /* Kept apart rather than overwritten: a book that cannot be read is still
       somebody's book, and saving over it would make that permanent. */
    loadFailed = true; loadError = e.message;
    try{ localStorage.setItem(STORE + ".unreadable." + Date.now(), localStorage.getItem(STORE) || ""); }catch(_){}
    state = stateBlank();
  }
}
/* Set by every save; a screen left showing older figures under a sheet is
   redrawn when the last sheet closes. */
let needsRender = false;
/** Saves locally and nothing else. Never schedules a push. */
function save(){
  needsRender = true;
  if (loadFailed) return;
  try{ localStorage.setItem(STORE, JSON.stringify(state)); }
  catch(e){ toast("Storage is full — could not save"); }
}

/* ==========================================================================
   UI PRIMITIVES
   ========================================================================== */
const ICONS = {
  plus:'<path d="M12 5v14M5 12h14"/>',
  close:'<path d="M6 6l12 12M18 6L6 18"/>',
  left:'<path d="M15 5l-7 7 7 7"/>',
  right:'<path d="M9 5l7 7-7 7"/>',
  check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  trash:'<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/>',
  mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21"/>',
  stop:'<rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor"/>',
  play:'<path d="M7 4.5v15l13-7.5z" fill="currentColor"/>',
  pause:'<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/>',
  chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  spark:'<path d="M12 3l2 5.5L19.5 10.5 14 12.5 12 18l-2-5.5L4.5 10.5 10 8.5z"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>',
  flame:'<path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.9 3.3-6 3.8-9.8 2.6 1.6 3.4 4.3 3.2 6.3 1-.6 1.7-1.8 1.9-3.3 2 1.6 4.1 4.3 4.1 7 0 3.4-2.6 6-6.5 6z" fill="currentColor"/>',
  shuffle:'<path d="M3 7h3.5c4.5 0 6.5 10 11 10H21M3 17h3.5c1.6 0 2.8-1.3 3.9-3M14.5 10c1-1.8 2.2-3 3.9-3H21M18.5 4.5L21 7l-2.5 2.5M18.5 14.5L21 17l-2.5 2.5"/>',
  wave:'<path d="M4 12h2M8 8v8M12 5v14M16 9v6M20 11v2"/>'
};
function ico(name, w){ return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (w || 2) +
  '" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name] || "") + "</svg>"; }

let toastTimer = 0;
function toast(msg){
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("vis");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("vis"), 2400);
}

/* ---------- sheets: stacked bottom panels ----------
   openSheet({ title, body, foot, onClose }) → { el, body, close, setTitle }
   Visibility is a transition on a class, so a sheet reopened mid-close can
   never be left present-but-invisible over the app. */
const sheetStack = [];
function openSheet(opt){
  const z = 50 + sheetStack.length * 2;
  const scrim = document.createElement("div");
  scrim.className = "scrim"; scrim.style.zIndex = z;
  const el = document.createElement("div");
  el.className = "sheet"; el.style.zIndex = z + 1;
  if (opt.tall) el.style.height = "92vh";
  el.setAttribute("role", "dialog");
  el.innerHTML =
    '<div class="sheet-h">' + (opt.back ? '<button class="iconbtn" data-x="1" aria-label="Back">' + ico("left") + "</button>" : "") +
    "<h2>" + esc(opt.title || "") + "</h2>" +
    (opt.back ? "" : '<button class="iconbtn" data-x="1" aria-label="Close">' + ico("close") + "</button>") + "</div>" +
    '<div class="sheet-body"></div>' + (opt.foot ? '<div class="sheet-foot"></div>' : "");
  document.body.appendChild(scrim);
  document.body.appendChild(el);
  const body = $(".sheet-body", el);
  if (typeof opt.body === "string") body.innerHTML = opt.body;
  if (opt.foot) $(".sheet-foot", el).innerHTML = opt.foot;
  const api = {
    el, body, foot: $(".sheet-foot", el), closed: false, refresh: opt.refresh || null,
    setTitle(t){ $(".sheet-h h2", el).textContent = t; },
    close(){
      if (api.closed) return;
      api.closed = true;
      const i = sheetStack.indexOf(api); if (i >= 0) sheetStack.splice(i, 1);
      el.classList.remove("vis"); scrim.classList.remove("vis");
      setTimeout(() => { el.remove(); scrim.remove(); }, 340);
      if (opt.onClose) opt.onClose();
      /* what is underneath catches up with whatever changed up here */
      const below = sheetStack[sheetStack.length - 1];
      if (below && below.refresh) below.refresh();
      if (!sheetStack.length){
        document.body.style.overflow = "";
        if (needsRender || currentView === "more") rerender();
      }
    }
  };
  scrim.addEventListener("click", () => api.close());
  $$("[data-x]", el).forEach(b => b.addEventListener("click", () => api.close()));
  sheetStack.push(api);
  document.body.style.overflow = "hidden";
  void el.offsetWidth;
  el.classList.add("vis"); scrim.classList.add("vis");
  return api;
}
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && sheetStack.length) sheetStack[sheetStack.length - 1].close();
});
function closeAllSheets(){ sheetStack.slice().forEach(s => s.close()); }

/** A small sheet asking for one number. Resolves to the number, or null. */
function askNumber(title, value, unit){
  return new Promise((resolve) => {
    let done = false;
    const s = openSheet({
      title,
      body: '<label class="field"><span>' + esc(unit || "Value") + '</span><input class="input" id="askN" type="number" inputmode="decimal" step="any" value="' + esc(value) + '"></label>',
      foot: '<button class="btn" data-a="cancel">Cancel</button><button class="btn primary" data-a="ok">Save</button>',
      onClose: () => { if (!done) resolve(null); }
    });
    const inp = $("#askN", s.el);
    setTimeout(() => { inp.focus(); inp.select(); }, 320);
    const ok = () => { done = true; resolve(num(inp.value, 0)); s.close(); };
    inp.addEventListener("keydown", e => { if (e.key === "Enter") ok(); });
    $('[data-a="ok"]', s.el).addEventListener("click", ok);
    $('[data-a="cancel"]', s.el).addEventListener("click", () => s.close());
  });
}

/** A circular progress ring as SVG. frac 0–1. */
function ringSVG(frac, opt){
  opt = opt || {};
  const size = opt.size || 100, w = opt.w || 10, r = (size - w) / 2, c = 2 * Math.PI * r;
  const f = clamp(frac || 0, 0, 1);
  const id = "g" + Math.random().toString(36).slice(2, 7);
  const track = opt.track || "rgba(255,255,255,.22)";
  const stroke = opt.color || "url(#" + id + ")";
  return '<svg viewBox="0 0 ' + size + " " + size + '" width="100%" height="100%" style="transform:rotate(-90deg)">' +
    '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + (opt.c1 || "#fff") +
    '"/><stop offset="1" stop-color="' + (opt.c2 || "rgba(255,255,255,.75)") + '"/></linearGradient></defs>' +
    '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + track + '" stroke-width="' + w + '"/>' +
    '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + stroke + '" stroke-width="' + w +
    '" stroke-linecap="round" stroke-dasharray="' + c + '" stroke-dashoffset="' + (c * (1 - f)) +
    '" style="transition:stroke-dashoffset .8s cubic-bezier(.2,.8,.2,1)"/></svg>';
}
function ringBox(frac, inner, opt){
  return '<div style="position:relative;width:100%;height:100%">' + ringSVG(frac, opt) +
    '<div style="position:absolute;inset:0;display:grid;place-items:center;text-align:center;line-height:1.1">' + inner + "</div></div>";
}

function confetti(){
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const box = document.createElement("div");
  box.className = "confetti";
  const cols = ["#8B5CF6","#14B8A6","#F59E0B","#EF4444","#22C55E","#0EA5E9","#EC4899"];
  for (let i = 0; i < 90; i++){
    const p = document.createElement("i");
    p.style.left = Math.random() * 100 + "vw";
    p.style.background = cols[i % cols.length];
    p.style.setProperty("--dx", (Math.random() * 160 - 80) + "px");
    p.style.setProperty("--r", (Math.random() * 900 - 450) + "deg");
    p.style.animationDuration = (1.6 + Math.random() * 1.6) + "s";
    p.style.animationDelay = Math.random() * .4 + "s";
    box.appendChild(p);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 3800);
}

/* ==========================================================================
   AUDIO STORE — voice notes are blobs, far too big for localStorage, so they
   live in IndexedDB keyed by clip id. The book only carries {id, dur, mime}.
   ========================================================================== */
const AudioDB = (() => {
  let dbp = null;
  function db(){
    if (!dbp) dbp = new Promise((res, rej) => {
      const rq = indexedDB.open("habits-audio", 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore("clips");
      rq.onsuccess = () => res(rq.result);
      rq.onerror = () => rej(rq.error);
    });
    return dbp;
  }
  function tx(mode, fn){
    return db().then(d => new Promise((res, rej) => {
      const t = d.transaction("clips", mode);
      const r = fn(t.objectStore("clips"));
      t.oncomplete = () => res(r && r.result);
      t.onerror = () => rej(t.error);
    }));
  }
  return {
    put: (id, blob) => tx("readwrite", s => s.put(blob, id)),
    get: (id) => tx("readonly", s => s.get(id)),
    del: (id) => tx("readwrite", s => s.delete(id)),
    keys: () => tx("readonly", s => s.getAllKeys())
  };
})();
function blobToB64(blob){
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result).split(",")[1] || "");
    fr.onerror = () => rej(fr.error);
    fr.readAsDataURL(blob);
  });
}
function b64ToBlob(b64, mime){
  const bin = atob(String(b64).replace(/\s/g, ""));
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return new Blob([u], { type: mime || "audio/webm" });
}

/* ==========================================================================
   ROUTER
   ========================================================================== */
const VIEWS = {};          /* name → { render(), fab() } — filled by each module */
let currentView = "today";
function go(name){
  if (!VIEWS[name]) name = "today";
  currentView = name;
  $$(".view").forEach(v => v.classList.toggle("on", v.id === "view-" + name));
  $$(".tab").forEach(t => t.classList.toggle("on", t.dataset.view === name));
  $("#fab").hidden = !VIEWS[name].fab;
  try{ localStorage.setItem("habits.view", name); }catch(e){}
  needsRender = false;
  VIEWS[name].render();
  window.scrollTo(0, 0);
}
function rerender(){ needsRender = false; if (VIEWS[currentView]) VIEWS[currentView].render(); }

/* ---------- profile-derived figures ---------- */
function weightKg(){ return num(state.profile.weight, 0); }
function bmiOf(){
  const w = weightKg(), h = num(state.profile.height, 0) / 100;
  return (w > 0 && h > 0.5) ? w / (h * h) : 0;
}
function bmiBand(b){
  if (!b) return { name:"—", color:"var(--ink-3)" };
  if (b < 18.5) return { name:"Underweight", color:"#0EA5E9" };
  if (b < 25) return { name:"Healthy", color:"#10B981" };
  if (b < 30) return { name:"Overweight", color:"#F59E0B" };
  return { name:"Obese", color:"#EF4444" };
}
function firstName(){ return String(state.profile.name || "").trim().split(/\s+/)[0] || ""; }
