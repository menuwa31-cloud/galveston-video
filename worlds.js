import * as THREE from 'three';
import { INK, rng, toon, solid, tex, rep, box, cyl, sign, ground, post, facade, house, lamp, barrel, crate, crib, jack, water, planks, sky, paintTex } from './kit.js';
import { makeChar } from './char3.js';
import timing from '../sentence_times.json';

/* ---------------- shot timing (from real sentence ends) ---------------- */
const E = timing.sentences.map((s) => s.end);
export const CUTS = [E[0], E[1], E[2], E[3], E[4], E[5], E[7], E[8], E[9]]; // shot 7 holds two sentences (E[6], E[7])
const T0 = [0, ...CUTS.map((c) => c + 0.05)];
const T1 = [...CUTS, E[10]];
const SPACING = 150;

export function warpU(T, t) {
  const n = T.length; if (t <= T[0]) return 0; if (t >= T[n - 1]) return 1;
  const sec = []; for (let i = 0; i < n - 1; i++) sec.push((1 / (n - 1)) / (T[i + 1] - T[i]));
  const m = [0]; for (let i = 1; i < n - 1; i++) m.push(2 * sec[i - 1] * sec[i] / (sec[i - 1] + sec[i])); m.push(0);
  let i = 0; while (t > T[i + 1]) i++;
  const h = T[i + 1] - T[i], x = (t - T[i]) / h, x2 = x * x, x3 = x2 * x;
  return (2 * x3 - 3 * x2 + 1) * (i / (n - 1)) + (x3 - 2 * x2 + x) * h * m[i] + (-2 * x3 + 3 * x2) * ((i + 1) / (n - 1)) + (x3 - x2) * h * m[i + 1];
}
const sm = (t, a, b) => { const x = Math.max(0, Math.min(1, (t - a) / (b - a))); return x * x * (3 - 2 * x); };

/* ---------------- camera plan: keys carry a beat (fraction of the shot) tied to the words ---------------- */
export const SHOTS = [
  { // 1 flooded street, push toward the painted sign
    keys: [{ at: 0, p: [0, 4.2, 17], l: [0, 6.5, -9] }, { at: 0.42, p: [0.5, 4.6, 11.5], l: [0, 6.6, -9] }, { at: 1, p: [0, 4.9, 5], l: [0, 6.4, -9] }],
    sky: ['#4b5a60', '#8a9a96', '#6f7e80', 11, true], fog: ['#8a9a96', 20, 95], key: ['#dfe6d8', 1.5], hemi: ['#a8b8b6', '#4a4036', 1.15] },
  { // 2 engineers' room, push to the table
    keys: [{ at: 0, p: [3.6, 7, 12.5], l: [0, 3, -3] }, { at: 0.55, p: [1.2, 5.6, 7], l: [0, 2.8, -3.2] }, { at: 1, p: [0, 4.1, 2.1], l: [0, 2.8, -3.4] }],
    sky: ['#e9dcbc', '#d9c9a8', '#efe3c7', 12], fog: ['#d9c9a8', 30, 130], key: ['#ffe3b0', 1.9], hemi: ['#f0e4c8', '#6a5238', 1.25] },
  { // 3 seawall, sideways track with a slow crane
    keys: [{ at: 0, p: [-10, 4, 16], l: [-6, 4.5, -4] }, { at: 0.5, p: [-3, 5.2, 15], l: [0, 4.6, -4] }, { at: 1, p: [5, 6.6, 13.5], l: [3, 4.6, -4] }],
    sky: ['#9fc7de', '#e6e2cf', '#ffffff', 13], fog: ['#e6e2cf', 30, 120], key: ['#fff0cc', 2.1], hemi: ['#cfe3ee', '#8a7a5c', 1.2] },
  { // 4 low town, crane up over the flooded street
    keys: [{ at: 0, p: [-4, 2.6, 10], l: [0, 3.4, -4] }, { at: 0.5, p: [-1, 4.6, 8.5], l: [0, 4.6, -8] }, { at: 1, p: [2.5, 6.6, 7], l: [0, 5.6, -12] }],
    sky: ['#aab9bc', '#d4d6c8', '#e4e8e0', 14], fog: ['#d4d6c8', 28, 120], key: ['#f3ecd0', 1.5], hemi: ['#c5d2d4', '#6b5a44', 1.2] },
  { // 5 banner, street rises behind it
    keys: [{ at: 0, p: [0, 3.2, 20], l: [0, 6.5, 0] }, { at: 0.5, p: [0, 5.4, 16.5], l: [0, 6.8, -2] }, { at: 1, p: [0, 6.8, 15.8], l: [0, 6.6, -6] }],
    sky: ['#e9b78a', '#f6dfb8', '#fff1d8', 15], fog: ['#f6dfb8', 30, 130], key: ['#ffd49a', 2.2], hemi: ['#f5e2c4', '#7a5c3c', 1.2] },
  { // 6 stilts and boardwalks, track right
    keys: [{ at: 0, p: [-13, 2, 11], l: [-8, 5, -4] }, { at: 0.5, p: [-4, 3.2, 10.5], l: [0, 5.2, -4] }, { at: 1, p: [6, 4.8, 9.5], l: [10, 5, -4] }],
    sky: ['#8fc3e0', '#f1e3bd', '#ffffff', 16], fog: ['#f1e3bd', 30, 130], key: ['#fff0cc', 2.1], hemi: ['#d2e6f0', '#8a7a5c', 1.2] },
  { // 7 church on jackscrews: wide, then down to the workers
    keys: [{ at: 0, p: [-12, 5, 23], l: [0, 7, 0] }, { at: 0.42, p: [-8, 4.5, 18], l: [0, 5, 2] }, { at: 1, p: [-2.6, 3.6, 14.5], l: [0.2, 2.5, 8] }],
    sky: ['#86b9dc', '#efe6c8', '#ffffff', 17], fog: ['#efe6c8', 36, 140], key: ['#fff0cc', 2.2], hemi: ['#d0e4f0', '#8a7a5c', 1.2] },
  { // 8 dredge, canal, pipe, outlet: track right
    keys: [{ at: 0, p: [-18, 5.2, 15], l: [-9, 2.2, -2] }, { at: 0.45, p: [-3, 4.6, 13], l: [0, 3, 0] }, { at: 1, p: [7, 4.2, 12.5], l: [4, 2.8, 3] }],
    sky: ['#a8cfe0', '#ece3c6', '#ffffff', 18], fog: ['#ece3c6', 36, 140], key: ['#fff0cc', 2.1], hemi: ['#d6e8f0', '#8a7a5c', 1.2] },
  { // 9 the town has risen: crane up
    keys: [{ at: 0, p: [0, 3.2, 17], l: [0, 5, 0] }, { at: 0.5, p: [0, 7, 17], l: [0, 4.2, -1] }, { at: 1, p: [0, 11.5, 15.5], l: [0, 3.2, -2] }],
    sky: ['#79b8e6', '#f4ecd0', '#ffffff', 19], fog: ['#f4ecd0', 36, 140], key: ['#fff2d2', 2.3], hemi: ['#d8ecf6', '#8a7a5c', 1.25] },
  { // 10 storm hits, the town stands: push to the people, then hold
    keys: [{ at: 0, p: [0, 5.2, 18], l: [0, 6, -10] }, { at: 0.55, p: [0, 4.4, 12.5], l: [0, 5.2, -4] }, { at: 1, p: [0, 3.8, 9], l: [0, 5.2, 0.5] }],
    sky: ['#3a4650', '#76858a', '#566872', 20, true], fog: ['#76858a', 24, 110], key: ['#d6dcdc', 1.5], hemi: ['#8c9ca0', '#4a4036', 1.15] },
].map((s, i) => ({ ...s, t0: T0[i], t1: i === 9 ? E[10] : T1[i], i }));

export function shotIndex(t) {
  for (let i = 0; i < 9; i++) if (t < T1[i] + 0.025) return i;
  return 9;
}

/* ---------------- shared scene pieces ---------------- */
function seawall(len, hgt, col = '#bdb8aa') {
  const s = new THREE.Shape();
  s.moveTo(-3, 0); s.lineTo(3.8, 0);
  s.bezierCurveTo(0.5, 1.0, -0.2, 4.2, -0.5, hgt - 0.4);
  s.lineTo(-0.9, hgt + 0.1); s.lineTo(-3, hgt + 0.1); s.lineTo(-3, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false, curveSegments: 20 });
  g.translate(0, 0, -len / 2); g.rotateY(-Math.PI / 2);
  return solid(g, toon(rep(tex.conc(col, 3), 1 / 4, 1 / 4)), 0.06, true);
}
function liftHouse(o) {
  const root = new THREE.Group(), y0 = o.y0 ?? 1.6, w = o.w || 8, d = o.d || 7;
  const hs = house(o); hs.position.y = y0; root.add(hs);
  [[-w / 2 + 0.5, -d / 2 + 0.5], [w / 2 - 0.5, -d / 2 + 0.5], [-w / 2 + 0.5, d / 2 - 0.5], [w / 2 - 0.5, d / 2 - 0.5]].forEach(([x, z]) => root.add(box(1, y0, 1, tex.brick('#8e5a3e', 2), { x, y: y0 / 2, z })));
  const beams = new THREE.Group();
  [-d / 3, d / 3].forEach((z) => beams.add(box(w + 2.6, 0.5, 0.5, tex.plank('#8a5f35', 5), { y: y0 - 0.3, z })));
  root.add(beams);
  const jacks = [];
  [-d / 3, d / 3].forEach((z) => [-w / 2 - 0.7, w / 2 + 0.7].forEach((x) => { const j = jack(2.4); j.position.set(x, 0, z); root.add(j); jacks.push(j); }));
  root.userData.set = (h, spin = 0) => { hs.position.y = y0 + h; beams.position.y = h; jacks.forEach((j) => j.userData.set(h, spin)); };
  root.userData.set(0, 0);
  return root;
}
function rain(L, anims, x0, x1, z0, z1, n = 260) {
  const R = rng(77), g = new THREE.BufferGeometry(), a = new Float32Array(n * 6), base = [];
  for (let i = 0; i < n; i++) base.push([x0 + R() * (x1 - x0), R() * 26, z0 + R() * (z1 - z0), 8 + R() * 8]);
  g.setAttribute('position', new THREE.BufferAttribute(a, 3));
  const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#dfe8e8', transparent: true, opacity: 0.5 }));
  l.frustumCulled = false; L.add(l);
  anims.push((t) => {
    for (let i = 0; i < n; i++) {
      const b = base[i], y = 26 - ((b[1] + t * b[3] * 2.2) % 26);
      a.set([b[0], y, b[2], b[0] - 0.2, y + 1.4, b[2]], i * 6);
    }
    g.attributes.position.needsUpdate = true;
  });
}

/* ---------------- the ten locations ---------------- */
function build(i, L, anims, ch) {
  const add = (o) => { L.add(o); return o; };
  const t0 = T0[i], t1 = i === 9 ? E[10] : T1[i], dur = t1 - t0;
  const K = (a, b) => sm(0, 0, 1) + 0 * a + 0 * b; // (unused placeholder)
  const char = (o, x, y, z) => { const c = makeChar(o); c.position.set(x, y, z); L.add(c); anims.push((t, cam) => c.userData.update(t, cam)); return c; };

  if (i === 0) {
    add(ground(75, tex.mud('#7a6a54', 1), 0));
    const w = add(water(150, 150, '#5f8a86')); w.position.y = 1.7; anims.push((t) => w.userData.update(t, 0.14, 1.2));
    [-1, 1].forEach((s) => [2, -11, -24, -37].forEach((z, k) => { const h = house({ seed: k + 1 + (s > 0 ? 4 : 0), wall: ['#d4c3a0', '#c9b79a', '#b9c4b0', '#d9c0a0'][k], roof: '#6c4a3f', awning: k % 2 === 0 }); h.position.set(s * 10, 0, z); h.rotation.y = -s * Math.PI / 2; add(h); }));
    [-4, 4].forEach((x) => add(post(10, x, -9)));
    add(sign('GALVESTON', 9.4, 2.6, { y: 8.7, z: -8.7, size: 0.52 }));
    add(sign('TEXAS · 1900', 5.4, 1.15, { y: 6.5, z: -8.7, size: 0.5 }));
    [[-2.4, -6.3], [2.5, -4.6]].forEach(([x, z], k) => char({ seed: 3 + k, hat: k ? 'cap' : 'bowler', coatTop: k ? '#6b7a5a' : '#6b4a4a', coatBot: k ? '#4a5840' : '#4d3434', hatCol: '#3a2f2c' }, x, 0.8, z));
    [[3.2, -1.5, 0.3], [-3.6, -7.5, -0.4], [1, -12, 0.8]].forEach(([x, z, r]) => { const p = box(3.2, 0.16, 0.6, tex.plank('#a88358', 5), { x, y: 1.75, z, ry: r }); add(p); anims.push((t) => { p.position.y = 1.75 + Math.sin(t * 1.4 + x) * 0.1; }); });
    [[3.6, 2.5], [-4.2, -3]].forEach(([x, z]) => { const b = barrel(); b.position.set(x, 1.1, z); add(b); });
    const lp = lamp(7); lp.position.set(-4.6, 1.5, 3.5); lp.rotation.z = 0.06; add(lp);
    rain(L, anims, -16, 16, -26, 18);
  }

  if (i === 1) {
    const flo = box(44, 0.4, 28, rep(tex.plank('#9b774c', 2), 11, 7), { y: -0.2 }); add(flo);
    const wall = facade(40, 18, { windows: [[0, 9.5, 8, 7]], mat: rep(tex.plaster('#d8c7a5', 2), 1 / 4, 1 / 4), depth: 0.6 }); wall.position.set(0, 0, -10.2); add(wall);
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(14, 12), new THREE.MeshBasicMaterial({ color: '#fbf3da' })); gl.position.set(0, 9.5, -10.0); add(gl);
    [-20, 20].forEach((x) => add(box(0.6, 18, 28, rep(tex.plaster('#d0bf9d', 3), 6, 4), { x, y: 9, z: 4 })));
    add(sign('SEAWALL\n17 FT', 4.2, 3.2, { x: -12, y: 10, z: -9.5, bg: '#d3dde8', size: 0.34 }));
    add(sign('RAISE THE\nCITY', 4.2, 3.2, { x: 12, y: 10, z: -9.5, bg: '#d3dde8', size: 0.34 }));
    const dk = new THREE.Group();
    dk.add(box(5.6, 0.3, 2.6, tex.plank('#6d4a2c', 3), { y: 1.5 }));
    [[-2.6, -1.1], [2.6, -1.1], [-2.6, 1.1], [2.6, 1.1]].forEach(([x, z]) => dk.add(box(0.3, 1.5, 0.3, '#5a3b22', { x, y: 0.75, z })));
    dk.add(box(5.5, 1.0, 0.2, '#5a3b22', { y: 1.0, z: 1.25 }));
    const mapT = paintTex('map', 640, 340, (x, w, h) => {
      x.fillStyle = '#eadfbf'; x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(70,90,120,.35)'; x.lineWidth = 1;
      for (let a = 0; a < w; a += 40) { x.beginPath(); x.moveTo(a, 0); x.lineTo(a, h); x.stroke(); } for (let a = 0; a < h; a += 40) { x.beginPath(); x.moveTo(0, a); x.lineTo(w, a); x.stroke(); }
      x.fillStyle = '#c9b78e'; x.strokeStyle = '#351f22'; x.lineWidth = 5; x.beginPath(); x.moveTo(60, 230); x.bezierCurveTo(150, 170, 400, 200, 590, 150); x.lineTo(590, 190); x.bezierCurveTo(400, 250, 150, 270, 60, 260); x.closePath(); x.fill(); x.stroke();
      x.fillStyle = '#351f22'; x.font = 'bold 40px Georgia, serif'; x.textAlign = 'center'; x.fillText('GALVESTON ISLAND', w / 2, 70);
      x.font = 'bold 26px Georgia, serif'; x.fillText('SEAWALL PLAN', w / 2, 112);
    });
    const mp = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.4), new THREE.MeshBasicMaterial({ map: mapT })); mp.rotation.x = -Math.PI / 2 + 0.05; mp.position.set(0, 1.68, 0); dk.add(mp);
    dk.add(sign('BOARD OF ENGINEERS', 4.4, 0.7, { y: 1.05, z: 1.4, d: 0.1, size: 0.4 }));
    dk.add(cyl(0.18, 0.2, 0.4, '#27303a', { x: 2.2, y: 1.85 })); dk.add(cyl(0.3, 0.3, 0.5, '#d9b24c', { x: -2.1, y: 1.95, z: -0.6 }));
    dk.position.set(0, 0, -1.8); add(dk);
    [[-1.45, -3.4, 0, 'top'], [0, -3.85, 1, 'bowler'], [1.45, -3.4, 2, null]].forEach(([x, z, k, hat]) => char({ seed: 20 + k, hat, glasses: k === 1, coatTop: ['#4d6a8a', '#6a5a7a', '#4f7a66'][k], coatBot: ['#34495f', '#4a3f58', '#385a4a'][k], hatCol: '#2c2530', tie: ['#b03a3a', '#d9b24c', '#b03a3a'][k], hair: k === 2 ? '#8a7a6a' : '#4a3328' }, x, 0, z));
    [-1, 0, 1].forEach((k) => add(cyl(0.22, 0.22, 2.6, '#e6d7b3', { x: -5.4 + k * 0.5, y: 0.25, z: 4 + k * 0.4, rz: Math.PI / 2, seg: 12 })));
    const sc = lamp(5); sc.position.set(7, 0, -6); add(sc);
  }

  if (i === 2) {
    add(ground(80, tex.sand('#d9c79a', 2), 0));
    const wl = seawall(22, 8.5); wl.position.set(-11, 0, -4); add(wl);
    const wr = seawall(22, 8.5); wr.scale.y = 0.5; wr.position.set(11, 0, -4); add(wr);
    for (let k = 0; k < 14; k++) add(cyl(0.06, 0.06, 3, '#6a5040', { x: 1 + k * 1.5, y: 4.9, z: -5.2 }));
    for (let k = 0; k < 6; k++) add(box(0.4, 4, 4, tex.plank('#a88358', 6), { x: 2 + k * 3.4, y: 2, z: 1.6 }));
    for (let k = 0; k < 5; k++) { const R = rng(k + 3); const s = 1.1 + R() * 0.8; add(box(s * 1.4, s, s, rep(tex.conc('#8d8a86', k + 7), 1, 1), { x: -16 + k * 10 + R() * 3, y: s / 2, z: 5.3 + R() * 2.2, ry: R() })); }
    [-0.5, 0.5].forEach((s) => add(box(46, 0.3, 0.4, '#4a4040', { y: 0.18, z: -8 + s * 1.6 })));
    const cart = new THREE.Group(); cart.add(box(2.8, 0.8, 2, '#5a6068', { y: 0.7 })); cart.add(cyl(1.1, 0.7, 1.4, '#7a6a58', { y: 1.8 })); cart.position.set(-14, 0, -8); add(cart);
    anims.push((t) => { cart.position.x = -14 + 12 * sm(t, t0, t1); });
    const cr = new THREE.Group(); [-1.6, 1.6].forEach((x) => cr.add(box(0.5, 10, 0.5, '#8a5f35', { x, y: 5, rz: x > 0 ? -0.12 : 0.12 }))); cr.add(box(5, 0.5, 0.5, '#8a5f35', { y: 9.8 })); const bk = cyl(0.8, 0.5, 1.2, '#6a6058', { y: 6.2 }); cr.add(bk); cr.position.set(9, 0, -8.5); add(cr);
    anims.push((t) => { bk.position.y = 6.4 + Math.sin(t * 0.9) * 0.15; });
    const st = new THREE.Group(); st.add(box(0.3, 8.5, 0.18, '#e9d9b4', { y: 4.25 }));
    for (let k = 1; k <= 8; k++) st.add(box(k % 2 ? 0.9 : 0.6, 0.1, 0.12, INK, { x: 0.3, y: k, z: 0.1, thick: 0.01, edges: false }));
    st.add(sign('17 FT', 2.6, 1.0, { y: 9.3, z: 0.1, size: 0.52, d: 0.1 })); st.position.set(-5.5, 0, 7.4); add(st);
    [[-2.6, 9.2], [1, 9.8]].forEach(([x, z], k) => char({ seed: 30 + k, hat: 'cap', coatTop: k ? '#7a6a4a' : '#4d6a8a', coatBot: '#3a4a5a', hatCol: '#4a4036' }, x, 0, z));
  }

  if (i === 3) {
    add(ground(80, tex.mud('#7a6a54', 4), 0));
    const wl = seawall(90, 8.5); wl.rotation.y = Math.PI; wl.position.set(0, 0, -20); add(wl);
    const w = add(water(110, 40, '#6f8f8c')); w.position.set(0, 0.35, -2); anims.push((t) => { w.userData.update(t, 0.08, 0.8); w.position.y = 0.3 + 1.8 * sm(t, t0, t1 - 0.4); });
    [[-11, -5], [0, -6], [11, -5], [-6, -13], [6, -13]].forEach(([x, z], k) => { const h = house({ floors: 1, h: 4.6, roofH: 2.2, seed: 9 + k, wall: ['#d4c3a0', '#b9c4b0', '#d9c0a0', '#c9b79a', '#d4c3a0'][k], roof: '#6c4a3f' }); h.position.set(x, 0, z); add(h); add(box(8.3, 0.45, 0.15, '#4f6f84', { x, y: 3.2, z: z + 3.55, thick: 0.02 })); });
    [[-1.9, 0.9], [1.5, 2.0]].forEach(([x, z], k) => char({ seed: 40 + k, hat: k ? null : 'bowler', glasses: !!k, coatTop: k ? '#6a5a7a' : '#4d6a8a', coatBot: k ? '#4a3f58' : '#34495f', hatCol: '#3a2f2c', pose: k ? (t, a, b) => { a.rotation.z = -0.1; b.rotation.z = 2.6 + 0.06 * Math.sin(t * 2); } : null }, x, 0.9, z));
    const lp = lamp(6.5); lp.position.set(-6.5, 1.0, 3.5); add(lp);
    add(barrel()).position.set(5, 1.0, 3);
  }

  if (i === 4) {
    add(ground(80, tex.mud('#7a6a54', 5), 0));
    const sand = box(44, 0.3, 30, rep(tex.sand('#dcc28a', 3), 8, 6), { y: -0.2, z: -9 }); add(sand);
    const hs = [-10.5, 0, 10.5].map((x, k) => { const h = liftHouse({ seed: 5 + k, wall: ['#d4c3a0', '#b9c4b0', '#d9c0a0'][k], roof: '#6c4a3f', awning: !k }); h.position.set(x, 0, -9); add(h); return h; });
    anims.push((t) => { const r = sm(t, t0 + 0.8, t1 - 0.3); sand.position.y = -0.2 + 3.6 * r; hs.forEach((h, k) => h.userData.set(3.6 * r, t * 2 + k)); });
    [-4.8, 4.8].forEach((x) => add(post(9.6, x, 1.8)));
    add(sign('RAISE THE GRADE\nUP TO 17 FT', 8.6, 3.3, { y: 7.6, z: 2, size: 0.36 }));
    [[-6.4, 4.6, 'top'], [6.2, 4.8, 'bowler']].forEach(([x, z, hat], k) => char({ seed: 50 + k, hat, coatTop: k ? '#7a4a4a' : '#4d6a8a', coatBot: k ? '#583636' : '#34495f', hatCol: '#2c2530' }, x, 0, z));
    add(crate(1.6, 'SAND')).position.set(3.4, 0, 8);
    add(barrel()).position.set(-3.5, 0, 9);
  }

  if (i === 5) {
    add(ground(90, tex.mud('#7a6a54', 6), 0));
    const R = rng(8);
    [-15, -5, 5, 15].forEach((x, k) => {
      const h = house({ seed: 15 + k, wall: ['#d4c3a0', '#b9c4b0', '#d9c0a0', '#c9b79a'][k], roof: '#6c4a3f', awning: k % 2 === 1 }); h.position.set(x, 3.8, -8); add(h);
      [[-3.2, -2.8], [3.2, -2.8], [-3.2, 2.8], [3.2, 2.8], [0, -2.8], [0, 2.8]].forEach(([dx, dz]) => add(cyl(0.34, 0.4, 3.8, tex.plank('#7a5a3c', 3), { x: x + dx, y: 1.9, z: -8 + dz, seg: 10 })));
      [-2.8, 2.8].forEach((dz) => add(box(7, 0.25, 0.25, '#7a5a3c', { x, y: 1.9, z: -8 + dz, rz: 0.5 })));
    });
    add(planks(48, 2.6)).position.set(0, 4.0, -1.5);
    for (let x = -22; x <= 22; x += 4.4) { add(post(4, x, -0.3, '#7a5a3c', 0.22)); add(post(4, x, -2.7, '#7a5a3c', 0.22)); }
    for (let x = -22; x <= 22; x += 2.2) add(box(0.14, 1.3, 0.14, '#7a5a3c', { x, y: 4.8, z: -0.3, thick: 0.02 }));
    add(box(48, 0.14, 0.14, '#7a5a3c', { y: 5.45, z: -0.3, thick: 0.02 }));
    const walkers = [[-14, 0.7, 'top', '#4d6a8a'], [-4, 0.55, 'bowler', '#7a4a4a'], [8, 0.65, null, '#4f7a66']].map(([x, sp, hat, col], k) => { const c = char({ seed: 60 + k, hat, glasses: k === 2, coatTop: col, coatBot: '#34393f', hatCol: '#2c2530', yaw: 0 }, x, 4.15, -1.5); anims.push((t) => { c.position.x = x + sp * (t - t0) * 0.9; }); return c; });
    char({ seed: 66, hat: 'cap', coatTop: '#7a6a4a', coatBot: '#4a4036', hatCol: '#4a4036' }, -1, 0, 4.5);
    [-23, 23].forEach((x) => { const lp = lamp(3.2); lp.position.set(x, 4.1, -2.5); add(lp); });
    add(barrel()).position.set(-6, 0, 6); add(crate(1.5)).position.set(7, 0, 5.5);
  }

  if (i === 6) {
    add(ground(90, tex.mud('#7a6a54', 7), 0));
    const C = new THREE.Group(); const nv = rep(tex.plaster('#e3d6ba', 6), 1 / 4, 1 / 4);
    const body = new THREE.Group();
    body.add(box(10, 9, 14, [toon(rep(tex.plaster('#e3d6ba', 6), 3, 2)), toon(rep(tex.plaster('#e3d6ba', 6), 3, 2)), toon('#6b5646'), toon('#6b5646'), toon('#2c1b17'), toon('#e3d6ba')], { y: 4.5 }));
    const f = facade(10, 9, { windows: [[-3.2, 5.2, 1.4, 3.2], [3.2, 5.2, 1.4, 3.2]], round: [[0, 7.2, 1.1]], door: [0, 2.6, 5], mat: nv, depth: 0.5 }); f.position.z = 7; body.add(f);
    const rs = new THREE.Shape(); rs.moveTo(-7.4, 0); rs.lineTo(7.4, 0); rs.lineTo(0, 3.6); rs.lineTo(-7.4, 0);
    const rg = new THREE.ExtrudeGeometry(rs, { depth: 11, bevelEnabled: false }); rg.translate(0, 0, -5.5);
    const rf = solid(rg, toon(rep(tex.shingle('#5b4a52', 2), 3, 1.5)), 0.06, true); rf.rotation.y = Math.PI / 2; rf.position.y = 9.1; body.add(rf);
    const tw = new THREE.Group(); tw.add(box(5, 17, 5, rep(tex.plaster('#e3d6ba', 6), 1.2, 3), { y: 8.5, thick: 0.06 }));
    tw.add(box(1.4, 3.2, 0.3, '#2c1b17', { y: 14, z: 2.55 }));
    const sp = solid(new THREE.ConeGeometry(3.7, 7, 4), toon(rep(tex.shingle('#5b4a52', 3), 2, 2)), 0.06, true); sp.rotation.y = Math.PI / 4; sp.position.y = 20.5; tw.add(sp);
    tw.add(box(0.25, 2, 0.25, '#d9b24c', { y: 25.2 })); tw.add(box(1.1, 0.25, 0.25, '#d9b24c', { y: 25.6 }));
    tw.position.set(0, 0, 6.5); body.add(tw);
    C.add(body); body.position.y = 2.4;
    const piers = [[-4.5, -5.5], [4.5, -5.5], [-4.5, 5.5], [4.5, 5.5], [-4.5, 0], [4.5, 0]]; piers.forEach(([x, z]) => C.add(box(1.6, 2.4, 1.6, tex.brick('#8e5a3e', 3), { x, y: 1.2, z })));
    const beams = new THREE.Group(); [-3.5, 0, 3.5].forEach((x) => beams.add(box(0.7, 0.6, 18, tex.plank('#8a5f35', 7), { x, y: 2.1 }))); C.add(beams);
    const jacks = []; [-5.4, -1.8, 1.8, 5.4].forEach((x) => [-8, -4, 0, 4, 8].forEach((z, k) => { if (x > 0 && z === 8) return; const j = jack(2.4); j.position.set(x, 0, z); C.add(j); jacks.push(j); }));
    [-6.2, 6.2].forEach((x) => [-7, -3, 1, 5, 8].forEach((z) => { const j = jack(2.4); j.position.set(x, 0, z); C.add(j); jacks.push(j); }));
    add(C);
    anims.push((t) => { const h = 0.0 + 2.2 * sm(t, t0 + 0.4, t1 - 0.2); body.position.y = 2.4 + h; beams.position.y = h; jacks.forEach((j, k) => j.userData.set(h, t * 3 + k)); });
    [[-1.4, 3, 9.6], [1.7, 3, 10], [-4.6, 3, 9], [4.9, 3, 9.4]].forEach(([x, , z], k) => char({ seed: 70 + k, hat: 'cap', coatTop: ['#7a6a4a', '#4d6a8a', '#7a4a4a', '#4f7a66'][k], coatBot: '#3a3a40', hatCol: '#4a4036', pose: (t, a, b) => { a.rotation.z = 0.6 + 0.7 * Math.sin(t * 3 + k); b.rotation.z = -0.6 - 0.7 * Math.sin(t * 3 + k + 1); } }, x, 0, z));
    [-9.2, 9.2].forEach((x) => add(post(8, x, 13.5)));
    add(sign('ST. PATRICK', 8.2, 1.7, { y: 7.9, z: 13.5, size: 0.5 }));
    add(crib(2.4, 4)).position.set(-9, 0, 4); add(crate(1.5)).position.set(8.6, 0, 12); add(barrel()).position.set(-8, 0, 12);
  }

  if (i === 7) {
    add(ground(90, tex.sand('#cdb88a', 8), 0));
    const cw = water(80, 7, '#5b7f86', 30); cw.position.set(0, 0.04, -2); add(cw); anims.push((t) => cw.userData.update(t, 0.07, 1));
    [-5.2, 1.2].forEach((z) => add(box(80, 0.6, 0.6, tex.plank('#7a5a3c', 3), { y: 0.3, z })));
    const dg = new THREE.Group(); dg.add(box(8, 1.8, 4, tex.plank('#5b6b74', 2), { y: 0.3 })); dg.add(box(3.8, 3, 3.4, tex.plank('#7a8a94', 4), { x: -1.4, y: 2.7 }));
    dg.add(box(0.1, 1.1, 1.8, '#26303a', { x: 0.5, y: 2.9, z: 0.0 })); dg.add(cyl(0.45, 0.5, 3.6, '#3a3030', { x: 2.2, y: 3.6 }));
    dg.add(box(7, 0.5, 0.5, '#5a4a3c', { x: 6, y: 1.2, rz: -0.35 }));
    dg.position.set(-10, 0.2, -2); add(dg); anims.push((t) => { dg.position.y = 0.2 + Math.sin(t * 1.3) * 0.1; });
    const puffs = []; for (let k = 0; k < 6; k++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 8), new THREE.MeshBasicMaterial({ color: '#d8d8d4', transparent: true, opacity: 0.8 })); L.add(m); puffs.push(m); }
    anims.push((t) => puffs.forEach((m, k) => { const p = ((t * 0.5 + k / 6) % 1); m.position.set(-7.8 + p * 3, 6.4 + p * 5, -2); m.scale.setScalar(0.6 + p * 1.6); m.material.opacity = 0.8 * (1 - p); }));
    const pipeM = tex.plank('#6a7078', 9);
    add(cyl(0.65, 0.65, 14, pipeM, { x: -0.5, y: 1.2, z: -2, rz: Math.PI / 2, seg: 14 }));
    add(cyl(0.65, 0.65, 9, pipeM, { x: 6.5, y: 1.2, z: 2.5, rx: Math.PI / 2, seg: 14 }));
    add(cyl(0.65, 0.65, 2.4, pipeM, { x: 6.5, y: 2.2, z: 7 }));
    [-5, 1, 6.5].forEach((x) => add(cyl(0.8, 0.8, 0.7, '#3d3030', { x, y: 0.5, z: -2, seg: 10 })));
    const mound = solid(new THREE.ConeGeometry(4.6, 3.4, 18), toon(rep(tex.sand('#e0c78c', 4), 2, 2)), 0.05, false); mound.position.set(6.5, 0, 9.5); add(mound);
    anims.push((t) => { const s = 0.25 + 0.75 * sm(t, t0, t1); mound.scale.set(s, s, s); mound.position.y = 1.7 * s; });
    const N = 70, parts = []; for (let k = 0; k < N; k++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.28), new THREE.MeshBasicMaterial({ color: k % 2 ? '#d9bd80' : '#b99a62' })); L.add(m); parts.push(m); }
    anims.push((t) => parts.forEach((m, k) => { const p = (t * 1.1 + k / N) % 1; m.position.set(6.5 + 0.6 * Math.sin(k * 3.1) , 3.0 - 6 * p * p + 0 * p, 7.6 + 2.6 * p + 0.3 * Math.cos(k * 2.3)); m.position.y = Math.max(0.3, m.position.y + 1.0 * (1 - p)); m.rotation.set(p * 6, k, 0); }));
    [[-8, 0], [10, 0]].forEach(([x, z], k) => { const h = house({ seed: 30 + k, wall: k ? '#b9c4b0' : '#d4c3a0', roof: '#6c4a3f' }); h.position.set(x + 4, 3.6, -14); add(h); [[-3, -2.5], [3, -2.5], [-3, 2.5], [3, 2.5]].forEach(([dx, dz]) => add(cyl(0.34, 0.4, 3.6, '#7a5a3c', { x: x + 4 + dx, y: 1.8, z: -14 + dz, seg: 10 }))); });
    [[3.2, 5.8], [9.8, 6.2]].forEach(([x, z], k) => char({ seed: 80 + k, hat: 'cap', coatTop: k ? '#4d6a8a' : '#7a6a4a', coatBot: '#3a3a40', hatCol: '#4a4036' }, x, 0, z));
    add(crate(1.7, 'BAY SAND')).position.set(-3.6, 0, 7.6); add(barrel()).position.set(-6, 0, 9);
  }

  if (i === 8) {
    add(ground(90, tex.mud('#7a6a54', 9), -2.6));
    const town = new THREE.Group(); add(town);
    town.add(box(90, 0.5, 40, rep(tex.sand('#dcc28a', 5), 14, 6), { y: -0.25, z: -6 }));
    [-14, -4.5, 5, 14.5].forEach((x, k) => { const h = house({ seed: 40 + k, wall: ['#d4c3a0', '#b9c4b0', '#d9c0a0', '#c9b79a'][k], roof: ['#6c4a3f', '#5b4a52'][k % 2], awning: k % 2 === 0, y0: 0 }); h.position.set(x, 1.0, -8); town.add(h); town.add(box(8.6, 1.0, 7.6, tex.brick('#8e5a3e', 4), { x, y: 0.5, z: -8 })); town.add(box(2.4, 0.5, 1.6, '#9d907c', { x, y: 0.25, z: -3.4 })); });
    [-9, 0, 9.8].forEach((x) => { const lp = lamp(6); lp.position.set(x, 0, -3); town.add(lp); });
    town.add(box(60, 0.15, 6, rep(tex.sand('#c9b07a', 6), 10, 1), { y: 0.1, z: 1 }));
    [[-5, 3, 'top', '#4d6a8a'], [0, 4.2, 'bowler', '#7a4a4a'], [5, 3.2, null, '#4f7a66']].forEach(([x, z, hat, col], k) => { const c = char({ seed: 90 + k, hat, glasses: k === 2, coatTop: col, coatBot: '#34393f', hatCol: '#2c2530' }, x, 0, z); town.add(c); });
    [7.4, 11.0].forEach((x) => add(post(5.4, x, 7)));
    add(sign('1910', 4.2, 1.6, { x: 9.2, y: 4.6, z: 7, size: 0.62 }));
    anims.push((t) => { town.position.y = -2.6 + 2.6 * sm(t, t0 + 0.2, t0 + dur * 0.55); });
  }

  if (i === 9) {
    add(ground(90, tex.mud('#7a6a54', 10), 0));
    const wl = seawall(90, 7); wl.rotation.y = Math.PI; wl.position.set(0, 0, -8); add(wl);
    const w = add(water(140, 70, '#4f6f78', 50)); w.position.set(0, 7.3, -42); anims.push((t) => w.userData.update(t, 1.5, 1.7));
    const sp = []; for (let k = 0; k < 30; k++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), new THREE.MeshBasicMaterial({ color: '#f1f4f4' })); L.add(m); sp.push(m); }
    anims.push((t) => sp.forEach((m, k) => { const p = (t * 0.5 + k / 30) % 1; m.position.set(-24 + ((k * 7) % 48), 7.4 + Math.sin(p * Math.PI) * (1.6 + (k % 4)), -12 - 2 * p + (k % 3)); m.scale.setScalar(0.4 + 0.9 * Math.sin(p * Math.PI)); }));
    [-1, 1].forEach((s) => { const h = house({ seed: 50 + s, wall: s < 0 ? '#d4c3a0' : '#b9c4b0', roof: '#6c4a3f' }); h.position.set(s * 12, 0, 1); h.rotation.y = -s * Math.PI / 2; add(h); });
    [[-1.4, 1], [0, 0.4], [1.4, 1]].forEach(([x, z], k) => char({ seed: 100 + k, hat: [null, 'bowler', 'cap'][k], glasses: k === 0, coatTop: ['#4d6a8a', '#7a4a4a', '#4f7a66'][k], coatBot: '#34393f', hatCol: '#2c2530' }, x, 0, z));
    [-5.6].forEach((x) => add(post(5, x, 4.4))); add(sign('1915', 3.2, 1.4, { x: -5.6, y: 4.5, z: 4.4, size: 0.62 }));
    const lp = lamp(6.5); lp.position.set(4.8, 0, 6); add(lp);
    rain(L, anims, -16, 16, -14, 18);
  }
}

/* ---------------- world assembly ---------------- */
export function buildWorld() {
  const root = new THREE.Group();
  const locs = [];
  for (let i = 0; i < 10; i++) {
    const L = new THREE.Group(); L.position.x = i * SPACING; L.userData.anims = [];
    build(i, L, L.userData.anims);
    L.visible = false; root.add(L); locs.push(L);
  }
  const skies = SHOTS.map((s) => sky(...s.sky));
  const dome = new THREE.Mesh(new THREE.SphereGeometry(220, 32, 16), new THREE.MeshBasicMaterial({ map: skies[0], side: THREE.BackSide, fog: false, depthWrite: false }));
  dome.renderOrder = -10; root.add(dome);
  const key = new THREE.DirectionalLight('#fff0cc', 2);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0006; key.shadow.normalBias = 0.04;
  const sc = key.shadow.camera; sc.left = -26; sc.right = 26; sc.top = 26; sc.bottom = -26; sc.near = 1; sc.far = 90;
  root.add(key, key.target);
  const hemi = new THREE.HemisphereLight('#ffffff', '#886644', 1.2); root.add(hemi);
  const fog = new THREE.Fog('#cccccc', 20, 100);
  const curves = SHOTS.map((s) => {
    const o = new THREE.Vector3(s.i * SPACING, 0, 0);
    return { p: new THREE.CatmullRomCurve3(s.keys.map((k) => new THREE.Vector3(...k.p).add(o))), l: new THREE.CatmullRomCurve3(s.keys.map((k) => new THREE.Vector3(...k.l).add(o))), T: s.keys.map((k) => s.t0 + (s.t1 - s.t0) * k.at) };
  });
  const P = new THREE.Vector3(), Lk = new THREE.Vector3();
  function update(t, cam, scene) {
    const si = shotIndex(t), sh = SHOTS[si], c = curves[si];
    locs.forEach((L, k) => (L.visible = k === si));
    const u = warpU(c.T, t);
    c.p.getPoint(u, P); c.l.getPoint(u, Lk);
    cam.position.copy(P); cam.lookAt(Lk); cam.updateMatrixWorld();
    scene.fog = fog; fog.color.set(sh.fog[0]); fog.near = sh.fog[1]; fog.far = sh.fog[2];
    dome.material.map = skies[si]; dome.position.copy(P);
    key.color.set(sh.key[0]); key.intensity = sh.key[1];
    key.position.copy(Lk).add(new THREE.Vector3(-12, 20, 10)); key.target.position.copy(Lk); key.target.updateMatrixWorld();
    hemi.color.set(sh.hemi[0]); hemi.groundColor.set(sh.hemi[1]); hemi.intensity = sh.hemi[2];
    locs[si].userData.anims.forEach((a) => a(t, cam));
    return { focus: P.distanceTo(Lk) };
  }
  return { root, update };
}
