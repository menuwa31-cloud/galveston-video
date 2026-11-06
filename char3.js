import * as THREE from 'three';
import { INK, rng } from './kit.js';

const flat = (c) => new THREE.MeshBasicMaterial({ color: c });
const SKIN = '#f3dcc4';

/* One fixed character design. Variants: palette, hat, glasses only. */
export function makeChar(o = {}) {
  const R = rng(o.seed || 3);
  const g = new THREE.Group();
  const body = new THREE.Group();
  const head = new THREE.Group();
  g.add(body); body.add(head); head.position.set(0, 1.95, 0);
  const S = o.scale || 0.88; g.scale.setScalar(S);
  const dz = 0.007;

  const poly = (pts) => { const s = new THREE.Shape(); pts.forEach((p, i) => (i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1]))); return s; };
  const blobPts = (cx, cy, rx, ry, wob = 0.03, n = 40) => {
    const ph = R() * 6, p = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, k = 1 + wob * Math.sin(a * 3 + ph) + wob * 0.6 * Math.sin(a * 5 + ph * 2); p.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
    return p;
  };
  const inflate = (pts, th) => {
    const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    return pts.map((p) => { const dx = p[0] - cx, dy = p[1] - cy, l = Math.hypot(dx, dy) || 1, t = th * (0.75 + 0.5 * R()); return [p[0] + (dx / l) * t, p[1] + (dy / l) * t]; });
  };
  let zc = 0;
  const add = (dst, pts, col, withInk = true, th = 0.045) => {
    if (withInk) { const m = new THREE.Mesh(new THREE.ShapeGeometry(poly(inflate(pts, th)), 8), flat(INK)); m.position.z = zc; dst.add(m); zc += dz * 0.5; }
    const m = new THREE.Mesh(new THREE.ShapeGeometry(poly(pts), 8), flat(col)); m.position.z = zc; dst.add(m); zc += dz; return m;
  };
  const limb = (x0, y0, x1, y1, w0, w1) => {
    const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy), nx = -dy / l, ny = dx / l;
    return [[x0 + nx * w0, y0 + ny * w0], [x1 + nx * w1, y1 + ny * w1], [x1 - nx * w1, y1 - ny * w1], [x0 - nx * w0, y0 - ny * w0]];
  };
  const C = { coatTop: o.coatTop || '#4d6a8a', coatBot: o.coatBot || '#34495f', tie: o.tie || '#b03a3a', hair: o.hair || '#4a3328', trouser: o.trouser || '#2e2a33', hat: o.hat, hatCol: o.hatCol || '#2c2530', glasses: !!o.glasses };

  /* legs + feet */
  [-1, 1].forEach((s) => {
    add(body, limb(s * 0.2, 0.9, s * 0.26, 0.1, 0.055, 0.04), C.trouser);
    add(body, blobPts(s * 0.31, 0.06, 0.17, 0.07, 0.02, 20), '#26212a');
  });
  /* torso (pear, two-tone, pocket) */
  const torso = [[-0.28, 1.98], [0.28, 1.98], [0.42, 1.7], [0.5, 1.35], [0.47, 1.0], [0.34, 0.8], [-0.34, 0.8], [-0.47, 1.0], [-0.5, 1.35], [-0.42, 1.7]];
  add(body, torso, C.coatTop, true, 0.05);
  add(body, [[-0.495, 1.25], [0.495, 1.25], [0.47, 1.0], [0.34, 0.8], [-0.34, 0.8], [-0.47, 1.0]], C.coatBot, false);
  add(body, [[0.1, 1.2], [0.34, 1.2], [0.34, 0.95], [0.1, 0.95]], '#2a3b4c', false);
  /* collar + tie */
  add(body, [[-0.3, 1.98], [0, 1.78], [0.3, 1.98]], '#fbf6ea', true, 0.025);
  add(body, [[0, 1.82], [0.09, 1.62], [0, 1.38], [-0.09, 1.62]], C.tie, true, 0.02);
  /* arms (pivot at shoulders, animated) */
  const arms = [-1, 1].map((s) => {
    const a = new THREE.Group(); a.position.set(s * 0.46, 1.82, 0); body.add(a);
    const save = zc; zc = 0.09;
    add(a, limb(0, 0, 0, -1.0, 0.055, 0.038), C.coatTop, true, 0.04);
    add(a, blobPts(0, -1.07, 0.11, 0.11, 0.05, 18), '#241f26', false);
    zc = save; return a;
  });
  /* head */
  zc = 0.05;
  const hz = zc;
  add(head, blobPts(0, 0.52, 0.62, 0.6, 0.025), SKIN, true, 0.05);
  /* eyes: calm, half-lidded */
  [-1, 1].forEach((s) => {
    const ey = 0.46, ex = s * 0.22;
    const eye = new THREE.Mesh(new THREE.CircleGeometry(0.075, 14, Math.PI, Math.PI), flat('#2a1d1f')); eye.position.set(ex, ey, zc); head.add(eye);
    const lid = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.035), flat(INK)); lid.position.set(ex, ey + 0.005, zc + 0.003); head.add(lid);
    const brow = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.03), flat(C.hair)); brow.position.set(ex, ey + 0.13, zc + 0.002); brow.rotation.z = s * -0.08; head.add(brow);
  });
  const sm = new THREE.Mesh(new THREE.RingGeometry(0.15, 0.185, 16, 1, Math.PI * 1.15, Math.PI * 0.7), flat(INK)); sm.position.set(0, 0.36, zc); sm.scale.set(0.9, 0.7, 1); head.add(sm);
  zc += dz * 2;
  /* hair fringe */
  const fr = []; for (let a = 172; a >= 8; a -= 12) { const r = (a * Math.PI) / 180; fr.push([Math.cos(r) * 0.63, 0.5 + Math.sin(r) * 0.62]); }
  for (let i = 0; i <= 8; i++) fr.push([0.52 - i * 0.13, 0.73 + (i % 2 ? -0.09 : 0.02)]);
  add(head, fr, C.hair, true, 0.03);
  /* glasses */
  if (C.glasses) [-1, 1].forEach((s) => {
    const r = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.15, 20), flat(INK)); r.position.set(s * 0.22, 0.45, zc + dz); head.add(r);
  });
  if (C.glasses) { const br = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.03), flat(INK)); br.position.set(0, 0.47, zc + dz); head.add(br); }
  zc += dz * 3;
  /* hats */
  if (C.hat === 'top') {
    add(head, blobPts(0, 1.08, 0.7, 0.08, 0.02, 24), C.hatCol, true, 0.04);
    add(head, [[-0.38, 1.1], [0.38, 1.1], [0.36, 1.78], [-0.36, 1.78]], C.hatCol, true, 0.04);
    add(head, [[-0.385, 1.14], [0.385, 1.14], [0.38, 1.3], [-0.38, 1.3]], '#8a2e2e', false);
  } else if (C.hat === 'bowler') {
    add(head, blobPts(0, 1.04, 0.7, 0.08, 0.02, 24), C.hatCol, true, 0.04);
    const d = []; for (let a = 0; a <= 180; a += 12) { const r = (a * Math.PI) / 180; d.push([Math.cos(r) * 0.5, 1.06 + Math.sin(r) * 0.46]); }
    add(head, d, C.hatCol, true, 0.04);
  } else if (C.hat === 'cap') {
    const d = []; for (let a = 0; a <= 180; a += 12) { const r = (a * Math.PI) / 180; d.push([Math.cos(r) * 0.58, 0.98 + Math.sin(r) * 0.42]); }
    add(head, d, C.hatCol, true, 0.04);
    add(head, [[0.1, 1.0], [0.8, 0.98], [0.8, 0.92], [0.1, 0.92]], C.hatCol, true, 0.03);
  }
  /* contact shadow */
  const sh = new THREE.Mesh(new THREE.CircleGeometry(0.8, 24), new THREE.MeshBasicMaterial({ color: INK, transparent: true, opacity: 0.3, depthWrite: false }));
  sh.rotation.x = -Math.PI / 2; sh.scale.set(1, 0.45, 1); sh.position.set(0, 0.03, 0); g.add(sh);

  const ph = (o.seed || 1) * 1.7, wp = new THREE.Vector3();
  g.userData.update = (t, cam) => {
    g.getWorldPosition(wp);
    const yaw = Math.atan2(cam.position.x - wp.x, cam.position.z - wp.z) + (o.yaw || 0);
    body.rotation.y = Math.max(-0.7, Math.min(0.7, yaw));
    body.position.y = Math.abs(Math.sin(t * 2.1 + ph)) * 0.045;
    head.rotation.z = 0.045 * Math.sin(t * 1.3 + ph);
    if (o.pose) o.pose(t, arms[0], arms[1], head, body);
    else { arms[0].rotation.z = -0.1 - 0.1 * Math.sin(t * 1.6 + ph); arms[1].rotation.z = 0.1 + 0.1 * Math.sin(t * 1.6 + ph + 1); }
  };
  return g;
}
