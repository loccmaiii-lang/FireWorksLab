// Runs as a classic script INSIDE the original Ultra page, sharing its lexical
// globals. The parent only controls time/parameters; the old engine draws itself.
state.stillBusy=true;state.playing=false;state.dirty=false;LAB.bloom=0;
document.head.insertAdjacentHTML('beforeend','<style>body>*{display:none!important}#app,#workspace,#box{display:block!important}#box{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;background:#000}#gl{display:block!important;position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;object-fit:contain}body{background:#000}</style>');
canvas.style.display='block';document.body.appendChild(canvas);
let compareLayers=[],compareRecipe;
// Equal display response: original particle/filament shaders and raw GL draw
// remain intact; both engines use the same exposure, sRGB curve and black sky.
const comparePost=compile(VS_QUAD,HDR+window.parent.THREE_LAB.comparisonPostShader);
window.ultraCompare={
  load(recipe){
    for(const l of compareLayers)l.R.dispose();compareLayers=[];
    compareRecipe=recipe;
    for(const spec of recipe.layers) {
      const P={...spec.P,engine:'gpu'};
      compareLayers.push({...spec,P,R:P.form==='trail'?makeTrailRenderer(P):makeRenderer(P,familyOf(P.type)==='ground'?'loop':'master')});
    }
    return true;
  },
  render(time,size=1024,exposure=1,bloom=0){
    canvas.width=canvas.height=size;
    if(!hdrT||hdrT.w!==size){hdrT?.dispose();rgT?.dispose();hdrT=new Target(size,size,gl.RGBA16F);rgT=new Target(size,size,gl.RGBA16F);}
    hdrT.clear();
    const view=compareRecipe.view,ppm=size/(2*view[2]);
    for(const l of compareLayers){
      rgT.clear();rgT.bind();additive(true);
      PPMY=size/(2*view[3]);
      if(l.P.form==='trail'){
        const stop=compareRecipe.stop;
        l.R.stop=time>stop?stop:-1;l.R.stopE=time>stop?stop:-1;l.R.fadeK=1;
      }
      l.R.draw(time,view,ppm,1,Math.floor(time*480),0);
      additive(false);hdrT.bind();additive(true);
      const pr=PR.rgmat;gl.useProgram(pr.p);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,rgT.tex);
      gl.uniform1i(pr.u.uS,0);gl.uniform1f(pr.u.uEH,l.expo?.[0]??1);gl.uniform1f(pr.u.uET,l.expo?.[1]??1);
      gl.uniform1f(pr.u.uG,l.P.encGamma||1);gl.uniform1f(pr.u.uComb,l.P.outMode==='combined'?1:0);
      setMatUniforms(pr,l.M,time);drawQuad();additive(false);
    }
    PPMY=0;gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,size,size);
    gl.useProgram(comparePost.p);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,hdrT.tex);
    gl.uniform1i(comparePost.u.uS,0);gl.uniform1i(comparePost.u.uSS,1);
    gl.uniform1i(comparePost.u.uLinear,0);gl.uniform1f(comparePost.u.uExposure,exposure);
    gl.uniform1f(comparePost.u.uBloom,bloom);drawQuad();
    return {glError:gl.getError(),time,size};
  },
  raw(){
    hdrT.bind();const a=new Float32Array(hdrT.w*hdrT.h*4);
    gl.readPixels(0,0,hdrT.w,hdrT.h,gl.RGBA,gl.FLOAT,a);return a;
  },
  dispose(){for(const l of compareLayers)l.R.dispose();compareLayers=[];}
};
