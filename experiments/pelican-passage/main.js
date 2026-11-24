import { startScene } from './scene.js';

const el = (id) => document.getElementById(id);
const dialog = el('info'),
  viewport = el('viewport'),
  canvas = el('scene');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let running = !reducedMotion,
  scene,
  guideTrigger = null;
const sections = {
  notes: {
    kicker: 'FIELD NOTES',
    title: '海岸骑行手记',
    body: '<p>这段虚构的法国海岸公路上，一只系着红领巾的鹈鹕骑过石灰岩海岬。远处的灯塔、白帆和近处的野花，都由几何体在现场绘出。</p><p>切到「传动」镜头，可以看清左右蹼足相隔半圈踩踏。每转一圈，40 齿牙盘带动 16 齿飞轮转过两圈半；鸟的跗关节会随踏板位置屈伸，翼尖始终搭在车把上。</p>',
  },
  help: {
    kicker: 'FIELD GUIDE',
    title: '操作指南',
    body: '<dl><dt>环视</dt><dd>拖动画面，或聚焦画面后按方向键。</dd><dt>缩放</dt><dd>滚轮、双指捏合或使用画面右下角的加减按钮。</dd><dt>播放</dt><dd>空格暂停或继续骑行。速度按钮调节踩踏节奏。</dd><dt>镜头</dt><dd>选择「海岸」「跟骑」「传动」，或按数字键 1、2、3。</dd><dt>车铃</dt><dd>轻点骑手或自行车，或按 B 键。</dd></dl>',
  },
};
function openSection(key, trigger) {
  const { kicker, title, body } = sections[key];
  el('dialog-kicker').textContent = kicker;
  el('dialog-title').textContent = title;
  el('dialog-body').innerHTML = body;
  guideTrigger = trigger;
  dialog.setAttribute('aria-labelledby', 'dialog-title');
  dialog.showModal();
}
el('notes-open').onclick = (e) => openSection('notes', e.currentTarget);
el('help-open').onclick = (e) => openSection('help', e.currentTarget);
el('dialog-close').onclick = () => dialog.close();
dialog.addEventListener('click', (event) => {
  const rect = dialog.getBoundingClientRect();
  if (
    event.target === dialog &&
    (event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom)
  )
    dialog.close();
});
dialog.addEventListener('close', () => guideTrigger?.focus());

// 风声和车铃都由 Web Audio 合成。用户触发声音时才创建音频上下文。
let audio = null,
  wind = null,
  soundOn = false;
function audioContext() {
  if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
  if (audio.state === 'suspended') audio.resume().catch(() => {});
  return audio;
}
function ringBell() {
  if (!window.AudioContext && !window.webkitAudioContext) return;
  const ctx = audioContext();
  for (const delay of [0, 0.105]) {
    for (const [freq, gain, decay] of [
      [1468, 0.075, 0.7],
      [2765, 0.031, 0.42],
      [3891, 0.011, 0.23],
    ]) {
      const start = ctx.currentTime + 0.008 + delay,
        osc = ctx.createOscillator(),
        volume = ctx.createGain();
      osc.frequency.setValueAtTime(freq * (delay ? 1.008 : 1), start);
      volume.gain.setValueAtTime(0.0001, start);
      volume.gain.exponentialRampToValueAtTime(gain, start + 0.003);
      volume.gain.exponentialRampToValueAtTime(0.0001, start + decay);
      osc.connect(volume).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + decay + 0.01);
      osc.onended = () => {
        osc.disconnect();
        volume.disconnect();
      };
    }
  }
}
function makeWind(ctx) {
  const size = ctx.sampleRate * 4,
    buffer = ctx.createBuffer(1, size, ctx.sampleRate),
    data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < size; i++) {
    last = (last + (Math.random() * 2 - 1) * 0.025) / 1.025;
    data[i] = last * 4;
  }
  const noise = ctx.createBufferSource(),
    filter = ctx.createBiquadFilter(),
    gain = ctx.createGain();
  const swell = ctx.createOscillator(),
    amount = ctx.createGain();
  noise.buffer = buffer;
  noise.loop = true;
  filter.type = 'lowpass';
  filter.frequency.value = 730;
  swell.frequency.value = 0.12;
  amount.gain.value = 250;
  swell.connect(amount).connect(filter.frequency);
  gain.gain.value = 0;
  noise.connect(filter).connect(gain).connect(ctx.destination);
  noise.start();
  swell.start();
  return gain;
}
function updateSound() {
  if (!wind) return;
  const level = soundOn && !document.hidden ? 0.18 : 0;
  wind.gain.setTargetAtTime(level, audio.currentTime, 0.15);
}
el('sound').onclick = () => {
  if (!window.AudioContext && !window.webkitAudioContext) return;
  const ctx = audioContext();
  if (!wind) wind = makeWind(ctx);
  soundOn = !soundOn;
  el('sound').setAttribute('aria-pressed', String(soundOn));
  el('sound-value').textContent = soundOn ? '开' : '关';
  updateSound();
};
document.addEventListener('visibilitychange', updateSound);

function syncPlayback() {
  el('state-label').textContent = running ? '骑行中' : '已暂停';
  el('play').classList.toggle('paused', !running);
  el('play').setAttribute('aria-label', running ? '暂停骑行' : '继续骑行');
  el('live').classList.toggle('still', !running);
  el('live').querySelector('span').textContent = running ? 'LIVE VIEW' : 'PAUSED';
}
function togglePlayback() {
  running = !running;
  scene.setRunning(running);
  syncPlayback();
}
function selectButtons(container, key, value) {
  for (const button of el(container).querySelectorAll('button')) {
    button.setAttribute('aria-pressed', String(button.dataset[key] === value));
  }
}
function changeView(preset, free) {
  viewport.classList.toggle('exploring', free || preset !== 'coast');
  selectButtons('cameras', 'cam', free ? '' : preset);
  el('gesture-text').textContent = free
    ? '自由视角'
    : { coast: '拖动环视', follow: '跟骑视角', drive: '传动特写' }[preset];
}
async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await viewport.requestFullscreen();
  } catch {
    el('fullscreen').disabled = true;
  }
}
function showError(detail) {
  el('error').hidden = false;
  el('error').textContent = detail;
  el('live').hidden = true;
  for (const id of ['play', 'zoom-in', 'zoom-out', 'ride-tab']) el(id).disabled = true;
  for (const button of document.querySelectorAll('.switch button')) button.disabled = true;
  el('state-label').textContent = '画面未就绪';
}
try {
  scene = startScene(
    canvas,
    {
      view: changeView,
      bell: ringBell,
      distance(value) {
        el('distance').textContent = value;
      },
      zoomLimits(near, far) {
        el('zoom-in').disabled = near;
        el('zoom-out').disabled = far;
      },
    },
    reducedMotion,
  );
  el('play').onclick = togglePlayback;
  el('ride-tab').onclick = () => scene.select('coast');
  el('zoom-out').onclick = () => scene.zoom(1.16);
  el('zoom-in').onclick = () => scene.zoom(1 / 1.16);
  for (const button of el('rates').querySelectorAll('button'))
    button.onclick = () => {
      selectButtons('rates', 'rate', button.dataset.rate);
      scene.setRate(Number(button.dataset.rate));
    };
  for (const button of el('cameras').querySelectorAll('button'))
    button.onclick = () => scene.select(button.dataset.cam);
  syncPlayback();
} catch (error) {
  console.error(error);
  showError('无法启动三维场景。请使用支持 WebGL 2 的浏览器，并检查硬件加速设置。');
}
canvas.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  showError('图形上下文已中断。刷新页面即可重新开始骑行。');
});
el('fullscreen').onclick = toggleFullscreen;
if (!document.fullscreenEnabled) el('fullscreen').hidden = true;
document.addEventListener('fullscreenchange', () => {
  el('fullscreen').setAttribute('aria-label', document.fullscreenElement ? '退出全屏' : '进入全屏');
});
document.addEventListener('keydown', (event) => {
  if (!scene || dialog.open || event.metaKey || event.ctrlKey || event.altKey) return;
  const key = event.key;
  if (key === ' ' && (event.target.tagName === 'BUTTON' || event.repeat)) return;
  if (key === ' ') togglePlayback();
  else if (key === '+' || key === '=') scene.zoom(1 / 1.12);
  else if (key === '-') scene.zoom(1.12);
  else if (['1', '2', '3'].includes(key))
    scene.select(['coast', 'follow', 'drive'][Number(key) - 1]);
  else if (key.toLowerCase() === 'b' && !event.repeat) ringBell();
  else if (event.target === canvas && key.startsWith('Arrow')) {
    const sign = key === 'ArrowLeft' || key === 'ArrowDown' ? -1 : 1;
    scene.rotate(
      key === 'ArrowLeft' || key === 'ArrowRight' ? sign * 0.1 : 0,
      key === 'ArrowDown' || key === 'ArrowUp' ? sign * 0.07 : 0,
    );
  } else return;
  event.preventDefault();
});
