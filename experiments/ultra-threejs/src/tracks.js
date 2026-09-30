import { Sim, H_STEP, G, shapePoints } from './generated/core.js';

export function emitterInfo(P) {
  const Tp=P.loopT,lifeMax=P.sparkLife*2.5,Mp=Math.max(1,Math.round(P.sparkRate*Tp));
  const E={rate:Mp/Tp,Mp,mode:0,nsrc:Math.max(1,Math.round(P.nozzles)),omega:0};
  const source=[];
  if(P.type==='wheel'){E.mode=1;E.omega=2*Math.PI/Tp;}
  else if(P.type==='fan'||P.type==='barrage') {
    E.mode=2;E.nshot=Math.max(1,Math.round(P.shotRate*Tp));E.shot=E.nshot/Tp;E.ck=G/Math.max(1,P.vt);
  } else if(P.type==='shikake') {
    const shape=['sphere','half','saturn'].includes(P.pattern)?'text':P.pattern;
    for(const [x,y]of shapePoints(shape,Math.round(P.stars),P.text))source.push([x*P.spacing/2,P.groundH+(y+1)*P.spacing/2*.62,P.jetDir]);
    E.nsrc=source.length;
  } else for(let i=0;i<E.nsrc;i++) {
    const spread=P.type==='fountain'&&P.fanAngle>0?P.fanAngle:P.jetCone*.5;
    source.push([(i-(E.nsrc-1)/2)*P.spacing,P.groundH,
      P.jetDir+(P.type==='falls'?0:E.nsrc>1?(i/(E.nsrc-1)-.5)*spread:0)]);
  }
  if(E.mode===2) {
    E.Mw=Math.ceil(E.rate*Math.min(P.cometBurn,lifeMax))+2;
    E.slots=Math.ceil((P.cometBurn+lifeMax)*E.shot)+1;E.total=E.slots*E.Mw;
    E.heads=(Math.ceil((P.cometBurn+P.subBurn*1.25)*E.shot)+1)*(1+Math.round(P.burstStars||0));
  }else{E.Mw=Math.ceil(E.rate*lifeMax)+2;E.total=E.nsrc*E.Mw;E.heads=E.nsrc;}
  E.source=new Float32Array(Math.max(1,E.nsrc)*4);
  source.forEach((s,i)=>E.source.set(s,i*4));
  return E;
}

// Same 480 Hz physics and 240 Hz trajectory history as Ultra buildTrack.
// Returned ArrayBuffers are transferred from the worker, never duplicated.
export function buildTrack(input, maxTextureSize = 16384) {
  const P = { ...input, engine: 'gpu' }, sim = new Sim(P);
  const k = Math.max(2, Math.ceil(P.duration / (maxTextureSize - 4) / H_STEP));
  const dt = k * H_STEP, Ns = Math.ceil(P.duration / dt) + 2, snaps = [];
  for (let i = 0; i < Ns; i++) {
    const a = new Float32Array(sim.all.length * 6);
    sim.all.forEach((s, j) => a.set([s.x, s.y, s.z, s.vx, s.vy, s.vz], j * 6));
    snaps.push(a);
    for (let j = 0; j < k; j++) sim.step(H_STEP);
  }
  if (sim.all.length > maxTextureSize) throw new Error('星体轨迹超过显卡纹理尺寸，请降低星数。');
  const nStars = sim.all.length, bytes = Ns * nStars * 32 + nStars * 16;
  if (bytes > 600 * 1024 * 1024) throw new Error('单层轨迹超过 600 MB，请减少子花数量或缩短时长。');
  const positions = new Float32Array(Ns * nStars * 4), velocities = new Float32Array(positions.length);
  const info = new Float32Array(nStars * 4);
  let M = 1, total = 0;
  sim.all.forEach((s, j) => {
    const first = snaps.findIndex(a => a.length > j * 6);
    for (let i = 0; i < Ns; i++) {
      const a = snaps[Math.max(i, first)], o = (j * Ns + i) * 4, b = j * 6;
      positions.set(a.subarray(b, b + 3), o);
      velocities.set(a.subarray(b + 3, b + 6), o);
    }
    const born = s.birth + (s.ign || 0);
    const death = Math.min(s.birth + (s.vis ?? s.burn), P.duration);
    const end = s.kind === 5 ? 1 : (P.sparkRateEnd ?? 1);
    const B = Math.max(.05, s.birth + (s.vis ?? s.burn) - born);
    const a = s.rate * (end - 1) / (2 * B);
    info.set([born, death, death > born ? s.rate : 0, a], j * 4);
    if (s.rate > 0 && death > born) {
      const span = death - born;
      const count = Math.ceil(Math.max(0, s.rate * span + a * span * span)) + 1;
      M = Math.max(M, count); total += count;
    }
  });
  return { positions, velocities, info, Ns, dt, nStars, M, total, bytes };
}

// CPU counterpart of the GPU lifetime hash, used to verify individual retirement.
export function pcg(value) {
  const s = (Math.imul(value >>> 0, 747796405) + 2891336453) >>> 0;
  const w = Math.imul(((s >>> ((s >>> 28) + 4)) ^ s) >>> 0, 277803737) >>> 0;
  return ((w >>> 22) ^ w) >>> 0;
}
export function hash(id, key, seed) {
  return pcg((id >>> 0) ^ pcg((key + Math.imul(seed, 2654435769)) >>> 0)) / 4294967296;
}
export function sparkLifetime(id, seed, mean) {
  const n = Math.sqrt(-2 * Math.log(Math.max(hash(id, 2, seed), 1e-7))) *
    Math.cos(2 * Math.PI * hash(id, 103, seed));
  return mean * Math.exp(.45 * n);
}
export function sparkBirth(index, info) {
  const [start, , rate, acceleration] = info;
  if (Math.abs(acceleration) < 1e-6) return start + index / rate;
  const disc = rate * rate + 4 * acceleration * index;
  return disc < 0 ? Infinity : start + 2 * index / (rate + Math.sqrt(disc));
}
export function sparkMotion(p, v, age, drag, gravity = 1, wind = 0) {
  if (drag < 1e-4) return [p[0] + v[0] * age, p[1] + v[1] * age - .5 * G * gravity * age * age];
  const terminalY = -G * gravity / drag, a = (1 - Math.exp(-drag * age)) / drag;
  return [p[0] + wind * age + (v[0] - wind) * a,
    p[1] + terminalY * age + (v[1] - terminalY) * a];
}
