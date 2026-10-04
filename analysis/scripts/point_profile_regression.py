"""Before/after frames + standard metrics for current accepted/candidate layers."""
import base64
import hashlib
import importlib.util
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'analysis/results/POINT17_IMPL/regression'
spec=importlib.util.spec_from_file_location('standard',ROOT/'analysis/scripts/标准检查.py')
standard=importlib.util.module_from_spec(spec);spec.loader.exec_module(standard)

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    status=json.loads((ROOT/'协作/状态清单.json').read_text(encoding='utf-8'))
    ids=set()
    for e in status['effects']:
        if e.get('进度',{}).get('用户验收'): ids.add(e.get('已通过版') or e['主条目'])
        if e.get('阶段')=='待验收':
            ids.add(e.get('待验收版') or e['主条目'])
            # A three-size candidate family is reviewed together.
            for s in e.get('方案',[]): ids.add(s['id'])
    with sync_playwright() as p:
        # Keep JS numeric execution stable for exact 8-bit comparisons near a rounding boundary.
        # WebGL still runs on the real GPU; ordinary-browser delivery is checked separately.
        b=p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe',headless=True,args=['--use-angle=d3d11','--ignore-gpu-blocklist','--js-flags=--jitless'])
        runs={}
        for label,html in [('before',ROOT/'analysis/local/POINT17_IMPL/baseline/FireworkBaker.html'),('after',ROOT/'tool/FireworkBaker.html')]:
            source_hash=hashlib.sha256(b'jitless-v1'+html.read_bytes()+(html.parent/'data/review.js').read_bytes()).hexdigest()
            pg=b.new_page();pg.add_init_script('window.requestAnimationFrame=()=>0;')
            pg.goto(html.as_uri()+'?fast',wait_until='load')
            pg.evaluate('state.playing=false;setAutoBake(false);clearTimeout(bakeTimer);')
            for ident in ids:
                archive=ROOT/'归档/results'/ident/'best.json'
                if archive.exists():
                    data=json.loads(archive.read_text(encoding='utf-8'))
                    pg.evaluate("""a=>{if(!REPLICA_BY_ID[a.id])REPLICA_BY_ID[a.id]={id:a.id,base:a.P.type,p:a.P,m:a.M};}""",dict(id=ident,**data))
            resolved=pg.evaluate("""ids=>{const layers=new Set(), entries=[];
              for(let id of ids){id=id.replace(/^rep:/,'');const e=FW_REVIEW_LIST.find(e=>e.id===id);
                if(e?.layerIds){e.layerIds.forEach(x=>layers.add(x));entries.push({id,ver:entryVer(e)});}
                else if(REPLICA_BY_ID[id]){layers.add(id);entries.push({id,ver:e?entryVer(e):null});}
                else throw Error('Missing regression entry '+id);
              }return {layers:[...layers].sort(),entries};}""",sorted(ids))
            cases=['type40:'+t for t in ['kiku','botan','kamuro','senrin','strobe','crackle']]+resolved['layers']
            rows=[]
            for ident in cases:
                cache=OUT/f'{label}_{ident.replace(":","_")}.json'
                if cache.exists():
                    cached=json.loads(cache.read_text(encoding='utf-8'))
                    if cached.get('source_sha256')==source_hash:
                        rows.append(cached);continue
                r=pg.evaluate("""async id=>{const d=id.startsWith('type40:')?defaultsFor(id.slice(7)):replicaPM(id),P=derive({...d.P}),M=d.M;
                  const fr=P.type==='crackle'?[.12,.53,.6]:[.12,.35,.7];
                  const frames=await renderStills(P,M,{times:fr.map(f=>f*P.duration),px:512});
                  return {id,version:VERSION,frames:frames.map(x=>({t:x.t,png:x.png}))};}""",ident)
                metrics=pg.evaluate(standard.probe.JS_METRICS,dict(id=ident,fps=30,dists=[800,1000,1200],screenH=1080,frac=1/3))
                r['metrics']=metrics;r['standard']=standard.probe.verdict(metrics,standard.STD)
                r['source_sha256']=source_hash
                for i,fr in enumerate(r['frames']):
                    data=base64.b64decode(fr.pop('png').split(',')[1]);fr['sha256']=hashlib.sha256(data).hexdigest()
                    name=f'{label}_{ident.replace(":","_")}_{i}.png';(OUT/name).write_bytes(data);fr['file']=name
                cache.write_text(json.dumps(r,ensure_ascii=False,indent=1),encoding='utf-8');rows.append(r)
                print(label,ident,'standard',all(r['standard'].values()),flush=True)
            runs[label]=dict(entries=resolved['entries'],rows=rows);pg.close()
        b.close()
    comparisons=[]
    for o,n in zip(runs['before']['rows'],runs['after']['rows']):
        comparisons.append(dict(id=n['id'],same=all(x['sha256']==y['sha256'] for x,y in zip(o['frames'],n['frames'])),standardSame=o['standard']==n['standard'],metricsSame=o['metrics']==n['metrics']))
    doc=dict(comparisons=comparisons,entriesSame=runs['before']['entries']==runs['after']['entries'])
    doc['passed']=doc['entriesSame'] and all(x['same'] and x['standardSame'] and x['metricsSame'] for x in comparisons)
    (OUT/'summary.json').write_text(json.dumps(doc,ensure_ascii=False,indent=1),encoding='utf-8')
    print(json.dumps(doc,ensure_ascii=False,indent=1));return 0 if doc['passed'] else 1

if __name__=='__main__':raise SystemExit(main())
