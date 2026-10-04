"""Isolated actual-WebGL point diagnostic. Does not mutate production recipes/code.

Run with the existing local monitor dependency directory on PYTHONPATH.
"""
import argparse
import base64
import hashlib
import json
import math
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'analysis/results/POINT17'

INIT = r"""() => {
 state.playing=false; state.stillBusy=true; clearTimeout(bakeTimer);
 if(typeof setAutoBake==='function')setAutoBake(false);
 window.diagMat=compile(VS_QUAD,FS_MAT);
 // Isolated source-profile experiment, equal total energy and second moment to a disk.
 // No image-space blur, no production shader change. Sigma = disk radius / 2.
 window.diagGaussian=compile(POINT40_CPU_VS,POINT40_FS.replace(
   'float core=diskCoverage(vLocal,vSig), halo=0.;',
   'float core=3.14159265*vSig.x*vSig.y*gaussianCoverage(vLocal,vSig*.5), halo=0.;'));
 const d=defaultsFor('botan'), P=derive({...d.P}), pl=displayPlan40(P);
 const dbg=gl.getExtension('WEBGL_debug_renderer_info');
 return {version:VERSION,output:OUTPUT_VER,renderer:dbg?gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL):'unknown',
   P,M:d.M,plan:{Ww:pl.Ww,Wh:pl.Wh,HX:pl.HX,HY:pl.HY,cell:pl.L.cellW,t0:pl.t0,duration:pl.duration},
   ppm:pl.L.cellW/(2*pl.HX)};
}"""

SHOT = r"""(a) => {
 const N=64,D=a.display||256,ss=a.ss||2,ppm=a.ppm;
 const P={...defaultsFor('botan').P,headSize:a.size,headBright:a.I,exposure:a.exposure??3.1,
   haloFrac:a.halo??.22,haloR:3,qSS:ss,qHz:300,qMaxSub:16,shutter:a.shutter||0,
   cellPad:0,outMode:a.separate?'separate':'combined',previewBloom:0,encGamma:1};
 const M={...defaultsFor('botan').M,headInt:a.gain||1};
 if(a.whiteRamp)Object.assign(M,{ramp0:'#ffffff',ramp1:'#ffffff',ramp2:'#ffffff',ramp3:'#ffffff'});
 const samples=new Target(N*ss,N*ss,gl.RGBA16F),cell=new Target(N,N,gl.RGBA16F),enc=new Target(N,N,gl.RGBA8),H=new Target(D,D,gl.RGBA16F,true);
 const saved={h:hdrT,r:rgT,e:state.expo,ref:state.ref.mode,gauss:PT_GAUSS,pts:PR40.pts};
 const view=[0,0,N/(2*ppm),N/(2*ppm)], pos=[(.5+(a.phase||0))/ppm,(.5+(a.phaseY??a.phase??0))/ppm];
 const pl={t0:0,duration:1,dur:[a.hold||1/30],keys:[[0,0],[1,0]],L:{F:1},loop:false,noFade:true};
 const R={draw:(t,v,p,w)=>drawPoints(new Float32Array([pos[0]+(t-.5)*(a.speed||0),pos[1],a.I,a.size]),1,v,p,[1,0,0,0],w)};
 try {
   gl.activeTexture(gl.TEXTURE0);PT_GAUSS=0;
   if(a.profile==='gaussian')PR40.pts=window.diagGaussian;
   const timeWindow=renderCell40(P,pl,R,.5,samples,cell,view);
   cell.bind();const lin=new Float32Array(N*N*4);gl.readPixels(0,0,N,N,gl.RGBA,gl.FLOAT,lin);
   let sum=0,peak=0,mx=0,my=0,sx=0,sy=0;
   for(let y=0;y<N;y++)for(let x=0;x<N;x++){const z=lin[(y*N+x)*4];sum+=z;peak=Math.max(peak,z);mx+=z*x;my+=z*y;}
   mx/=sum;my/=sum;
   for(let y=0;y<N;y++)for(let x=0;x<N;x++){const z=lin[(y*N+x)*4];sx+=z*(x-mx)**2;sy+=z*(y-my)**2;}
   enc.clear();enc.bind();const pe=PR.enc;gl.useProgram(pe.p);
   gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,cell.tex);gl.uniform1i(pe.u.uH,0);gl.uniform1i(pe.u.uT,0);
   gl.uniform1f(pe.u.uEH,P.exposure);gl.uniform1f(pe.u.uET,0);gl.uniform1f(pe.u.uG,1);gl.uniform1f(pe.u.uWhich,1);gl.uniform1f(pe.u.uSingle,1);drawQuad();
   const bytes=new Uint8Array(N*N*4);gl.readPixels(0,0,N,N,gl.RGBA,gl.UNSIGNED_BYTE,bytes);
   let esum=0,ep=0,clip=0;for(let i=0;i<bytes.length;i+=4){esum+=bytes[i];ep=Math.max(ep,bytes[i]);if(bytes[i]>=254)clip++;}
   H.clear();H.bind();
   if(a.route==='live')shadeCell40(P,M,cell,.5);
   else {
     const pm=window.diagMat;gl.useProgram(pm.p);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,enc.tex);
     gl.uniform1i(pm.u.uH,0);gl.uniform1i(pm.u.uT,0);gl.uniform1f(pm.u.uFrame,0);gl.uniform1f(pm.u.uCols,1);gl.uniform1f(pm.u.uRows,1);gl.uniform1f(pm.u.uChans,1);
     gl.uniform1f(pm.u.uComb,a.separate?0:1);gl.uniform1f(pm.u.uMirror,0);gl.uniform2f(pm.u.uInset,0,0);
     setMatUniforms(pm,M,.5);if(a.separate)gl.uniform1f(pm.u.uTI,0);drawQuad();
   }
   const hdr=new Float32Array(D*D*4);H.bind();gl.readPixels(0,0,D,D,gl.RGBA,gl.FLOAT,hdr);
   let hp=0,hs=0;for(let i=0;i<hdr.length;i+=4){const l=.2126*hdr[i]+.7152*hdr[i+1]+.0722*hdr[i+2];hp=Math.max(hp,l);hs+=l;}
   let flat=0,visible=0;for(let i=0;i<hdr.length;i+=4){const l=.2126*hdr[i]+.7152*hdr[i+1]+.0722*hdr[i+2];if(l>hp*.95)flat++;if(l>hp*.05)visible++;}
   hdrT=H;rgT=cell;state.expo=1;state.ref.mode=0;canvas.width=canvas.height=D;post(-1,P);
   return {input:a,glError:gl.getError(),window:timeWindow,linear:{sum,peak,cx:mx,cy:my,sigmaX:Math.sqrt(sx/sum),sigmaY:Math.sqrt(sy/sum)},
    encoded:{sum:esum,peak:ep,clipped:clip},hdr:{peak:hp,sum:hs,flatFraction:flat/visible},
    png:canvas.toDataURL('image/png'),linearR:Array.from(lin.filter((_,i)=>i%4===0)),encodedR:Array.from(bytes.filter((_,i)=>i%4===0))};
 }finally{hdrT=saved.h;rgT=saved.r;state.expo=saved.e;state.ref.mode=saved.ref;PT_GAUSS=saved.gauss;PR40.pts=saved.pts;samples.dispose();cell.dispose();enc.dispose();H.dispose();}
}"""

def save_shot(page, name, **args):
    row = page.evaluate(SHOT, args)
    (OUT / (name + '.png')).write_bytes(base64.b64decode(row.pop('png').split(',')[1]))
    row['file'] = name + '.png'
    return row


def panel(rows, title, filename, columns=4):
    font_path = 'C:/Windows/Fonts/msyh.ttc'
    font = ImageFont.truetype(font_path, 19)
    small = ImageFont.truetype(font_path, 15)
    w, h = columns * 280, 64 + math.ceil(len(rows)/columns) * 290
    sheet = Image.new('RGB', (w, h), '#101118'); d = ImageDraw.Draw(sheet)
    d.text((16, 15), title, font=font, fill='#f0f1f4')
    for i, (label, file) in enumerate(rows):
        x, y = (i % columns)*280, 64+(i//columns)*290
        im = Image.open(OUT/file).convert('RGB')
        # Pixel-level diagnostic images are generated by WebGL; no blur/sharpen.
        if im.size != (256,256): im = im.resize((256,256), Image.Resampling.NEAREST)
        sheet.paste(im,(x+12,y));d.text((x+12,y+259),label,font=small,fill='#cdd1df')
    sheet.save(OUT/filename)


def main():
    ap=argparse.ArgumentParser();ap.add_argument('--browser',default='C:/Program Files/Google/Chrome/Application/chrome.exe');a=ap.parse_args()
    OUT.mkdir(parents=True,exist_ok=True)
    report={'commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),
      'html_sha256':hashlib.sha256((ROOT/'tool/FireworkBaker.html').read_bytes()).hexdigest(), 'shots':{}}
    errors=[]
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=a.browser,headless=True,args=['--use-angle=d3d11','--ignore-gpu-blocklist'])
        page=browser.new_page(viewport={'width':900,'height':700})
        page.on('pageerror',lambda e:errors.append(str(e)))
        # Disable UI animation only; production diagnostic functions remain intact.
        page.add_init_script('window.requestAnimationFrame = () => 0;')
        page.goto((ROOT/'tool/FireworkBaker.html').as_uri()+'?fast',wait_until='domcontentloaded')
        page.wait_for_function('window.__fw && typeof PR40 !== "undefined"',timeout=60000)
        env=page.evaluate(INIT);report['environment']=env;print(json.dumps({'renderer':env['renderer'],'ppm':env['ppm'],'plan':env['plan']},ensure_ascii=False),flush=True)
        if any(t in env['renderer'].lower() for t in ('swiftshader','software','basic render')):raise RuntimeError('Hardware GPU required for this local diagnostic')
        # 512/1024 equivalent local crop, same world view; screen magnification stated.
        ppm=env['ppm']; s=report['shots']; overview=[]
        for size in [.4,.65,1.4]:
            for phase in [0,.25,.5]:
                name=f'phase_s{size}_p{phase}'
                s[name]=save_shot(page,name,ppm=ppm,size=size,I=3,phase=phase,route='export')
                overview.append((f'{size}m / 相位{phase}px',name+'.png'))
        panel(overview,'原核→8位灰度→材质回放 | 512等效局部，WebGL放大4倍','01_phase.png',3)
        print('phase matrix complete',flush=True)
        routes=[]
        for I in [.3,1,3]:
            for route in ['live','export']:
                for phase in [0,.5]:
                    name=f'route_i{I}_{route}_p{phase}'
                    s[name]=save_shot(page,name,ppm=ppm,size=.65,I=I,phase=phase,route=route)
                    routes.append((f'I={I} / {route} / 相位{phase}',name+'.png'))
        panel(routes,'同一线性原图：放大时先插值再编码（live）vs先编码再插值（export）','02_routes.png')
        resolutions=[]
        for res in [512,1024]:
            # Keep world-space crop and display scale equal: 1024 crop is 2x zoomed OUT in final composite.
            for size in [.4,.65]:
                for phase in [0,.5]:
                    name=f'res{res}_s{size}_p{phase}'
                    s[name]=save_shot(page,name,ppm=ppm*res/512,size=size,I=3,phase=phase,route='export',display=256 if res==512 else 128)
                    # Produce equal-world-size cutout on 256 board (1024 shot covers half world width).
                    if res==1024:
                        im=Image.open(OUT/(name+'.png')).convert('RGB');board=Image.new('RGB',(256,256),'#101118');board.paste(im,(64,64));board.save(OUT/(name+'.png'))
                    resolutions.append((f'{res}格 / {size}m / 相位{phase}',name+'.png'))
        panel(resolutions,'同一世界尺寸与屏幕比例：512/1024（局部4倍查看）','03_resolution.png')
        optics=[]
        cases=[('current',{}),('lower_halo',{'halo':.08}),('pure_color',{'separate':True}),('lower_encode',{'exposure':.775,'gain':2})]
        for size in [.4,.65]:
            for label,extra in cases:
                name=f'color_s{size}_{label}'
                s[name]=save_shot(page,name,ppm=ppm,size=size,I=3,phase=.25,route='export',**extra)
                optics.append((f'{size}m / {label}',name+'.png'))
        panel(optics,'控制变量诊断：原参数 / 减光晕 / 纯色星头 / 低编码曝光+显示增益','04_color.png')
        candidates=[]; fixed_gains={}
        for phase in [0,.25,.5]:
            for label,opts in [
                ('baseline512',{'ppm':ppm}),
                ('baseline1024',{'ppm':ppm*2,'display':128}),
                ('range1024',{'ppm':ppm*2,'display':128,'exposure':.4}),
                ('profile1024',{'ppm':ppm*2,'display':128,'exposure':.4,'profile':'gaussian'})]:
                name=f'candidate_{label}_p{phase}'
                row=save_shot(page,name,size=.65,I=3,phase=phase,route='export',**opts)
                if label in ('range1024','profile1024'):
                    # Calibrate once at phase 0; NEVER adapt gain to subsequent positions.
                    target=s['candidate_baseline1024_p0']['hdr']['sum']
                    if label not in fixed_gains:fixed_gains[label]=target/row['hdr']['sum']
                    opts['gain']=fixed_gains[label]
                    row=save_shot(page,name,size=.65,I=3,phase=phase,route='export',**opts)
                    if phase==0:row['matched_hdr_sum_target']=target
                s[name]=row
                if label!='baseline512':
                    im=Image.open(OUT/(name+'.png')).convert('RGB');board=Image.new('RGB',(256,256),'#101118');board.paste(im,(64,64));board.save(OUT/(name+'.png'))
                candidates.append((f'{label} / 相位{phase}',name+'.png'))
        panel(candidates,'方案隔离试验：同屏幕尺寸；后两列只在相位0标定，增益固定','06_candidates.png')
        report['fixed_candidate_gains']=fixed_gains
        for phase in [i/8 for i in range(9)]:
            for label,opts in [('base512',{'ppm':ppm}),('base1024',{'ppm':ppm*2,'display':128}),
               ('range1024',{'ppm':ppm*2,'display':128,'exposure':.4,'gain':fixed_gains['range1024']}),
               ('profile1024',{'ppm':ppm*2,'display':128,'exposure':.4,'profile':'gaussian','gain':fixed_gains['profile1024']})]:
                name=f'sweep_{label}_{phase}'
                s[name]=save_shot(page,name,size=.65,I=3,phase=phase,route='export',**opts)
        # Hold the candidate settings fixed while varying physical diameter.
        for size in [.4,1.4]:
            for phase in [i/8 for i in range(9)]:
                for label,opts in [('base512',{'ppm':ppm}),('profile1024',{'ppm':ppm*2,'display':128,'exposure':.4,'profile':'gaussian','gain':fixed_gains['profile1024']})]:
                    name=f'robust_s{size}_{label}_{phase}'
                    s[name]=save_shot(page,name,size=size,I=3,phase=phase,route='export',**opts)
                if size==.4:
                    name=f'robust_s0.4_profile2048_{phase}'
                    s[name]=save_shot(page,name,ppm=ppm*4,display=64,size=size,I=3,phase=phase,route='export',exposure=.4,profile='gaussian',gain=fixed_gains['profile1024'])
        # Native-size replay diagnostic: neither upscale nor hidden screenshot resampling.
        for phase in [0,.25,.5]:
            for label,opts in [('current',{}),('linear_tint',{'separate':True,'exposure':.1,'gain':8,'halo':.04})]:
                name=f'native_{label}_p{phase}'
                s[name]=save_shot(page,name,ppm=ppm,size=.65,I=3,phase=phase,route='export',display=64,**opts)
        print('color and resolution matrices complete',flush=True)
        for speed in [0,20,100]:
            for hold in [1/30,1/10]:
                for shutter in [0,.2,.6]:
                    name=f'motion_v{speed}_h{hold:.3f}_s{shutter}'
                    s[name]=save_shot(page,name,ppm=ppm,size=.65,I=3,phase=.25,route='export',speed=speed,hold=hold,shutter=shutter)
        motion=[(f'v={r["input"]["speed"]} / hold={r["input"]["hold"]:.3f} / sh={r["input"]["shutter"]}',r['file']) for k,r in s.items() if k.startswith('motion') and r['input']['speed']>0]
        panel(motion,'实际快门采样：速度×持帧×快门比例（画点核与导出链路不变）','05_motion.png',3)
        # Conservation controls independent from artistic judgments.
        for I in [1,2]:
            name=f'energy_i{I}';s[name]=save_shot(page,name,ppm=ppm,size=.65,I=I,phase=.25,route='export',halo=0)
        for ss in [1,2,4]:
            name=f'supersample{ss}';s[name]=save_shot(page,name,ppm=ppm,size=.4,I=3,phase=.25,route='export',ss=ss)
        # Small real-template sample; no full export or acceptance claims.
        real=page.evaluate(r'''async()=>{const d=defaultsFor('botan'),out=[];for(const size of [.4,.65]){const P=derive({...d.P,headSize:size,headBright:3});const pl=displayPlan40(P);for(const px of [512,1024]){const f=await renderStills40(P,d.M,{times:[.8],px,plan:pl,metrics:true});out.push({size,px,P,M:d.M,plan:{Ww:pl.Ww,HX:pl.HX},...f[0]});}}return out;}''')
        for r in real:
            name=f'botan_s{r["size"]}_{r["px"]}.png';(OUT/name).write_bytes(base64.b64decode(r.pop('png').split(',')[1]));r['file']=name
        report['real_template']=real
        report['pageErrors']=errors
        browser.close()
    # Preserve full pixel arrays in one compressed numeric file; JSON remains reviewable.
    arrays={}
    for name,r in report['shots'].items():
        arrays[name+'_linear']=np.array(r.pop('linearR'),dtype=np.float32).reshape(64,64)
        arrays[name+'_encoded']=np.array(r.pop('encodedR'),dtype=np.uint8).reshape(64,64)
    np.savez_compressed(OUT/'pixels.npz',**arrays)
    report['checks']={
      'no_page_errors':not errors,
      'no_WebGL_errors':all(r['glError']==0 for r in s.values()),
      'radiance_x2_linear_energy_x2':abs(s['energy_i2']['linear']['sum']/s['energy_i1']['linear']['sum']-2)<.02,
      'phase_energy_within_2pct':all(max(s[f'phase_s{z}_p{p}']['linear']['sum'] for p in [0,.25,.5])/min(s[f'phase_s{z}_p{p}']['linear']['sum'] for p in [0,.25,.5])<1.02 for z in [.4,.65,1.4]),
      'diameter_energy_matches_area_within_2pct':abs(s['phase_s0.65_p0']['linear']['sum']/s['phase_s0.4_p0']['linear']['sum']/(.65/.4)**2-1)<.02}
    report['candidate_checks']={
      'matched_HDR_sum_within_1pct':all(abs(r['hdr']['sum']/r['matched_hdr_sum_target']-1)<.01 for r in s.values() if 'matched_hdr_sum_target' in r),
      'profile_linear_energy_within_1pct':all(abs(s[f'candidate_profile1024_p{p}']['linear']['sum']/s[f'candidate_baseline1024_p{p}']['linear']['sum']-1)<.01 for p in [0,.25,.5])}
    report['phase_summaries']={}
    for prefix in ['sweep_'+v+'_' for v in ['base512','base1024','range1024','profile1024']]+['robust_s'+str(z)+'_'+v+'_' for z in [.4,1.4] for v in ['base512','profile1024']]+['robust_s0.4_profile2048_']:
        rows=[r for k,r in s.items() if k.startswith(prefix)]
        report['phase_summaries'][prefix]={
          'count':len(rows),
          'linear_range_percent':100*(max(r['linear']['sum'] for r in rows)/min(r['linear']['sum'] for r in rows)-1),
          'HDR_range_percent':100*(max(r['hdr']['sum'] for r in rows)/min(r['hdr']['sum'] for r in rows)-1),
          'encoded_peak_max':max(r['encoded']['peak'] for r in rows)}
    # Clearly labeled inspection enlargement, nearest-neighbor to preserve raster evidence.
    font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',22);small=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',17)
    summary=Image.new('RGB',(960,880),'#101118');dd=ImageDraw.Draw(summary)
    dd.text((20,12),'光点方边诊断：同一尺寸、同一亮度，改变落点位置',font=font,fill='white')
    dd.text((20,46),'局部放大20倍用于看像素；不是游戏内大小。实验方案尚未进入正式烘焙器。',font=small,fill='#adb7c9')
    for col,label in enumerate(['当前512单格','只升1024单格','1024＋亮部保留＋渐变亮核']):dd.text((col*320+15,85),label,font=small,fill='#73d8ba')
    for ri,phase in enumerate([0,.25,.5]):
        for ci,label in enumerate(['baseline512','baseline1024','profile1024']):
            im=Image.open(OUT/f'candidate_{label}_p{phase}.png').convert('RGB')
            crop=im.crop((104,104,152,152)).resize((240,240),Image.Resampling.NEAREST)
            summary.paste(crop,(ci*320+40,115+ri*255))
        dd.text((10,122+ri*255),str(phase),font=small,fill='#a7adbd')
    summary.save(OUT/'结论对照.png')
    (OUT/'measurements.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(report['checks'],indent=2),flush=True)
    print('Saved '+str(OUT),flush=True)


if __name__=='__main__':main()
