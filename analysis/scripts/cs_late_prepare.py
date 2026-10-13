"""只生成隔离实验，不修改正式源码或原配方。"""
from pathlib import Path
import json,re,hashlib,subprocess
R=Path(__file__).resolve().parents[2];O=R/'analysis/results/CS3_LateMotion';O.mkdir(exist_ok=True)
SOURCE_COMMIT='359a8df2'
def frozen(path):return subprocess.check_output(['git','show',SOURCE_COMMIT+':'+path],cwd=R).decode('utf-8').replace('\r\n','\n')
source=frozen('tool/FireworkBaker.html');raw=frozen('tool/data/review.js')
entries=json.JSONDecoder().raw_decode(raw.split('var FW_REVIEW = ',1)[1])[0]
original=[e for e in entries if e['id'] in ['CS3C','CS3C-T','CS3C-H','CS3S']]
assert len(original)==4
copies=json.loads(json.dumps(original).replace('CS3C','CSLTC').replace('CS3S','CSLTS'))
for e in copies:
 e['name']=e['name'].replace('3.0','扰动测试副本');e['note']='独立实验：原参数复制，正式认可版本未改。末段气流仅在实验页有效。';e['look']=['只看燃尽后的尾部，原头部、寿命、亮度不变。'];e['ver']+='-late-copy'
effects=[{'key':'cs_late_comet' if id=='CSLTC' else 'cs_late_silver','名':name+' · 扰动测试副本','负责':'comet&silver3.0（xx）','阶段':'制作中','主条目':id,'工作版':id,'英文名':name+'Late_Test','下一步':'隔离测试，未正式通过，不覆盖认可原件。'} for id,name in [('CSLTC','Comet'),('CSLTS','Silver')]]
data='var FW_REVIEW='+json.dumps(copies,ensure_ascii=False)+';var FW_VMETA={};var FW_REVIEW_COMBOS=[];var FW_EFFECTS='+json.dumps(effects,ensure_ascii=False)+';'
(O/'原条目与副本.json').write_text(json.dumps({'source_commit':SOURCE_COMMIT,'source':original,'copies':copies,'source_html_sha256_utf8_lf':hashlib.sha256(source.encode()).hexdigest()},ensure_ascii=False,indent=2),encoding='utf-8')
helper='''
let csLateMeasuring=false;
// 对照实验固定原版取景和帧表；不让自动测量把前段一起重排。
function rtLayoutFar(...args){const old=csLateMeasuring;csLateMeasuring=true;try{return csBaseLayoutFar(...args);}finally{csLateMeasuring=old;}}
// 隔离试验：只让燃尽之后仍存活的尾部粒子继续受时变气流影响。
// 空间尺度与相位仅供小样验证，不是已批准的生产参数。
function csLateMotion(p,vx0,vz0,q,a,T,R0,dtMax=DTMAX){
 if(AMP===0){const e=Math.exp(-q.kd*a),s=(1-e)/q.kd;return [p[0]+R0*Math.cos(q.ph)+vx0*s+q.wx*(a-s),p[2]+vz0*s-(G/q.kd-q.wz)*(a-s),vx0*e+q.wx*(1-e),vz0*e-(G/q.kd-q.wz)*(1-e)];}
 const early=Math.max(0,T-q.tb),e=Math.exp(-q.kd*early),s1=(1-e)/q.kd;
 let x=p[0]+R0*Math.cos(q.ph)+vx0*s1+q.wx*(early-s1);
 let z=p[2]+vz0*s1-(G/q.kd-q.wz)*(early-s1);
 let vx=vx0*e+q.wx*(1-e),vz=vz0*e-(G/q.kd-q.wz)*(1-e);
 const duration=a-early,N=Math.max(1,Math.ceil(duration/dtMax)),h=duration/N,k=q.kd,eh=Math.exp(-k*h),s=(1-eh)/k;
 for(let i=0;i<N;i++){
  const t=(i+.5)*h,w=clamp(t/.4,0,1),amp=AMP*w*w*(3-2*w),xm=x+.5*h*vx,zm=z+.5*h*vz;
  const ux=q.wx+amp*Math.sin(zm/1.5+1.3*t+1.7),uz=q.wz+.35*amp*Math.sin(xm/1.5-.9*t+2.3),vi=uz-G/k;
  x+=ux*h+(vx-ux)*s;z+=vi*h+(vz-vi)*s;
  vx=ux+(vx-ux)*eh;vz=vi+(vz-vi)*eh;
 }
 return [x,z,vx,vz];
}
'''
version=re.search(r"const VERSION = '([^']+)'",source).group(1)
manifest={}
for name,amp,dt in [('baseline',0.,1/60),('zero',0.,1/60),('trial',.6,1/60),('fine',.6,1/120)]:
 s=source.replace('<script src="data/review.js"></script>','<script>'+data+'</script>',1)
 s=s.replace('<head>','<head><base href="../../../tool/">',1)
 s=s.replace('<title>','<title>Comet / Silver 隔离测试 · ',1)
 s=s.replace("const VERSION = '"+version+"'","const VERSION = '"+version+'-cs-late-'+name+"'",1)
 if name!='baseline':
  s=s.replace('function rtLayoutFar(', 'function csBaseLayoutFar(',1)
  s=s.replace('function rtWorldDraw(',helper.replace('DTMAX',repr(dt)).replace('AMP',repr(amp))+'\nfunction rtWorldDraw(',1)
  start=s.index('function rtWorldDraw(');end=s.index('// 4.5.1 远段 TrailFar 渲染器',start);f=s[start:end]
  line='const x = p[0] + R0 * Math.cos(q.ph) + vx0 * s1 + q.wx * (a - s1) - cx, z = p[2] + vz0 * s1 - (G / q.kd - q.wz) * (a - s1);'
  assert f.count(line)==2
  f=f.replace(line,line.replace('const x','let x'))
  vel='const rvx = vx0 * e + q.wx * (1 - e) - (t <= T ? vh[0] : 0), rvz = vz0 * e - (G / q.kd - q.wz) * (1 - e) - (t <= T ? vh[2] : 0);'
  f=f.replace(vel,vel.replace('const rvx','let rvx')+'\n      if(t>T){const m=csLateMotion(p,vx0,vz0,q,a,T,R0);x=m[0]-cx;z=m[1];rvx=m[2];rvz=m[3];}',1)
  anchor='    const I = rtPowderI(P, q, a, LI.pulse(q.tb))'
  assert anchor in f
  f=f.replace(anchor,'    if(t>T){const m=csLateMotion(p,vx0,vz0,q,a,T,R0);x=m[0]-cx;z=m[1];}\n'+anchor,1)
  f=f.replace('if(t>T){const m=csLateMotion', 'if(t>T&&!csLateMeasuring){const m=csLateMotion')
  s=s[:start]+f+s[end:]
 (O/(name+'.html')).write_text(s,encoding='utf-8')
 manifest[name]={'version':version+'-cs-late-'+name,'strength_mps':amp,'fade_s':.4,'scale_m':1.5,'max_step_s':dt,'sha256_utf8_lf':hashlib.sha256(s.encode()).hexdigest()}
(O/'内核指纹.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print('隔离副本已生成',O)
