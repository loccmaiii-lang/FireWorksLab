const tau = 2 * Math.PI;
const leaves = ['#708047', '#84934d', '#536c45', '#93a060', '#9a9b59'];
const poppy = ['#ee472e', '#d93429', '#fa5b3e', '#e5462d', '#fc6b45'];
const daisy = ['#fff8de', '#fff3cb', '#fffbe8', '#f4e5bb', '#fff8dd'];

// 花盘略仰起并朝向不同方位，花瓣向杯口卷起，花心比花瓣根部更突出。
function corolla(batch, center, r, red, rand) {
  const yaw = (rand() - 0.5) * 1.55,
    tilt = 0.59 + 0.57 * rand();
  const cx = Math.cos(yaw),
    sx = Math.sin(yaw),
    ct = Math.cos(tilt),
    st = Math.sin(tilt);
  const at = (angle, reach, lift) => {
    const x = r * reach * Math.cos(angle),
      y = r * reach * Math.sin(angle),
      z = r * lift;
    return [
      center[0] + cx * x - sx * st * y + sx * ct * z,
      center[1] + ct * y + st * z,
      center[2] - sx * x - cx * st * y + cx * ct * z,
    ];
  };
  const rotation = rand() * tau,
    palette = red ? poppy : daisy;
  const spread = red ? 0.61 : 0.41,
    cup = red ? 0.39 : 0.15;
  const hub = at(0, 0, red ? 0.23 : 0.25);
  for (let i = 0; i < 5; i++) {
    const a = rotation + (i * tau) / 5;
    const reach = 0.92 + rand() * 0.16;
    const root = at(a, 0.13, 0.02);
    const left = at(a - spread, 0.7, cup * 0.64);
    const right = at(a + spread, 0.7, cup * 0.71);
    const lipL = at(a - spread * 0.55, reach, cup);
    const lipR = at(a + spread * 0.58, reach * 0.95, cup * 1.14);
    const crease = at(a + 0.026, 0.62, cup * 0.42);
    batch.tri(root, left, crease, palette[(i + 1) % 5]);
    batch.quad(left, lipL, lipR, crease, palette[i]);
    batch.quad(crease, lipR, right, root, palette[(i + 3) % 5]);
    batch.tri(
      hub,
      at(a, 0.27, 0.09),
      at(a + tau / 5, 0.27, 0.09),
      red ? (i % 2 ? '#593c2d' : '#70412c') : i % 2 ? '#ffd143' : '#e9ac26',
    );
  }
}

function flower(batch, x, y, z, size, red, rand) {
  const h = size * (0.15 + rand() * 0.245);
  const drift = (rand() - 0.45) * 0.115,
    side = (rand() - 0.5) * 0.052;
  const mid = [x + drift * 0.28, y + h * 0.56, z + side * 0.35];
  const top = [x + drift, y + h, z + side];
  const w = 0.0048 * size;
  batch.quad(
    [x - w, y, z],
    [x + w, y, z],
    [mid[0] + w, mid[1], mid[2]],
    [mid[0] - w, mid[1], mid[2]],
    '#728045',
  );
  batch.quad(
    [mid[0] - w, mid[1], mid[2]],
    [mid[0] + w, mid[1], mid[2]],
    [top[0] + w * 0.6, top[1], top[2]],
    [top[0] - w * 0.6, top[1], top[2]],
    '#657642',
  );
  const lean = rand() < 0.5 ? -1 : 1;
  const leaf = [mid[0] + lean * 0.04, mid[1] + 0.023, mid[2] + 0.012];
  const tip = [mid[0] + lean * 0.09, mid[1] + 0.052, mid[2] - 0.003];
  batch.tri(mid, leaf, tip, '#71844d');
  corolla(batch, top, size * (0.033 + 0.022 * rand()), red, rand);
}

function tussock(batch, x, y, z, size, rand, count) {
  for (let i = 0; i < count; i++) {
    const a = rand() * tau,
      dx = Math.cos(a),
      dz = Math.sin(a);
    const baseX = x + (rand() - 0.5) * 0.18,
      baseZ = z + (rand() - 0.5) * 0.1;
    const w = size * (0.009 + rand() * 0.011),
      h = size * (0.1 + rand() * 0.18);
    const bow = size * (0.036 + rand() * 0.092);
    const baseL = [baseX - dz * w, y, baseZ + dx * w],
      baseR = [baseX + dz * w, y, baseZ - dx * w];
    const mid = [baseX + dx * bow * 0.28, y + h * 0.67, baseZ + dz * bow * 0.28];
    const midL = [mid[0] - dz * w * 0.52, mid[1], mid[2] + dx * w * 0.52];
    const midR = [mid[0] + dz * w * 0.52, mid[1], mid[2] - dx * w * 0.52];
    const tip = [baseX + dx * bow, y + h, baseZ + dz * bow];
    batch.quad(baseL, baseR, midR, midL, leaves[i % 5]);
    batch.tri(midL, midR, tip, leaves[(i + 1) % 5]);
    if (i === 1 || i === 7) {
      // 细长禾穗分成三个小穗，草丛中留出透光的间隙。
      for (let j = 0; j < 3; j++) {
        const stem = [tip[0] + dx * j * 0.009, tip[1] + j * 0.011, tip[2] + dz * j * 0.009];
        const side = j % 2 ? -1 : 1;
        batch.tri(
          stem,
          [stem[0] + 0.008 * side, stem[1] + 0.015, stem[2]],
          [stem[0] + 0.013 * side + dx * 0.014, stem[1] + 0.036, stem[2] + dz * 0.014],
          '#c6aa67',
        );
      }
    }
  }
}

export function addWildflowers(batch, rand) {
  for (const near of [true, false]) {
    const count = near ? 15 : 10;
    for (let i = 0; i < count; i++) {
      const x = -19.65 + ((i + 0.5) * 39.3) / count + (rand() - 0.5) * 0.48;
      const z = near ? 1.87 + rand() * 0.43 : -1.9 - rand() * 0.22;
      const size = near ? 1 : 0.77;
      const floor = near ? 0.006 + (z - 1.57) * 0.048 : 0.019 + 0.009 * Math.sin((x * tau) / 8);
      const blooms = near ? [6, 8, 5, 9, 7][i % 5] : [4, 5, 4, 6, 3][i % 5];
      const mostlyRed = i % 5 === 0 || i % 5 === 2 || i % 5 === 3;
      for (let j = 0; j < blooms; j++) {
        const t = (j / blooms) * tau + rand() * 0.63,
          spread = 0.46 + rand() * 0.54;
        const bx = x + Math.cos(t) * spread * 0.4,
          bz = z + Math.sin(t) * spread * 0.12;
        const red = rand() < (mostlyRed ? 0.82 : 0.18);
        flower(batch, bx, floor, bz, size, red, rand);
      }
      tussock(batch, x - 0.14, floor, z + 0.04, size, rand, near ? 13 : 7);
      if (near) tussock(batch, x + 0.38, floor, z - 0.05, 0.78, rand, 5);
    }
  }
}
