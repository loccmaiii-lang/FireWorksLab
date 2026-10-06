// =====================================================================
//  更新记录：build.py 把仓库根目录的 更新记录.md 嵌进来（UPDATES），这里显示；有没看过的新条目时按钮上亮一个点
// =====================================================================
function mdLite(t) {
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  let html = '', inList = false;
  for (const raw of t.split('\n')) {
    const l = raw.replace(/\s+$/, '');
    const m = l.match(/^(\s*)- (.*)$/);
    if (m) { if (!inList) { html += '<ul>'; inList = true; } html += `<li${m[1].length ? ' class="sub"' : ''}>${esc(m[2])}</li>`; continue; }
    if (inList) { html += '</ul>'; inList = false; }
    if (l) html += `<p>${esc(l)}</p>`;
  }
  return html + (inList ? '</ul>' : '');
}
function initUpdates() {
  const list = typeof UPDATES !== 'undefined' ? UPDATES : [];
  const seen = store.get('updSeen', ''), latest = list[0] ? list[0].title : '';
  $('#updDot').hidden = !latest || seen === latest;
  const open = () => {
    $('#updList').innerHTML = list.length ? list.map((u, i) => `<section class="upd-it${i === 0 ? ' new' : ''}"><h3>${u.title}</h3>${mdLite(u.body)}</section>`).join('') : '<p class="hint">还没有更新记录。</p>';
    $('#updDlg').hidden = false; store.set('updSeen', latest); $('#updDot').hidden = true;
  };
  $('#updBtn').addEventListener('click', open);
  $('#updClose').addEventListener('click', () => { $('#updDlg').hidden = true; });
  keyBind('esc', () => { if ($('#updDlg').hidden) return false; $('#updDlg').hidden = true; return true; }, 30);     // 4.9.4 快捷键登记表
  // 有新内容只在按钮上亮一个点，不自动弹出（不挡画布）
}
