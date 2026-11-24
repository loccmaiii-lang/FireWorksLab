import * as THREE from 'three';
import { createBicycle, ROLL_PER_RAD } from './bicycle.js';
import { createPelican } from './pelican.js';
import { createCoast } from './coast.js';
import { makeSky } from './sky.js';

const TAU = Math.PI * 2;
const clamp = THREE.MathUtils.clamp;
const presets = {
  coast: { az: 0.18, el: 0.085, radius: 7.55, y: 1.68, x: 0, shift: 0.13, drop: 0.035 },
  follow: { az: -1.04, el: 0.19, radius: 6.6, y: 1.55, x: -0.1, shift: 0, drop: 0 },
  drive: { az: 0.1, el: 0.12, radius: 4.15, y: 1.0, x: -0.09, shift: 0, drop: 0 },
};

export function startScene(canvas, callbacks, reducedMotion) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const world = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(36, 1, 0.035, 230);
  world.add(makeSky());
  world.fog = new THREE.FogExp2(0xc2d7cb, 0.015);
  world.add(new THREE.HemisphereLight(0xeff9ff, 0xe4dac5, 1.85));
  const sun = new THREE.DirectionalLight(0xfff1db, 2.23);
  sun.position.set(-4.5, 7, 3.7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.1, far: 18 });
  sun.shadow.normalBias = 0.012;
  sun.shadow.bias = -0.00018;
  sun.shadow.radius = 2;
  sun.shadow.camera.updateProjectionMatrix();
  world.add(sun);
  const rim = new THREE.DirectionalLight(0xfff6e1, 0.65);
  rim.position.set(1, 3, -5);
  world.add(rim);
  const coast = createCoast(world),
    bicycle = createBicycle(),
    pelican = createPelican();
  world.add(bicycle.group, pelican.group);

  const target = { ...presets.coast },
    current = { ...target };
  let preset = 'coast',
    free = false,
    width = 1,
    height = 1,
    needsPaint = true;
  let running = !reducedMotion,
    rate = 1,
    travelled = 0,
    sceneTime = 0;
  const startingPhase = 0.67,
    cadence = (TAU * 52) / 60;
  const pointers = new Map();
  let lastGrip = null,
    dragLength = 0,
    tapStart = null;
  const raycaster = new THREE.Raycaster();

  function frameCamera() {
    camera.position.set(
      current.x + Math.sin(current.az) * Math.cos(current.el) * current.radius,
      current.y + Math.sin(current.el) * current.radius,
      Math.cos(current.az) * Math.cos(current.el) * current.radius,
    );
    camera.lookAt(current.x, current.y, 0);
    camera.setViewOffset(
      width,
      height,
      -width * current.shift,
      -height * current.drop,
      width,
      height,
    );
  }
  function select(name, instant = false) {
    const mobile = width / height < 1.13;
    const pose = { ...presets[name] };
    if (mobile && name === 'coast') Object.assign(pose, { radius: 9.8, shift: 0.046, drop: 0.126 });
    if (mobile && name === 'drive') pose.radius = 5.4;
    // 从当前角度沿较短路径切入新机位。
    pose.az =
      current.az + THREE.MathUtils.euclideanModulo(pose.az - current.az + Math.PI, TAU) - Math.PI;
    Object.assign(target, pose);
    if (instant || reducedMotion) Object.assign(current, target);
    preset = name;
    free = false;
    needsPaint = true;
    callbacks.view(name, false);
  }
  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    if (!free) select(preset, true);
    needsPaint = true;
    frameCamera();
  }
  function explore() {
    if (!free) {
      free = true;
      target.shift = 0;
      target.drop = 0;
      callbacks.view(preset, true);
    }
  }
  function zoom(factor) {
    explore();
    target.radius = clamp(target.radius * factor, 2.7, 14);
  }
  function rotate(dx, dy) {
    explore();
    target.az -= dx;
    target.el = clamp(target.el + dy, -0.035, 0.93);
  }
  function grip() {
    const [a, b] = pointers.values();
    return b
      ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, span: Math.hypot(a.x - b.x, a.y - b.y) }
      : { ...a, span: 0 };
  }
  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || pointers.size >= 2) return;
    canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    lastGrip = grip();
    if (pointers.size === 1) {
      dragLength = 0;
      tapStart = { ...lastGrip };
    } else {
      dragLength = 10;
      tapStart = null;
    }
    canvas.classList.add('dragging');
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const now = grip(),
      dx = now.x - lastGrip.x,
      dy = now.y - lastGrip.y;
    dragLength += Math.hypot(dx, dy);
    if (dragLength > 4) {
      rotate((dx * 4) / height, (dy * 2.7) / height);
      if (now.span > 0 && lastGrip.span > 0) zoom(lastGrip.span / now.span);
    }
    lastGrip = now;
  });
  function release(event) {
    if (!pointers.delete(event.pointerId)) return;
    if (event.type === 'pointerup' && tapStart && dragLength <= 4 && !pointers.size) {
      const rect = canvas.getBoundingClientRect();
      raycaster.setFromCamera(
        new THREE.Vector2(
          ((event.clientX - rect.left) / width) * 2 - 1,
          1 - ((event.clientY - rect.top) / height) * 2,
        ),
        camera,
      );
      if (raycaster.intersectObjects([bicycle.group, pelican.group], true).length) callbacks.bell();
    }
    tapStart = null;
    if (pointers.size) lastGrip = grip();
    else canvas.classList.remove('dragging');
  }
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'])
    canvas.addEventListener(type, release);
  canvas.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      const pixels =
        event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1);
      zoom(Math.exp(clamp(pixels, -160, 160) * 0.0016));
    },
    { passive: false },
  );
  let previous = null,
    lastMeter = -1;
  function render(now) {
    const dt = previous === null ? 0 : Math.min((now - previous) / 1000, 0.075);
    previous = now;
    if (document.hidden) return;
    const advancing = running && !document.querySelector('dialog[open]');
    if (advancing) {
      sceneTime += dt * rate;
      travelled += cadence * dt * rate * ROLL_PER_RAD;
    }
    if (
      !advancing &&
      !needsPaint &&
      !Object.keys(target).some((key) => Math.abs(target[key] - current[key]) > 0.00001)
    )
      return;
    needsPaint = false;
    const phase = startingPhase + travelled / ROLL_PER_RAD;
    bicycle.update(phase);
    pelican.update(phase);
    coast.update(travelled, sceneTime);
    const blend = reducedMotion ? 1 : 1 - Math.exp(-9 * dt);
    for (const key of Object.keys(target)) current[key] += (target[key] - current[key]) * blend;
    frameCamera();
    renderer.render(world, camera);
    const meter = Math.floor(travelled / 10);
    if (lastMeter !== meter) {
      lastMeter = meter;
      callbacks.distance((meter / 100).toFixed(2));
    }
    callbacks.zoomLimits(target.radius <= 2.701, target.radius >= 13.999);
  }
  new ResizeObserver(resize).observe(canvas);
  resize();
  renderer.setAnimationLoop(render);
  document.addEventListener('visibilitychange', () => {
    previous = null;
  });
  return {
    select,
    zoom,
    rotate,
    setRunning(value) {
      running = value;
    },
    setRate(value) {
      rate = value;
    },
  };
}
