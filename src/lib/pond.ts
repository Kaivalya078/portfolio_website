/**
 * A small procedural koi pond on a 2D canvas.
 *
 * All simulation state lives in this closure, never in React, and the whole
 * thing advances inside one requestAnimationFrame loop. Nothing here imports
 * React and nothing here triggers a re-render.
 *
 * The caustics are the only non-obvious part: they are drawn into a buffer at
 * an eighth scale and then blown up with smoothing on, so the browser's own
 * bilinear filter supplies the blur for free. Summing four sines and keeping
 * the values *near zero* is what produces a network of closed cells rather
 * than a field of blobs.
 */

const PAPER = '#f4f1ea';
const WATER_TOP = '#7d9c85';
const WATER_BOTTOM = '#5f8069';
const CAUSTIC = '#eff6e9';

type Koi = {
  x: number;
  y: number;
  heading: number;
  target: number;
  speed: number;
  cruise: number;
  len: number;
  phase: number;
  patches: { t: number; off: number; rx: number; ry: number }[];
  startle: number;
  nextChange: number;
  wander: number;
  body: string;
  mark: string;
};

type Ripple = { x: number; y: number; age: number };
type Stone = { x: number; y: number; rx: number; ry: number; rot: number; tone: string };
type Reed = { x: number; y: number; blades: { len: number; angle: number; bow: number }[]; phase: number };

const KOI_COLOURS: [string, string][] = [
  ['#d2703e', '#f6f1e8'],
  ['#f6f1e8', '#d2703e'],
  ['#d79a47', '#4a4036'],
  ['#c04a32', '#f6f1e8'],
  ['#e08a4e', '#f6f1e8'],
  ['#f6f1e8', '#c04a32'],
  ['#c9673a', '#f2ece1'],
];

const TAU = Math.PI * 2;

/** Mixes a hex colour toward white (amount > 0) or black (amount < 0). */
function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const t = amount > 0 ? 255 : 0;
  const a = Math.abs(amount);
  const ch = (shift: number) => {
    const c = (n >> shift) & 255;
    return Math.round(c + (t - c) * a);
  };
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Shortest signed angular distance from a to b. */
function angleDelta(a: number, b: number) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

/** Fills a closed smooth path through the given points. */
function smoothPath(ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[]) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    const my = (pts[i].y + pts[i + 1].y) / 2;
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
  }
  const last = pts[pts.length - 1];
  ctx.quadraticCurveTo(last.x, last.y, pts[0].x, pts[0].y);
  ctx.closePath();
}

export function createPond(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { destroy() {} };

  let w = 0;
  let h = 0;
  let dpr = 1;
  let raf = 0;
  let last = 0;
  let time = 0;
  let frame = 0;

  let koi: Koi[] = [];
  let ripples: Ripple[] = [];
  let stones: Stone[] = [];
  let reeds: Reed[] = [];

  const caustic = document.createElement('canvas');
  const causticCtx = caustic.getContext('2d', { willReadFrequently: true });
  let causticData: ImageData | null = null;

  let grain: CanvasPattern | null = null;

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let calm = motionQuery.matches;

  /* ---------------------------------------------------------------- setup */

  function buildGrain() {
    const tile = document.createElement('canvas');
    tile.width = tile.height = 128;
    const tctx = tile.getContext('2d');
    if (!tctx) return;
    const img = tctx.createImageData(128, 128);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = (Math.random() * 255) | 0;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 18;
    }
    tctx.putImageData(img, 0, 0);
    grain = ctx!.createPattern(tile, 'repeat');
  }

  function seedScenery() {
    const area = w * h;
    const stoneCount = clamp(Math.round(area / 120000), 2, 4);
    stones = [];
    const TONES = ['#6f7d68', '#7b8571'];
    for (let i = 0; i < stoneCount; i++) {
      const rx = rand(Math.min(w, h) * 0.035, Math.min(w, h) * 0.075);
      stones.push({
        x: rand(w * 0.12, w * 0.88),
        y: rand(h * 0.12, h * 0.88),
        rx,
        ry: rx * rand(0.7, 0.92),
        rot: rand(0, TAU),
        tone: TONES[i % TONES.length],
      });
    }

    const reedCount = clamp(Math.round(area / 70000) + 3, 4, 10);
    reeds = [];
    for (let i = 0; i < reedCount; i++) {
      const edge = Math.floor(rand(0, 4));
      let x = 0;
      let y = 0;
      if (edge === 0) {
        x = rand(0, w);
        y = rand(-6, 14);
      } else if (edge === 1) {
        x = rand(0, w);
        y = h - rand(-6, 14);
      } else if (edge === 2) {
        x = rand(-6, 14);
        y = rand(0, h);
      } else {
        x = w - rand(-6, 14);
        y = rand(0, h);
      }
      const inward = Math.atan2(h / 2 - y, w / 2 - x);
      const blades = [];
      const n = Math.floor(rand(5, 9));
      const scale = Math.min(w, h);
      for (let b = 0; b < n; b++) {
        blades.push({
          len: rand(scale * 0.09, scale * 0.2),
          angle: inward + rand(-0.42, 0.42),
          bow: rand(-0.35, 0.35),
        });
      }
      reeds.push({ x, y, blades, phase: rand(0, TAU) });
    }
  }

  function seedKoi() {
    const count = clamp(Math.round(Math.sqrt(w * h) / 150), 3, 7);
    const len = clamp(Math.min(w, h) * 0.17, 40, 172);
    koi = [];
    for (let i = 0; i < count; i++) {
      const [body, mark] = KOI_COLOURS[i % KOI_COLOURS.length];
      const cruise = len * rand(0.3, 0.55);
      const heading = rand(0, TAU);
      koi.push({
        x: rand(w * 0.15, w * 0.85),
        y: rand(h * 0.15, h * 0.85),
        heading,
        target: heading,
        speed: cruise,
        cruise,
        len: len * rand(0.85, 1.12),
        phase: rand(0, TAU),
        patches: Array.from({ length: Math.floor(rand(2, 4)) }, () => ({
          t: rand(0.12, 0.68),
          off: rand(-0.35, 0.35),
          rx: rand(0.06, 0.13),
          ry: rand(0.035, 0.06),
        })),
        startle: 0,
        nextChange: rand(2, 7),
        wander: rand(0, TAU),
        body,
        mark,
      });
    }
  }

  /**
   * Opening a panel animates the pond's width, so this runs once per frame for
   * the length of that animation. Reseeding here would restart the whole pond
   * mid-animation, which is why the scenery is built once and afterwards only
   * follows the new bounds.
   */
  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const prevW = w;
    const prevH = h;
    w = rect.width;
    h = rect.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cw = Math.max(2, Math.ceil(w / 6));
    const chh = Math.max(2, Math.ceil(h / 6));
    if (cw !== caustic.width || chh !== caustic.height) {
      caustic.width = cw;
      caustic.height = chh;
      causticData = causticCtx!.createImageData(cw, chh);
    }

    if (!prevW || !prevH) {
      buildGrain();
      seedScenery();
      seedKoi();
      repaint();
      return;
    }

    // The grain tile is size-independent, so it is never rebuilt. Everything
    // else is carried across: same fish, same stones, new bounds.
    const sx = w / prevW;
    const sy = h / prevH;
    const ss = Math.min(w, h) / Math.min(prevW, prevH);
    for (const k of koi) {
      k.x *= sx;
      k.y *= sy;
      k.len *= ss;
      k.cruise *= ss;
      k.speed *= ss;
    }
    for (const s of stones) {
      s.x *= sx;
      s.y *= sy;
      s.rx *= ss;
      s.ry *= ss;
    }
    for (const r of reeds) {
      r.x *= sx;
      r.y *= sy;
      for (const b of r.blades) b.len *= ss;
    }
    for (const r of ripples) {
      r.x *= sx;
      r.y *= sy;
    }

    repaint();
  }

  /**
   * Assigning canvas.width wipes the canvas, and a ResizeObserver callback runs
   * *after* the frame's rAF tick - so without repainting here the browser would
   * paint an empty canvas on every frame of the panel animation, which is what
   * made the pond flicker while a panel opened.
   */
  function repaint() {
    drawCaustics();
    draw();
  }

  /* --------------------------------------------------------------- update */

  function update(dt: number) {
    const scale = calm ? 0.35 : 1;

    for (const k of koi) {
      k.nextChange -= dt;
      if (k.nextChange <= 0) {
        k.nextChange = rand(3, 9);
        k.cruise = k.len * rand(0.22, 0.55);
        k.wander += rand(-1.2, 1.2);
      }

      // Heading wanders on summed sines with a per-fish phase, so no two fish
      // move together and there is no loop to notice.
      k.wander += dt * 0.35;
      const drift =
        Math.sin(k.wander) * 0.6 +
        Math.sin(k.wander * 0.41 + 1.7) * 0.4 +
        Math.sin(k.wander * 0.23 + 4.1) * 0.3;
      k.target = k.heading + drift * dt * 2.2;

      // Steer away from the edges, allowing a little drift into the feather.
      const margin = k.len * 1.1;
      if (k.x < margin) k.target = 0;
      else if (k.x > w - margin) k.target = Math.PI;
      if (k.y < margin) k.target = Math.PI / 2;
      else if (k.y > h - margin) k.target = -Math.PI / 2;

      const turnRate = (0.55 + k.startle * 2.2) * (calm ? 0.5 : 1);
      const delta = angleDelta(k.heading, k.target);
      k.heading += clamp(delta, -turnRate * dt, turnRate * dt);

      const want = k.cruise * (1 + k.startle * 1.8);
      k.speed += (want - k.speed) * Math.min(1, dt * 2.5);

      k.x += Math.cos(k.heading) * k.speed * dt * scale;
      k.y += Math.sin(k.heading) * k.speed * dt * scale;

      k.phase += dt * (4.2 + k.startle * 7) * scale;
      k.startle = Math.max(0, k.startle - dt / 1.4);
    }

    for (let i = ripples.length - 1; i >= 0; i--) {
      ripples[i].age += dt;
      if (ripples[i].age > (calm ? 0.9 : 1.9)) ripples.splice(i, 1);
    }
  }

  /* ----------------------------------------------------------------- draw */

  function drawCaustics() {
    if (!causticData || !causticCtx) return;
    const cw = caustic.width;
    const ch = caustic.height;
    const t = time * (calm ? 0.15 : 1);
    const d = causticData.data;

    let i = 0;
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        // Domain warp: bending the coordinates before sampling turns a
        // regular interference lattice into irregular, organic cells.
        const wx = x + Math.sin(y * 0.053 + t * 0.05) * 9.3;
        const wy = y + Math.sin(x * 0.045 - t * 0.04) * 9.3;
        const v =
          Math.sin(wx * 0.255 + t * 0.35) +
          Math.sin(wy * 0.293 - t * 0.29) +
          Math.sin((wx + wy) * 0.18 + t * 0.21) +
          Math.sin((wx - wy) * 0.21 - t * 0.17);
        // Varying the band width across the pond keeps ridges from matching.
        const band = 1.45 + 0.4 * Math.sin(x * 0.0375 + y * 0.031 + t * 0.07);
        const av = Math.abs(v);
        const core = Math.max(0, 1 - av / (band * 0.62));
        const bloom = Math.max(0, 1 - av / (band * 1.8));
        const a = Math.min(1, core * core * 0.6 + bloom * bloom * bloom * 0.32);
        d[i] = 244;
        d[i + 1] = 248;
        d[i + 2] = 242;
        d[i + 3] = a * 150;
        i += 4;
      }
    }
    causticCtx.putImageData(causticData, 0, 0);
  }

  function drawWater() {
    const g = ctx!.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, WATER_TOP);
    g.addColorStop(1, WATER_BOTTOM);
    ctx!.fillStyle = g;
    ctx!.fillRect(0, 0, w, h);

    ctx!.imageSmoothingEnabled = true;
    ctx!.imageSmoothingQuality = 'high';
    ctx!.globalAlpha = 0.8;
    ctx!.drawImage(caustic, 0, 0, w, h);
    ctx!.globalAlpha = 1;
  }

  function drawStones() {
    for (const s of stones) {
      ctx!.save();
      ctx!.translate(s.x, s.y);
      ctx!.rotate(s.rot);
      const g = ctx!.createRadialGradient(
        -s.rx * 0.3,
        -s.ry * 0.35,
        s.rx * 0.1,
        0,
        0,
        s.rx,
      );
      g.addColorStop(0, 'rgba(188,196,176,0.95)');
      g.addColorStop(1, s.tone);
      ctx!.globalAlpha = 0.22;
      ctx!.fillStyle = 'rgba(64,84,78,1)';
      ctx!.beginPath();
      ctx!.ellipse(s.rx * 0.1, s.ry * 0.16, s.rx * 1.04, s.ry * 1.04, 0, 0, TAU);
      ctx!.fill();

      ctx!.fillStyle = g;
      ctx!.globalAlpha = 0.72;
      ctx!.beginPath();
      ctx!.ellipse(0, 0, s.rx, s.ry, 0, 0, TAU);
      ctx!.fill();
      ctx!.globalAlpha = 1;
      ctx!.restore();
    }
  }

  function drawReeds() {
    ctx!.strokeStyle = 'rgba(32,56,36,0.5)';
    ctx!.lineCap = 'round';
    for (const r of reeds) {
      const sway = Math.sin(time * (calm ? 0.12 : 0.6) + r.phase) * 0.06;
      for (const b of r.blades) {
        const a = b.angle + sway;
        const mx = r.x + Math.cos(a + b.bow) * b.len * 0.55;
        const my = r.y + Math.sin(a + b.bow) * b.len * 0.55;
        const ex = r.x + Math.cos(a) * b.len;
        const ey = r.y + Math.sin(a) * b.len;
        ctx!.lineWidth = Math.max(1.4, b.len * 0.052);
        ctx!.beginPath();
        ctx!.moveTo(r.x, r.y);
        ctx!.quadraticCurveTo(mx, my, ex, ey);
        ctx!.stroke();
      }
    }
  }

  /** Spine points from the nose backwards, with a travelling undulation. */
  function spine(k: Koi) {
    const N = 14;
    const pts = [];
    const back = k.heading + Math.PI;
    const px = Math.cos(k.heading + Math.PI / 2);
    const py = Math.sin(k.heading + Math.PI / 2);
    const amp = k.len * 0.055 * (1 + k.startle * 0.9) * (calm ? 0.3 : 1);
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const off = Math.sin(k.phase - t * 3.1) * amp * t;
      pts.push({
        x: k.x + Math.cos(back) * t * k.len + px * off,
        y: k.y + Math.sin(back) * t * k.len + py * off,
        t,
      });
    }
    return pts;
  }

  function koiOutline(sp: ReturnType<typeof spine>, k: Koi) {
    const right = [];
    const left = [];
    for (let i = 0; i < sp.length; i++) {
      const t = sp[i].t;
      const width = k.len * 0.115 * (0.2 + 0.8 * Math.sin(Math.PI * Math.sqrt(t)));
      const next = sp[Math.min(i + 1, sp.length - 1)];
      const prev = sp[Math.max(i - 1, 0)];
      const a = Math.atan2(next.y - prev.y, next.x - prev.x) + Math.PI / 2;
      right.push({ x: sp[i].x + Math.cos(a) * width, y: sp[i].y + Math.sin(a) * width });
      left.push({ x: sp[i].x - Math.cos(a) * width, y: sp[i].y - Math.sin(a) * width });
    }
    return [...right, ...left.reverse()];
  }

  function drawKoi(k: Koi) {
    const sp = spine(k);
    const outline = koiOutline(sp, k);
    const tailRoot = sp[sp.length - 1];
    const beforeTail = sp[sp.length - 3];
    const ta = Math.atan2(tailRoot.y - beforeTail.y, tailRoot.x - beforeTail.x);
    const tailLen = k.len * 0.38;
    const fin = 'rgba(250,247,240,0.34)';

    // Shadow on the pond floor.
    ctx!.save();
    ctx!.translate(k.len * 0.022, k.len * 0.038);
    ctx!.fillStyle = 'rgba(24,46,32,0.13)';
    smoothPath(ctx!, outline);
    ctx!.fill();
    ctx!.restore();

    // Tail fan, behind the body.
    ctx!.fillStyle = fin;
    ctx!.beginPath();
    ctx!.moveTo(tailRoot.x, tailRoot.y);
    ctx!.quadraticCurveTo(
      tailRoot.x + Math.cos(ta + 0.7) * tailLen * 0.8,
      tailRoot.y + Math.sin(ta + 0.7) * tailLen * 0.8,
      tailRoot.x + Math.cos(ta + 0.45) * tailLen,
      tailRoot.y + Math.sin(ta + 0.45) * tailLen,
    );
    ctx!.quadraticCurveTo(
      tailRoot.x + Math.cos(ta) * tailLen * 0.55,
      tailRoot.y + Math.sin(ta) * tailLen * 0.55,
      tailRoot.x + Math.cos(ta - 0.45) * tailLen,
      tailRoot.y + Math.sin(ta - 0.45) * tailLen,
    );
    ctx!.quadraticCurveTo(
      tailRoot.x + Math.cos(ta - 0.7) * tailLen * 0.8,
      tailRoot.y + Math.sin(ta - 0.7) * tailLen * 0.8,
      tailRoot.x,
      tailRoot.y,
    );
    ctx!.fill();

    // Pectoral fins.
    const pec = sp[4];
    const pa = Math.atan2(sp[5].y - sp[3].y, sp[5].x - sp[3].x);
    const flap = Math.sin(k.phase * 1.3) * 0.25;
    for (const side of [1, -1]) {
      ctx!.save();
      ctx!.translate(pec.x, pec.y);
      ctx!.rotate(pa + side * (1.1 + flap * side));
      ctx!.fillStyle = fin;
      ctx!.beginPath();
      ctx!.ellipse(k.len * 0.12, 0, k.len * 0.15, k.len * 0.06, 0, 0, TAU);
      ctx!.fill();
      ctx!.restore();
    }

    // Soft outer halo: the same silhouette, slightly spread and translucent,
    // so the body edge dissolves into the water instead of cutting it.
    ctx!.save();
    ctx!.translate(k.x, k.y);
    ctx!.scale(1.035, 1.035);
    ctx!.translate(-k.x, -k.y);
    smoothPath(ctx!, outline);
    ctx!.fillStyle = k.body;
    ctx!.globalAlpha = 0.16;
    ctx!.fill();
    ctx!.restore();
    ctx!.globalAlpha = 1;

    // Body, shaded across its width so it reads as round rather than flat.
    const perp = k.heading + Math.PI / 2;
    const gx = Math.cos(perp) * k.len * 0.13;
    const gy = Math.sin(perp) * k.len * 0.13;
    const bodyGrad = ctx!.createLinearGradient(k.x + gx, k.y + gy, k.x - gx, k.y - gy);
    bodyGrad.addColorStop(0, shade(k.body, 0.22));
    bodyGrad.addColorStop(0.45, k.body);
    bodyGrad.addColorStop(1, shade(k.body, -0.2));
    smoothPath(ctx!, outline);
    ctx!.fillStyle = bodyGrad;
    ctx!.fill();

    // Markings, clipped to the body.
    ctx!.save();
    smoothPath(ctx!, outline);
    ctx!.clip();
    ctx!.fillStyle = k.mark;
    ctx!.globalAlpha = 0.62;
    for (const patch of k.patches) {
      const idx = Math.round(patch.t * (sp.length - 1));
      const p = sp[idx];
      const nxt = sp[Math.min(idx + 1, sp.length - 1)];
      const ang = Math.atan2(nxt.y - p.y, nxt.x - p.x);
      const nx = Math.cos(ang + Math.PI / 2) * k.len * 0.06 * patch.off;
      const ny = Math.sin(ang + Math.PI / 2) * k.len * 0.06 * patch.off;
      ctx!.beginPath();
      ctx!.ellipse(p.x + nx, p.y + ny, k.len * patch.rx, k.len * patch.ry, ang, 0, TAU);
      ctx!.fill();
    }
    ctx!.restore();

    // Eyes sit either side of the head, as they do on a koi seen from above.
    const head = sp[1];
    const ha = Math.atan2(sp[2].y - sp[0].y, sp[2].x - sp[0].x) + Math.PI / 2;
    ctx!.fillStyle = 'rgba(38,34,30,0.72)';
    for (const side of [1, -1]) {
      ctx!.beginPath();
      ctx!.ellipse(
        head.x + Math.cos(ha) * k.len * 0.045 * side,
        head.y + Math.sin(ha) * k.len * 0.045 * side,
        k.len * 0.018,
        k.len * 0.018,
        0,
        0,
        TAU,
      );
      ctx!.fill();
    }

    // Shading along the back keeps it from reading flat.
    ctx!.save();
    smoothPath(ctx!, outline);
    ctx!.clip();
    const g = ctx!.createLinearGradient(k.x, k.y, sp[sp.length - 1].x, sp[sp.length - 1].y);
    g.addColorStop(0, 'rgba(0,0,0,0.09)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx!.fillStyle = g;
    ctx!.fillRect(k.x - k.len, k.y - k.len, k.len * 2, k.len * 2);
    ctx!.restore();
  }

  function drawRipples() {
    const life = calm ? 0.9 : 1.9;
    const maxR = Math.min(w, h) * 0.27;

    // One wobbled ring. The radius is modulated by two harmonics so it reads
    // as refracted light rather than a drawn circle.
    const ring = (
      r: Ripple,
      radius: number,
      colour: string,
      alpha: number,
      width: number,
    ) => {
      if (radius < 1 || alpha <= 0.002) return;
      ctx!.beginPath();
      for (let s = 0; s <= 48; s++) {
        const th = (s / 48) * TAU;
        const wob = 1 + 0.035 * Math.sin(th * 3 + r.x) + 0.02 * Math.sin(th * 5 - r.y);
        const px = r.x + Math.cos(th) * radius * wob;
        const py = r.y + Math.sin(th) * radius * wob;
        if (s === 0) ctx!.moveTo(px, py);
        else ctx!.lineTo(px, py);
      }
      ctx!.closePath();
      ctx!.strokeStyle = colour;
      ctx!.globalAlpha = alpha;
      ctx!.lineWidth = width;
      ctx!.stroke();
    };

    for (const r of ripples) {
      const p = r.age / life;
      const radius = maxR * (1 - Math.pow(1 - p, 3));
      const fade = Math.pow(1 - p, 1.5);
      const bands = calm ? [1] : [1, 0.84, 0.69];

      bands.forEach((m, idx) => {
        const rr = radius * m;
        const a = fade * (1 - idx * 0.3);
        const lw = Math.max(1, 3.6 * (1 - p));
        // A trough just inside each crest is what makes it look like water.
        ring(r, rr * 0.94, 'rgba(38,64,46,1)', a * 0.5, lw * 1.05);
        ring(r, rr, 'rgba(255,255,255,1)', a * 0.95, lw);
      });
      ctx!.globalAlpha = 1;
    }
  }

  function drawEdges() {
    // Wide enough that the pond dissolves into the page instead of ending
    // at a rectangle, and that koi fade as they drift out through it.
    const fade = Math.min(Math.max(18, Math.min(w, h) * 0.13), Math.min(w, h) * 0.16);
    const sides: [number, number, number, number][] = [
      [0, 0, 0, fade],
      [0, h, 0, h - fade],
      [0, 0, fade, 0],
      [w, 0, w - fade, 0],
    ];
    for (const [x0, y0, x1, y1] of sides) {
      const g = ctx!.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, PAPER);
      g.addColorStop(1, 'rgba(244,241,234,0)');
      ctx!.fillStyle = g;
      ctx!.fillRect(0, 0, w, h);
    }
  }

  function draw() {
    ctx!.clearRect(0, 0, w, h);
    drawWater();
    drawStones();
    drawReeds();
    for (const k of koi) drawKoi(k);
    drawRipples();
    if (grain) {
      ctx!.fillStyle = grain;
      ctx!.fillRect(0, 0, w, h);
    }
    drawEdges();
  }

  /* ----------------------------------------------------------------- loop */

  function tick(now: number) {
    raf = requestAnimationFrame(tick);
    if (!last) last = now;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    time += dt;
    frame++;

    // The caustic field morphs slowly, so refreshing it every other frame is
    // invisible and halves its cost.
    if (frame % 2 === 0) drawCaustics();

    update(dt);
    draw();
  }

  /* -------------------------------------------------------------- input */

  function onPointerDown(e: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Did the tap land on a fish?
    let hit: Koi | null = null;
    let bestDist = Infinity;
    for (const k of koi) {
      const sp = spine(k);
      for (const p of sp) {
        const d = Math.hypot(p.x - x, p.y - y);
        if (d < k.len * 0.3 && d < bestDist) {
          bestDist = d;
          hit = k;
        }
      }
    }

    if (hit) {
      // Startled: turn away from the touch and bolt, then settle back down.
      hit.startle = 1;
      hit.heading = Math.atan2(hit.y - y, hit.x - x);
      hit.target = hit.heading;
      hit.cruise = hit.len * rand(0.5, 0.7);
      hit.nextChange = rand(2.5, 5);
      for (const k of koi) {
        if (k === hit) continue;
        if (Math.hypot(k.x - hit.x, k.y - hit.y) < hit.len * 2.2) {
          k.startle = Math.max(k.startle, 0.35);
        }
      }
      return;
    }

    ripples.push({ x, y, age: 0 });
    if (ripples.length > 6) ripples.shift();

    // The water nudges whatever is nearby, so the two systems feel like one pond.
    for (const k of koi) {
      const d = Math.hypot(k.x - x, k.y - y);
      if (d < Math.min(w, h) * 0.3) {
        k.startle = Math.max(k.startle, 0.15);
        k.target = Math.atan2(k.y - y, k.x - x);
      }
    }
  }

  function onMotionChange(e: MediaQueryListEvent) {
    calm = e.matches;
  }

  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  canvas.addEventListener('pointerdown', onPointerDown);
  motionQuery.addEventListener('change', onMotionChange);

  resize();
  raf = requestAnimationFrame(tick);

  // Read-only handle so the animation can be asserted in tests; it cannot be
  // observed through the DOM. NODE_ENV is inlined at build time, so this whole
  // block is dropped from the production bundle rather than shipped.
  if (process.env.NODE_ENV !== 'production') {
    (window as unknown as { __pond?: unknown }).__pond = {
      koi: () => koi.map((k) => ({ x: k.x, y: k.y, heading: k.heading, startle: k.startle })),
      ripples: () => ripples.length,
      calm: () => calm,
    };
  }

  return {
    destroy() {
      cancelAnimationFrame(raf);
      observer.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      motionQuery.removeEventListener('change', onMotionChange);
      if (process.env.NODE_ENV !== 'production') {
        delete (window as unknown as { __pond?: unknown }).__pond;
      }
    },
  };
}
