from pathlib import Path

root = Path(__file__).resolve().parents[1]
src = root / 'tool/src'
def edit(name, old, new, count=None):
    p = src / name
    s = p.read_text(encoding='utf-8')
    assert old in s, (name, old[:90])
    if count is not None: assert s.count(old) == count, (name, s.count(old))
    p.write_text(s.replace(old, new), encoding='utf-8')

edit('js/10_types.js', "const VERSION = '3.6';", "const VERSION = '3.6 · ULTRA 实验版 1';")
edit('js/10_types.js', "shutter: 0.6, fpsFloor: 24,", "shutter: 0.6, fpsFloor: 24, qSS: 4, qHz: 960, qMaxSub: 64, qKernel: 1, qCore: 0.25,")
edit('js/00_util.js', 'const PREVIEW_LIB_N = 1024;', 'const PREVIEW_LIB_N = 2048;')
edit('js/75_iter.js', "'fwb.'", "'fwb.ultra36.'")
edit('js/79_library.js', "'../' + formal.video", "'../../../' + formal.video")
edit('js/79_library.js', "if (fresh) openReview(fresh); else if (lastRv) openReview(lastRv); else crumb('花型', TYPE_NAMES[state.P.type]);", "crumb('高精度实验', TYPE_NAMES[state.P.type]); // 实验版不自动切换到素材审阅页")
review = root / 'tool/data/review.js'
review.write_text(review.read_text(encoding='utf-8').replace('../analysis/', '../../../analysis/').replace('../vidio/', '../../../vidio/'), encoding='utf-8')
edit('js/70_ui.js', "const libP = P => ({ ...P, texW: 1024, texH: 1024,", "const libP = P => ({ ...P, texW: 2048, texH: 2048,")
edit('js/90_events.js', '烘焙 1024 版本存入组合库', '烘焙完整 2K 版本存入组合库')
edit('body.html', '组合预览用 1024 版本。', '组合预览使用完整 2048 版本。')
edit('body.html', '<b>烟花母版烘焙器</b>', '<b>烟花高精度实验室</b>')
edit('body.html', '<option value="2048x2048">', '<option value="4096x4096">4096 × 4096 · 4K 母版</option><option value="8192x8192">8192 × 8192 · 8K 母版</option><option value="2048x2048">', 1)
edit('js/90_events.js', 'initPicker();', 'initQuality();\ninitPicker();', 1)
edit('js/90_events.js', "$('#btnExport').addEventListener('click', exportMaster);", "$('#btnExport').addEventListener('click', () => qualityExport(exportMaster));")
edit('js/90_events.js', "$('#btnVariants').addEventListener('click', exportVariants);", "$('#btnVariants').addEventListener('click', () => qualityExport(exportVariants));")
# Gate rendering while asynchronous baking owns the WebGL state.
edit('js/80_render.js', 'if (state.stillBusy) {', 'if (state.stillBusy || state.baking || LAB.job) {')
edit('js/80_render.js', 'Math.min(2048, Math.round(Math.min(box.width, box.height || box.width) * (devicePixelRatio || 1) / 4)', 'Math.min(LAB.previewCap, Math.round(Math.min(box.width, box.height || box.width) * (devicePixelRatio || 1) * LAB.previewScale / 4)')
edit('js/80_render.js', 'const pr = PR.post, R = state.ref; gl.useProgram(pr.p);', 'const pr = PR.post, R = state.ref; gl.useProgram(pr.p); gl.uniform1f(pr.u.uBloom, LAB.bloom); gl.uniform1f(pr.u.uRaw, LAB.raw ? 1 : 0);')
edit('js/80_render.js', 'function renderLive() {', 'function renderLive() {\n  setParticleProfile(state.P);')
# A/B live scenes can use different particle profiles.
p = src/'js/80_render.js'
s = p.read_text(encoding='utf-8'); import re
s,n = re.subn(r'(function drawLiveScene\([^\n]+\) \{)', r'\1\n  setParticleProfile(P);', s); assert n == 1
p.write_text(s,encoding='utf-8')
edit('js/80_render.js', "$('#hud').textContent = hudText;", "updateQualityHUD();\n  $('#hud').textContent = hudText;")
# Actual dimensions must use the baked buffer, not nominal source size.
edit('js/80_render.js', 'const texPPM = m.L.cellW /', 'const texPPM = s.cw /')
edit('js/50_bake.js', 'draw(ts, view, ppm, w, tw, f) {', 'draw(ts, view, ppm, w, tw, f) {\n        setParticleProfile(P);')
edit('js/50_bake.js', 'draw(ts, view, ppm, w, tw) {', 'draw(ts, view, ppm, w, tw) {\n      setParticleProfile(P);')
edit('js/42_trail.js', 'draw(ts, view, ppm, w, tw, f) {', 'draw(ts, view, ppm, w, tw, f) {\n      setParticleProfile(P);')
edit('js/85_stills.js', 'const drawAt = (sim, t, tw) => {', 'const drawAt = (sim, t, tw) => {\n    setParticleProfile(P);')
# Correct weighted spatial downsample, in the linear floating-point domain.
edit('js/40_gl.js', 'uniform float uFade, uPad; uniform vec2 uCell;', 'uniform float uFade, uPad; uniform int uSS; uniform vec2 uCell;')
edit('js/40_gl.js', 'o=vec4(dot(texture(uS,v_uv),uM)*uFade*m);', '''ivec2 sz=textureSize(uS,0); ivec2 base=ivec2(floor(v_uv*uCell))*uSS; vec4 sum=vec4(0.);
  for(int y=0;y<8;y++){ if(y>=uSS) break; for(int x=0;x<8;x++){ if(x>=uSS) break; sum+=texelFetch(uS,clamp(base+ivec2(x,y),ivec2(0),sz-1),0); } }
  o=vec4(dot(sum/float(uSS*uSS),uM)*uFade*m);''')
edit('js/40_gl.js', 'uniform float uX, uRefMode, uRefA, uSplit, uWipe;', 'uniform float uX, uRefMode, uRefA, uSplit, uWipe, uBloom, uRaw;')
edit('js/40_gl.js', 'c+=b*.2;', 'c+=b*uBloom; if(uRaw>.5){ float y=dot(c,vec3(.2126,.7152,.0722)); c=vec3(y); }')
edit('js/40_gl.js', 'c=1.-exp(-(c*uX+sky));', 'c=1.-exp(-(c*uX+(uRaw>.5?vec3(0.):sky)));')
edit('js/40_gl.js', 'uniform float uPPM, uPPMY; out vec4 o;\nvoid main(){ vec2 d=(gl_PointCoord-.5)*vPS/vSig; float g=exp(-.5*dot(d,d))/(6.2831853*vSig.x*vSig.y);', '''uniform float uPPM, uPPMY, uKernel, uCore; out vec4 o;
// Integrate the normalized Gaussian over the pixel footprint (avoids subpixel peak aliasing).
vec2 erf2(vec2 x){ vec2 sg=sign(x); x=abs(x); vec2 t=1./(1.+.3275911*x); return sg*(1.-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t*exp(-x*x)); }
float coverage(vec2 p, vec2 s){ vec2 v=.5*(erf2((p+.5)/(1.41421356*s))-erf2((p-.5)/(1.41421356*s))); return max(0.,v.x*v.y); }
void main(){ vec2 p=(gl_PointCoord-.5)*vPS; vec2 d=p/vSig; float g=exp(-.5*dot(d,d))/(6.2831853*vSig.x*vSig.y);
  if(uKernel>.5) g=mix(coverage(p,vSig),coverage(p,max(vSig*.6,vec2(.25))),uCore);''')
edit('js/40_gl.js', 'g*=smoothstep(1.,.8,length(gl_PointCoord-.5)*2.);', 'g*=1.-smoothstep(.8,1.,length(gl_PointCoord-.5)*2.);')
# All point programs share the fragment kernel; select it at every draw.
edit('js/40_gl.js', 'gl.uniform4fv(pr.u.uChan, chan);', 'setParticleUniforms(pr, chan); gl.uniform4fv(pr.u.uChan, chan);')
edit('js/42_trail.js', 'gl.uniform4fv(pr.u.uChan, [0, 1, 0, 0]);', 'setParticleUniforms(pr, [0, 1, 0, 0]); gl.uniform4fv(pr.u.uChan, [0, 1, 0, 0]);')
# Quality metadata and allocation budget.
edit('js/50_bake.js', 'const ssW = cw * 2, ssH = chh * 2;', 'const q = qualityOf(P); validateQuality(P, scale);\n  const ssW = cw * q.ss, ssH = chh * q.ss;')
edit('js/50_bake.js', 'const nsub = clamp(Math.ceil(W / (1 / 300)), 1, 16);', 'const nsub = clamp(Math.ceil(W * q.hz), 1, q.maxSub);')
edit('js/50_bake.js', 'for (let f = 0; f < L.F; f++) {\n    const tc', "for (let f = 0; f < L.F; f++) {\n    if (LAB.cancel) throw new Error('已取消烘焙，保留上一份结果。');\n    const tc")
edit('js/50_bake.js', 'gl.uniform1i(PR.pack.u.uS, 0);', 'gl.uniform1i(PR.pack.u.uS, 0); gl.uniform1i(PR.pack.u.uSS, q.ss);')
edit('js/50_bake.js', 'meta: { ...pl, expoH:', 'meta: { ...pl, quality: q, budget: qualityBudget(P, scale), expoH:')
# Free every allocated GPU target if cancellation/allocation/analyze fails.
edit('js/50_bake.js', 'const fH = new Target(N, NH, gl.RGBA16F), fT = new Target(N, NH, gl.RGBA16F), sst = new Target(ssW, ssH, gl.RGBA16F);', '''const allocated = []; let success = false;
  const target = (...args) => { const t = new Target(...args); allocated.push(t); return t; };
  try {
  const fH = target(N, NH, gl.RGBA16F), fT = target(N, NH, gl.RGBA16F), sst = target(ssW, ssH, gl.RGBA16F);''')
edit('js/50_bake.js', 'const head = new Target(N, NH, gl.RGBA8), tail = comb ? null : new Target(N, NH, gl.RGBA8);', 'const head = target(N, NH, gl.RGBA8), tail = comb ? null : target(N, NH, gl.RGBA8);')
edit('js/50_bake.js', 'fH.dispose(); fT.dispose(); sst.dispose();', '// Intermediate targets are released in finally.')
edit('js/50_bake.js', 'analyze(b);\n  return b;', '''analyze(b); success = true;
  return b;
  } finally {
    PPMY = 0; additive(false); gl.colorMask(true,true,true,true); gl.activeTexture(gl.TEXTURE0);
    allocated.forEach((t,i) => { if (!success || i < 3) t.dispose(); });
  }''')
# Do not keep reattempting an invalid/cancelled bake forever.
edit('js/70_ui.js', "state.baking = true; const gen = state.gen;", "if (LAB.job) return;\n  LAB.cancel = false; state.baking = true; const gen = state.gen;")
edit('js/70_ui.js', "} catch (e) { console.error(e); flash('烘焙失败：' + e.message, true); }", "} catch (e) { state.dirty = false; state.rebake = false; console.error(e); flash('烘焙未完成：' + e.message, true); }")
# Export caches must never reuse a stale result following failure.
edit('js/70_ui.js', "state.dirty = false; state.rebake = false; console.error(e);", "state.dirty = true; state.rebake = false; state.baking = false; console.error(e);")
edit('js/70_ui.js', "flash('烘焙未完成：' + e.message, true); }", "flash('烘焙未完成：' + e.message, true); return; }")
# Shader allocation failure should not leak its texture / framebuffer.
edit('js/40_gl.js', "if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('帧缓冲创建失败');", "if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) { this.dispose(); throw new Error('显存分配失败，请降低母版尺寸或采样档位。'); }")
edit('js/60_export.js', "if (b.form === 'trail' && state.P.trExport4K)", "if (b.form === 'trail' && state.P.trExport4K && state.P.texW <= 2048)")
# Keep captured seed, framing, exposure identical in controlled render comparisons.
edit('js/85_stills.js', 'const comb = P.outMode', 'const comb = P.outMode')
edit('js/85_stills.js', "eH = expoOfChannel(buf, 0, comb ? 0.92 : 0.9, 99.8) * cg[0], eT = expoOfChannel(buf, 1, comb ? 0.55 : 0.85, 99.6) * cg[1];", "eH = opt.fixedExposure ? opt.fixedExposure[0] : expoOfChannel(buf, 0, comb ? 0.92 : 0.9, 99.8) * cg[0], eT = opt.fixedExposure ? opt.fixedExposure[1] : expoOfChannel(buf, 1, comb ? 0.55 : 0.85, 99.6) * cg[1];")
edit('js/85_stills.js', "out.push({ t: times[i], png: canvas.toDataURL('image/png') });", "out.push({ t: times[i], png: canvas.toDataURL('image/png'), exposure: [eH, eT], view });")
# Compile this copy only; title and release label stay distinct.
p=root/'tool/build.py'; s=p.read_text(encoding='utf-8').replace('<title>烟花母版烘焙器</title>', '<title>ULTRA 烟花实验室 · 独立测试版</title>'); p.write_text(s,encoding='utf-8')
print('Applied isolated quality upgrades')
