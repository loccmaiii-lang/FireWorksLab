import {parseCurve,at,serialize,validatePoint,movePoint} from '../full-sample/curve-model.mjs';
// 实际线性插值图。预览拖动不提交；松手只提交一次，取消保留旧值。
export class CurveEditor {
  constructor(host,{read,commit,label,state,announce,onHelp}) {
    Object.assign(this,{host,read,commit,label,state,announce,onHelp});
    this.selected=state.selected??-1;this.preview=null;this.drag=null;
    host.innerHTML='<div class="curve-heading"><button type="button" class="param-label">随寿命</button><button type="button" class="curve-mode"></button></div><div class="curve-graph"><canvas></canvas><div class="curve-points"></div></div><div class="point-editor"></div>';
    host.querySelector('.param-label').onclick=onHelp;
    this.graph=host.querySelector('.curve-graph');this.canvas=host.querySelector('canvas');this.points=host.querySelector('.curve-points');this.editor=host.querySelector('.point-editor');this.mode=host.querySelector('.curve-mode');
    this.mode.onclick=()=>{const points=parseCurve(this.read());this.state.selected=-1;this.commit(points?'':'0:1, 1:1');};
    this.resize=new ResizeObserver(()=>this.draw());this.resize.observe(this.graph);this.draw();this.showEditor();
  }
  values(){return this.preview||parseCurve(this.read());}
  bounds(){const p=this.values()||[[0,1],[1,1]];const max=Math.max(2,...p.map(k=>k[1]*1.2)),min=Math.min(0,...p.map(k=>k[1]*1.2));return {min,max};}
  geometry(){const w=this.graph.clientWidth,h=this.graph.clientHeight;return {w,h,left:28,right:w-12,top:12,bottom:h-24};}
  position(x,y,bounds=this.bounds()) {const g=this.geometry();return [g.left+x*(g.right-g.left),g.bottom-(y-bounds.min)/(bounds.max-bounds.min)*(g.bottom-g.top)];}
  draw(){
    const g=this.geometry();if(g.w<10||g.h<10)return;
    const dpr=devicePixelRatio||1;this.canvas.width=g.w*dpr;this.canvas.height=g.h*dpr;const c=this.canvas.getContext('2d');c.scale(dpr,dpr);c.clearRect(0,0,g.w,g.h);
    const style=getComputedStyle(document.body),color=k=>style.getPropertyValue('--fw-color-'+k).trim(),p=this.values(),b=this.drag?.bounds||this.bounds();
    c.lineWidth=1;c.strokeStyle=color('divider');
    for(let i=0;i<=4;i++){const x=g.left+(g.right-g.left)*i/4,y=g.top+(g.bottom-g.top)*i/4;c.beginPath();c.moveTo(x,g.top);c.lineTo(x,g.bottom);c.stroke();c.beginPath();c.moveTo(g.left,y);c.lineTo(g.right,y);c.stroke();}
    c.font='10px Consolas,monospace';c.fillStyle=color('on-surface-muted');c.textAlign='right';c.fillText(b.max.toFixed(1),24,g.top+4);c.fillText(b.min.toFixed(1),24,g.bottom+4);c.textAlign='center';for(const x of [0,.5,1])c.fillText(String(x),this.position(x,0,b)[0],g.h-7);
    c.strokeStyle=color('primary');c.lineWidth=2;c.beginPath();for(let i=0;i<=100;i++){const x=i/100,[px,py]=this.position(x,at(p,x),b);if(!i)c.moveTo(px,py);else c.lineTo(px,py);}c.stroke();
    this.mode.textContent=p?'恒定 1':'编辑曲线';this.mode.setAttribute('aria-label',this.label+'：'+(p?'恢复恒定倍率1':'编辑曲线'));
    if(!this.drag) {
      this.points.replaceChildren();
      (p||[]).forEach(([x,y],i)=>{
        const button=document.createElement('button');button.type='button';button.className='curve-point';button.dataset.point=i;button.setAttribute('aria-label',`${this.label}曲线点 ${i+1}，寿命位置 ${x}，倍率 ${y}`);button.setAttribute('aria-pressed',this.selected===i);this.points.append(button);
        button.onclick=()=>{if(this.suppressClick){this.suppressClick=false;return;}this.select(i);};
        button.onpointerdown=e=>this.start(e,i,button);button.onpointermove=e=>this.move(e);button.onpointerup=e=>this.end(e,button);button.onpointercancel=()=>this.cancel();button.onlostpointercapture=()=>{if(this.drag)this.cancel();};
        button.onkeydown=e=>this.key(e,i);
      });
    }
    this.points.querySelectorAll('button').forEach((button,i)=>{const k=p?.[i];if(!k)return;const [x,y]=this.position(...k,b);button.style.left=x+'px';button.style.top=y+'px';button.setAttribute('aria-pressed',this.selected===i);});
  }
  select(i){this.selected=i;this.state.selected=i;this.draw();this.showEditor();this.editor.querySelector('input')?.focus({preventScroll:true});}
  showEditor(){
    const p=this.values();this.editor.replaceChildren();if(!p||this.selected<0||!p[this.selected])return;
    const form=document.createElement('form');form.className='point-editor';form.setAttribute('aria-label',this.label+'曲线点精确编辑');
    form.innerHTML='<label>寿命位置<input name="x" type="number" step="any" min="0" max="1" required></label><label>倍率<input name="y" type="number" step="any" required></label><button type="submit" class="primary-button">确定</button><button type="button" class="close-point">收起</button><p class="error" role="alert" hidden></p>';
    form.elements.x.value=p[this.selected][0];form.elements.y.value=p[this.selected][1];
    form.elements.x.setAttribute('aria-label',this.label+'曲线点寿命位置');form.elements.y.setAttribute('aria-label',this.label+'曲线点倍率');
    form.onsubmit=e=>{e.preventDefault();const values=this.values(),x=form.elements.x.value,y=form.elements.y.value,error=validatePoint(values,this.selected,x,y);if(error){const errorEl=form.querySelector('.error');errorEl.textContent=error;errorEl.hidden=false;form.elements.x.setAttribute('aria-invalid','true');return;}const next=values.map(point=>[...point]);next[this.selected]=[+x,+y];this.commit(serialize(next));};
    form.querySelector('.close-point').onclick=()=>{this.selected=-1;this.state.selected=-1;this.draw();this.showEditor();this.mode.focus();};
    this.editor.append(form);
  }
  start(e,i,button){if(e.button!==0)return;const p=parseCurve(this.read());this.selected=i;this.state.selected=i;this.drag={id:e.pointerId,index:i,start:[e.clientX,e.clientY],bounds:this.bounds(),points:p,moved:false};this.preview=p;button.setPointerCapture(e.pointerId);this.draw();}
  move(e){const d=this.drag;if(!d||d.id!==e.pointerId)return;const distance=Math.hypot(e.clientX-d.start[0],e.clientY-d.start[1]);if(distance<3&&!d.moved)return;d.moved=true;const r=this.graph.getBoundingClientRect(),g=this.geometry(),x=(e.clientX-r.left-g.left)/(g.right-g.left),y=d.bounds.min+(g.bottom-(e.clientY-r.top))/(g.bottom-g.top)*(d.bounds.max-d.bounds.min);this.preview=movePoint(d.points,d.index,x,y);this.draw();}
  end(e,button){const d=this.drag;if(!d||d.id!==e.pointerId)return;const points=this.preview;this.drag=null;this.preview=null;if(button.hasPointerCapture(e.pointerId))button.releasePointerCapture(e.pointerId);if(d.moved){this.suppressClick=true;this.commit(serialize(points));}else this.select(d.index);}
  cancel(){if(!this.drag)return;this.drag=null;this.preview=null;this.draw();this.showEditor();this.announce('已取消拖动，保留原曲线');}
  key(e,i){if(e.key==='Escape'){e.preventDefault();this.cancel();this.selected=-1;this.state.selected=-1;this.showEditor();return;}if(e.key==='Enter'||e.key===' '){e.preventDefault();this.select(i);return;}if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const p=parseCurve(this.read()),[x,y]=p[i],step=e.shiftKey?.1:.01;this.state.selected=i;this.commit(serialize(movePoint(p,i,x+(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0),y+(e.key==='ArrowUp'?step:e.key==='ArrowDown'?-step:0))));}
  destroy(){this.resize.disconnect();this.drag=null;}
}
