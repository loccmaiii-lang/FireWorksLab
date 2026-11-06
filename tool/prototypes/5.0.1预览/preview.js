// 烟花工坊 5.0.1 预览：只挪位置、加类名，不改任何业务逻辑（按钮、滑杆、读数的事件都还是原来那个元素上的）
(function () {
  document.documentElement.classList.add('p501');
  const $ = s => document.querySelector(s);
  let tries = 0;
  const go = () => {
    const vb = $('#viewbar'), disp = $('#dispSeg'), read = $('#vfRead');
    if (!vb || !disp || !read) { if (tries++ < 200) setTimeout(go, 100); return; }
    if (vb.querySelector('.p501-br')) return;
    // 第二行：画面　[适应窗口 | 1:1 | 实机窗口]　[距离 1000 m ↔]　[预览曝光 1.00 倍 ↔]
    const br = document.createElement('i'); br.className = 'p501-br';
    const k = document.createElement('span'); k.className = 'p501-k'; k.textContent = '画面';
    vb.append(br, k, disp, read);
    // 版本号：顶栏写 5.0.1 预览，免得和正式 5.0.0 搞混
    let n = 0; const ver = () => { const v = $('.sh-ver'); if (v && v.firstChild && v.firstChild.nodeType === 3) v.firstChild.textContent = 'FireWorksLab 5.0.1 预览'; document.title = '烟花工坊 5.0.1 预览'; if (n++ < 20) setTimeout(ver, 500); };
    ver();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
