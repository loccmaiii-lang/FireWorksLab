import {random,dot,glow,line,rgb,shell} from './firework-painter.mjs';
import {drawRecipeEntry} from './recipe-renderer.mjs';
import {layoutPointLabels} from './point-labels.mjs';
import {cameraFrame,BASE_FRAME_SCALE} from './stage-camera.mjs';
import {drawDamFront,drawDamPlan,drawLaunchPoint,drawPointLabel,unfoldPoint} from './stage-architecture.mjs';
/* New 17-point design prototype. Deterministic virtual sketch; no UE access. */
(function (root) {
  'use strict';
  const RAD = Math.PI / 180;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const num = (v, fallback) => Number.isFinite(Number(v)) ? Number(v) : fallback;
  const chosen = (a, id) => a instanceof Set ? a.has(id) : Array.isArray(a) && a.includes(id);
  function prepare(canvas) {
    const rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : null;
    const w = Math.max(1, Math.round(rect?.width || canvas.clientWidth || num(canvas.width, 1000)));
    const h = Math.max(1, Math.round(rect?.height || canvas.clientHeight || num(canvas.height, 500)));
    const dpr = clamp(num(root.devicePixelRatio, 1), 1, 2);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    return { ctx, w, h, dpr };
  }
  function templateInfo(t) {
    t = t || {};
    const text = [t.kind, t.type, t.shape, t.hue, t.family, t.category, t.id, t.name].join(' ').toLowerCase();
    const isFan = /fan|扇|comet/.test(text), color = rgb(t.color || t.previewColor || (isFan && /red|红/.test(text) ? '#ff5b89' : /silver|白|银/.test(text) ? '#e5efff' : '#ffd794'));
    return { raw: t, isFan, isComet:t.kind==='comet'||t.shape==='comet', color,
      flight: Math.max(.2, num(t.flightS ?? t.flight ?? t.riseTimeS ?? t.burstDelayS ?? (!isFan ? t.rise : undefined), isFan ? 1.4 : 4)),
      life: Math.max(.2, num(t.lifeS ?? t.burstLifeS ?? t.life ?? t.durationS ?? t.duration, isFan ? 3.2 : 4.2)),
      height: Math.max(1, num(t.flightHeight ?? t.riseM ?? t.heightM ?? t.height ?? t.burstHeightM, isFan ? 70 : 310)),
      diameter: Math.max(1, num(t.diameterM ?? t.diameter ?? t.widthM, 180)),
      count: Math.round(clamp(num(t.fanCount ?? t.branchCount ?? t.tubes ?? t.count, /gold|金/.test(text) ? 10 : 5), 1, 40)),
      spread: clamp(num(t.spreadDeg ?? t.fanSpreadDeg ?? t.fanAngle ?? t.spread, 88), 0, 160),
      interval: Math.max(0, num(t.beamGap ?? t.gap ?? t.fanIntervalS ?? t.tubeIntervalS ?? t.internalIntervalS, .035)),
      angles: t.anglesDeg || t.angles || null,
      times: t.delaysS || t.tubeDelaysS || null,
      name: t.name || t.id || '烟花', golden: /gold|金|锦/.test(text), silver: /silver|白|银/.test(text)
    };
  }
  function pointInfo(p) {
    return { ...p, xM: num(p.xM ?? p.x, 0), yM: num(p.yM ?? p.y, 0), zM: num(p.zM ?? p.z ?? p.heightM, 150), yawDeg: num(p.yawDeg ?? p.yaw, 0) };
  }
  function eventInfo(e, templates, pointMap) {
    const t = templateInfo(templates[e.templateId ?? e.shotId ?? e.template ?? e.kind] || e.templateData);
    const sourcePoint = pointMap[e.pointId ?? e.point]; if (!sourcePoint || e.enabled === false || e.muted === true) return null;
    const p={...sourcePoint,zM:sourcePoint.zM+num(e.dz,0)};
    const start = num(e.effectiveLaunch ?? e.launchS ?? e.launch ?? e.startS ?? e.timeS ?? e.time ?? e.start, 0);
    const burst = num(e.effectiveBurst ?? e.burstS ?? e.burst, start + (t.isFan ? 0 : t.flight));
    const flight = Math.max(.1, num(e.flightS, t.isFan ? t.flight : burst - start));
    const rise = t.isFan ? t.height : Math.max(1, num(t.raw.burstZ ?? t.raw.z, sourcePoint.zM + t.height) + num(e.dz, 0) - p.zM);
    if(e.fanAngle!==undefined)t.spread=clamp(num(e.fanAngle,t.spread),0,150);if(e.beamGap!==undefined)t.interval=Math.max(0,num(e.beamGap,t.interval));
    if (Number.isFinite(Number(e.beams))) t.count = clamp(Math.round(Number(e.beams)), 1, 40);
    return { ...e, id: e.id || [p.id, start, t.name].join('-'), p, t, start, flight,
      burst, end: num(e.effectiveEnd ?? e.endS ?? e.end, burst + t.life + (t.isFan ? (t.count - 1) * t.interval : 0)),
      rise: Math.max(1, num(e.riseM ?? e.heightM, rise)),
      size: clamp(num(e.scale ?? e.sizeFactor ?? e.size, 1), .1, 5),
      angle: num(e.angleDeg ?? e.rollDeg ?? e.tilt ?? e.angle, 0), life: Math.max(.2, num(e.lifeS, t.life)) };
  }
  function label(ctx, text, x, y, color, align = 'left', size = 11) {
    ctx.font = size + 'px "Segoe UI","Microsoft YaHei",sans-serif'; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillStyle = color; ctx.fillText(text, x, y);
  }
  function background(ctx, w, h) {
    const sky = ctx.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#0c131c'); sky.addColorStop(.72, '#121e26'); sky.addColorStop(1, '#18272c');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    // Sparse fixed sky detail, deliberately below the stage and firework contrast.
    for (let i = 0; i < 37; i++) dot(ctx, random('skyx', i) * w, random('skyy', i) * h * .72, .45, [170, 200, 215], .12 + random('skybright', i) * .16);
  }
  function comet(ctx,item,time,project,unit,opacity){
    const {p,t,start,flight,life,rise,angle,size}=item,age=time-start;
    if(age<0||age>flight+life)return;
    const a=angle*RAD,position=at=>{const q=1-Math.pow(1-clamp(at/flight,0,1),1.5);return project(p.xM+Math.sin(a)*rise*size*q,p.zM+Math.cos(a)*rise*size*q-2*Math.max(0,at-flight)**2)};
    const head=position(age),fade=(age<flight?1:clamp(1-(age-flight)/life,0,1))*opacity;
    line(ctx,[position(Math.max(0,age-.28)),head],t.color,fade*.72,Math.max(.8,unit*1.4));
    glow(ctx,head[0],head[1],Math.max(2,unit*t.diameter/2),t.color,fade*.3);dot(ctx,head[0],head[1],Math.max(.8,unit),t.color,fade);
  }
  function fan(ctx, item, time, project, unit, opacity) {
    const { p, t, start, rise, flight, life, size, id, angle } = item, age = time - start;
    if (age < 0 || age > Math.max(life, flight) + t.count * t.interval + 1) return;
    const count = t.angles?.length || t.count, forward = Math.cos(p.yawDeg * RAD);
    for (let i = 0; i < count; i++) {
      const rank = item.dir === 'R' ? count - 1 - i : i;
      const delay = num(t.times?.[i], rank * t.interval), a = (angle + num(t.angles?.[i], count === 1 ? 0 : -t.spread / 2 + i * t.spread / (count - 1))) * RAD;
      const at = age - delay; if (at < 0 || at > life) continue;
      const q = clamp(at / flight, 0, 1.15), baseX = p.xM + (i - (count - 1) / 2) * .8;
      const length = rise * size * (.94 + random(id, i + 55) * .07);
      const position = t0 => { const progress = clamp(t0 / flight, 0, 1.15), d = progress < 1 ? (1 - Math.pow(1 - progress, 1.65)) : 1;
        return project(baseX + Math.sin(a) * length * d * Math.max(.4, Math.abs(forward)), p.zM + Math.cos(a) * length * d - 7 * Math.max(0, t0 - flight * .6) ** 2); };
      const fade = Math.pow(clamp(1 - at / life, 0, 1), .57) * opacity, head = position(at);
      const tailTime = Math.max(0, at - (t.golden ? .84 : .65));
      const coords = []; for (let j = 0; j <= 7; j++) coords.push(position(tailTime + (at - tailTime) * j / 7));
      line(ctx, coords, t.color, fade * .21, Math.max(1.8, unit * 4));
      line(ctx, coords, t.color, fade * .78, Math.max(.7, unit * 1.4));
      for (let j = 0; j < 12; j++) {
        const offset = random(id + ':' + i, j), sample = Math.max(0, at - offset * .72), v = position(sample);
        dot(ctx, v[0] + (random(id + i, j + 90) - .5) * unit * 5 * offset, v[1] + offset * offset * unit * 12,
          .55 + random(id + i, j + 40) * .55, t.color, fade * (1 - offset) * .8);
      }
      glow(ctx, head[0], head[1], t.golden ? 6 : 10, t.color, fade * (t.golden ? .19 : .30));
      dot(ctx, head[0], head[1], t.golden ? 1.1 : 1.6, t.color, fade);
      dot(ctx, head[0], head[1], .65, [255, 247, 225], fade);
      if (at < .32) { const muzzle = project(baseX, p.zM); glow(ctx, muzzle[0], muzzle[1], 7, [255, 183, 99], (1 - at / .32) * .36 * opacity); }
    }
  }
  function render(canvas, options = {}) {
    const { ctx, w, h } = prepare(canvas), points = (options.points || []).map(p=>pointInfo(options.view==='top'?p:unfoldPoint(p,options.stage))), source = options.templates || [];
    const templates = Array.isArray(source) ? Object.fromEntries(source.map(t => [t.id, t])) : source;
    const pointMap = Object.fromEntries(points.map(p => [p.id, p])), time = num(options.time, 0);
    const events = (options.events || []).map(e => eventInfo(e, templates, pointMap)).filter(Boolean);
    const active = events.filter(e => time >= e.start && time <= e.end);
    const selection = options.selectedEventIds || [], focused = selection.size || selection.length;
    const shown = options.isolated && focused ? active.filter(e => chosen(selection, e.id) || chosen(selection, e.groupId)) : active;
    background(ctx, w, h);
    const minX = Math.min(-400, ...points.map(p => p.xM)), maxX = Math.max(400, ...points.map(p => p.xM));
    const camera=cameraFrame(w,h,points,options.cameraMode||'full',options.cameraZoom||1);
    const {maxZ,unit,baseY,center:middle}=camera;
    const project=(x,z)=>[w/2+(x-middle)*unit,baseY-z*unit];
    const hits = [];
    if (options.view === 'top') {
      const minY = Math.min(-60, ...points.map(p => p.yM)), maxY = Math.max(60, ...points.map(p => p.yM));
      const topUnit = Math.max(.04,Math.min((w - 110) / (maxX - minX + 150), (h - Math.min(145,h*.45)) / (maxY - minY + 130)))*BASE_FRAME_SCALE*(options.cameraZoom||1);
      const topProject = p => [w / 2 + (p.xM - middle) * topUnit, h / 2 + 18 - (p.yM - (maxY + minY) / 2) * topUnit];
      for (let x = Math.ceil(minX / 100) * 100; x <= maxX; x += 100) { const px = topProject({ xM: x, yM: 0 })[0]; line(ctx, [[px, 62], [px, h - 57]], [75, 100, 113], .19, .5); label(ctx, x + ' m', px, h - 31, '#566f79', 'center', 10); }
      drawDamPlan(ctx,topProject,points,options.stage);
      for (const p of points) {
        const xy = topProject(p), playing = shown.filter(e => e.p.id === p.id), selected = chosen(options.selectedPointIds, p.id);
        if (playing.length) glow(ctx, xy[0], xy[1], 15 + Math.min(playing.length, 4) * 6, playing[0].t.color, .23);
        drawLaunchPoint(ctx,xy,{selected,playing:playing.length>0,front:p.zone==='front',fan:p.id.startsWith('B')});
        const labelY=xy[1]+(p.zone==='front'?(topUnit>=.75?-20:-20-(Number(p.id.slice(1))%3)*18):p.id.startsWith('B')?29:-24);
        const labelBox=drawPointLabel(ctx,p.id,xy[0],labelY,selected);
        if (playing.length&&selected) label(ctx, playing.length + ' 发', xy[0], xy[1] + 38, '#e1dbcc', 'center', 10);
        const a = p.yawDeg * RAD; line(ctx, [xy, [xy[0] - Math.sin(a) * 12, xy[1] - Math.cos(a) * 12]], [110, 179, 164], .6, 1);
        hits.push({ id: p.id, x: xy[0], y: xy[1]-5, r: 16,labelBox });
      }
      label(ctx, '平面 · '+points.length+' 个物理发射点', 18, 20, '#90aab2', 'left', 11);
      label(ctx, '观众方向  ↑', w / 2, 43, '#78939a', 'center', 11);
      return { points: hits, scale: topUnit, width: w, height: h, virtualSchematic: true, activeCount: new Set(shown.map(e=>e.parentId||e.id)).size };
    }
    for (let z = 100; z <= maxZ; z += 100) {
      const y = project(0, z)[1]; if (y < 24) continue;
      ctx.setLineDash([2, 6]); line(ctx, [[36, y], [w - 20, y]], [99, 127, 137], z === 150 ? .24 : .12, .5); ctx.setLineDash([]);
      label(ctx, z + ' m', 8, y, '#536e78', 'left', 9);
    }
    const z = options.stage?.damHeight??150, damY = project(0,z)[1];
    drawDamFront(ctx,project,unit,{front:points.some(p=>p.zone==='front'),width:w,stage:options.stage,points});

    const screenPoints=points.map(p=>{const [x,y]=project(p.xM,p.zM);return {...p,x,y}});
    const selectedPoint=points.find(p=>chosen(options.selectedPointIds,p.id))?.id;
    const labels=layoutPointLabels(screenPoints,w,h,selectedPoint);
    for(const p of screenPoints){
      const selected=p.id===selectedPoint,playing=shown.some(e=>e.p.id===p.id);
      drawLaunchPoint(ctx,[p.x,p.y],{selected,playing,front:p.zone==='front',fan:p.id.startsWith('B')});
      hits.push({id:p.id,x:p.x,y:p.y+7,r:16});
    }
    // Text has its own rails and screen-space spacing; physical markers never move.
    for(const text of labels){
      const p=screenPoints.find(p=>p.id===text.id),selected=p.id===selectedPoint;
      const above=text.y<p.y;
      line(ctx,[[p.x,above?p.y-3:p.y+14],[p.x,above?text.y+10:text.y-18],[text.x,above?text.y+6:text.y-15]],[112,130,140],selected?.9:.5,.75);
      const labelBox=drawPointLabel(ctx,p.id,text.x,text.y,selected,p.zone==='front'?'#c2d2dc':'#bbc9d2');
      hits.find(hit=>hit.id===p.id).labelBox=labelBox;
    }
    // Source-over tails preserve readable layering; additive stars avoid opaque sun discs.
    ctx.save(); ctx.beginPath(); ctx.rect(0, 24, w, baseY - 20); ctx.clip(); ctx.globalCompositeOperation = 'lighter';
    for (const e of shown) {
      const opacity = focused && !chosen(selection, e.id) && !chosen(selection, e.groupId) ? .45 : 1;
      if(e.nativePrimitive){drawRecipeEntry(ctx,e,time,project(e.p.xM,e.p.zM-num(e.dz,0)),unit,opacity)}else (e.t.isComet ? comet : e.t.isFan ? fan : shell)(ctx, e, time, project, unit, opacity);
    }
    ctx.restore();
    label(ctx, '坝顶 ' + z + ' m', w - 16, damY + 15, '#6e929a', 'right', 10);
    const rulerX = w - 100 * unit - 20, rulerY = h - 16;
    line(ctx, [[rulerX, rulerY - 3], [rulerX, rulerY], [rulerX + 100 * unit, rulerY], [rulerX + 100 * unit, rulerY - 3]], [114, 145, 154], .8, 1);
    label(ctx, '100 m', rulerX + 50 * unit, rulerY - 10, '#809aa3', 'center', 9);
    label(ctx, '坝体展开 · 总长 800 m · 米制比例', 16, 18, '#8aa4ad', 'left', 11);

    return { points: hits, scale: unit, width: w, height: h, virtualSchematic: true, activeCount: new Set(shown.map(e=>e.parentId||e.id)).size };
  }
  function thumbnail(canvas, template) {
    const { ctx, w, h } = prepare(canvas), t = templateInfo(template), p = { id: 'thumb', xM: 0, yM: 0, zM: 0, yawDeg: 0 };
    ctx.fillStyle = '#111c24'; ctx.fillRect(0, 0, w, h);
    const height = t.isFan ? t.height * 1.1 : t.diameter * 1.2, unit = Math.min((h - 8) / height, (w - 8) / (t.isFan ? t.height * 1.55 : t.diameter * 1.2));
    const project = (x, z) => [w / 2 + x * unit, h - 5 - z * unit];
    const e = { id: 'thumbnail-' + t.name, p, t, start: 0, burst: t.isFan ? 0 : 0, rise: t.isFan ? t.height : t.diameter * .53, flight: t.flight, life: t.life, angle: 0, size: 1 };
    ctx.globalCompositeOperation = 'lighter'; (t.isComet ? comet : t.isFan ? fan : shell)(ctx, e, t.isFan ? t.flight * .76 : .9, project, unit, 1); ctx.globalCompositeOperation = 'source-over';
    return { virtualSchematic: true };
  }
  root.Stage17 = { render, thumbnail };
})(typeof window !== 'undefined' ? window : globalThis);
