"use strict";
/* ==========================================================================
   EXERCISE ANIMATIONS — a stick figure that shows how each exercise moves.

   A pose names where the body's key points are, not its angles: hip (h),
   shoulder (s), near/far foot (fn/ff) and near/far hand (hn/hf). Knees and
   elbows are worked out each frame by two-bone inverse kinematics, bending
   the way the hint (kh / eh) points. So a squat is "hips back and down, feet
   stay put", and the knees fold correctly on their own.

   Side view faces right; the floor is y = 118 in a 200 × 125 box. A front
   view (v:"front") mirrors the near limbs to draw the far ones.

   Each exercise loops through its frames; time is taken from the clock, not
   from when the figure was drawn, so a figure redrawn mid-move (the routine
   player redraws every second) carries on where it was.
   ========================================================================== */

const MV = { F:118, TOR:30, UA:17, FA:16, TH:21, SH:21, HEAD:6.5, NECK:5, FOOT:6 };
const MV_F = MV.F;
const MV_STAND = { h:[100,76], s:[100,46], fn:[100,MV_F], hn:[101,79] };
const mvP = (o) => Object.assign({}, MV_STAND, o);

/* group → which segments light up */
const MV_HI = { abs:["torso"], chest:["torso"], back:["torso"], biceps:["ua"], triceps:["ua"], shoulders:["ua"],
  arms:["fa"], thighs:["th"], glutes:["th"], calves:["sh"] };

/* v: view · f: frames · p: props · dur: ms per move · ease: "linear" for circles */
const MOVES = {
  /* ---- abs ---- */
  crunch:   { p:["mat"], f:[
    { h:[96,113], s:[66,113], fn:[124,116], kh:[0,-1], hn:[58,104], eh:[0,-1] },
    { h:[96,113], s:[70,98],  fn:[124,116], kh:[0,-1], hn:[62,90],  eh:[0,-1] }] },
  plank:    { p:["mat"], hold:1, f:[
    { h:null, s:[121,98], fn:[51,MV_F], hn:[137,116], eh:[0,1] },
    { h:null, s:[121,96], fn:[51,MV_F], hn:[137,116], eh:[0,1] }] },
  legraise: { p:["mat"], f:[
    { h:[100,114], s:[70,114], fn:[141,111], kh:[1,-1], hn:[96,116], eh:[0,1] },
    { h:[100,114], s:[70,114], fn:[103,72],  kh:[1,-1], hn:[96,116], eh:[0,1] }] },
  bicycle:  { p:["mat"], dur:700, f:[
    { h:[100,113], s:[74,98], hn:[64,92], eh:[0,-1], fn:[112,92], ff:[140,104], kh:[0,-1] },
    { h:[100,113], s:[74,98], hn:[64,92], eh:[0,-1], fn:[140,104], ff:[112,92], kh:[0,-1] }] },
  mountain: { p:["mat"], dur:420, f:[
    { h:[97,99], s:[124,85], fn:[60,MV_F], ff:[60,MV_F], hn:[124,MV_F], kh:[1,1] },
    { h:[97,99], s:[124,85], fn:[108,104], ff:[60,MV_F], hn:[124,MV_F], kh:[1,1] },
    { h:[97,99], s:[124,85], fn:[60,MV_F], ff:[60,MV_F], hn:[124,MV_F], kh:[1,1] },
    { h:[97,99], s:[124,85], fn:[60,MV_F], ff:[108,104], hn:[124,MV_F], kh:[1,1] }] },
  twist:    { p:["mat","db"], f:[
    { h:[100,112], s:[86,86], fn:[126,106], kh:[0,-1], hn:[116,92], eh:[0,1] },
    { h:[100,112], s:[86,86], fn:[126,106], kh:[0,-1], hn:[108,114], eh:[0,1] }] },
  deadbug:  { p:["mat"], f:[
    { h:[100,114], s:[70,114], hn:[72,81], hf:[72,81], fn:[121,93], ff:[121,93], kh:[-0.3,-1], eh:[1,0] },
    { h:[100,114], s:[70,114], hn:[38,112], hf:[72,81], fn:[121,93], ff:[141,111], kh:[-0.3,-1], eh:[1,0] }] },
  flutter:  { p:["mat"], dur:340, f:[
    { h:[100,114], s:[70,114], hn:[96,116], eh:[0,1], fn:[140,106], ff:[140,114] },
    { h:[100,114], s:[70,114], hn:[96,116], eh:[0,1], fn:[140,114], ff:[140,106] }] },
  sideplank:{ p:["mat"], hold:1, f:[
    { h:null, s:[121,97], fn:[52,MV_F], hn:[134,116], eh:[0,1], hf:[121,64] },
    { h:null, s:[121,94], fn:[52,MV_F], hn:[134,116], eh:[0,1], hf:[121,61] }] },

  /* ---- biceps ---- */
  curl:     { p:["db"], f:[ mvP({ hn:[101,79], eh:[-0.3,1] }), mvP({ hn:[107,51], eh:[-0.3,1] })] },
  hammer:   { p:["db"], f:[ mvP({ hn:[101,79], eh:[-0.3,1] }), mvP({ hn:[107,51], eh:[-0.3,1] })] },
  conc:     { p:[["bench",70,104,99],"db"], f:[
    { h:[96,96], s:[112,72], fn:[120,MV_F], kh:[1,-1], hn:[118,102], eh:[0,1] },
    { h:[96,96], s:[112,72], fn:[120,MV_F], kh:[1,-1], hn:[116,80],  eh:[0,1] }] },
  bandcurl: { p:["band"], f:[ mvP({ hn:[101,79], eh:[-0.3,1] }), mvP({ hn:[107,51], eh:[-0.3,1] })] },
  chinup:   { p:[["bar",14]], dur:1100, f:[
    { h:[100,77], s:[100,47], hn:[98,14], hf:[102,14], fn:[90,112], kh:[1,0], eh:[1,0] },
    { h:[100,57], s:[100,27], hn:[98,14], hf:[102,14], fn:[90,92],  kh:[1,0], eh:[1,0] }] },

  /* ---- triceps ---- */
  dips:     { p:[["chair",62,90,86]], f:[
    { h:[93,82], s:[90,52], hn:[87,84], eh:[-1,0], fn:[114,MV_F], kh:[1,-0.5] },
    { h:[94,98], s:[91,68], hn:[87,84], eh:[-1,0], fn:[114,MV_F], kh:[1,-1] }] },
  ohext:    { p:["db"], f:[ mvP({ hn:[101,13], eh:[0,-1] }), mvP({ hn:[93,40], eh:[0.3,-1] })] },
  diamond:  { p:["mat"], f:[
    { h:null, s:[124,85],  fn:[60,MV_F], hn:[124,MV_F], eh:[-1,-0.3] },
    { h:null, s:[131,104], fn:[60,MV_F], hn:[124,MV_F], eh:[-1,-0.3] }] },
  kickback: { p:["db"], f:[
    { h:[94,76], s:[121,63], fn:[98,MV_F], hn:[107,84], hf:[118,96], eh:[-1,-0.2] },
    { h:[94,76], s:[121,63], fn:[98,MV_F], hn:[90,72],  hf:[118,96], eh:[-1,-0.2] }] },
  skull:    { p:[["bench",50,120,97],"db"], f:[
    { h:[100,93], s:[70,93], fn:[120,MV_F], kh:[0.3,-1], hn:[70,60], eh:[0,-1] },
    { h:[100,93], s:[70,93], fn:[120,MV_F], kh:[0.3,-1], hn:[57,80], eh:[0,-1] }] },

  /* ---- shoulders ---- */
  ohp:      { p:["db"], f:[ mvP({ hn:[107,46], eh:[0.2,1] }), mvP({ hn:[102,13], eh:[0.2,1] })] },
  lateral:  { v:"front", p:["db"], f:[
    { h:[100,76], s:[100,46], fn:[104,MV_F], hn:[110,79], eh:[0,1] },
    { h:[100,76], s:[100,46], fn:[104,MV_F], hn:[140,50], eh:[0,1] }] },
  front:    { p:["db"], f:[ mvP({ hn:[102,79] }), mvP({ hn:[133,47] })] },
  pike:     { p:["mat"], f:[
    { h:[90,82],  s:[114,99],  fn:[72,MV_F], hn:[142,MV_F], eh:[-1,-1] },
    { h:[100,84], s:[120,106], fn:[72,MV_F], hn:[142,MV_F], eh:[-1,-1] }] },
  arnold:   { p:["db"], f:[ mvP({ hn:[106,40], eh:[0.5,1] }), mvP({ hn:[102,13], eh:[0.5,1] })] },
  reardelt: { p:["db"], f:[
    { h:[94,74], s:[122,64], fn:[98,MV_F], hn:[124,96], eh:[0,1] },
    { h:[94,74], s:[122,64], fn:[98,MV_F], hn:[127,37], eh:[1,0] }] },

  /* ---- forearms / arms ---- */
  wristcurl:{ p:[["bench",70,104,99],"db"], dur:600, f:[
    { h:[96,96], s:[104,67], fn:[124,MV_F], kh:[1,-1], hn:[126,101], eh:[0,1] },
    { h:[96,96], s:[104,67], fn:[124,MV_F], kh:[1,-1], hn:[126,93],  eh:[0,1] }] },
  farmer:   { p:["db"], dur:480, f:[
    mvP({ h:[100,78], s:[100,48], fn:[110,MV_F], ff:[90,MV_F], hn:[101,81] }),
    mvP({ h:[100,78], s:[100,48], fn:[90,MV_F],  ff:[110,MV_F], hn:[101,81] })] },
  revcurl:  { p:["db"], f:[ mvP({ hn:[101,79], eh:[-0.3,1] }), mvP({ hn:[107,51], eh:[-0.3,1] })] },
  armcircle:{ v:"front", dur:260, ease:"linear", f:[
    { h:[100,76], s:[100,46], fn:[104,MV_F], hn:[141,42] },
    { h:[100,76], s:[100,46], fn:[104,MV_F], hn:[146,47] },
    { h:[100,76], s:[100,46], fn:[104,MV_F], hn:[141,52] },
    { h:[100,76], s:[100,46], fn:[104,MV_F], hn:[136,47] }] },

  /* ---- chest ---- */
  pushup:   { p:["mat"], f:[
    { h:null, s:[124,85],  fn:[60,MV_F], hn:[124,MV_F], eh:[-0.5,-1] },
    { h:null, s:[131,104], fn:[60,MV_F], hn:[124,MV_F], eh:[-0.5,-1] }] },
  incline:  { p:[["bench",112,152,90]], f:[
    { h:null, s:[121,58], fn:[72,MV_F], hn:[126,90], eh:[-1,-0.5] },
    { h:null, s:[131,75], fn:[72,MV_F], hn:[126,90], eh:[-1,-0.5] }] },
  bench:    { p:[["bench",50,120,97],"db"], f:[
    { h:[100,93], s:[70,93], fn:[120,MV_F], kh:[0.3,-1], hn:[72,80], eh:[0,1] },
    { h:[100,93], s:[70,93], fn:[120,MV_F], kh:[0.3,-1], hn:[70,60], eh:[0,1] }] },
  fly:      { p:[["bench",50,120,97],"db"], f:[
    { h:[100,93], s:[70,93], fn:[120,MV_F], kh:[0.3,-1], hn:[52,86], eh:[0,1] },
    { h:[100,93], s:[70,93], fn:[120,MV_F], kh:[0.3,-1], hn:[70,61], eh:[0,1] }] },
  widepush: { p:["mat"], f:[
    { h:null, s:[124,85],  fn:[60,MV_F], hn:[124,MV_F], eh:[-0.3,-1] },
    { h:null, s:[131,104], fn:[60,MV_F], hn:[124,MV_F], eh:[-0.3,-1] }] },

  /* ---- thighs ---- */
  squat:    { f:[ mvP({ hn:[101,79] }),
    { h:[82,92], s:[99,67], fn:[100,MV_F], hn:[131,68], kh:[1,0], eh:[0,1] }] },
  lunge:    { p:["db"], f:[ mvP({ hn:[101,79] }),
    { h:[96,94], s:[97,64], fn:[124,MV_F], ff:[72,MV_F], kh:[1,0], khF:[0,1], hn:[98,97] }] },
  wallsit:  { p:[["wall",70]], hold:1, f:[
    { h:[78,97], s:[76,67], fn:[100,MV_F], kh:[1,-1], hn:[98,96], eh:[1,0] },
    { h:[78,97], s:[76,66], fn:[100,MV_F], kh:[1,-1], hn:[98,95], eh:[1,0] }] },
  stepup:   { p:[["step",108,150,96]], dur:1000, f:[
    { h:[96,77], s:[98,47], fn:[120,96], ff:[96,MV_F], kh:[1,-0.5], hn:[99,80] },
    { h:[124,56], s:[124,26], fn:[124,96], ff:[126,96], hn:[125,59] }] },
  bulgarian:{ p:[["bench",40,72,94],"db"], f:[
    { h:[100,80], s:[103,50], fn:[118,MV_F], ff:[66,92], kh:[1,0], khF:[0,1], hn:[101,83] },
    { h:[100,96], s:[106,67], fn:[118,MV_F], ff:[66,92], kh:[1,0], khF:[0,1], hn:[104,99] }] },
  sumo:     { v:"front", p:["db"], f:[
    { h:[100,77], s:[100,47], fn:[120,MV_F], kh:[1,0], hn:[104,90], eh:[0,1] },
    { h:[100,93], s:[100,63], fn:[120,MV_F], kh:[1,0], hn:[104,106], eh:[0,1] }] },

  /* ---- glutes ---- */
  bridge:   { p:["mat"], f:[
    { h:[98,114], s:[68,114], fn:[124,MV_F], kh:[0,-1], hn:[84,116], eh:[0,1] },
    { h:[98,95],  s:[70,111], fn:[124,MV_F], kh:[0,-1], hn:[84,116], eh:[0,1] }] },
  donkey:   { p:["mat"], f:[
    { h:[96,88], s:[126,85], hn:[128,MV_F], eh:[0,1], fn:[74,114], ff:[74,114], kh:[0,1] },
    { h:[96,88], s:[126,85], hn:[128,MV_F], eh:[0,1], fn:[76,64],  ff:[74,114], kh:[-1,0.3], khF:[0,1] }] },
  clam:     { p:["mat"], f:[
    { h:[100,112], s:[70,112], hn:[60,104], eh:[0,1], fn:[118,116], ff:[118,116], kh:[1,-0.2] },
    { h:[100,112], s:[70,112], hn:[60,104], eh:[0,1], fn:[116,100], ff:[118,116], kh:[0.5,-1], khF:[1,-0.2] }] },

  /* ---- back ---- */
  superman: { p:["mat"], f:[
    { h:[96,114], s:[126,114], hn:[158,113], fn:[54,114], toe:[0,4] },
    { h:[96,113], s:[125,105], hn:[156,96],  fn:[56,104], toe:[-1,4] }] },
  row:      { p:["db"], f:[
    { h:[94,74], s:[122,64], fn:[98,MV_F], hn:[124,96], eh:[0,1] },
    { h:[94,74], s:[122,64], fn:[98,MV_F], hn:[110,76], eh:[-1,-1] }] },
  birddog:  { p:["mat"], f:[
    { h:[96,88], s:[126,85], hn:[128,MV_F], hf:[128,MV_F], fn:[74,114], ff:[74,114], kh:[0,1], eh:[0,1] },
    { h:[96,88], s:[126,85], hn:[159,82],   hf:[128,MV_F], fn:[74,114], ff:[54,86],   kh:[0,1], eh:[0,1] }] },

  /* ---- calves ---- */
  calfraise:{ p:[["step",92,130,104]], dur:700, f:[
    { h:[100,62], s:[100,32], fn:[100,104], hn:[101,65], toe:[7,0] },
    { h:[100,56], s:[100,26], fn:[100,98],  hn:[101,59], toe:[4,6] }] },
  jumpjack: { v:"front", dur:340, f:[
    { h:[100,76], s:[100,46], fn:[104,MV_F], hn:[110,79] },
    { h:[100,72], s:[100,42], fn:[122,MV_F], hn:[120,14] }] }
};

/* ---------- geometry ---------- */
/** Two-bone IK: [joint, end] for a limb from root toward target, the joint
    bending to whichever side the hint points. Out of reach, the limb points
    straight at the target. */
function mvLimb(root, target, a, b, hint, side){
  const dx = target[0] - root[0], dy = target[1] - root[1];
  let d = Math.hypot(dx, dy) || 1e-6;
  const ux = dx / d, uy = dy / d;
  if (d >= a + b - 0.01) return [[root[0] + ux * a, root[1] + uy * a], [root[0] + ux * (a + b), root[1] + uy * (a + b)]];
  d = Math.max(d, Math.abs(a - b) + 0.01);
  const ang = Math.atan2(dy, dx);
  const off = Math.acos(Math.max(-1, Math.min(1, (a * a + d * d - b * b) / (2 * a * d))));
  const c1 = [root[0] + a * Math.cos(ang + off), root[1] + a * Math.sin(ang + off)];
  const c2 = [root[0] + a * Math.cos(ang - off), root[1] + a * Math.sin(ang - off)];
  const mx = (root[0] + target[0]) / 2, my = (root[1] + target[1]) / 2, hh = hint || [1, 0];
  const s1 = (c1[0] - mx) * hh[0] + (c1[1] - my) * hh[1], s2 = (c2[0] - mx) * hh[0] + (c2[1] - my) * hh[1];
  let pick = s1 >= s2 ? c1 : c2;
  if (side){
    const cr = (c) => Math.sign(dx * (c[1] - root[1]) - dy * (c[0] - root[0]));
    pick = cr(c1) === side ? c1 : c2;
  }
  return [pick, [target[0], target[1]]];
}
function mvExpand(p){
  const q = Object.assign({}, p);
  /* a straight body from the feet to the shoulders — plank, push-up */
  if (!q.h) q.h = [q.fn[0] + (q.s[0] - q.fn[0]) * 42 / 72, q.fn[1] + (q.s[1] - q.fn[1]) * 42 / 72];
  if (!q.ff) q.ff = q.fn;
  if (!q.hf) q.hf = q.hn;
  if (!q.kh) q.kh = [1, 0];
  if (!q.khF) q.khF = q.kh;
  if (!q.eh) q.eh = [0, 1];
  if (!q.ehF) q.ehF = q.eh;
  return q;
}
function mvLerp(a, b, u){
  const o = {};
  Object.keys(a).forEach(k => {
    const x = a[k], y = b[k] == null ? x : b[k];
    o[k] = Array.isArray(x) ? x.map((v, i) => v + ((y[i] == null ? v : y[i]) - v) * u)
      : typeof x === "number" ? x + (y - x) * u : x;
  });
  return o;
}
const mvEase = (u) => u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
const mvF1 = (n) => Math.round(n * 10) / 10;
function mvLine(a, b, cls, w){ return '<line class="' + cls + '" x1="' + mvF1(a[0]) + '" y1="' + mvF1(a[1]) + '" x2="' + mvF1(b[0]) + '" y2="' + mvF1(b[1]) + '" stroke-width="' + w + '"/>'; }
function mvToe(knee, ankle, given){
  if (given) return [ankle[0] + given[0], ankle[1] + given[1]];
  const dx = ankle[0] - knee[0], dy = ankle[1] - knee[1], L = Math.hypot(dx, dy) || 1;
  const p1 = [-dy / L, dx / L], p2 = [dy / L, -dx / L];
  const pick = (p1[0] - p1[1] * .5) >= (p2[0] - p2[1] * .5) ? p1 : p2;
  return [ankle[0] + pick[0] * MV.FOOT, ankle[1] + pick[1] * MV.FOOT];
}

/* ---------- the body ----------
   Drawn as filled, tapered shapes rather than lines: each limb is a profile
   of half-widths along its length (thick at the hip, a calf below the knee,
   slim at the ankle), the torso has a chest that bulges to the front and a
   waist, and the figure wears a t-shirt, shorts and trainers. The far-side
   limbs are a shade darker so the near ones read as in front. */
const mvAdd = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mvMul = (a, k) => [a[0] * k, a[1] * k];
const mvMix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
function mvUnit(a, b){ const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1; return [dx / L, dy / L]; }
const mvPt = (q) => mvF1(q[0]) + "," + mvF1(q[1]);
/** A tapered shape from a to b. prof: [[t, halfWidthLeft, halfWidthRight?], …] along the
    segment, left/right relative to the direction a→b. Both ends are rounded. */
function mvShape(a, b, prof, cls){
  const d = mvUnit(a, b), n = [-d[1], d[0]];
  const L = [], R = [];
  prof.forEach((r) => {
    const c = mvMix(a, b, r[0]), wl = r[1], wr = r[2] == null ? r[1] : r[2];
    L.push(mvAdd(c, mvMul(n, wl)));
    R.push(mvAdd(c, mvMul(n, -wr)));
  });
  const f = prof[0], l = prof[prof.length - 1];
  const r0 = (f[1] + (f[2] == null ? f[1] : f[2])) / 2, r1 = (l[1] + (l[2] == null ? l[1] : l[2])) / 2;
  /* Each end is a half-round cap: a cubic that bulges out along the
     segment's own direction, so it is right whichever way the limb points. */
  const k = 1.33, e1 = mvMul(d, r1 * k), e0 = mvMul(d, -r0 * k);
  const Ln = L[L.length - 1], Rn = R[R.length - 1];
  let path = "M" + mvPt(L[0]);
  for (let i = 1; i < L.length; i++) path += " L" + mvPt(L[i]);
  path += " C" + mvPt(mvAdd(Ln, e1)) + " " + mvPt(mvAdd(Rn, e1)) + " " + mvPt(Rn);
  for (let i = R.length - 2; i >= 0; i--) path += " L" + mvPt(R[i]);
  path += " C" + mvPt(mvAdd(R[0], e0)) + " " + mvPt(mvAdd(L[0], e0)) + " " + mvPt(L[0]) + "Z";
  return '<path class="' + cls + '" d="' + path + '"/>';
}
const MVP = {
  thigh:  [[0, 5.4], [.3, 5.0], [.7, 4.2], [1, 3.6]],
  shin:   [[0, 3.5], [.28, 3.9], [.6, 3.0], [1, 2.2]],
  uarm:   [[0, 3.3], [.4, 3.5], [1, 2.6]],
  farm:   [[0, 2.7], [.3, 2.9], [1, 1.8]],
  shorts: [[0, 5.7], [.5, 5.4], [1, 4.9]],
  sleeve: [[0, 4.1], [1, 3.9]],
  neck:   [[0, 2.4], [1, 2.2]],
  shoe:   [[0, 2.5], [.6, 2.4], [1, 2.0]]
};
/** Draws one pose as SVG markup. hi: segment names to light up. */
function mvDraw(p, def, hi, sg, rec){
  const lit = (seg) => hi.indexOf(seg) >= 0;
  const out = [];
  const front = def.v === "front";
  const db = (def.p || []).indexOf("db") >= 0;
  const up = mvUnit(p.h, p.s);                    /* hip → shoulder */
  const fwd = front ? [0, 0] : [-up[1], up[0]];   /* the way the chest faces */
  const limb = (side) => {
    const near = side === "n";
    const mir = (pt) => front && !near ? [2 * p.h[0] - pt[0], pt[1]] : pt;
    const mirH = (v) => front && !near ? [-v[0], v[1]] : v;
    const hipR = front ? [p.h[0] + (near ? 4.6 : -4.6), p.h[1] - 1] : p.h;
    const shR = front ? [p.s[0] + (near ? 8.2 : -8.2), p.s[1] + 2.5] : p.s;
    const foot = mir(near ? p.fn : p.ff), hand = mir(near ? p.hn : p.hf);
    const kk = near ? "kn" : "kf", ek = near ? "en" : "ef";
    const kj = mvLimb(hipR, foot, MV.TH, MV.SH, mirH(near ? p.kh : p.khF), sg && sg[kk]);
    const ej = mvLimb(shR, hand, MV.UA, MV.FA, mirH(near ? p.eh : p.ehF), sg && sg[ek]);
    if (rec){
      const side = (r, t, j) => Math.sign((t[0] - r[0]) * (j[1] - r[1]) - (t[1] - r[1]) * (j[0] - r[0]));
      rec[kk] = side(hipR, foot, kj[0]); rec[ek] = side(shR, hand, ej[0]);
      rec["d" + kk] = Math.hypot(foot[0] - hipR[0], foot[1] - hipR[1]);
      rec["d" + ek] = Math.hypot(hand[0] - shR[0], hand[1] - shR[1]);
    }
    const knee = kj[0], ankle = kj[1], elbow = ej[0], wrist = ej[1];
    const f = near || front ? "" : " f";
    let toe = mvToe(knee, ankle, p.toe);
    if (front) toe = [ankle[0] + (near ? 2.5 : -2.5), ankle[1] + .5];
    const td = mvUnit(ankle, toe);
    const glow = (seg, a, b, prof) => lit(seg) ? mvShape(a, b, prof, "mv-hi") : "";
    const leg =
      mvShape(knee, ankle, MVP.shin, "mv-skin" + f) + glow("sh", knee, ankle, MVP.shin) +
      mvShape(hipR, knee, MVP.thigh, "mv-skin" + f) + glow("th", hipR, knee, MVP.thigh) +
      mvShape(hipR, mvMix(hipR, knee, .48), MVP.shorts, "mv-shorts" + f) +
      mvShape(mvAdd(ankle, mvMul(td, front ? 0 : -1.6)), mvAdd(ankle, mvMul(td, front ? 3 : 6.6)), MVP.shoe, "mv-shoe" + f);
    const arm =
      mvShape(shR, elbow, MVP.uarm, "mv-skin" + f) + glow("ua", shR, elbow, MVP.uarm) +
      mvShape(elbow, wrist, MVP.farm, "mv-skin" + f) + glow("fa", elbow, wrist, MVP.farm) +
      mvShape(shR, mvMix(shR, elbow, .45), MVP.sleeve, "mv-shirt" + f) +
      '<circle class="mv-skin' + f + '" cx="' + mvF1(wrist[0]) + '" cy="' + mvF1(wrist[1]) + '" r="2.3"/>' +
      (db ? mvDumbbell(wrist, mvUnit(elbow, wrist), front) : "");
    return { leg, arm, ankle, wrist, elbow, knee };
  };
  const n = limb("n"), fl = limb("f");
  if (def.under) out.push(def.under({ p, n, f: fl }));
  out.push(fl.leg, fl.arm);

  /* torso: a t-shirt with the chest to the front, shorts over the hips */
  const torso = front
    ? [[0, 7.6], [.42, 6.4], [.8, 8.8], [1, 9.6]]
    : [[0, 5.2, 5.6], [.42, 4.4, 4.6], [.78, 6.8, 5.0], [1, 5.0, 4.4]];
  const top = front ? mvAdd(p.s, [0, 2]) : p.s;
  const hc = mvAdd(p.s, mvMul(up, MV.NECK + MV.HEAD - .5));
  out.push(mvShape(mvAdd(p.s, mvMul(up, 1)), mvAdd(p.s, mvMul(up, MV.NECK + 1)), MVP.neck, "mv-skin"));
  out.push(mvShape(p.h, top, torso, "mv-shirt"));
  if (lit("torso")) out.push(mvShape(mvMix(p.h, top, .08), mvMix(p.h, top, .92), torso.map(r => [r[0], r[1] * .8, r[2] == null ? null : r[2] * .8]), "mv-hi"));
  const hipW = torso[0], waistW = torso[1];
  out.push(mvShape(p.h, mvMix(p.h, top, .24), [[0, hipW[1] + .3, hipW[2] == null ? null : hipW[2] + .3], [1, waistW[1] + .4, waistW[2] == null ? null : waistW[2] + .4]], "mv-shorts"));

  /* head: a plain oval with short hair — no drawn face, which only ever
     looked cartoonish at this size */
  if (front){
    out.push('<ellipse class="mv-skin" cx="' + mvF1(hc[0]) + '" cy="' + mvF1(hc[1] + .4) + '" rx="5.7" ry="6.6"/>');
    out.push('<path class="mv-hair" d="M' + mvF1(hc[0] - 5.6) + "," + mvF1(hc[1] - .6) + " Q" + mvF1(hc[0]) + "," + mvF1(hc[1] - 9.6) + " " + mvF1(hc[0] + 5.6) + "," + mvF1(hc[1] - .6) + '"/>');
  } else {
    const back = mvMul(fwd, -1);
    out.push('<circle class="mv-skin" cx="' + mvF1(hc[0]) + '" cy="' + mvF1(hc[1]) + '" r="6.3"/>');
    const h1 = mvAdd(hc, mvMul(fwd, 2.5)), h1b = mvAdd(h1, mvMul(up, 6)), h2 = mvAdd(mvAdd(hc, mvMul(back, 6.2)), mvMul(up, -.5));
    const ctl = mvAdd(mvAdd(hc, mvMul(up, 8.6)), mvMul(back, 3.2));
    out.push('<path class="mv-hair" d="M' + mvPt(h1b) + " Q" + mvPt(ctl) + " " + mvPt(h2) + '"/>');
  }
  if ((def.p || []).indexOf("band") >= 0) out.push(mvLine(n.ankle, n.wrist, "mv-band", 1.6));
  out.push(n.leg, n.arm);
  if (def.over) out.push(def.over({ p, n, f: fl }));
  return out.join("");
}
/** A dumbbell at the wrist: seen end-on from the side (a plate), across from the front. */
function mvDumbbell(w, along, front){
  if (front) return '<rect class="mv-dbh" x="' + mvF1(w[0] - 4.5) + '" y="' + mvF1(w[1] - .8) + '" width="9" height="1.6" rx=".8"/>' +
    '<rect class="mv-db" x="' + mvF1(w[0] - 6) + '" y="' + mvF1(w[1] - 3) + '" width="2.6" height="6" rx="1"/>' +
    '<rect class="mv-db" x="' + mvF1(w[0] + 3.4) + '" y="' + mvF1(w[1] - 3) + '" width="2.6" height="6" rx="1"/>';
  const c = mvAdd(w, mvMul(along, 1.2));
  return '<circle class="mv-db" cx="' + mvF1(c[0]) + '" cy="' + mvF1(c[1]) + '" r="3.8"/><circle class="mv-dbh" cx="' + mvF1(c[0]) + '" cy="' + mvF1(c[1]) + '" r="1.3"/>';
}
function mvProps(def){
  const F = MV_F;
  let s = def.nofloor ? "" : '<line class="mv-floor" x1="-80" y1="' + (F + 1.5) + '" x2="280" y2="' + (F + 1.5) + '"/>';
  (def.p || []).forEach(pr => {
    const k = Array.isArray(pr) ? pr[0] : pr;
    if (k === "mat") s += '<rect class="mv-mat" x="30" y="' + (F - 1) + '" width="140" height="3" rx="1.5"/>';
    if (k === "bench") s += '<rect class="mv-prop" x="' + pr[1] + '" y="' + pr[3] + '" width="' + (pr[2] - pr[1]) + '" height="5" rx="2"/>' +
      '<rect class="mv-prop" x="' + (pr[1] + 4) + '" y="' + pr[3] + '" width="4" height="' + (F - pr[3]) + '"/><rect class="mv-prop" x="' + (pr[2] - 8) + '" y="' + pr[3] + '" width="4" height="' + (F - pr[3]) + '"/>';
    if (k === "chair") s += '<rect class="mv-prop" x="' + pr[1] + '" y="' + pr[3] + '" width="' + (pr[2] - pr[1]) + '" height="4" rx="2"/>' +
      '<rect class="mv-prop" x="' + pr[1] + '" y="' + (pr[3] - 34) + '" width="4" height="' + (F - pr[3] + 34) + '"/><rect class="mv-prop" x="' + (pr[2] - 4) + '" y="' + pr[3] + '" width="4" height="' + (F - pr[3]) + '"/>';
    if (k === "bar") s += '<line class="mv-bar" x1="62" y1="' + pr[1] + '" x2="138" y2="' + pr[1] + '"/><line class="mv-bar" x1="64" y1="' + pr[1] + '" x2="64" y2="' + F + '"/><line class="mv-bar" x1="136" y1="' + pr[1] + '" x2="136" y2="' + F + '"/>';
    if (k === "wall") s += '<rect class="mv-prop" x="' + (pr[1] - 6) + '" y="10" width="6" height="' + (F - 8) + '"/>';
    if (k === "step") s += '<rect class="mv-prop" x="' + pr[1] + '" y="' + pr[3] + '" width="' + (pr[2] - pr[1]) + '" height="' + (F - pr[3] + 1) + '" rx="3"/>';
    if (k === "road") s += '<line class="mv-road" x1="-80" y1="' + (F + 4.5) + '" x2="280" y2="' + (F + 4.5) + '"/>';
    if (MV_SCENES[k]) s += MV_SCENES[k];
  });
  return s;
}

/** A viewBox around everything this exercise ever reaches, so a figure lying
    on a mat fills the box instead of hugging its floor. */
function mvFrame(def){
  if (def.box) return def.box.join(" ");
  let x0 = 1e9, x1 = -1e9, y0 = 1e9;
  const take = (pt) => { if (!pt) return; x0 = Math.min(x0, pt[0]); x1 = Math.max(x1, pt[0]); y0 = Math.min(y0, pt[1]); };
  def.f.map(mvExpand).forEach(p => {
    const mir = (pt) => def.v === "front" ? [2 * p.h[0] - pt[0], pt[1]] : pt;
    [p.h, p.s, p.fn, p.ff, p.hn, p.hf].forEach(pt => { take(pt); take(mir(pt)); });
    const dx = p.s[0] - p.h[0], dy = p.s[1] - p.h[1], L = Math.hypot(dx, dy) || 1, r = MV.NECK + MV.HEAD * 2;
    take([p.s[0] + dx / L * r, p.s[1] + dy / L * r]);
  });
  (def.p || []).forEach(pr => {
    if (!Array.isArray(pr)) return;
    if (pr[0] === "bench" || pr[0] === "step" || pr[0] === "chair"){ take([pr[1], pr[3] - (pr[0] === "chair" ? 34 : 0)]); take([pr[2], pr[3]]); }
    if (pr[0] === "bar"){ take([64, pr[1]]); take([136, pr[1]]); }
    if (pr[0] === "wall"){ take([pr[1] - 6, 30]); }
  });
  const pad = 17, top = Math.max(0, y0 - pad), bottom = MV_F + 5;
  let w = x1 - x0 + pad * 2, h = bottom - top;
  /* never narrower than 1.6 : 1, so a standing figure isn't blown up */
  const wantW = Math.max(w, h * 1.6), cx = (x0 + x1) / 2;
  return mvF1(cx - wantW / 2) + " " + mvF1(top) + " " + mvF1(wantW) + " " + mvF1(h);
}

/* ---------- illustrations ----------
   Where a professional drawing exists, it is used instead of the figure:
   Everkinetic's start ("relaxation") and finish ("tension") drawings, by Greg
   Priday, CC BY-SA 4.0 — see moves/README.md. The app blends between the two.
   Exercises not in this map keep the drawn figure. */
const MV_EK = {
  crunch:"0291", legraise:"0021", bicycle:"0284", flutter:"0116", sideplank:"0113",
  curl:"0224", hammer:"0227", conc:"0220", bandcurl:"0261", chinup:"0090", revcurl:"0257",
  dips:"0162", ohext:"0198", diamond:"0188", kickback:"0204", skull:"0181",
  ohp:"0038", lateral:"0018", front:"0033", reardelt:"0032",
  pushup:"0077", widepush:"0077", bench:"0055", fly:"0056",
  squat:"0130", lunge:"0115", stepup:"0137", sumo:"0152",
  bridge:"0109", superman:"0105", row:"0024", calfraise:"0281"
};
function mvIllustration(el, id, name){
  const n = MV_EK[id];
  el.classList.add("ek");
  /* The blend runs on the clock, not from when this was drawn: the routine
     player redraws every second and would otherwise restart it each time. */
  el.style.setProperty("--ek-at", -(performance.now() % 3400) + "ms");
  el.innerHTML =
    '<div class="ek-stage" role="img" aria-label="How to do ' + esc(name) + ': start and finish positions">' +
    '<img src="moves/' + n + '-relaxation.svg" alt="" draggable="false">' +
    '<img class="ek-end" src="moves/' + n + '-tension.svg" alt="" draggable="false">' +
    '<span class="ek-tag ek-a">1 · Start</span><span class="ek-tag ek-b">2 · Finish</span></div>';
}

/* ---------- the loop: one requestAnimationFrame for every figure on screen ---------- */
const mvLive = new Set();
let mvRaf = 0;
const mvStill = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
/* Which way each knee and elbow bends, decided at the key frames and held
   through the move between them. Choosing afresh every frame let a joint
   snap to the other side as a limb swung past vertical — a twisted leg. Where
   two key frames genuinely bend a joint differently, the switch happens at
   the point in the move where that limb is straightest, so it can't be seen. */
const MV_JOINTS = ["kn", "kf", "en", "ef"];
const MV_REACH = { kn: MV.TH + MV.SH, kf: MV.TH + MV.SH, en: MV.UA + MV.FA, ef: MV.UA + MV.FA };
function mvPlan(def, frames){
  frames.forEach(f => { const r = {}; mvDraw(f, def, [], null, r); f._sg = r; });
  /* A joint that never straightens anywhere it would have to switch has no
     moment where a switch is invisible: it keeps one side for the whole loop. */
  MV_JOINTS.forEach(j => {
    let hidden = true;
    frames.forEach((f, i) => {
      const g = frames[(i + 1) % frames.length];
      if (!f._sg[j] || !g._sg[j] || f._sg[j] === g._sg[j]) return;
      let far = 0;
      for (let k = 0; k <= 20; k++){ const r = {}; mvDraw(mvLerp(f, g, k / 20), def, [], null, r); far = Math.max(far, r["d" + j]); }
      if (far < MV_REACH[j] - 3) hidden = false;
    });
    if (!hidden){ const keep = frames.map(f => f._sg[j]).find(Boolean) || 0; frames.forEach(f => { f._sg[j] = keep; }); }
  });
  return frames.map((f, i) => {
    const g = frames[(i + 1) % frames.length], sw = {};
    MV_JOINTS.forEach(j => {
      if (!f._sg[j] || !g._sg[j] || f._sg[j] === g._sg[j]){ sw[j] = 1.01; return; }
      let best = .5, far = -1;
      for (let k = 0; k <= 20; k++){
        const r = {}; mvDraw(mvLerp(f, g, k / 20), def, [], null, r);
        if (r["d" + j] > far){ far = r["d" + j]; best = k / 20; }
      }
      sw[j] = best;
    });
    return sw;
  });
}
function mvSides(frames, plan, i, u){
  const f = frames[i], g = frames[(i + 1) % frames.length], o = {};
  MV_JOINTS.forEach(j => { o[j] = (u < plan[i][j] ? f._sg[j] : g._sg[j]) || f._sg[j] || g._sg[j] || 0; });
  return o;
}
function mvRender(a, now){
  const d = a.def, frames = a.frames, n = frames.length;
  const dur = d.dur || (d.hold ? 1600 : 1000), pause = d.ease === "linear" ? 0 : (d.hold ? 400 : 260);
  const t = now % (n * (dur + pause)), i = Math.floor(t / (dur + pause)), local = t - i * (dur + pause);
  const u0 = local < pause ? 0 : (local - pause) / dur;
  const u = d.ease === "linear" ? u0 : mvEase(u0);
  a.dyn.innerHTML = mvDraw(mvLerp(frames[i], frames[(i + 1) % n], u), d, a.hi, mvSides(frames, a.plan, i, u));
}
function mvTick(now){
  mvRaf = 0;
  mvLive.forEach(a => {
    if (!a.svg.isConnected){ mvLive.delete(a); if (mvObs) mvObs.unobserve(a.svg); return; }
    if (a.seen) mvRender(a, now);
  });
  if (mvLive.size) mvRaf = requestAnimationFrame(mvTick);
}
let mvObs = null;
/** Fills every [data-move] element under root with its exercise's animation. */
function mountMoves(root){
  $$("[data-move]", root || document).forEach(el => {
    if (el.dataset.mounted) return;
    const id = el.dataset.move, def = MOVES[id], ex = (typeof exById === "function") ? exById(id) : null;
    if (MV_EK[id]){ el.dataset.mounted = "1"; mvIllustration(el, id, ex ? ex.name : id); return; }
    if (!def){ el.remove(); return; }
    el.dataset.mounted = "1";
    el.innerHTML = '<svg viewBox="' + mvFrame(def) + '" role="img" aria-label="How to do ' + esc(def.name || (ex ? ex.name : id)) + '"><g>' + mvProps(def) + "</g><g></g></svg>";
    const svg = el.firstChild;
    const a = { svg, dyn: svg.lastChild, def, frames: def.f.map(mvExpand), hi: def.hi || (ex && MV_HI[ex.g]) || [], seen: true };
    a.plan = mvPlan(def, a.frames);
    /* Reduced motion: the finishing position, still. Otherwise the pose for
       this very moment, so a figure redrawn mid-move doesn't flash back. */
    if (mvStill()){ a.dyn.innerHTML = mvDraw(a.frames[1], def, a.hi, a.frames[1]._sg); return; }
    mvRender(a, performance.now());
    if ("IntersectionObserver" in window){
      if (!mvObs) mvObs = new IntersectionObserver((es) => es.forEach(e => {
        mvLive.forEach(x => { if (x.svg === e.target) x.seen = e.isIntersecting; });
      }));
      mvObs.observe(svg);
    }
    mvLive.add(a);
    if (!mvRaf) mvRaf = requestAnimationFrame(mvTick);
  });
}

/* ==========================================================================
   CARDIO — the same figure, with the kit each activity needs. Nothing glows:
   cardio works the heart and lungs rather than one muscle. Keyed
   "cardio-<id>" so a cardio id never collides with an exercise id (both have
   a "row"). Anything that moves with the body — pedals, a rope, a rowing
   handle, a racket — is drawn each frame by `under` / `over` from the solved
   joints; the scenery is static markup in MV_SCENES.
   ========================================================================== */
const MV_SCENES = {
  bike:
    '<g class="mv-spin" style="transform-origin:66px 103px"><circle class="mv-wheel" cx="66" cy="103" r="14.5"/><path class="mv-spoke" d="M66 89v28M52 103h28M56 93l20 20M76 93l-20 20"/></g>' +
    '<g class="mv-spin" style="transform-origin:136px 103px"><circle class="mv-wheel" cx="136" cy="103" r="14.5"/><path class="mv-spoke" d="M136 89v28M122 103h28M126 93l20 20M146 93l-20 20"/></g>' +
    '<path class="mv-frame" d="M66 103L100 103L90 73L66 103M90 73L126 69L100 103M126 69L136 103M126 69L128 61"/>' +
    '<path class="mv-frame" d="M83 71.5h13" stroke-width="3.2"/><path class="mv-frame" d="M124 61h9" stroke-width="2.4"/>',
  water:
    '<rect class="mv-water" x="0" y="88" width="200" height="40"/><path class="mv-wave" d="M0 88q8-3 16 0t16 0t16 0t16 0t16 0t16 0t16 0t16 0t16 0t16 0t16 0t16 0t16 0"/>',
  stairs:
    '<path class="mv-prop" d="M60 118V118H90V106H114V94H138V82H170V118Z"/>',
  hill:
    '<path class="mv-hill" d="M-20 128L-20 ' + (118 + 60 * .18) + 'L220 ' + (118 - 180 * .18) + 'L220 128Z"/>',
  ellip:
    '<rect class="mv-prop" x="72" y="111" width="80" height="6" rx="3"/><circle class="mv-wheel" cx="146" cy="99" r="11"/><circle class="mv-dbh" cx="146" cy="99" r="2.5"/>' +
    '<rect class="mv-prop" x="115" y="93" width="6" height="22" rx="2"/>',
  rower:
    '<rect class="mv-prop" x="58" y="107" width="96" height="4" rx="2"/><rect class="mv-prop" x="62" y="111" width="4" height="7"/><rect class="mv-prop" x="146" y="105" width="5" height="13"/>' +
    '<circle class="mv-wheel" cx="150" cy="97" r="9"/><circle class="mv-dbh" cx="150" cy="97" r="2.4"/>' +
    '<path class="mv-frame" d="M126 98l4 10" stroke-width="3"/>'
};
const mvSlope = (x) => 118 - (x - 40) * .18;
function mvCardioLine(a, b, cls, w){ return mvLine(a, b, cls, w); }

/* walking gait: contact, passing, contact, passing — the ground moves under it */
function mvGait(o){
  const y = o.y || ((x) => MV_F), lift = o.lift || 8, stride = o.stride || 14, hip = o.hip || 41, lean = o.lean || 2;
  const step = (front, back, swingNear) => {
    const fy = (x) => y(x);
    const fn = front === "n" ? [100 + stride, fy(100 + stride)] : back === "n" ? [100 - stride, fy(100 - stride)] :
      swingNear ? [102, fy(102) - lift] : [100, fy(100)];
    const ff = front === "f" ? [100 + stride, fy(100 + stride)] : back === "f" ? [100 - stride, fy(100 - stride)] :
      !swingNear ? [102, fy(102) - lift] : [100, fy(100)];
    const ground = Math.max(fn[1], ff[1]);
    const h = [100, ground - hip], sh = [100 + lean, ground - hip - 30];
    const sw = o.arm || 12, ay = o.armY || 30;
    const armF = [sh[0] + sw, sh[1] + ay], armB = [sh[0] - sw, sh[1] + ay];
    return { h, s: sh, fn, ff, hn: front === "n" ? armB : front === "f" ? armF : [sh[0] + 1, sh[1] + ay + 2],
      hf: front === "f" ? armB : front === "n" ? armF : [sh[0] + 1, sh[1] + ay + 2],
      kh: [1, 0], khF: [1, 0], eh: o.eh || [-0.2, 1], ehF: o.eh || [-0.2, 1] };
  };
  return [step("n", "f"), step(null, null, false), step("f", "n"), step(null, null, true)];
}

Object.assign(MOVES, {
  "cardio-walk": { name:"Walking", p:["road"], ease:"linear", dur:420, hi:[], f: mvGait({ stride:13, lift:7, hip:41, lean:1.5, arm:11 }) },
  "cardio-run":  { name:"Running", p:["road","road-fast"], ease:"linear", dur:250, hi:[],
    f: mvGait({ stride:17, lift:16, hip:40, lean:6, arm:12, armY:16, eh:[-1,1] }).map((q, i) => i % 2 ? Object.assign(q, { h:[q.h[0], q.h[1] - 3], s:[q.s[0], q.s[1] - 3] }) : q) },
  "cardio-hike": { name:"Hiking", p:["hill"], nofloor:1, ease:"linear", dur:520, hi:[],
    f: mvGait({ y: mvSlope, stride:13, lift:8, hip:40, lean:5, arm:10 }),
    over: (c) => mvLine(c.n.wrist, [c.n.wrist[0] + 7, mvSlope(c.n.wrist[0] + 7)], "mv-pole", 1.6) },

  "cardio-cycle": { name:"Cycling", p:["bike"], ease:"linear", dur:150, hi:[], box:[44, 22, 112, 102],
    f: [0, 45, 90, 135, 180, 225, 270, 315].map(a => {
      const r = a * Math.PI / 180, c = [100, 103], k = 8;
      return { h:[90,71], s:[112,50], hn:[127,64], eh:[0,1], kh:[1,-0.4], khF:[1,-0.4],
        fn:[c[0] + Math.cos(r) * k, c[1] + Math.sin(r) * k], ff:[c[0] - Math.cos(r) * k, c[1] - Math.sin(r) * k], toe:[6,0.5] };
    }),
    under: (c) => mvLine([100, 103], c.f.ankle, "mv-crank", 2.2),
    over: (c) => mvLine([100, 103], c.n.ankle, "mv-crank", 2.2) + '<circle class="mv-dbh" cx="100" cy="103" r="2.6"/>' },

  "cardio-swim": { name:"Swimming", p:["water"], nofloor:1, ease:"linear", dur:330, hi:[], box:[30, 46, 140, 80],
    f: (() => {
      const near = [[146,92],[122,121],[86,100],[110,60]], eh = [[0,-1],[-1,0],[0,1],[0,-1]];
      return near.map((hn, i) => ({ h:[84,91], s:[114,90], hn, hf: near[(i + 2) % 4], eh: eh[i], ehF: eh[(i + 2) % 4],
        fn:[44, i % 2 ? 95 : 87], ff:[44, i % 2 ? 87 : 95], kh:[0,1], khF:[0,1], toe:[-5,1] }));
    })() },

  "cardio-rope": { name:"Skipping rope", v:"front", ease:"linear", dur:230, hi:[], box:[42, 0, 116, 124],
    f: [[-24, 76], [60, 73], [140, 70], [60, 73]].map(([ry, hy]) => ({ h:[100,hy], s:[100,hy - 30], fn:[104, hy + 42 > MV_F ? MV_F : hy + 42], hn:[116,hy + 2], eh:[1,0.3], kh:[1,0], ry })),
    under: (c) => '<path class="mv-rope" d="M' + mvPt(c.n.wrist) + " Q100," + mvF1(c.p.ry) + " " + mvPt(c.f.wrist) + '"/>' },

  "cardio-stairs": { name:"Stair climbing", p:["stairs"], dur:520, hi:[], box:[50, 6, 140, 118],
    f: [
      { h:[108,66], s:[114,37], fn:[126,94], ff:[102,106], kh:[1,-0.3], hn:[104,70], hf:[120,66], eh:[-0.2,1] },
      { h:[108,66], s:[114,37], fn:[102,106], ff:[126,94], kh:[1,-0.3], hn:[120,66], hf:[104,70], eh:[-0.2,1] }] },

  "cardio-ellip": { name:"Cross trainer", p:["ellip"], ease:"linear", dur:210, hi:[], box:[50, 6, 120, 118],
    f: [0, 45, 90, 135, 180, 225, 270, 315].map(a => {
      const r = a * Math.PI / 180;
      return { h:[98,63], s:[101,33], kh:[1,0], khF:[1,0], eh:[0,1], toe:[6,0],
        fn:[100 + Math.cos(r) * 13, 100 + Math.sin(r) * 5], ff:[100 - Math.cos(r) * 13, 100 - Math.sin(r) * 5],
        hn:[120 - Math.cos(r) * 8, 60], hf:[120 + Math.cos(r) * 8, 60] };
    }),
    under: (c) => mvLine(c.f.wrist, [118, 98], "mv-crank", 2.4) + mvLine(c.f.ankle, [c.f.ankle[0] + 8, c.f.ankle[1] + 2], "mv-crank", 2.6),
    over: (c) => mvLine(c.n.wrist, [118, 98], "mv-crank", 2.4) + mvLine(c.n.ankle, [c.n.ankle[0] + 8, c.n.ankle[1] + 2], "mv-crank", 2.6) },

  "cardio-row": { name:"Rowing machine", p:["rower"], dur:850, hi:[], box:[42, 30, 124, 92],
    f: [
      { h:[100,103], s:[118,79], fn:[124,105], kh:[0.3,-1], hn:[140,93], eh:[0,1], toe:[3,-5] },
      { h:[83,103],  s:[72,76],  fn:[124,105], kh:[0.3,-1], hn:[90,86],  eh:[-1,0], toe:[3,-5] }],
    under: (c) => '<rect class="mv-frame" x="' + mvF1(c.p.h[0] - 7) + '" y="104" width="14" height="3" rx="1.5"/>',
    over: (c) => mvLine(c.n.wrist, [148, 96], "mv-chain", 1.2) + mvLine([c.n.wrist[0] - 1, c.n.wrist[1] - 3], [c.n.wrist[0] - 1, c.n.wrist[1] + 3], "mv-crank", 2) },

  "cardio-dance": { name:"Dancing", v:"front", dur:420, hi:[],
    f: [
      { h:[96,76], s:[97,46], fn:[114,MV_F], ff:[112,MV_F], hn:[122,18], hf:[120,66], eh:[1,0], kh:[1,0] },
      { h:[100,73], s:[100,43], fn:[110,MV_F], ff:[110,MV_F], hn:[136,40], hf:[136,40], eh:[1,0], kh:[1,0] },
      { h:[104,76], s:[103,46], fn:[112,MV_F], ff:[114,MV_F], hn:[120,66], hf:[122,18], eh:[1,0], kh:[1,0] },
      { h:[100,73], s:[100,43], fn:[110,MV_F], ff:[110,MV_F], hn:[136,40], hf:[136,40], eh:[1,0], kh:[1,0] }] },

  "cardio-yoga": { name:"Yoga", p:["mat"], dur:1500, hold:1, hi:[],
    f: [
      mvP({ hn:[101,13], eh:[0,-1] }),
      { h:[97,76], s:[106,104], fn:[100,MV_F], hn:[110,MV_F], eh:[1,0] },
      { h:[118,82], s:[140,100], fn:[100,MV_F], hn:[168,MV_F], eh:[-1,-1] },
      { h:[97,76], s:[106,104], fn:[100,MV_F], hn:[110,MV_F], eh:[1,0] }] },

  "cardio-sport": { name:"Badminton", dur:520, hi:[],
    f: [
      { h:[100,77], s:[96,47], fn:[116,MV_F], ff:[84,MV_F], kh:[1,0], khF:[1,0], hn:[88,30], eh:[-1,-1], hf:[122,24], ehF:[0,1] },
      { h:[102,78], s:[108,49], fn:[116,MV_F], ff:[84,MV_F], kh:[1,0], khF:[1,0], hn:[132,70], eh:[0,1], hf:[96,80], ehF:[0,1] }],
    over: (c) => {
      const d = mvUnit(c.n.elbow, c.n.wrist), tip = mvAdd(c.n.wrist, mvMul(d, 13)), head = mvAdd(c.n.wrist, mvMul(d, 19));
      const ang = Math.atan2(d[1], d[0]) * 180 / Math.PI;
      return mvLine(c.n.wrist, tip, "mv-crank", 1.4) + '<ellipse class="mv-racket" cx="' + mvF1(head[0]) + '" cy="' + mvF1(head[1]) + '" rx="6.5" ry="4.6" transform="rotate(' + mvF1(ang) + " " + mvF1(head[0]) + " " + mvF1(head[1]) + ')"/>';
    } }
});
