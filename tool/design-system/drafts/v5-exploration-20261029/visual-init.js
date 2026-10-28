// 在首个控件创建前选择视觉，避免浅色首帧闪回原深色主题。
(() => {
  const direction=new URLSearchParams(location.search).get('direction')||'graphite';
  if(['graphite','porcelain','indigo'].includes(direction))document.body.dataset.visual=direction;
})();
