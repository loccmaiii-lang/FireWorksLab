// Original Stage17 star and short-tail appearance, shared by stage, entry preview and thumbnail.
// This is a deterministic browser sketch, not measured Cascade playback.
const TAU=Math.PI*2,RAD=Math.PI/180;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const ease=t=>1-Math.exp(-Math.max(0,t)*2.8);
  function random(key, i) {
    let h = 2166136261; const s = String(key) + ':' + i;
    for (let k = 0; k < s.length; k++) h = Math.imul(h ^ s.charCodeAt(k), 16777619);
    h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15;
    return (h >>> 0) / 4294967295;
  }
  function rgb(s) {
    s = String(s || '#ffdba0');
    if (/^#[0-9a-f]{3}$/i.test(s)) s = '#' + [...s.slice(1)].map(x => x + x).join('');
    const n = /^#[0-9a-f]{6}$/i.test(s) ? parseInt(s.slice(1), 16) : 0xffdba0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgba = (c, a) => 'rgba(' + c.join(',') + ',' + clamp(a, 0, 1).toFixed(3) + ')';
  function dot(ctx, x, y, r, color, alpha) {
    if (alpha <= 0 || r <= 0) return;
    ctx.fillStyle = rgba(color, alpha); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
  function glow(ctx, x, y, r, color, alpha) {
    if (r <= 0 || alpha <= 0) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(color, alpha)); g.addColorStop(.22, rgba(color, alpha * .25)); g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function line(ctx, coords, color, alpha, width) {
    ctx.strokeStyle = rgba(color, alpha); ctx.lineWidth = width; ctx.lineCap = 'round';
    ctx.beginPath(); coords.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
  }
  function shell(ctx, item, time, project, unit, opacity) {
    const { p, t, flight, rise, angle, size, id, start, burst, life } = item, age = time - start, after = time - burst;
    const a = angle * RAD, bx = p.xM + Math.sin(a) * rise, bz = p.zM + Math.cos(a) * rise;
    if (age < 0 || after > life + .5) return;
    if (age < flight && after < 0) {
      const progress = clamp(age / flight, 0, 1);
      const location = u => { const q = 1 - Math.pow(1 - clamp(u, 0, 1), 1.5); return project(p.xM + (bx - p.xM) * q, p.zM + (bz - p.zM) * q); };
      const head = location(progress), tail = location(Math.max(0, progress - .14));
      line(ctx, [tail, head], [255, 213, 147], .7 * opacity, Math.max(.75, unit * 1.6));
      for (let k = 0; k < 12; k++) { const q = k / 12, pos = location(progress - q * .18); dot(ctx, pos[0] + (random(id, k) - .5) * unit * 2, pos[1] + q * q * unit * 7, .65, [255, 183, 99], opacity * (1 - q) * .68); }
      glow(ctx, head[0], head[1], 8, [255, 204, 139], .34 * opacity); dot(ctx, head[0], head[1], 1.5, [255, 246, 219], opacity);
      return;
    }
    if (after < 0) return;
    const center = project(bx, bz), radius = t.diameter * size / 2, fade = Math.pow(clamp(1 - after / life, 0, 1), .8) * opacity;
    if (fade <= .003) return;
    glow(ctx, center[0], center[1], Math.max(12, radius * unit * .86), t.color, fade * .047);
    if (after < .15) glow(ctx, center[0], center[1], 20 * (1 - after / .15), [255, 239, 210], .34 * opacity);
    const count = t.golden ? 92 : 80, growth = ease(after) / ease(1.3), fall = t.golden ? 4.1 : 2.7;
    const position = (i, at) => {
      // Fibonacci sphere, with independent radial/time variation for a full round crown.
      const y = 1 - 2 * (i + .5) / count, ring = Math.sqrt(1 - y * y), azimuth = i * 2.3999632297 + random(id, 402) * TAU;
      const variance = .79 + random(id, i + 71) * .24, g = ease(at) / ease(1.3), x = Math.cos(azimuth) * ring;
      return { xy: project(bx + x * radius * g * variance, bz + y * radius * g * variance - fall * at * at), depth: Math.sin(azimuth) * ring };
    };
    for (let i = 0; i < count; i++) {
      const starEnd = life * (.75 + random(id, i + 102) * .25); if (after > starEnd) continue;
      const pos = position(i, after), tailAge = Math.max(0, after - (t.golden ? .32 : .19) * (.65 + random(id, i + 202)));
      const tail = position(i, tailAge), mid = position(i, (after + tailAge) / 2);
      const alpha = fade * (.65 + .35 * (pos.depth + 1) / 2) * clamp((starEnd - after) * 2, 0, 1);
      const flicker = t.silver ? .78 + .22 * Math.sin(after * (7 + random(id, i + 600) * 6) + i * 1.9) : 1;
      line(ctx, [tail.xy, mid.xy, pos.xy], t.color, alpha * .42 * flicker, Math.max(.55, unit * (t.golden ? 1 : .75)));
      dot(ctx, pos.xy[0], pos.xy[1], .7 + unit * .65, t.color, alpha * flicker);
      if (i % 3 === 0) dot(ctx, pos.xy[0], pos.xy[1], .45, [255, 248, 230], alpha * .75);
    }
  }

export {random,rgb,rgba,dot,glow,line,shell};
