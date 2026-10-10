import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft} from '@phosphor-icons/react';
import {baseComparisonSpecs} from './basic-template-model.mjs';
import {comparisonLabel,drawBasicPreview} from './basic-preview-renderer.mjs';

export function BasicTemplatePreview({resource,doc,onBack,onUse}){
 const canvas=useRef(),[view,setView]=useState('compare'),[selection,setSelection]=useState(null);
 const specs=useMemo(()=>baseComparisonSpecs(doc),[doc]),uses=specs.filter(s=>s.resourceIds.includes(resource.id));
 const selectedId=selection?.resource===resource.key&&specs.some(s=>s.id===selection.id)?selection.id:uses[0]?.id;
 const choose=id=>{setSelection({resource:resource.key,id});setView('compare');};
 useEffect(()=>{const c=canvas.current,draw=()=>{const w=c.clientWidth,h=c.clientHeight,dpr=devicePixelRatio||1;c.width=w*dpr;c.height=h*dpr;const ctx=c.getContext('2d');ctx.scale(dpr,dpr);drawBasicPreview(ctx,w,h,{resource,specs,selectedId,view,points:doc.points});};draw();const ro=new ResizeObserver(draw);ro.observe(c);return()=>ro.disconnect();},[resource,specs,selectedId,view,doc.points]);
 return <><section className="stage-panel recipe-preview basic-preview">
  <div className="panel-heading"><b>基础模板 · 全尺寸比例参照</b><button onClick={onBack}><ArrowLeft size={15}/>返回舞台</button></div>
  <div className="preview-mode tabs" aria-label="基础模板视图"><button aria-pressed={view==='compare'} onClick={()=>setView('compare')}>比例对照</button><button aria-pressed={view==='raw'} onClick={()=>setView('raw')}>原始形态</button><span>静态 · 米制参照</span></div>
  <canvas ref={canvas} className="basic-reference-canvas" aria-label={view==='compare'?'基础模板同尺度比例对照':'基础模板原始形态 · 静态'} />
  <p className="recipe-note">{view==='compare'?'对照读取当前花型的使用规格，基础资源原值不变。相近尺度共用轮廓，右侧点选高亮；高度包含点位高度。':'基础球花在0m原点，尾缀/扇形单束竖直。无延迟或编排动画；名义尺寸仍待UE标定。'}</p>
 </section><aside className="inspector recipe-inspector"><div className="panel-heading"><b>基础模板 · 只读</b></div><div className="inspector-body">
  <h3>{resource.label||resource.name}</h3><p className="native-info">{resource.id}</p><p className="field-hint">{resource.source==='programme'?'导入节目内资源，资源表中未收录':'ResourceFXTable · '+resource.platforms?.join(' / ')}</p>
  <p className="subtle-note">基础模板只选择资源。延迟、高度、大小、角度与随机范围在花型层中设置。</p>
  <h3>关联花型的设计规格</h3><div className="basic-associated">{uses.map(s=><button key={s.id} aria-pressed={s.id===selectedId} onClick={()=>choose(s.id)}><span>{s.name}</span><small>{comparisonLabel(s)}</small></button>)}</div>
  {!uses.length&&<p className="field-hint">尚无规格映射；可切换原始形态查看。尺寸待标定。</p>}
  <p className="field-hint">同一资源可用于不同大小的花型；这里显示用途规格，不是资源固有尺寸。</p>
  <h3>全尺寸对照</h3><div className="basic-comparisons">{specs.map(s=><button key={s.id} title={s.name+' · '+comparisonLabel(s)} aria-pressed={s.id===selectedId} onClick={()=>choose(s.id)}>{s.name}</button>)}</div>
  {resource.sourceRows?.map(row=><details key={row.platform}><summary>{row.platform} · 资源表原值</summary><dl><dt>资源行</dt><dd>{row.rowName}</dd><dt>原粒子</dt><dd className="native-info">{row.particle}</dd><dt>表中缩放</dt><dd>{row.scale}</dd><dt>表中寿命 / 延迟</dt><dd>{row.lifeTime} / {row.delay}</dd></dl></details>)}
  <p className="field-hint">设计参照不回写资源表，真实球花大小、单束轨迹与随机包络仍需UE核对。</p>
 </div><div className="recipe-save"><button disabled={resource.role==='unknown'} onClick={onUse}>用于当前花型</button></div></aside></>;
}
