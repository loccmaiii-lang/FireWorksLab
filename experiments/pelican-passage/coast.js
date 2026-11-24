import * as THREE from 'three';
import { addWildflowers } from './flowers.js';

const TAU = Math.PI * 2;
const SHORE_TILE = 40;
const SEA_LEVEL = -0.82;
const stone = ['#c6a17d', '#d4b28c', '#c29b7b', '#e1c5a0', '#b89173'];
const olive = ['#92934f', '#a4a15c', '#c1af64', '#7d8a54', '#b0a35c'];
const palette = new Map();

function color(value) {
  if (!palette.has(value)) palette.set(value, new THREE.Color(value));
  return palette.get(value);
}

function randomSource(seed) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

// 把静态景物按层合成一个网格，细小花草和远景也可共用绘制调用。
function geometryBatch() {
  const positions = [];
  const colors = [];
  function tri(a, b, c, paint) {
    const tint = color(paint);
    positions.push(...a, ...b, ...c);
    for (let i = 0; i < 3; i++) colors.push(tint.r, tint.g, tint.b);
  }
  function quad(a, b, c, d, paint) {
    tri(a, b, c, paint);
    tri(a, c, d, paint);
  }
  function mesh(unlit = false) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    if (!unlit) geometry.computeVertexNormals();
    const Material = unlit ? THREE.MeshBasicMaterial : THREE.MeshLambertMaterial;
    const object = new THREE.Mesh(
      geometry,
      new Material({ vertexColors: true, side: THREE.DoubleSide }),
    );
    return object;
  }
  return { tri, quad, mesh };
}

// 不规则扁球用于海石、树冠和花冠。每一圈都是实际几何轮廓。
function rock(batch, x, y, z, rx, ry, rz, paint, rand, steps = 7) {
  const rotation = rand() * TAU;
  const equator = [],
    cap = [];
  for (let i = 0; i < steps; i++) {
    const a = rotation + (i * TAU) / steps;
    const r = 0.84 + rand() * 0.23;
    equator.push([
      x + Math.cos(a) * rx * r,
      y + (0.12 - rand() * 0.25) * ry,
      z + Math.sin(a) * rz * r,
    ]);
    cap.push([
      x + Math.cos(a) * rx * r * 0.59,
      y + (0.62 + rand() * 0.2) * ry,
      z + Math.sin(a) * rz * r * 0.59,
    ]);
  }
  for (let i = 0; i < steps; i++) {
    const j = (i + 1) % steps;
    batch.quad(equator[j], equator[i], cap[i], cap[j], paint);
    batch.tri(cap[j], cap[i], [x + 0.05 * rx, y + ry, z + 0.07 * rz], paint);
    batch.tri(equator[i], equator[j], [x, y - ry * 0.8, z], paint);
  }
}

function post(batch, a, b, bottom, top, paint, sides = 8) {
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
  const reference = Math.abs(d.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const u = reference.cross(d).normalize(),
    v = d.clone().cross(u);
  const lo = [],
    hi = [];
  for (let i = 0; i < sides; i++) {
    const angle = (TAU * i) / sides,
      cs = Math.cos(angle),
      sn = Math.sin(angle);
    const dir = [u.x * cs + v.x * sn, u.y * cs + v.y * sn, u.z * cs + v.z * sn];
    lo.push(a.map((n, axis) => n + dir[axis] * bottom));
    hi.push(b.map((n, axis) => n + dir[axis] * top));
  }
  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides;
    batch.quad(lo[i], lo[j], hi[j], hi[i], paint);
    if (top) batch.tri(b, hi[i], hi[j], paint);
  }
}

function pine(batch, x, y, z, h, rand, distant = false) {
  const lean = (0.3 + 0.55 * rand()) * h * 0.19;
  const bark = distant ? '#6d8274' : '#726b54';
  post(batch, [x, y, z], [x + lean, y + h * 0.82, z], h * 0.054, h * 0.029, bark);
  const greens = distant
    ? ['#6d8c80', '#77958a', '#849e8e']
    : ['#546e59', '#657e60', '#708561', '#7c8e69'];
  for (let i = 0; i < 5; i++) {
    const angle = (TAU * (i + rand() * 0.4)) / 5;
    const reach = h * (0.2 + 0.16 * rand());
    const end = [
      x + lean + Math.cos(angle) * reach,
      y + h * (0.81 + rand() * 0.17),
      z + Math.sin(angle) * reach,
    ];
    post(
      batch,
      [x + lean * 0.65, y + h * (0.45 + rand() * 0.12), z],
      end,
      h * 0.026,
      h * 0.011,
      bark,
      5,
    );
    rock(
      batch,
      ...end,
      h * (0.27 + rand() * 0.12),
      h * (0.115 + rand() * 0.055),
      h * 0.27,
      greens[i % greens.length],
      rand,
    );
  }
}

function makeRoad() {
  const travel = { value: 0 };
  const mat = new THREE.MeshStandardMaterial({ color: '#d5bf9f', roughness: 0.99 });
  // 稀疏的细砂颗粒与路面共享模型坐标，随轮迹向后退。
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTravel = travel;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vRoad;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRoad = position.xy;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `
      #include <common>
      varying vec2 vRoad;
      uniform float uTravel;
      float gritHash(vec2 p) {return fract(sin(dot(mod(p, 1024.),vec2(37.13,17.29)))*16387.41);}
      float grit(vec2 p) {
        vec2 cell = floor(p), local = fract(p);
        float h = gritHash(cell);
        vec2 center = .18 + .64*vec2(h, gritHash(cell+19.));
        float d = length((local-center)*vec2(.8,1.15));
        return (1.-smoothstep(.06,.105+min(fwidth(d),.5),d))*smoothstep(.5,.96,h);
      }
    `,
      )
      .replace(
        '#include <color_fragment>',
        `
      #include <color_fragment>
      vec2 p = vRoad + vec2(uTravel, 0.);
      float sand = grit(p*vec2(14.,23.));
      diffuseColor.rgb *= 1. - .13*sand;
    `,
      );
  };
  const road = new THREE.Mesh(new THREE.PlaneGeometry(180, 3.6), mat);
  road.rotation.x = -Math.PI / 2;
  road.receiveShadow = true;
  return { road, travel };
}

function makeSea() {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uTravel: { value: 0 },
      uShallow: { value: color('#6ab6af') },
      uBay: { value: color('#80bdbb') },
      uHorizon: { value: color('#cddcd2') },
      uCrest: { value: color('#d7e6d8') },
    },
    vertexShader: `varying vec3 vWorld;
      void main() {
        vec4 p = modelMatrix*vec4(position,1.);
        vWorld = p.xyz;
        gl_Position = projectionMatrix*viewMatrix*p;
      }`,
    fragmentShader: `
      uniform float uTime, uTravel;
      uniform vec3 uShallow,uBay,uHorizon,uCrest;
      varying vec3 vWorld;
      float hash(vec2 p) {return fract(sin(dot(mod(p,1024.), vec2(41.7,16.53)))*28657.735);}
      float wave(vec2 p) {
        vec2 cell=floor(p), f=fract(p)-.5;
        float n=hash(cell);
        f.y += .21*sin(cell.x+cell.y*.8+uTime*.39) + .08*sin(f.x*3.4+cell.x);
        f.x += .12*sin(uTime*.21+8.*n);
        float width = .09+.25*n;
        float edge = max(abs(f.x)/width, abs(f.y)/(.035+n*.037));
        return (1.-smoothstep(.50,1.+min(fwidth(edge),1.),edge))*smoothstep(.47,.98,n);
      }
      void main() {
        vec2 p=vWorld.xz;
        p.x += uTravel;
        float depth=abs(p.y);
        vec3 ink=mix(uShallow,uBay,smoothstep(3.,25.,depth));
        ink=mix(ink,uHorizon,smoothstep(23.,105.,depth));
        float roll = sin(.79*p.y + .36*sin(.38*p.x) + .17*uTime);
        ink*=1.+roll*.023*(1.-smoothstep(27.,75.,depth));
        float ripple=wave(p*vec2(.50,1.55)+vec2(.09*uTime, .065*uTime));
        float fine=wave(p*vec2(.97,2.7)+vec2(26.3,22.2)-.055*uTime);
        float light=(ripple*.49+fine*.19)*(1.-smoothstep(18.,69.,depth));
        gl_FragColor=vec4(mix(ink,uCrest,light),1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(320, 320), mat);
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = SEA_LEVEL;
  return sea;
}

function shoreHeight(x) {
  return 0.052 + 0.022 * Math.sin(((x * TAU) / SHORE_TILE) * 5);
}

function grasses(batch, x, y, z, rand, bloom) {
  const h = 0.055 + rand() * 0.135;
  const stem = olive[Math.floor(rand() * olive.length)];
  for (let i = 0; i < 5; i++) {
    const a = rand() * TAU,
      dx = Math.cos(a),
      dz = Math.sin(a),
      w = h * (0.045 + rand() * 0.048);
    const lean = h * (0.37 + rand() * 0.63);
    const tip = [x + dx * lean, y + h * (0.65 + rand() * 0.5), z + dz * lean];
    const mid = [x + dx * lean * 0.44, y + h * 0.54, z + dz * lean * 0.44];
    batch.quad(
      [x - dz * w, y, z + dx * w],
      [x + dz * w, y, z - dx * w],
      [mid[0] + dz * w * 0.55, mid[1], mid[2] - dx * w * 0.55],
      [mid[0] - dz * w * 0.55, mid[1], mid[2] + dx * w * 0.55],
      stem,
    );
    batch.tri(
      [mid[0] - dz * w * 0.55, mid[1], mid[2] + dx * w * 0.55],
      [mid[0] + dz * w * 0.55, mid[1], mid[2] - dx * w * 0.55],
      tip,
      stem,
    );
  }
  if (!bloom) return;
  for (let i = 0; i < 3; i++) {
    const tx = x + (rand() - 0.5) * h,
      tz = z + (rand() - 0.5) * h,
      ty = y + h * (1.05 + rand() * 0.65);
    post(batch, [x, y, z], [tx, ty, tz], 0.0027, 0.0022, '#79804e', 3);
    const r = 0.014 + 0.012 * rand();
    for (let j = 0; j < 4; j++) {
      const a = (j * TAU) / 4,
        b = a + 0.92,
        c = a - 0.92;
      batch.quad(
        [tx, ty - 0.007, tz],
        [tx + Math.cos(c) * r * 0.78, ty + 0.005, tz + Math.sin(c) * r * 0.78],
        [tx + Math.cos(a) * r, ty + 0.009, tz + Math.sin(a) * r],
        [tx + Math.cos(b) * r * 0.78, ty + 0.005, tz + Math.sin(b) * r * 0.78],
        bloom,
      );
    }
    batch.tri([tx - r * 0.18, ty, tz], [tx + r * 0.2, ty, tz], [tx, ty, tz + r * 0.23], '#a17e3c');
  }
}

function makeVerges() {
  const land = geometryBatch(),
    details = geometryBatch(),
    rand = randomSource(7281992);
  const beachEdge = (x) =>
    -2.5 -
    0.23 * Math.sin(((x * TAU) / SHORE_TILE) * 2) -
    0.09 * Math.cos(((x * TAU) / SHORE_TILE) * 7);
  for (let i = 0; i < 80; i++) {
    const x = i * 0.5 - SHORE_TILE / 2,
      xx = x + 0.5;
    const z = beachEdge(x),
      zz = beachEdge(xx),
      y = shoreHeight(x),
      yy = shoreHeight(xx);
    const roadEdge = (s) => -1.59 + 0.017 * Math.sin(((s * TAU) / SHORE_TILE) * 11);
    land.quad(
      [x, 0.006, roadEdge(x)],
      [xx, 0.006, roadEdge(xx)],
      [xx, yy, zz],
      [x, y, z],
      '#c3b783',
    );
    land.quad(
      [x, y, z],
      [xx, yy, zz],
      [xx, yy - 0.22, zz - 0.07],
      [x, y - 0.22, z - 0.07],
      stone[1 + (i % 3)],
    );
    land.quad(
      [x, y - 0.22, z - 0.07],
      [xx, yy - 0.22, zz - 0.07],
      [xx, SEA_LEVEL - 0.15, zz - 0.51],
      [x, SEA_LEVEL - 0.15, z - 0.51],
      stone[(i >> 1) % 5],
    );
    const verge = (s) => 1.57 + 0.025 * Math.sin(((s * TAU) / SHORE_TILE) * 7);
    land.quad(
      [x, 0.006, verge(x)],
      [x, 0.065, 2.8],
      [xx, 0.065, 2.8],
      [xx, 0.006, verge(xx)],
      '#c5b57e',
    );
    land.quad([x, 0.065, 2.8], [x, 0.01, 68], [xx, 0.01, 68], [xx, 0.065, 2.8], '#b6ac77');
  }
  for (let i = 0; i < 184; i++) {
    const anchor = (rand() - 0.5) * (SHORE_TILE - 0.86);
    const near = i % 2 === 0,
      depth = near ? 1.73 + rand() * 2.37 : -1.8 - rand() * 0.39;
    const blooms = rand();
    const flower =
      blooms > 0.77 ? '#da6d49' : blooms > 0.64 ? '#edbb4e' : blooms > 0.52 ? '#f3e9cb' : null;
    const count = 3 + Math.floor(rand() * 5);
    for (let j = 0; j < count; j++) {
      const x = anchor + (rand() - 0.5) * 0.6,
        z = depth + (rand() - 0.5) * 0.23;
      const y = near ? 0.009 + Math.min(1, (z - 1.57) / 1.23) * 0.056 : 0.028;
      grasses(details, x, y, z, rand, j < 3 ? flower : null);
      if (j === 0 && i % 4 === 0) {
        const size = 0.032 + rand() * 0.074;
        rock(
          details,
          x + 0.12,
          y + 0.004,
          z,
          size * 1.4,
          size * 0.44,
          size * 0.83,
          stone[i % 5],
          rand,
          5,
        );
      }
    }
  }
  for (let i = 0; i < 150; i++) {
    const x = (rand() - 0.5) * (SHORE_TILE - 0.36);
    const z = (rand() < 0.5 ? 1 : -1) * (1.33 + 0.25 * rand());
    const s = 0.011 + rand() * 0.022;
    details.tri(
      [x - s, 0.006, z],
      [x + s * 1.5, 0.006, z - 0.008],
      [x + s, 0.006, z + s * 0.42],
      i % 3 ? '#c5ad8f' : '#e5cfaf',
    );
  }
  // 小段已磨损的奶白路缘线，骑行时给轮速一个稳定的视觉参照。
  for (let i = 0; i < 10; i++) {
    const x = -19.6 + i * 4,
      length = 1.38 + rand() * 0.48;
    details.quad(
      [x, 0.004, -1.395],
      [x + length, 0.004, -1.394],
      [x + length - 0.025, 0.004, -1.37],
      [x + 0.008, 0.004, -1.366],
      '#eddbbb',
    );
  }
  for (const x of [-16, -9.6, 8, 14.4]) {
    const z = -2.17,
      y = shoreHeight(x) - 0.004;
    post(details, [x, y, z], [x, y + 0.24, z], 0.076, 0.066, '#d3bd94', 6);
    post(details, [x, y + 0.24, z], [x, y + 0.29, z], 0.066, 0.06, '#c87954', 6);
    post(details, [x, y + 0.29, z], [x, y + 0.32, z], 0.06, 0.043, '#e1caa2', 6);
  }
  addWildflowers(details, rand);
  const group = new THREE.Group(),
    ground = land.mesh(),
    plants = details.mesh();
  ground.receiveShadow = true;
  group.add(ground, plants);
  return group;
}

// 海岬的每个站点记录沿岸位置和高度，分段地层及顶面的陆地连续连接。
function headland(batch, coords, farZ, shades, roof) {
  for (let i = 0; i < coords.length - 1; i++) {
    const [x, z, h] = coords[i],
      [xx, zz, hh] = coords[i + 1];
    const a = [x, SEA_LEVEL + h, z],
      b = [xx, SEA_LEVEL + hh, zz];
    const c = [x + 0.07, SEA_LEVEL + h * 0.59, z + 0.08],
      d = [xx + 0.07, SEA_LEVEL + hh * 0.59, zz + 0.08];
    const e = [x - 0.11, SEA_LEVEL + 0.08, z + 0.17],
      f = [xx - 0.11, SEA_LEVEL + 0.08, zz + 0.17];
    batch.quad(a, b, d, c, shades[i % shades.length]);
    batch.quad(c, d, f, e, shades[(i + 2) % shades.length]);
    batch.quad(
      e,
      f,
      [xx, SEA_LEVEL - 0.06, zz + 0.3],
      [x, SEA_LEVEL - 0.06, z + 0.3],
      shades[(i + 1) % shades.length],
    );
    batch.quad(a, [x, a[1] - 0.04, farZ], [xx, b[1] - 0.04, farZ], b, roof);
  }
}

function lighthouse(batch, x, y, z) {
  const ring = (lo, hi, rb, rt, paint) =>
    post(batch, [x, y + lo, z], [x, y + hi, z], rb, rt, paint, 16);
  ring(0, 0.16, 0.48, 0.42, '#d0b391');
  ring(0.16, 1.32, 0.36, 0.297, '#efe5cb');
  ring(1.32, 1.84, 0.297, 0.27, '#b85c4a');
  ring(1.84, 2.29, 0.27, 0.244, '#f5ebcf');
  ring(2.29, 2.41, 0.33, 0.36, '#bd6851');
  ring(2.41, 2.47, 0.36, 0.35, '#e4cbaa');
  ring(2.47, 2.53, 0.233, 0.233, '#59746d');
  ring(2.53, 2.81, 0.216, 0.216, '#a7c7bd');
  for (let i = 0; i < 8; i++) {
    const angle = (i * TAU) / 8,
      xx = x + 0.214 * Math.cos(angle),
      zz = z + 0.214 * Math.sin(angle);
    post(batch, [xx, y + 2.53, zz], [xx, y + 2.82, zz], 0.017, 0.017, '#65726a', 5);
    const ax = x + 0.32 * Math.cos(angle),
      az = z + 0.32 * Math.sin(angle);
    post(batch, [ax, y + 2.45, az], [ax, y + 2.59, az], 0.012, 0.011, '#817f6b', 4);
    post(
      batch,
      [ax, y + 2.59, az],
      [x + 0.32 * Math.cos(angle + TAU / 8), y + 2.59, z + 0.32 * Math.sin(angle + TAU / 8)],
      0.014,
      0.014,
      '#817f6b',
      4,
    );
  }
  ring(2.81, 2.87, 0.286, 0.29, '#ac5a4a');
  ring(2.87, 3.09, 0.29, 0.037, '#b7604d');
  ring(3.09, 3.2, 0.031, 0.013, '#676b61');
  for (const [h, r] of [
    [0.5, 0.34],
    [1.11, 0.301],
    [1.98, 0.257],
  ]) {
    batch.quad(
      [x - 0.044, y + h, z + r],
      [x + 0.044, y + h, z + r],
      [x + 0.044, y + h + 0.126, z + r - 0.004],
      [x - 0.044, y + h + 0.126, z + r - 0.004],
      '#707c71',
    );
  }
}

function cottage(batch, x, y, z, s) {
  const a = x - 0.5 * s,
    b = x + 0.5 * s,
    c = z - 0.36 * s,
    d = z + 0.36 * s,
    h = y + 0.46 * s;
  batch.quad([a, y, d], [b, y, d], [b, h, d], [a, h, d], '#e8d5ae');
  batch.quad([a, y, c], [a, y, d], [a, h, d], [a, h, c], '#d6bf96');
  batch.quad([b, y, d], [b, y, c], [b, h, c], [b, h, d], '#ddc9a5');
  const peak = h + 0.27 * s;
  batch.tri([a, h, d], [a, h, c], [a, peak, z], '#e9d6ab');
  batch.tri([b, h, c], [b, h, d], [b, peak, z], '#d6c19d');
  batch.quad(
    [a - 0.04 * s, peak, z],
    [b + 0.04 * s, peak, z],
    [b + 0.04 * s, h - 0.01 * s, d + 0.04 * s],
    [a - 0.04 * s, h - 0.01 * s, d + 0.04 * s],
    '#b57357',
  );
  batch.quad(
    [a - 0.04 * s, h - 0.01 * s, c - 0.04 * s],
    [b + 0.04 * s, h - 0.01 * s, c - 0.04 * s],
    [b + 0.04 * s, peak, z],
    [a - 0.04 * s, peak, z],
    '#c78466',
  );
  for (const dx of [-0.25, 0.24]) {
    const xx = x + dx * s;
    batch.quad(
      [xx - 0.055 * s, y + 0.16 * s, d + 0.004],
      [xx + 0.055 * s, y + 0.16 * s, d + 0.004],
      [xx + 0.055 * s, y + 0.34 * s, d + 0.004],
      [xx - 0.055 * s, y + 0.34 * s, d + 0.004],
      '#839684',
    );
  }
}

function buildHarbor() {
  const batch = geometryBatch(),
    rand = randomSource(720064);
  const shore = [
    [0.4, -17.6, 0.13],
    [0.72, -16.5, 0.23],
    [1.05, -15.4, 0.45],
    [1.7, -14.3, 0.82],
    [2.35, -13.65, 1.14],
    [3.3, -13.38, 1.26],
    [4.5, -13.09, 1.35],
    [6, -13.6, 1.45],
    [7.45, -13.94, 1.26],
    [8.4, -13.76, 1.31],
    [10.3, -13.94, 1.48],
    [12.45, -14.6, 1.67],
    [15.7, -14.48, 1.74],
    [18.2, -13.5, 1.74],
    [24.1, -11.6, 2.2],
    [34, -9.5, 2.8],
    [36, -10.8, 2.2],
    [38.4, -13.6, 1.45],
    [40.1, -16.8, 0.91],
    [42, -21.5, 0.39],
    [43.1, -24, 0.07],
  ];
  headland(batch, shore, -24, ['#cfad8c', '#ddc09b', '#bd9e83', '#d4b79a', '#cfb19b'], '#a9a976');
  lighthouse(batch, 3.18, SEA_LEVEL + 1.22, -13.94);
  cottage(batch, 4.35, SEA_LEVEL + 1.31, -14.17, 1.05);
  const heath = ['#929769', '#9aa072', '#a7a078', '#b3a981'];
  for (let i = 0; i < 92; i++) {
    const t = rand() * 11.8 + 0.4,
      k = Math.floor(t),
      f = t - k;
    const [x, z, h] = shore[k],
      [xx, zz, hh] = shore[k + 1];
    const size = 0.07 + rand() * 0.19,
      dx = x + (xx - x) * f;
    const dz = z + (zz - z) * f - 0.07 - rand() * 0.81;
    if (Math.abs(dx - 3.18) < 0.48 || Math.abs(dx - 4.35) < 0.58) continue;
    rock(
      batch,
      dx,
      SEA_LEVEL + h + (hh - h) * f + 0.005,
      dz,
      size * 1.4,
      size * 0.47,
      size * 0.73,
      heath[i % heath.length],
      rand,
      5,
    );
  }
  // 几层不连续的浅色石灰岩纹理，打散大岩面的几何分块。
  for (let i = 0; i < shore.length - 1; i++) {
    const [x, z, h] = shore[i],
      [xx, zz, hh] = shore[i + 1];
    for (let j = 0; j < 4; j++) {
      const a = rand() * 0.48 + 0.04,
        b = Math.min(0.97, a + 0.16 + rand() * 0.47);
      const level = 0.18 + 0.58 * rand(),
        bump = 0.082 + (1 - level) * 0.19;
      const at = (t, delta) => [
        x + (xx - x) * t,
        SEA_LEVEL + (h + (hh - h) * t) * (level + delta),
        z + (zz - z) * t + bump,
      ];
      batch.quad(
        at(a, 0.009),
        at(b, 0.018),
        at(b, 0),
        at(a + (b - a) * 0.21, -0.019),
        ['#d9bfa2', '#c4a688', '#d3b797'][j % 3],
      );
    }
  }
  for (let i = 0; i < 13; i++) {
    const x = 5.46 + i * 0.92 + rand() * 0.75;
    pine(
      batch,
      x,
      0.53 + Math.max(0, x - 7) * 0.04,
      -14.8 - rand() * 2.9,
      0.66 + rand() * 0.64,
      rand,
    );
  }
  for (let i = 0; i < 27; i++) {
    const t = rand() * (shore.length - 1),
      k = Math.floor(t),
      f = t - k;
    const [x, z] = shore[k],
      [xx, zz] = shore[k + 1];
    const r = 0.14 + rand() * 0.31;
    rock(
      batch,
      x + (xx - x) * f,
      SEA_LEVEL + 0.025,
      z + (zz - z) * f + 0.21 + rand() * 0.44,
      r * 1.46,
      r * 0.6,
      r * 0.85,
      stone[i % 5],
      rand,
    );
  }
  return batch.mesh();
}

function buildHills() {
  const batch = geometryBatch(),
    rand = randomSource(83421);
  function ridge(x0, x1, z0, base, low, amplitude, paint, seed) {
    const profile = (x) =>
      low +
      amplitude *
        (0.5 + 0.5 * Math.cos(x * 0.085 + seed)) *
        (0.55 + 0.45 * Math.cos(x * 0.185 + seed * 0.87)) +
      0.07 * amplitude * Math.sin(x * 0.46 + seed);
    const n = 40;
    for (let i = 0; i < n; i++) {
      const x = THREE.MathUtils.lerp(x0, x1, i / n),
        xx = THREE.MathUtils.lerp(x0, x1, (i + 1) / n);
      batch.quad([x, base, z0], [xx, base, z0], [xx, profile(xx), z0], [x, profile(x), z0], paint);
    }
  }
  ridge(-92, 95, -56, SEA_LEVEL, -0.08, 4.3, '#a6bcb4', 3);
  ridge(-90, 92, -47, SEA_LEVEL, -0.46, 2.85, '#93ada4', 5);
  const left = [
    [-90, -25, 6.1],
    [-37, -26, 4.4],
    [-32, -26.8, 4.1],
    [-28, -27.35, 3.2],
    [-25.5, -27.9, 3.25],
    [-24.2, -28.3, 2.7],
    [-23.3, -28.9, 2.57],
    [-21, -29.3, 2.35],
    [-20, -29.77, 1.98],
    [-18.5, -29.8, 1.85],
    [-16.7, -29.2, 1.7],
    [-15.7, -30, 1.43],
    [-15, -30, 1.2],
    [-13.3, -30.2, 0.76],
    [-12.8, -30.2, 0.7],
    [-11.9, -31, 0.35],
    [-11, -30.79, 0.3],
    [-10.2, -31.1, 0.11],
  ];
  headland(batch, left, -35, ['#9fae9d', '#a4b0a0', '#b1b9a7', '#a8b3a0'], '#94aa94');
  for (let i = 0; i < 32; i++) {
    const t = 3 + rand() * 10,
      k = Math.floor(t),
      f = t - k;
    const [x, z, h] = left[k],
      [xx, zz, hh] = left[k + 1];
    const size = 0.36 + rand() * 0.88;
    rock(
      batch,
      x + (xx - x) * f,
      SEA_LEVEL + h + (hh - h) * f - 0.02,
      z + (zz - z) * f - 0.7,
      size,
      size * 0.28,
      size * 0.54,
      ['#93a58e', '#92a693', '#8fa18b'][i % 3],
      rand,
      6,
    );
    if (i % 3 === 0)
      pine(
        batch,
        x + (xx - x) * f,
        SEA_LEVEL + h + (hh - h) * f,
        z + (zz - z) * f - 0.72,
        0.28 + rand() * 0.45,
        rand,
        true,
      );
  }
  ridge(-91, 94, 47, -0.1, 0.8, 5.8, '#9aab8e', 6);
  for (let i = 0; i < 46; i++) {
    const x = -62 + i * 2.7 + rand() * 2;
    pine(batch, x, 0.008, 14 + rand() * 9, 1.8 + rand() * 1.8, rand);
  }
  return batch.mesh(true);
}

function boat(batch, x, z, scale, paint) {
  const y = SEA_LEVEL + 0.025,
    s = scale;
  const xyz = (a, b, c = 0) => [x + a * s, y + b * s, z + c * s];
  batch.quad(
    xyz(-0.75, 0.2),
    xyz(0.73, 0.22),
    xyz(0.46, 0.045, 0.13),
    xyz(-0.48, 0.03, 0.13),
    '#847f6d',
  );
  batch.quad(
    xyz(-0.68, 0.21, -0.05),
    xyz(-0.51, 0.05, -0.15),
    xyz(0.48, 0.07, -0.15),
    xyz(0.73, 0.22),
    '#bfa78b',
  );
  batch.quad(
    xyz(-0.75, 0.2),
    xyz(0.73, 0.22),
    xyz(0.56, 0.235, -0.11),
    xyz(-0.54, 0.22, -0.11),
    '#e4d7ba',
  );
  post(batch, xyz(-0.07, 0.2), xyz(-0.03, 1.95), 0.018 * s, 0.012 * s, '#9a9a82', 5);
  batch.tri(xyz(-0.1, 1.88), xyz(-0.17, 0.38, 0.016), xyz(-0.83, 0.38, -0.04), paint);
  batch.tri(xyz(0.0, 1.65), xyz(0.62, 0.34, -0.014), xyz(0.0, 0.47, 0.024), '#f3ecd5');
  batch.tri(xyz(-0.03, 1.95), xyz(-0.03, 2.03), xyz(-0.27, 1.96), '#c17659');
}

function makeBird() {
  const group = new THREE.Group(),
    wings = [];
  for (const side of [-1, 1]) {
    const b = geometryBatch();
    b.quad(
      [0, 0, 0],
      [0.17, 0.095, side * 0.26],
      [0.08, 0.12, side * 0.37],
      [-0.035, 0.022, side * 0.15],
      '#788e89',
    );
    b.tri(
      [0.17, 0.095, side * 0.26],
      [0.1, 0.042, side * 0.64],
      [0.08, 0.12, side * 0.37],
      '#788e89',
    );
    const wing = b.mesh(true);
    wings.push(wing);
    group.add(wing);
  }
  return { group, wings };
}

export function createCoast(scene) {
  const { road, travel } = makeRoad(),
    sea = makeSea(),
    verges = makeVerges();
  const tiles = [verges.clone(), verges, verges.clone()];
  const harbor = buildHarbor(),
    hills = buildHills();
  const boats = geometryBatch();
  boat(boats, -8.3, -16, 0.84, '#eadbc2');
  boat(boats, -1.4, -25, 0.6, '#dca383');
  boat(boats, 9.5, -25, 0.63, '#e2d5b8');
  const fleet = boats.mesh(true);
  const harbors = [harbor.clone(), harbor, harbor.clone()];
  const fleets = [fleet.clone(), fleet, fleet.clone()];
  const birds = Array.from({ length: 3 }, (_, i) => {
    const bird = makeBird();
    bird.group.rotation.y = Math.PI * 0.4;
    bird.group.scale.setScalar(0.5 + i * 0.095);
    scene.add(bird.group);
    return bird;
  });
  scene.add(road, sea, hills, ...harbors, ...fleets, ...tiles);
  function update(distance, time) {
    const shift =
      THREE.MathUtils.euclideanModulo(distance + SHORE_TILE / 2, SHORE_TILE) - SHORE_TILE / 2;
    for (let i = 0; i < 3; i++) tiles[i].position.x = (i - 1) * SHORE_TILE - shift;
    travel.value = THREE.MathUtils.euclideanModulo(distance, 512);
    sea.material.uniforms.uTravel.value = distance * 0.3;
    sea.material.uniforms.uTime.value = time;
    // 远景沿前进方向连续经过，重复单元在镜头外衔接。
    const harborShift = THREE.MathUtils.euclideanModulo(distance * 0.078 + 48, 96) - 48;
    const fleetShift = THREE.MathUtils.euclideanModulo(distance * 0.052 + 24, 48) - 24;
    for (let i = 0; i < 3; i++) {
      harbors[i].position.x = (i - 1) * 96 - harborShift;
      fleets[i].position.set((i - 1) * 48 - fleetShift, 0.014 * Math.sin(time * 1.08), 0);
    }
    birds.forEach(({ group, wings }, i) => {
      group.position.set(
        -8 + i * 1.6 + 1.8 * Math.sin(time * 0.086 + i * 0.64),
        4.25 + i * 0.42 + 0.14 * Math.sin(time * 0.5 + i),
        -27 - i * 1.4,
      );
      wings[0].rotation.x = 0.21 * Math.sin(time * 2.1 + i);
      wings[1].rotation.x = -wings[0].rotation.x;
    });
  }
  update(0, 0);
  return { update };
}
