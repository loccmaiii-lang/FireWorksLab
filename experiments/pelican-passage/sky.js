import * as THREE from 'three';

// 云团按观察方向生成，日照和阴面在同一层云密度上取样。
export function makeSky() {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: Object.fromEntries(
      Object.entries({
        upper: '#71b9d2',
        middle: '#a1d3df',
        horizon: '#edecda',
        cloudDark: '#bed3d1',
        cloudLight: '#fff9e8',
      }).map(([key, color]) => [key, { value: new THREE.Color(color) }]),
    ),
    vertexShader: `
      varying vec3 direction;
      void main() {
        direction = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
      }`,
    fragmentShader: `
      uniform vec3 upper,middle,horizon,cloudDark,cloudLight;
      varying vec3 direction;
      float hash(vec2 p) { return fract(sin(dot(p,vec2(27.61,73.19)))*7483.789); }
      float noise(vec2 p) {
        vec2 k=floor(p), f=fract(p); f=f*f*(3.-2.*f);
        return mix(mix(hash(k),hash(k+vec2(1,0)),f.x),mix(hash(k+vec2(0,1)),hash(k+1.),f.x),f.y);
      }
      float bank(vec2 p,vec2 center,vec2 size) {
        vec2 q=(p-center)/size;
        float n=.22*noise(q*4.)+.07*noise(q*11.);
        float a=length((q-vec2(-.57,-.04))*vec2(2.5,2.9));
        float b=length((q-vec2(-.24,.15))*vec2(2.6,1.65));
        float c=length((q-vec2(.13,.28))*vec2(2.5,1.25));
        float d=length((q-vec2(.47,.03))*vec2(2.7,2.0));
        float e=length((q-vec2(.76,-.09))*vec2(3.2,3.4));
        return min(1.-min(min(a,b),min(min(c,d),e))+n, (q.y+.28)*3.5+.23*sin(q.x*6.)+n);
      }
      void main() {
        vec3 dir=normalize(direction);
        float h=max(0.,dir.y);
        vec3 sky=mix(horizon,middle,smoothstep(-.055,.22,h));
        sky=mix(sky,upper,smoothstep(.13,.69,h));
        float lon=atan(dir.x,-dir.z);
        vec2 p=vec2(lon,dir.y);
        float bank1=bank(p,vec2(-.40,.13),vec2(.108,.032));
        float bank2=bank(p,vec2(.145,.17),vec2(.105,.044));
        float bank3=bank(p,vec2(.68,.11),vec2(.13,.040));
        float bank4=bank(p,vec2(-1.17,.18),vec2(.23,.067));
        float bank5=bank(p,vec2(2.25,.15),vec2(.24,.065));
        float density=max(max(bank1,bank2),max(max(bank3,bank4),bank5));
        float shade=.55+.45*noise(p*72.);
        vec3 cloud=mix(cloudLight,cloudDark,shade*.26);
        sky=mix(sky,cloud,smoothstep(-.18,.18,density)*.80);
        gl_FragColor=vec4(sky,1.);
        #include <colorspace_fragment>
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(185, 48, 24), material);
  sky.renderOrder = -100;
  return sky;
}
