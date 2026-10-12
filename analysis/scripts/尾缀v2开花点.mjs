// 尾缀 v2 开花点（手游编排，2026-10-12）
// 引擎里的三档尾缀已按尺寸档重导并导入（烘焙器交付 → 导入器更新同名，10-12 00:2x）：
//   RiseTrail_S 190 → 150 m（× 0.7895）、RiseTrail_M 265 → 210 m（× 0.7925）、RiseTrail_L 410 → 330 m（× 0.8049）；
//   烘焙器的尺寸档把尾缀「所有长度」等比缩（出生位置、初速、加速度、面片），时间不变 → 升空时间 D 不变，只是终点降低。
//   （用户 10-11：尾缀不能用 EffectScale 缩，近段和远段速度与初始位置不同会错位，必须重导。）
// 固定子模板里挂在这根尾缀上的球花开花点必须跟着降：开花点 = 尾缀出生点 + (旧开花点 − 尾缀出生点) × k；
//   倾角、局部延迟（= D）、球花 EffectScale 不变；编排条目里的高度偏移 dz 不变。
// 主角 400 m 尾缀（RiseTrail_Hero_L，× 0.9756）资源已导入 UE，但 ResourceFX 表还没有这一行：
//   hero=false（默认）时主角花型仍挂大号尾缀，开花点按大号的 × 0.8049；ResourceFX 加行后用 hero=true 换成主角尾缀。
// 幂等：处理过的子模板 / 基础资源带 trailRevision，再跑一次不会再缩。

export const TRAIL_REVISION = 'v2-20261012';
export const TRAIL_V2 = {
  P_EFX_FireWorks_NY_Trail_Small: {k: 0.7895, fromM: 190.08, toM: 150, particle: 'P_EFX_FireWorks_RiseTrail_S_HD', delivery: '50764d6d0def08376683'},
  P_EFX_FireWorks_NY_Trail_Medium: {k: 0.7925, fromM: 265.12, toM: 210, particle: 'P_EFX_FireWorks_RiseTrail_M_HD', delivery: 'b4994b2d3f6fa743e7c3'},
  P_EFX_FireWorks_NY_Trail_Large: {k: 0.8049, fromM: 410.21, toM: 330, particle: 'P_EFX_FireWorks_RiseTrail_L_HD', delivery: 'd11c724a11587dd83029'},
};
export const HERO_TRAIL = {id: 'P_EFX_FireWorks_NY_Trail_Hero', k: 0.9756, fromM: 410.21, toM: 400, particle: 'P_EFX_FireWorks_RiseTrail_Hero_L_HD', delivery: '004bd2f24f5f28506b10'};

const r6 = x => Math.round(x * 1e6) / 1e6;
const isHero = s => /主角/.test(s.name || '') || /_H280/.test(s.key || s.id || '');

export function applyTrailV2(doc, {hero = false, heroId = HERO_TRAIL.id} = {}) {   // heroId：ResourceFX 主角尾缀行的 ResourceId（22，10-12：用户定名 Hero）
  const report = {revision: TRAIL_REVISION, hero, heroId, subTemplates: 0, skipped: 0, heroOnLarge: [], heroSwitched: [], templates: 0, baseResources: 0, samples: []};
  const heroRow = hero && (doc.baseResourceLibrary || []).find(r => r.id === heroId);
  if (hero && !heroRow) throw Error('hero=true 但基础资源库里没有 ' + heroId + '（先在 ResourceFX 表加行并同步资源）');
  const moved = new Map();   // 子模板 key → 开花点 Z 的变化（m），用来改父模板 burstZ / z
  for (const s of doc.subTemplateLibrary || []) {
    const trail = (s.entries || []).filter(e => e.role === 'trail');
    if (trail.length !== 1 || !TRAIL_V2[trail[0].native?.FXResourceId]) continue;
    if (s.trailRevision === TRAIL_REVISION) { report.skipped++; continue; }
    const t = trail[0], spec = TRAIL_V2[t.native.FXResourceId], toHero = !!heroRow && isHero(s);
    const k = toHero ? HERO_TRAIL.k : spec.k, p0 = t.native.PositionOffset || {X: 0, Y: 0, Z: 0};
    let dz = 0;
    for (const b of s.entries.filter(e => e.role === 'burst')) {
      const p = b.native.PositionOffset, before = p.Z;
      b.native.PositionOffset = {X: r6(p0.X + (p.X - p0.X) * k), Y: r6(p0.Y + (p.Y - p0.Y) * k), Z: r6(p0.Z + (p.Z - p0.Z) * k)};
      dz = (b.native.PositionOffset.Z - before) / 100;
      if (report.samples.length < 6) report.samples.push(`${s.name}：开花 ${(before / 100).toFixed(1)} → ${(b.native.PositionOffset.Z / 100).toFixed(1)} m`);
    }
    t.preview = {...t.preview, heightM: r6((t.preview?.heightM || spec.fromM) * k)};
    if (toHero) { t.native.FXResourceId = heroId; t.baseTemplateRef = heroId + '|trail'; t.resourceSource = {...(heroRow.resourceSource || {}), particle: HERO_TRAIL.particle}; report.heroSwitched.push(s.key); }
    else if (isHero(s)) report.heroOnLarge.push(s.key);
    s.trailRevision = TRAIL_REVISION; s.trailV2 = {k, trail: t.native.FXResourceId, particle: toHero ? HERO_TRAIL.particle : spec.particle, delivery: toHero ? HERO_TRAIL.delivery : spec.delivery};
    moved.set(s.key, {dz, k});
    report.subTemplates++;
  }
  for (const t of doc.templateLibrary || []) {
    const m = moved.get(t.subTemplateRef); if (!m) continue;
    if (Number.isFinite(t.flightHeight)) t.flightHeight = r6(t.flightHeight * m.k);
    if (Number.isFinite(t.burstZ)) t.burstZ = r6(t.burstZ + m.dz);
    if (Number.isFinite(t.z)) t.z = r6(t.z + m.dz);
    t.trailRevision = TRAIL_REVISION; report.templates++;
  }
  for (const r of doc.baseResourceLibrary || []) {
    const spec = TRAIL_V2[r.id]; if (!spec || r.trailRevision === TRAIL_REVISION) continue;
    r.preview = {...r.preview, heightM: r6((r.preview?.heightM || spec.fromM) * spec.k)};
    r.trailRevision = TRAIL_REVISION; r.trailV2 = {k: spec.k, particle: spec.particle, delivery: spec.delivery};
    report.baseResources++;
  }
  return report;
}
