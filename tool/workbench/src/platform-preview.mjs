// 预览平台 PC / 手游（本机同步 8，用户 2026-10-12 07:56）：只影响舞台、时间线和底栏计数，不改节目数据、交付和导出。
// 手游 = 当前档位里没有标「不上手机」（片段 mobile:false）的片段，和交付一张表的 PlatformFlags 一致（不上手机写 12，其余 14）。
// 只上手游（片段 mobile:'only'，一张表写 2；跨年秀 22 10-12「手游替身」）：PC 预览不放，手游预览放。
export const PLATFORMS = {
  pc: {label: 'PC', icon: 'computer', hint: 'PC 预览：当前档位里上 PC 的片段（只上手游的不放）'},
  mobile: {label: '手游', icon: 'smartphone', hint: '手游预览：当前档位里上手机的片段（标了不上手机的不放，只上手游的放）；视角与 PC 相同'},
};
export function normalizePlatform(value) { return value === 'mobile' ? 'mobile' : 'pc'; }
export function offMobileCueIds(doc) { return new Set((doc.cues || []).filter(c => c.mobile === false).map(c => c.id)); }
export function mobileOnlyCueIds(doc) { return new Set((doc.cues || []).filter(c => c.mobile === 'only').map(c => c.id)); }
export function platformEvents(doc, events, platform) {
  const off = normalizePlatform(platform) === 'mobile' ? offMobileCueIds(doc) : mobileOnlyCueIds(doc);
  return off.size ? events.filter(e => !off.has(e.cueId)) : events;
}
export function platformSummary(doc, events, platform) {
  const off = offMobileCueIds(doc), only = mobileOnlyCueIds(doc), shown = platformEvents(doc, events, platform);
  const hidden = events.length - shown.length;
  if (normalizePlatform(platform) !== 'mobile')
    return {shown: shown.length, hidden, offCues: off.size, onlyCues: only.size,
      message: only.size ? `PC 预览：${shown.length} 次播放，${only.size} 个只上手游的片段已隐藏（${hidden} 次）` : `PC 预览：${shown.length} 次播放`};
  const extra = only.size ? `，含 ${only.size} 个只上手游的片段` : '';
  return {shown: shown.length, hidden, offCues: off.size, onlyCues: only.size,
    message: off.size ? `手游预览：${shown.length} 次播放，${off.size} 个不上手机的片段已隐藏（${hidden} 次）${extra}` : only.size ? `手游预览：${shown.length} 次播放${extra}` : `手游预览：还没有片段标为不上手机，和 PC 相同（${shown.length} 次播放）`};
}
