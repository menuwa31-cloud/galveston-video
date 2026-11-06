import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const INK = 0x351f22;
export const INK_CSS = '#351f22';

export function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- toon material (3 bands) ---------- */
const gm = new THREE.DataTexture(new Uint8Array([120, 190, 255]), 3, 1, THREE.RedFormat);
gm.minFilter = gm.magFilter = THREE.NearestFilter;
gm.needsUpdate = true;

export function toon(x, extra = {}) {
  if (x && x.isMaterial) return x;
  const o = { gradientMap: gm, ...extra };
  if (x && x.isTexture) o.map = x; else o.color = new THREE.Color(x);
  return new THREE.MeshToonMaterial(o);
}

/* ---------- outlines: inverted hull + edge lines ---------- */
const hulls = {};
function hullMat(t) {
  const k = t.toFixed(3);
  if (!hulls[k]) {
    const m = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
    m.onBeforeCompile = (s) => {
      s.vertexShader = s.vertexShader.replace('#include <begin_vertex>',
        'vec3 transformed = position + normalize(normal) * ' + t.toFixed(4) + ';');
    };
    m.customProgramCacheKey = () => 'hull' + k;
    hulls[k] = m;
  }
  return hulls[k];
}
function hullGeo(g) {
  const h = g.clone();
  h.deleteAttribute('normal'); h.deleteAttribute('uv');
  h.clearGroups();
  const m = mergeVertices(h, 0.002);
  m.computeVertexNormals();
  return m;
}
const lineMat = new THREE.LineBasicMaterial({ color: INK });

export function solid(geo, mat, thick = 0.05, edges = true) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true; m.receiveShadow = true;
  const h = new THREE.Mesh(hullGeo(geo), hullMat(thick));
  h.raycast = () => {};
  m.add(h);
  if (edges) m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 35), lineMat));
  return m;
}

/* ---------- painted textures (flat colour + wear) ---------- */
const cache = {};
function mk(key, w, h, fn) {
  if (!cache[key]) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    fn(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    cache[key] = t;
  }
  return cache[key];
}
function wear(x, w, h, seed) {
  const R = rng(seed * 7 + 3);
  for (let i = 0; i < 14; i++) {
    x.fillStyle = 'rgba(50,35,25,' + (0.05 + R() * 0.08) + ')';
    x.beginPath(); x.ellipse(R() * w, R() * h, 8 + R() * 30, (8 + R() * 30) * (0.4 + R()), R() * 3, 0, 7); x.fill();
  }
  for (let i = 0; i < 26; i++) {
    const cx = R() * w, cy = R() * h;
    x.fillStyle = 'rgba(255,246,226,' + (0.1 + R() * 0.12) + ')';
    x.beginPath(); x.moveTo(cx, cy);
    for (let k = 0; k < 5; k++) x.lineTo(cx + (R() - 0.5) * 14, cy + (R() - 0.5) * 10);
    x.fill();
  }
  x.strokeStyle = 'rgba(40,25,20,0.28)'; x.lineWidth = 1.2;
  for (let i = 0; i < 12; i++) {
    const a = R() * w, b = R() * h;
    x.beginPath(); x.moveTo(a, b); x.lineTo(a + (R() - 0.5) * 60, b + (R() - 0.5) * 50); x.stroke();
  }
}
export const tex = {
  plaster: (c, s = 1) => mk('pl' + c + s, 256, 256, (x, w, h) => { x.fillStyle = c; x.fillRect(0, 0, w, h); wear(x, w, h, s); }),
  clap: (c, s = 1) => mk('cl' + c + s, 256, 256, (x, w, h) => {
    x.fillStyle = c; x.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) { x.fillStyle = 'rgba(40,25,20,0.38)'; x.fillRect(0, y, w, 3); x.fillStyle = 'rgba(255,255,255,0.12)'; x.fillRect(0, y + 3, w, 6); }
    wear(x, w, h, s);
  }),
  plank: (c, s = 1) => mk('pk' + c + s, 256, 256, (x, w, h) => {
    x.fillStyle = c; x.fillRect(0, 0, w, h);
    for (let i = 0; i < w; i += 43) { x.fillStyle = 'rgba(40,25,20,0.4)'; x.fillRect(i, 0, 3, h); }
    const R = rng(s + 11);
    for (let i = 0; i < 14; i++) { x.fillStyle = 'rgba(40,25,20,0.16)'; x.fillRect(R() * w, R() * h, 2, 20 + R() * 50); }
    wear(x, w, h, s);
  }),
  brick: (c, s = 1) => mk('br' + c + s, 256, 256, (x, w, h) => {
    x.fillStyle = c; x.fillRect(0, 0, w, h);
    const R = rng(s + 5);
    for (let r = 0; r < 8; r++) for (let k = 0; k < 5; k++) {
      const bx = k * 52 + (r % 2 ? 26 : 0), by = r * 32;
      x.fillStyle = 'rgba(255,230,200,' + (R() * 0.14) + ')'; x.fillRect(bx, by, 50, 30);
      x.fillStyle = 'rgba(40,20,15,0.5)'; x.fillRect(bx, by + 30, 52, 2.5); x.fillRect(bx + 50, by, 2.5, 32);
    }
    wear(x, w, h, s);
  }),
  conc: (c, s = 1) => mk('cc' + c + s, 256, 256, (x, w, h) => {
    x.fillStyle = c; x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(40,30,25,0.35)'; x.fillRect(0, 126, w, 3); x.fillRect(126, 0, 3, 126);
    const R = rng(s + 2);
    for (let i = 0; i < 60; i++) { x.fillStyle = 'rgba(40,30,25,0.12)'; x.fillRect(R() * w, R() * h, 2 + R() * 4, 2 + R() * 4); }
    wear(x, w, h, s);
  }),
  sand: (c, s = 1) => mk('sd' + c + s, 256, 256, (x, w, h) => {
    x.fillStyle = c; x.fillRect(0, 0, w, h);
    const R = rng(s + 9);
    for (let i = 0; i < 220; i++) { x.fillStyle = R() > 0.5 ? 'rgba(90,60,30,0.22)' : 'rgba(255,240,200,0.3)'; x.fillRect(R() * w, R() * h, 2 + R() * 3, 2 + R() * 2); }
    wear(x, w, h, s);
  }),
  mud: (c, s = 1) => mk('md' + c + s, 256, 256, (x, w, h) => {
    x.fillStyle = c; x.fillRect(0, 0, w, h);
    const R = rng(s + 4);
    for (let i = 0; i < 30; i++) { x.fillStyle = R() > 0.5 ? 'rgba(30,20,15,0.22)' : 'rgba(200,170,130,0.18)'; x.beginPath(); x.ellipse(R() * w, R() * h, 10 + R() * 28, 5 + R() * 12, R() * 3, 0, 7); x.fill(); }
  }),
  shingle: (c, s = 1) => mk('sh' + c + s, 256, 256, (x, w, h) => {
    x.fillStyle = c; x.fillRect(0, 0, w, h);
    for (let r = 0; r < 8; r++) for (let k = 0; k < 8; k++) {
      x.strokeStyle = 'rgba(30,15,12,0.5)'; x.lineWidth = 2;
      x.strokeRect(k * 32 + (r % 2 ? 16 : 0), r * 32, 32, 32);
    }
    wear(x, w, h, s);
  }),
};
export const paintTex = mk;
const repCache = {};
export function rep(t, u, v) {
  const k = t.uuid + '|' + u.toFixed(2) + '|' + v.toFixed(2);
  if (!repCache[k]) { const c = t.clone(); c.repeat.set(u, v); c.needsUpdate = true; repCache[k] = c; }
  return repCache[k];
}

/* painted text sign texture */
export function signTex(text, w, h, o = {}) {
  const key = 'sg' + text + w + h + JSON.stringify(o);
  return mk(key, Math.round(w * 160), Math.round(h * 160), (x, W, H) => {
    x.fillStyle = o.bg || '#e9d9b4'; x.fillRect(0, 0, W, H);
    wear(x, W, H, 5);
    x.strokeStyle = INK_CSS; x.lineWidth = Math.max(5, H * 0.05);
    x.strokeRect(H * 0.07, H * 0.07, W - H * 0.14, H - H * 0.14);
    x.fillStyle = o.fg || INK_CSS; x.textAlign = 'center'; x.textBaseline = 'middle';
    const lines = text.split('\n');
    const fs = (o.size || 0.5) * H / (lines.length > 1 ? 1.15 : 1);
    x.font = 'bold ' + fs + 'px Georgia, "Times New Roman", serif';
    lines.forEach((ln, i) => x.fillText(ln, W / 2, H / 2 + (i - (lines.length - 1) / 2) * fs * 1.12, W * 0.92));
  });
}
export function sky(top, bottom, cloud, seed, storm) {
  return mk('sky' + top + bottom + seed, 1024, 512, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, top); g.addColorStop(0.55, bottom); g.addColorStop(1, bottom);
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    const R = rng(seed);
    for (let i = 0; i < (storm ? 26 : 16); i++) {
      const cx = R() * w, cy = h * (0.12 + R() * 0.38), rw = 70 + R() * 150, rh = 18 + R() * 30;
      x.fillStyle = cloud;
      x.beginPath(); for (let k = 0; k < 6; k++) x.ellipse(cx + (k - 2.5) * rw * 0.3, cy - Math.sin(k * 1.1) * rh * 0.4, rw * 0.35, rh, 0, 0, 7); x.fill();
      x.fillStyle = 'rgba(40,40,60,' + (storm ? 0.28 : 0.1) + ')';
      x.beginPath(); x.ellipse(cx, cy + rh * 0.55, rw * 0.9, rh * 0.35, 0, 0, 7); x.fill();
    }
  });
}

/* ---------- shape helpers ---------- */
export function box(w, h, d, m, o = {}) {
  const mat = Array.isArray(m) ? m.map((q) => toon(q)) : toon(m);
  const b = solid(new THREE.BoxGeometry(w, h, d), mat, o.thick ?? 0.04, o.edges ?? true);
  b.position.set(o.x || 0, o.y || 0, o.z || 0);
  if (o.ry) b.rotation.y = o.ry; if (o.rz) b.rotation.z = o.rz; if (o.rx) b.rotation.x = o.rx;
  return b;
}
export function cyl(rt, rb, h, m, o = {}) {
  const b = solid(new THREE.CylinderGeometry(rt, rb, h, o.seg || 16), toon(m), o.thick ?? 0.04, false);
  b.position.set(o.x || 0, o.y || 0, o.z || 0);
  if (o.rz) b.rotation.z = o.rz; if (o.rx) b.rotation.x = o.rx;
  return b;
}
export function sign(text, w, h, o = {}) {
  const front = toon(signTex(text, w, h, o));
  const side = toon(o.rim || '#7a5a3c');
  const b = solid(new THREE.BoxGeometry(w, h, o.d || 0.18), [side, side, side, side, front, side], 0.035, true);
  b.position.set(o.x || 0, o.y || 0, o.z || 0);
  if (o.ry) b.rotation.y = o.ry;
  return b;
}
export function ground(r, t, y = 0) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 48), toon(rep(t, r / 5, r / 5)));
  m.rotation.x = -Math.PI / 2; m.position.y = y; m.receiveShadow = true;
  return m;
}
export function post(h, x, z, c = '#7a5a3c', r = 0.2) {
  return cyl(r, r * 1.1, h, tex.plank(c, 3), { x, y: h / 2, z, seg: 10 });
}

/* ---------- facade: extruded wall with window reveals and a door notch ---------- */
export function facade(w, h, o) {
  const dep = o.depth || 0.5, hw = w / 2, s = new THREE.Shape();
  if (o.door) {
    const [dx, dw, dh] = o.door;
    s.moveTo(-hw, 0); s.lineTo(dx - dw / 2, 0); s.lineTo(dx - dw / 2, dh); s.lineTo(dx + dw / 2, dh); s.lineTo(dx + dw / 2, 0); s.lineTo(hw, 0);
  } else { s.moveTo(-hw, 0); s.lineTo(hw, 0); }
  s.lineTo(hw, h); s.lineTo(-hw, h); s.lineTo(-hw, 0);
  (o.windows || []).forEach(([cx, cy, ww, wh]) => {
    const p = new THREE.Path();
    p.moveTo(cx - ww / 2, cy - wh / 2); p.lineTo(cx - ww / 2, cy + wh / 2); p.lineTo(cx + ww / 2, cy + wh / 2); p.lineTo(cx + ww / 2, cy - wh / 2); p.lineTo(cx - ww / 2, cy - wh / 2);
    s.holes.push(p);
  });
  (o.round || []).forEach(([cx, cy, r]) => { const p = new THREE.Path(); p.absarc(cx, cy, r, 0, Math.PI * 2, true); s.holes.push(p); });
  const geo = new THREE.ExtrudeGeometry(s, { depth: dep, bevelEnabled: false, curveSegments: 16 });
  const g = new THREE.Group();
  g.add(solid(geo, toon(o.mat), 0.045, true));
  (o.windows || []).forEach(([cx, cy, ww, wh]) => {
    g.add(box(ww + 0.5, 0.18, 0.5, '#e9dcc0', { x: cx, y: cy - wh / 2 - 0.09, z: dep + 0.12, thick: 0.03 }));
    g.add(box(ww + 0.5, 0.22, 0.42, '#e9dcc0', { x: cx, y: cy + wh / 2 + 0.11, z: dep + 0.1, thick: 0.03 }));
    g.add(box(0.1, wh, 0.1, '#e9dcc0', { x: cx, y: cy, z: 0.25, thick: 0.025 }));
    g.add(box(ww, 0.1, 0.1, '#e9dcc0', { x: cx, y: cy + wh * 0.12, z: 0.25, thick: 0.025 }));
  });
  if (o.door) {
    const [dx, dw, dh] = o.door;
    g.add(box(dw - 0.1, dh - 0.1, 0.14, o.doorMat || '#5a3a2a', { x: dx, y: dh / 2, z: 0.2, thick: 0.03 }));
    g.add(box(dw + 0.5, 0.25, 0.5, '#e9dcc0', { x: dx, y: dh + 0.12, z: dep + 0.1, thick: 0.03 }));
    g.add(box(dw + 0.6, 0.22, 1.1, '#9d907c', { x: dx, y: 0.11, z: dep + 0.45, thick: 0.03 }));
    const k = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), toon('#d9b24c')); k.position.set(dx + dw * 0.32, dh * 0.45, 0.32); g.add(k);
  }
  return g;
}

/* ---------- house: body + front facade + gable roof + chimney ---------- */
export function house(o = {}) {
  const w = o.w || 8, h = o.h || 7.2, d = o.d || 7, seed = o.seed || 1;
  const g = new THREE.Group();
  const wall = o.brick ? tex.brick(o.wall || '#b5673f', seed) : tex.clap(o.wall || '#d4c3a0', seed);
  const inter = toon('#2c1b17');
  const sideMat = toon(rep(wall, d / 4, h / 4));
  g.add(box(w, h, d, [sideMat, sideMat, toon('#6b5646'), toon('#6b5646'), inter, sideMat], { y: h / 2, thick: 0.05 }));
  const fw = rep(wall, 1 / 4, 1 / 4);
  const rows = o.floors || 2, fh = h / rows;
  const wins = [];
  for (let r = 0; r < rows; r++) {
    const xs = r === 0 && o.door !== false ? [-2.6, 2.6] : [-2.6, 0, 2.6];
    xs.forEach((x) => wins.push([x * (w / 8), r * fh + fh * 0.58, 1.25, 1.9]));
  }
  const ff = facade(w, h, { windows: wins, door: o.door === false ? null : [0, 1.7, 3.4], mat: fw, depth: 0.5 }); ff.position.set(0, 0, d / 2); g.add(ff);
  g.add(box(w + 0.6, 0.45, 1.1, '#e9dcc0', { y: h + 0.1, z: d / 2 + 0.3, thick: 0.035 }));
  const rh = o.roofH || 3.2, rs = new THREE.Shape();
  rs.moveTo(-d / 2 - 0.5, 0); rs.lineTo(d / 2 + 0.5, 0); rs.lineTo(0, rh); rs.lineTo(-d / 2 - 0.5, 0);
  const rg = new THREE.ExtrudeGeometry(rs, { depth: w + 0.9, bevelEnabled: false });
  rg.translate(0, 0, -(w + 0.9) / 2);
  const roof = solid(rg, toon(rep(tex.shingle(o.roof || '#6c4a3f', seed), 3, 1.5)), 0.05, true);
  roof.rotation.y = Math.PI / 2; roof.position.y = h + 0.3; g.add(roof);
  g.add(box(1.1, 3, 1.1, tex.brick('#9a5a3c', seed), { x: w * 0.28, y: h + rh * 0.6 + 0.8, z: -d * 0.1, thick: 0.04 }));
  if (o.awning) g.add(box(2.6, 0.12, 1.6, rep(tex.clap('#a63d3d', 2), 1, 1), { x: 0, y: 3.9, z: d / 2 + 1.1, rx: 0.3, thick: 0.03 }));
  g.userData.size = { w, h, d, rh };
  return g;
}

/* ---------- small props ---------- */
export function lamp(h = 6.5) {
  const g = new THREE.Group();
  g.add(cyl(0.12, 0.2, h, '#2e2a2a', { y: h / 2 }));
  g.add(box(0.7, 0.7, 0.7, '#f3d98d', { y: h + 0.35, thick: 0.04 }));
  g.add(box(0.95, 0.18, 0.95, '#2e2a2a', { y: h + 0.8, thick: 0.03 }));
  return g;
}
export function barrel(c = '#8a5a34') {
  const g = new THREE.Group();
  g.add(cyl(0.7, 0.7, 1.5, tex.plank(c, 4), { y: 0.75, seg: 14 }));
  [0.3, 1.2].forEach((y) => g.add(cyl(0.73, 0.73, 0.08, '#3b3030', { y, seg: 14, thick: 0.02 })));
  return g;
}
export function crate(s = 1.4, label) {
  const g = new THREE.Group();
  g.add(box(s, s, s, tex.plank('#b88a52', 6), { y: s / 2 }));
  if (label) g.add(sign(label, s * 0.9, s * 0.45, { z: s / 2 + 0.05, y: s * 0.5, d: 0.06, size: 0.42 }));
  return g;
}
export function crib(w, levels, c = '#9a6a3c') {
  const g = new THREE.Group();
  for (let i = 0; i < levels; i++) {
    const t = tex.plank(c, 8 + i);
    if (i % 2) { g.add(box(w, 0.5, 0.9, t, { y: 0.25 + i * 0.5, x: 0, z: -w / 2 + 0.45 })); g.add(box(w, 0.5, 0.9, t, { y: 0.25 + i * 0.5, x: 0, z: w / 2 - 0.45 })); }
    else { g.add(box(0.9, 0.5, w, t, { y: 0.25 + i * 0.5, x: -w / 2 + 0.45 })); g.add(box(0.9, 0.5, w, t, { y: 0.25 + i * 0.5, x: w / 2 - 0.45 })); }
  }
  return g;
}
/* jackscrew: sleeve on the ground, threaded rod rises by `lift` */
export function jack(len = 2.6) {
  const g = new THREE.Group();
  g.add(box(1.1, 0.35, 1.1, '#4a4040', { y: 0.18 }));
  g.add(cyl(0.34, 0.38, 0.9, '#3d3636', { y: 0.8 }));
  const rod = new THREE.Group();
  rod.add(cyl(0.2, 0.2, len, '#8a8580', { y: len / 2 + 0.4, seg: 12 }));
  for (let i = 0; i < Math.floor(len / 0.3); i++) rod.add(cyl(0.26, 0.26, 0.07, '#5b5753', { y: 0.7 + i * 0.3, seg: 12, thick: 0.015 }));
  const lever = box(2.2, 0.14, 0.14, '#6b4a2c', { y: 1.5, thick: 0.03 });
  rod.add(lever);
  rod.add(box(1.0, 0.18, 1.0, '#3d3636', { y: len + 0.5, thick: 0.03 }));
  g.add(rod);
  g.userData.rod = rod; g.userData.lever = lever;
  g.userData.set = (lift, spin) => { rod.position.y = lift; lever.rotation.y = spin; };
  return g;
}
export function water(w, d, color, seg = 36) {
  const geo = new THREE.PlaneGeometry(w, d, seg, seg); geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, toon(color, { side: THREE.DoubleSide }));
  m.receiveShadow = true;
  const base = geo.attributes.position.array.slice();
  m.userData.update = (t, amp = 0.18, sp = 1) => {
    const p = geo.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) {
      const x = base[i], z = base[i + 2];
      p[i + 1] = Math.sin(x * 0.35 + t * 1.6 * sp) * amp + Math.cos(z * 0.45 + t * 1.2 * sp) * amp * 0.8;
    }
    geo.attributes.position.needsUpdate = true; geo.computeVertexNormals();
  };
  return m;
}
export function planks(w, d, c = '#a88358') {
  return box(w, 0.25, d, rep(tex.plank(c, 2), w / 3, d / 3), { thick: 0.03 });
}
