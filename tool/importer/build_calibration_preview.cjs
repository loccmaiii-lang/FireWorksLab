// Static review artifacts from the exact native import plan; no engine or browser calls.
const fs=require('node:fs');
const vm=require('node:vm');
const {recordText}=require('./import_calibrated.cjs');
const root=__dirname+'/research/calibration-20261002';
const plan=JSON.parse(fs.readFileSync(root+'/native-plan.json','utf8'));
const optional=name=>fs.existsSync(root+'/'+name)?JSON.parse(fs.readFileSync(root+'/'+name,'utf8')):null;
const verification=optional('native-verification.json'),deepVerification=optional('native-deep-verification.json'),imports=optional('native-imports.json');
const registered=imports?.items?.length||0,diskRows=imports?.items?.filter(i=>i.tableDisk).length||0;
const complete=verification?.bpSaved===true&&deepVerification?.pass===true&&registered===plan.items.length;
const progress=complete?'20组资源、两平台20行资源配表和21个子模板已保存，并完成原生属性与磁盘文件核对。':registered?`已开始导入：登记${registered}/20组资产；资源表磁盘保存核对${diskRows}/20行。21个子模板尚未完成追加与保存。`:'素材包和标定数据已准备，尚未执行原生导入。';
const channel='按用户明确答复沿用已跑通的工作台材质标准（帧号第0通道）；与仓库第3通道文字规则的差异已同步云端协作记录。';
const escaped=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const textApi=vm.runInNewContext('const ShowBlueprintData={parentFilter:{PlatformFlags:14,MinQualityLevel:"EQuality_VeryLow"}};'+fs.readFileSync(__dirname+'/show-text.js','utf8')+'\nShowText;');
const lines=plan.templates.map(t=>{
  const text=recordText(t),parsed=textApi.subtemplate(textApi.parse(text));
  if(parsed.TemplateName!==t.TemplateName||parsed.Entries.length!==2)throw Error('Invalid generated template');
  parsed.Entries.forEach((e,i)=>{
    const wanted=t.Entries[i];
    if(e.FXResourceId!==wanted.FXResourceId||e.LocalTimeOffset!==wanted.LocalTimeOffset)throw Error('Template timing or ID mismatch');
    for(const key of ['PositionOffset','EffectScale'])for(const axis of ['X','Y','Z'])if(Math.abs(e[key][axis]-wanted[key][axis])>1e-6)throw Error('Template vector mismatch');
    if(e.RandomScaleRatio!==0||Object.values(e.RandomPositionRange).some(n=>n!==0))throw Error('Unexpected independent randomness');
  });
  return text;
});
fs.writeFileSync(root+'/21个子模板_可复制参数.txt',(complete?'已保存的子模板参数；高度和花径仍为参考计算，未经UE实播测量。':'规划预览：本批21个子模板和全部ResourceId尚未完成原生保存核对，暂勿粘贴后播放。')+'\n\n'+lines.join('\n\n')+'\n');
const assetCount=plan.items.reduce((n,i)=>n+Object.keys(i.assets).length,0);
const packageRows=plan.items.map(i=>'<tr><td>'+escaped(i.platform==='pc'?'PC':'手机')+'</td><td>'+escaped(i.as)+'</td><td><code>'+escaped(i.resourceId)+'</code></td><td><details><summary>'+Object.keys(i.assets).length+' 项完整目标名</summary>'+Object.entries(i.assets).map(([key,value])=>'<div><b>'+escaped(key)+'</b><br><code>'+escaped(value)+'</code></div>').join('')+'</details></td></tr>').join('');
const templateRows=plan.templates.map(t=>{
  const e=t.Entries[1],source=plan.items.find(i=>i.platform==='pc'&&i.resourceId===e.FXResourceId);
  const warning=source.replay_pass?'数值回放检查通过':source.replay_fails.flatMap(f=>f.fails).join('；');
  return '<tr><td>'+escaped(t.TemplateName)+'</td><td>'+e.LocalTimeOffset+'s</td><td>'+e.PositionOffset.Z/100+'m</td><td>'+e.EffectScale.X.toFixed(6)+'</td><td>'+escaped(warning)+'</td></tr>';
}).join('');
const qualityRows=plan.items.filter(i=>i.platform==='pc'&&i.kind==='burst').map(pc=>{
  const mobile=plan.items.find(i=>i.platform==='mobile'&&i.resourceId===pc.resourceId);
  const status=i=>i.replay_pass?'数值回放检查通过':i.replay_fails.flatMap(f=>f.fails).join('；');
  return '<tr><td>'+escaped(pc.base)+'</td><td>'+escaped(status(pc))+'</td><td>'+escaped(status(mobile))+'</td></tr>';
}).join('');
const html='<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>烟花三档标定 · 导入预览</title><style>body{background:#181f21;color:#dae2e3;font:16px/1.7 "Microsoft YaHei",sans-serif;margin:28px auto;padding:0 24px;max-width:1600px}h1{font-size:28px}h2{font-size:22px}.note{background:#293536;padding:18px;border-left:4px solid #00d799}.warn{color:#ffbf78}.scroll{overflow:auto}table{border-collapse:collapse;width:100%;margin-top:18px}td,th{padding:12px;text-align:left;border-bottom:1px solid #3b4546;vertical-align:top}code{font:13px/1.6 Consolas,monospace;overflow-wrap:anywhere;color:#00d799}a{color:#00d799}summary{cursor:pointer;white-space:nowrap}details div{margin:12px 0;min-width:360px}</style><h1>烟花三档标定 · 导入预览</h1><div class="note">7 个完整 PC / 手机素材包和 3 档尾缀副本已生成。PC 与手机各 10 个导入项，共 '+assetCount+' 项新资产，10 个跨平台资源 ID，21 个子模板。<strong class="warn">尚未写入引擎，不能作为已可播放的资源使用。</strong><br>待确认：仓库要求帧号第 3 通道，本机现有母材质为第 0 通道。导入与 BP 写入须等用户确认本次通道约定。<br>小：3.5s / 180–200m / 爆炸100–120m；中：5s / 250–280m / 爆炸180–200m；大：8s / 400–420m / 爆炸280–300m。首版使用中心值190、265、410m与110、190、290m，无独立随机，避免尾缀与爆点错位。<br>所有高度和尺寸是参考标定，未经 UE 实播测量。当前金芒菊缩放读回为10，用户参考为15；原资产保留。球形 B 当前导出仍有过曝警告；球形 C 第二层有2个中间空帧。本预览不表示画质验收。</div><h2>完整导入名称</h2><div class="scroll"><table><thead><tr><th>平台</th><th>导入名称</th><th>共用 ResourceId</th><th>完整目标资产</th></tr></thead><tbody>'+packageRows+'</tbody></table></div><h2>21 个子模板计划</h2><div class="scroll"><table><thead><tr><th>子模板名</th><th>升空结束</th><th>爆点高度</th><th>爆炸组件缩放</th><th>当前配方回放检查</th></tr></thead><tbody>'+templateRows+'</tbody></table></div><p><a href="21个子模板_可复制参数.txt">查看完整参数文本（预览）</a> · <a href="native-plan.json">查看原始导入计划</a> · <a href="使用说明.md">查看标定说明</a></p></html>';
const quality='<h2>PC 与手机分别检查</h2><p>PC 回放检查5类通过，手机2类通过。云端最新STD3中球形B的组合标准检查通过，但导出回放仍有过曝警告。检查通过不等于用户画质验收。</p><div class="scroll"><table><thead><tr><th>当前素材</th><th>PC 回放</th><th>手机回放</th></tr></thead><tbody>'+qualityRows+'</tbody></table></div>';
const currentHtml=html.replace('尚未写入引擎，不能作为已可播放的资源使用。',escaped(progress)).replace('待确认：仓库要求帧号第 3 通道，本机现有母材质为第 0 通道。导入与 BP 写入须等用户确认本次通道约定。',escaped(channel)).replace('21 个子模板计划',complete?'21 个已保存子模板':'21 个子模板计划').replace('查看完整参数文本（预览）',complete?'查看完整参数文本':'查看完整参数文本（规划预览）');
fs.writeFileSync(root+'/导入预览.html',currentHtml.replace('<h2>完整导入名称</h2>',quality+'<h2>完整导入名称</h2>'));
console.log(JSON.stringify({packages:plan.items.length,assets:assetCount,resourceIds:new Set(plan.items.map(i=>i.resourceId)).size,templates:lines.length,ueTextRoundtrip:true,engineWrites:0}));
