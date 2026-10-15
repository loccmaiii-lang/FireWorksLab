// 灯光写进 UE（16.0.42，本机同步 8，用户 10-16 00:29「交付页面可以和导演文件一样一起交付吗」）。
// 走导演表同一个本机 GPUECli（127.0.0.1:17780）：用 UE 自带的 PythonScriptLibrary.ExecutePythonCommandEx 跑下面生成的脚本，
// 写法逐行照同事 tool/fwlight/ue/ue_apply_keys.py（同一个 Undo 事务清空重写 Intensity / LightColor、按 tick 写、读回比对），
// 保存用和导演表同一个 EditorAssetLibrary.SaveAsset。三种模式：check（只读）、dry（只读：取备份 + 校验数据，不改）、write。
// 脚本只用 ASCII，兼容 UE 内 Python 2.7 / 3；错误用代码返回，中文在这里翻译。
import {LIGHT_RIG} from './light-rig.mjs';

export const PY_LIBRARY='/Script/PythonScriptPlugin.Default__PythonScriptLibrary';
export const LIGHT_SCRIPT_HEADER='# -*- coding: utf-8 -*-\n# fwlight-workbench/1';
const SAVE={path:'/Script/EditorScriptingUtilities.Default__EditorAssetLibrary',function:'SaveAsset'};
const CHANNELS=['I','R','G','B','A'];

const PY_BODY=String.raw`
def emit(tag, obj):
    s = json.dumps(obj, separators=(',', ':'))
    n = 6000
    parts = [s[i:i + n] for i in range(0, len(s), n)] or ['']
    for i, p in enumerate(parts):
        print('FWLIGHT_%s:%d/%d:%s' % (tag, i, len(parts), p))

class Code(Exception):
    pass

def find_tracks(seq, parent_name, comp_name):
    comp = None
    for b in seq.get_bindings():
        p = b.get_parent()
        if str(b.get_name()) == comp_name and p is not None and str(p.get_name()) == parent_name:
            comp = b
    if comp is None:
        raise Code('NO_BINDING')
    it = ct = None
    for t in comp.get_tracks():
        pn = str(t.get_property_name())
        if isinstance(t, unreal.MovieSceneFloatTrack) and pn == 'Intensity':
            it = t
        if isinstance(t, unreal.MovieSceneColorTrack) and pn == 'LightColor':
            ct = t
    if it is None or ct is None:
        raise Code('NO_TRACK')
    if not it.get_sections() or not ct.get_sections():
        raise Code('NO_SECTION')
    isec = it.get_sections()[0]
    csec = ct.get_sections()[0]
    cch = dict((str(c.get_name()), c) for c in csec.get_channels())
    chans = {'I': isec.get_channels()[0], 'R': cch.get('Color.R'), 'G': cch.get('Color.G'), 'B': cch.get('Color.B'), 'A': cch.get('Color.A')}
    if [k for k in chans if chans[k] is None]:
        raise Code('NO_CHANNEL')
    return isec, csec, chans

def interp_code(k):
    try:
        s = str(k.get_interpolation_mode()).upper()
    except Exception:
        return 'A'
    return 'L' if 'LINEAR' in s else ('C' if 'CONSTANT' in s else 'A')

def dump_channel(ch):
    keys = []
    for k in ch.get_keys():
        keys.append([k.get_time(TR).frame_number.value, round(k.get_value(), 6), interp_code(k)])
    d = None
    try:
        if ch.has_default():
            d = ch.get_default()
    except Exception:
        d = None
    return [d, keys]

def to_tick(row):
    sub = float(row[2]) if len(row) > 2 else 0.0
    return int(round((float(row[0]) + sub) * TPF))

def write_channel(ch, spec):
    for k in list(ch.get_keys()):
        ch.remove_key(k)
    for row in spec[1]:
        ch.add_key(unreal.FrameNumber(to_tick(row)), float(row[1]), 0.0, TR, INTERP)
    if spec[0] is None:
        try:
            ch.remove_default()
        except Exception:
            pass
    else:
        ch.set_default(float(spec[0]))

def readback(ch, spec):
    ks = ch.get_keys()
    exp = spec[1]
    if len(ks) != len(exp):
        return 'COUNT %d/%d' % (len(ks), len(exp))
    err = 0.0
    for k, row in zip(ks, exp):
        if k.get_time(TR).frame_number.value != to_tick(row):
            return 'TIME %s' % row[0]
        err = max(err, abs(k.get_value() - float(row[1])))
    return err

T0 = time.time()
out = {'ok': False, 'mode': MODE}
TR = unreal.SequenceTimeUnit.TICK_RESOLUTION
INTERP = unreal.MovieSceneKeyInterpolation.LINEAR
TPF = 800.0
try:
    seq = unreal.load_asset(SEQ)
    if seq is None:
        raise Code('LOAD')
    dr = seq.get_display_rate()
    tr = seq.get_tick_resolution()
    out['fps'] = [dr.numerator, dr.denominator]
    out['tick'] = [tr.numerator, tr.denominator]
    TPF = (float(tr.numerator) / tr.denominator) / (float(dr.numerator) / dr.denominator)
    out['tpf'] = TPF
    try:
        out['end_s'] = seq.get_playback_end_seconds()
    except Exception:
        pass
    pkg = seq.get_outermost().get_name()
    out['package'] = pkg
    out['dirty'] = pkg in [p.get_name() for p in unreal.EditorLoadingAndSavingUtils.get_dirty_content_packages()]
    try:
        out['registry_loading'] = bool(unreal.AssetRegistryHelpers.get_asset_registry().is_loading_assets())
    except Exception:
        out['registry_loading'] = False
    try:
        base = unreal.Paths.project_content_dir()
        try:
            base = unreal.Paths.convert_relative_path_to_full(base)
        except Exception:
            base = os.path.abspath(base)
        fn = os.path.join(base, pkg[len('/Game/'):] + '.uasset')
        out['file'] = fn.replace('\\', '/')
        out['readonly'] = bool(os.path.isfile(fn) and not os.access(fn, os.W_OK))
    except Exception as e:
        out['file_error'] = str(e)
    out['t_meta'] = round(time.time() - T0, 3)
    found = {}
    rows = []
    for name, binding, comp in LIGHTS:
        row = {'light': name}
        try:
            isec, csec, chans = find_tracks(seq, binding, comp)
            found[name] = (isec, csec, chans)
            row['keys'] = dict((c, chans[c].get_num_keys()) for c in chans)
            row['ok'] = True
        except Code as e:
            row['ok'] = False
            row['code'] = str(e)
        rows.append(row)
    out['lights'] = rows
    out['t_tracks'] = round(time.time() - T0, 3)
    if MODE != 'check':
        if [r for r in rows if not r['ok']]:
            raise Code('NO_TRACK')
        if [dr.numerator, dr.denominator] != [FPS, 1]:
            raise Code('FPS')
        if out['dirty']:
            raise Code('DIRTY')
        if out['registry_loading']:
            raise Code('REGISTRY_LOADING')
        for name, binding, comp in LIGHTS:
            if name not in DATA or [c for c in ('I', 'R', 'G', 'B', 'A') if c not in DATA[name]]:
                raise Code('DATA')
        backup = {'tpf': TPF, 'pool': [], 'lights': {}}
        seen = {}
        for name, binding, comp in LIGHTS:
            chans = found[name][2]
            row = {}
            for c in ('I', 'R', 'G', 'B', 'A'):
                d, keys = dump_channel(chans[c])
                key = json.dumps(keys)
                if key not in seen:
                    seen[key] = len(backup['pool'])
                    backup['pool'].append(keys)
                row[c] = [d, seen[key]]
            backup['lights'][name] = row
        out['t_backup'] = round(time.time() - T0, 3)
        emit('B', backup)
        if MODE == 'write':
            with unreal.ScopedEditorTransaction('fwlight workbench: lights Intensity/LightColor'):
                seq.modify()
                for name, binding, comp in LIGHTS:
                    isec, csec, chans = found[name]
                    isec.modify()
                    csec.modify()
                    for c in ('I', 'R', 'G', 'B', 'A'):
                        write_channel(chans[c], DATA[name][c])
            out['written'] = True
            rb = {}
            bad = []
            for name, binding, comp in LIGHTS:
                chans = found[name][2]
                rb[name] = dict((c, readback(chans[c], DATA[name][c])) for c in ('I', 'R', 'G', 'B', 'A'))
                bad += [name + '.' + c for c in rb[name] if not isinstance(rb[name][c], float) or rb[name][c] > 1e-3]
            out['readback'] = rb
            out['new_keys'] = dict((name, dict((c, found[name][2][c].get_num_keys()) for c in ('I', 'R', 'G', 'B', 'A'))) for name, b, cc in LIGHTS)
            if bad:
                out['bad'] = bad
                raise Code('READBACK')
            try:
                lib = unreal.LevelSequenceEditorBlueprintLibrary
                cur = lib.get_current_level_sequence()
                if cur is not None and cur.get_path_name() == seq.get_path_name():
                    now = lib.get_current_time()
                    lib.close_level_sequence()
                    lib.open_level_sequence(seq)
                    lib.set_current_time(now)
                    out['sequencer_reopened'] = True
            except Exception as e:
                out['sequencer_error'] = str(e)
        else:
            out['dry_keys'] = dict((name, dict((c, len(DATA[name][c][1])) for c in ('I', 'R', 'G', 'B', 'A'))) for name, b, cc in LIGHTS)
            out['dry_ticks_ok'] = all(to_tick(r) >= 0 for name, b, cc in LIGHTS for c in ('I', 'R', 'G', 'B', 'A') for r in DATA[name][c][1])
    out['ok'] = True
except Code as e:
    out['code'] = str(e)
except Exception:
    out['code'] = 'PYTHON'
    out['error'] = traceback.format_exc()
out['t_total'] = round(time.time() - T0, 3)
emit('R', out)
`;

// Python 字面量：JSON.stringify 出来的字符串在 Python 里同样成立（只含 ASCII）
const pyStr=s=>{const t=JSON.stringify(String(s));if(/[^\x20-\x7e]/.test(t))throw Error('灯光脚本只能含 ASCII：'+s);return t;};
// 四盏灯里大量曲线相同（SpotLight / SpotLight3 = SpotLight2，SkyLight 颜色同 SpotLight2）：相同的键数组只放一份（pool），脚本里再展开
export function lightScriptData(delivery,rig=LIGHT_RIG){
 const pool=[],index=new Map(),lights={};
 const ref=keys=>{const t=JSON.stringify(keys);if(!index.has(t)){index.set(t,pool.length);pool.push(keys)}return index.get(t)};
 for(const l of rig.lights){const k=delivery.files[`keys_${l.light}.json`];if(!k)throw Error('交付包里缺少 '+l.light);if(k.interp!=='linear')throw Error(l.light+' 不是 Linear 插值');
  const ch={I:k.intensity,R:k.color.R,G:k.color.G,B:k.color.B,A:k.color.A};lights[l.light]=Object.fromEntries(CHANNELS.map(c=>[c,[ch[c].default??null,ref(ch[c].keys)]]));}
 return {pool,lights};
}
export function expandScriptData(data){return Object.fromEntries(Object.entries(data.lights).map(([n,ch])=>[n,Object.fromEntries(Object.entries(ch).map(([c,[d,i]])=>[c,[d,data.pool[i]]]))]));}
export function lightScript(mode,{rig=LIGHT_RIG,data=null}={}){
 if(!['check','dry','write'].includes(mode))throw Error('灯光脚本模式无效');
 if(mode!=='check'&&!data)throw Error('缺少灯光数据');
 return [LIGHT_SCRIPT_HEADER+' '+mode,'from __future__ import print_function','import json, os, time, traceback','import unreal',
  'MODE = '+pyStr(mode),'SEQ = '+pyStr(rig.sequence.asset),'FPS = '+Number(rig.sequence.fps),
  'LIGHTS = json.loads('+pyStr(JSON.stringify(rig.lights.map(l=>[l.light,l.binding,l.component])))+')',
  'RAW = '+(data?'json.loads('+pyStr(JSON.stringify(data))+')':'None'),
  'DATA = dict((n, dict((c, [v[0], RAW["pool"][v[1]]]) for c, v in ch.items())) for n, ch in RAW["lights"].items()) if RAW else None',PY_BODY].join('\n');
}

// 解析 ExecutePythonCommandEx 的 LogOutput（UE ExportText 格式：Output="..."，\" \\ \n 转义）
export function parsePythonOutput(response){
 const d=response?.data||response||{},lines=[],re=/Output="((?:[^"\\]|\\.)*)"/g;let m;
 while((m=re.exec(String(d.out_LogOutput||''))))lines.push(m[1].replace(/\\(.)/g,(a,c)=>c==='n'?'\n':c==='t'?'\t':c==='r'?'\r':c));
 const chunks={};
 for(const raw of lines)for(const line of raw.split('\n')){const x=/^FWLIGHT_([A-Z]):(\d+)\/(\d+):(.*)$/.exec(line.trim());if(!x)continue;(chunks[x[1]]??={n:Number(x[3]),parts:[]}).parts[Number(x[2])]=x[4];}
 const out={},ret=d.return_value;
 for(const [tag,c] of Object.entries(chunks)){if(c.parts.length!==c.n||Array.from({length:c.n},(_,i)=>c.parts[i]).some(p=>p===undefined))throw Error('UE 输出不完整（'+tag+'）');/* 稀疏数组的空位 some() 会跳过，按下标逐个查 */out[tag]=JSON.parse(c.parts.join(''));}
 return {result:out.R??out.C??null,backup:out.B??null,returned:ret===true||ret==='True'||ret==='true',commandResult:String(d.out_CommandResult||'').slice(-600)};
}

export async function runLightScript(request,mode,options={}){
 const code=lightScript(mode,options),payload={path:PY_LIBRARY,function:'ExecutePythonCommandEx',args:{PythonCommand:code,ExecutionMode:'ExecuteFile',FileExecutionScope:'Private'}};
 let r;
 try{r=await request('/object/call',payload,{timeout:mode==='write'?300000:60000});}
 catch(e){
  // 只读模式连接被重置（GPUECli 同时有别的工具在用时会这样）可以重试一次；写入结果未知，绝不重试
  if(mode==='write'||!/fetch|network|ECONNRESET|socket/i.test(e.message))throw Object.assign(e,{unknownResult:mode==='write'});
  await new Promise(ok=>setTimeout(ok,1000));r=await request('/object/call',payload,{timeout:60000});
 }
 const parsed=parsePythonOutput(r);
 if(!parsed.result)throw Error('UE 没有返回灯光结果'+(parsed.commandResult?'：'+parsed.commandResult:''));
 return parsed;
}

const CODE_TEXT={LOAD:'UE 里打不开灯光序列',NO_BINDING:'序列里找不到这盏灯的绑定',NO_TRACK:'缺少 Intensity 或 LightColor 轨道（要先在 Sequencer 里加好）',NO_SECTION:'轨道没有 Section',NO_CHANNEL:'颜色轨道缺通道',
 FPS:'序列显示帧率不是 30',DIRTY:'灯光序列在 UE 里有未保存的修改：先在 UE 保存或撤销再导入',REGISTRY_LOADING:'UE 还在加载资产（刚启动或刚开大地图），稍等再检查',DATA:'交付数据不完整',READBACK:'写入后读回不一致（没有保存；在 UE 里 Ctrl+Z 撤销）',PYTHON:'UE 内脚本出错'};
export const lightCodeText=c=>CODE_TEXT[c]||c||'未知错误';

// 只读检查：返回 {ok, issues, notes, info}
export async function checkLightTarget(request,{rig=LIGHT_RIG}={}){
 const {result:r}=await runLightScript(request,'check',{rig});
 const issues=[],notes=[];
 if(!r.ok)issues.push(lightCodeText(r.code)+(r.error?'：'+String(r.error).trim().split('\n').at(-1):''));
 else{
  for(const l of r.lights||[])if(!l.ok)issues.push(`${l.light}：${lightCodeText(l.code)}`);
  if(JSON.stringify(r.fps)!==JSON.stringify([rig.sequence.fps,1]))issues.push(lightCodeText('FPS')+`（现在 ${r.fps?.join('/')}）`);
  if(r.dirty)issues.push(lightCodeText('DIRTY'));
  if(r.registry_loading)issues.push(lightCodeText('REGISTRY_LOADING'));
  if(Number.isFinite(r.end_s)&&Math.abs(r.end_s-rig.sequence.endS)>0.1)notes.push(`序列播放到 ${r.end_s.toFixed(2)} s，曲线按 ${rig.sequence.endS} s 算`);
  if(r.readonly)notes.push('序列文件只读（P4 未迁出）：保存走和导演蓝图同一个 UE 保存，保存不上会提示');
 }
 return {ok:!issues.length,issues,notes,info:r};
}

// 写入：只读核对 → 同一个 Undo 事务写四盏灯并读回 → SaveAsset → 再读一次核对。onBackup 拿到写入前曲线（可还原的交付包）。
export async function writeLightTarget(request,delivery,{rig=LIGHT_RIG,onBackup}={}){
 if(delivery.errors?.length)throw Error(delivery.errors.join('；'));
 const data=lightScriptData(delivery,rig);
 const {result:r,backup}=await runLightScript(request,'write',{rig,data});
 if(backup&&onBackup)await onBackup(backup);
 const receipt={format:'fwlight.ue-receipt/1',sequence:rig.sequence.asset,time:new Date().toISOString(),written:!!r.written,verified:false,saved:false,
  lights:rig.lights.map(l=>({light:l.light,keys:r.new_keys?.[l.light]??null,readback:r.readback?.[l.light]??null})),sequencerReopened:!!r.sequencer_reopened};
 if(!r.ok){const e=Error(lightCodeText(r.code)+(r.bad?'：'+r.bad.join('、'):'')+(r.error?'：'+String(r.error).trim().split('\n').at(-1):''));e.receipt=receipt;e.written=!!r.written;throw e;}
 receipt.verified=true;
 try{const s=await request('/object/call',{...SAVE,args:{AssetToSave:rig.sequence.asset,bOnlyIfIsDirty:false}});if(![true,'True','true'].includes(s.return_value))throw Error('UE 未返回保存成功');receipt.saved=true;}
 catch(e){receipt.saveError=e.message;return receipt;}
 try{const after=await runLightScript(request,'check',{rig});const rows=after.result.lights||[];
  const full=expandScriptData(data),expect=Object.fromEntries(rig.lights.map(l=>[l.light,Object.fromEntries(CHANNELS.map(c=>[c,full[l.light][c][1].length]))]));
  receipt.afterSave={dirty:!!after.result.dirty,keysMatch:rows.every(x=>x.ok&&CHANNELS.every(c=>x.keys?.[c]===expect[x.light]?.[c]))};
  if(after.result.dirty||!receipt.afterSave.keysMatch)receipt.saveError='保存后核对不一致（序列仍有未保存修改或键数不对）';
 }catch(e){receipt.afterSave={error:e.message};}
 return receipt;
}

// 写入前曲线 → 可还原的交付包（fwlight.pack/1，tool/fwlight apply-pack 能直接写回）
export function backupPackFiles(backup,{rig=LIGHT_RIG,now=new Date()}={}){
 const tpf=Number(backup.tpf)||800,files={},rows=[];
 const row=([tick,value])=>{const f=Math.floor(tick/tpf),sub=(tick-f*tpf)/tpf;return sub?[f,value,Number(sub.toFixed(6))]:[f,value];};
 for(const l of rig.lights){const p=backup.lights?.[l.light];if(!p)continue;const b=Object.fromEntries(CHANNELS.map(c=>[c,[p[c][0],backup.pool[p[c][1]]]]));const modes=new Set(CHANNELS.flatMap(c=>b[c][1].map(k=>k[2])));
  const interp=modes.size===1&&modes.has('L')?'linear':modes.size===1&&modes.has('C')?'constant':modes.size?'auto':'linear';
  const ch=c=>({default:b[c][0],keys:b[c][1].map(row)});
  const keys={format:'fwlight.keys/2',light:l.light,binding:l.binding,component:l.component,fps:rig.sequence.fps,interp,intensity:ch('I'),color:{R:ch('R'),G:ch('G'),B:ch('B'),A:ch('A')},meta:{note:'UE 写入前备份',source_interp_modes:[...modes].sort()}};
  const file=`keys_${l.light}.json`;files[file]=JSON.stringify(keys);
  rows.push({light:l.light,binding:l.binding,component:l.component,file,peak:Math.max(0,...keys.intensity.keys.map(k=>k[1])),intensityKeys:keys.intensity.keys.length,colorKeys:keys.color.R.keys.length});}
 const manifest={format:'fwlight.pack/1',generator:'烟花编排工作台（UE 写入前备份）',generatedAt:now.toISOString(),programme:{name:'UE 写入前备份'},sequence:rig.sequence,lights:rows,errors:[],warnings:[],
  notes:['写入前从 UE 读出的原曲线。还原：python tool/fwlight/fwlight.py apply-pack <本目录>（先 P4 迁出序列）。']};
 return {'manifest.json':JSON.stringify(manifest,null,1),...files};
}
