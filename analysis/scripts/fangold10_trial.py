from pathlib import Path
import json,hashlib
R=Path.cwd();O=R/'analysis/local/CS3-FanGold10';O.mkdir(exist_ok=True)
stage=json.loads((R/'analysis/results/FC6O_FanGold10/阶段与阻力.json').read_text())
source=(R/'tool/FireworkBaker.html').read_text(encoding='utf-8')
for name,amp,steps in [('trial',.6,64),('perstar',.6,64),('fine',.6,128),('zero',0.,64)]:
 helper='''
// 隔离试验：燃尽之后新增时变空气速度；常量不是生产参数。
bool fgLate=false; vec3 fgVelocity=vec3(0.);
vec3 fgAir(vec3 p,float t){
 float z=max(0.,t-ONSET), a=AMP*smoothstep(0.,.4,z);
 return a*vec3(sin(p.y/1.5+1.3*z+1.7),.35*sin(p.x/1.5-.9*z+2.3),0.);
}
void fgStep(inout vec3 p,inout vec3 v,vec3 U,vec3 g,float k,float c,float h){
 v=linV(v,U,g,k,.5*h);vec3 w=v-U;float sw=length(w);
 if(c>0. && sw>1e-6){float e=1.+c*sw*h;p+=U*h+w/sw*log(e)/c;v=U+w/e;}else p+=v*h;
 v=linV(v,U,g,k,.5*h);
}
void fgMotion(vec3 p0,vec3 v0,vec3 U,vec3 g,float k,float c,float age,float tb,out vec3 p,out vec3 v){
 float early=clamp(ONSET-tb,0.,age);motQ(p0,v0,U,g,k,c,early,p,v);
 float duration=age-early,h=duration/STEPS;
 for(int i=0;i<STEPS;i++){
  float tm=tb+early+(float(i)+.5)*h;
  vec3 Um=U+fgAir(p+.5*h*v,tm);fgStep(p,v,Um,g,k,c,h);
 }
}
'''.replace('ONSET',str(stage['onset'])).replace('AMP',str(amp)).replace('STEPS',str(steps)+'.' )
 # GLSL 循环需要整数上界，步长分母保持浮点。
 helper=helper.replace('i<'+str(steps)+'.','i<'+str(steps))
 s=source.replace('// 火花此刻的速度（火花拉长用）',helper+'\n// 火花此刻的速度（火花拉长用）',1)
 needle='vec3 vEnd; motQ(sp,vq,U,g,uK,uCq,age,p,vEnd);'
 assert s.count(needle)==1
 s=s.replace(needle,needle+f'\n      if(uT>{stage["onset"]} && {amp}>0.){{fgMotion(sp,vq,U,g,uK,uCq,age,tb,p,vEnd);fgLate=true;fgVelocity=vEnd;}}',1)
 s=s.replace('vec3 vv=spkVel(vel,U,g,age);','vec3 vv=fgLate?fgVelocity:spkVel(vel,U,g,age);',1)
 if name in ('perstar','fine'):
  s=s.replace('bool fgLate=false;', 'float fgOnset=0.; bool fgLate=false;',1)
  # 只换试验常量所在位置，不动主星、温度或寿命代码。
  s=s.replace(str(stage['onset']), 'fgOnset')
  s=s.replace('vec4 inf=texelFetch(uInfo,ivec2(0,s),0);','vec4 inf=texelFetch(uInfo,ivec2(0,s),0);fgOnset=inf.y;',1)
 s=s.replace('<title>','<title>FC6O 隔离末段试验 · ',1)
 s=s.replace('<head>','<head><base href="'+(R/'tool').as_uri()+'/">',1)
 # 单独的工具版本号让实验产物不会冒充生产导出。
 s=s.replace("const VERSION = '4.9.79'",f"const VERSION = '4.9.79-fg10-{name}'")
 (O/(name+'.html')).write_text(s,encoding='utf-8')
 (O/(name+'-kernel.json')).write_text(json.dumps({'prototype':True,'name':name,'amp_mps':amp,'scale_m':1.5,'fade_s':.4,'onset':stage['onset'],'steps':steps,'sha256':hashlib.sha256(s.encode()).hexdigest(),'source_sha256':hashlib.sha256(source.encode()).hexdigest()},indent=2),encoding='utf-8')
