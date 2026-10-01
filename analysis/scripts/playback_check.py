"""Engine playback tick and game-size checks, including special product forms."""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_runtime import chromium_options,verify_renderer
ROOT=Path(__file__).resolve().parents[2]
JS=r"""async () => {
  state.stillBusy=true;clearTimeout(bakeTimer);canvas.width=canvas.height=1080;
  const result={checks:{},views:[]}; const ok=result.checks;
  ok['30 Hz tick helper exists']=typeof engineTick==='function';
  if(ok['30 Hz tick helper exists']){
    ok['same tick stays fixed']=engineTick(.101)===engineTick(.132);
    ok['next tick advances']=engineTick(.134)>engineTick(.132);
    ok['negative age remains negative']=engineTick(-.001)<0;
  }
  const {P}=defaultsFor('kiku');const pl=displayPlan40(P);
  const b={P,meta:pl,form:'master',cw:pl.L.cellW,chh:pl.L.cellH};
  const tests=[b,{...b,form:'segments'},{...b,form:'unit',meta:{...pl,fit:{v0:100,k:1}}},
    {...b,form:'riseLoop'},{...b,form:'trail',meta:{...pl,T:5,Tp:1,hb:.8,fit:{v0:100,k:1},sizeKeysRise:[[0,1],[1,1]]}}];
  state.t=.1;
  for(const item of tests){
    const views=[];
    for(const dist of [800,1000,1200]){
      state.dist=dist;state.disp='game';const v=exportViewAny(item,{});views.push(v);
    }
    result.views.push({form:item.form,views});
    ok[item.form+': distance changes projected size']=Math.abs(views[2].view[2]/views[0].view[2]-1.5)<1e-6;
  }
  if(typeof gamePixelsPerMeter==='function'){
    ok['1000 m maps supplied diameter to one third screen']=Math.abs(gamePixelsPerMeter({screenFrac:1/3},600,1080,1000)*600-360)<1e-6;
    ok['screenFrac override']=Math.abs(gamePixelsPerMeter({screenFrac:.25},600,1080,1000)*600-270)<1e-6;
  }else ok['game size calibration exists']=false;
  return result;
}"""
def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--out',required=True);args=ap.parse_args()
    with sync_playwright() as pw:
        with pw.chromium.launch(**chromium_options()) as b:
            p=b.new_page();p.goto((ROOT/'tool/FireworkBaker.html').as_uri()+'?fast');p.wait_for_function('window.__fw && __fw.idle()')
            gpu=verify_renderer(p.evaluate("document.querySelector('#gpu').title"));r=p.evaluate(JS);r['renderer']=gpu
    r['pass']=all(r['checks'].values());out=Path(args.out);out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(r['checks'],ensure_ascii=False,indent=2))
    if not r['pass']:raise SystemExit(1)
if __name__=='__main__':main()
