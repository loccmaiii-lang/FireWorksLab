// 源 PNG 含透明通道上的独立动画帧。这里按原始字节上传，避开浏览器的 Alpha 预乘。
async function unpackAtlasBytes(data) {
  const bytes = Uint8Array.from(atob(data), char => char.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

window.createRabbitBaker = async function (canvas) {
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false });
  if (!gl) throw new Error('序列回放需要 WebGL 2');
  const vs = `#version 300 es
  out vec2 uv;
  void main() {
    vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
    uv = vec2(p.x, 1.0 - p.y);
    gl_Position = vec4(2.0 * p - 1.0, 0., 1.);
  }`;
  const fs = `#version 300 es
  precision highp float;
  precision highp sampler2DArray;
  in vec2 uv;
  uniform sampler2DArray atlas, lut;
  uniform int frame, layers;
  out vec4 color;
  void main() {
    int tile = frame % 16;
    vec2 location = (uv + vec2(tile % 4, tile / 4)) * 0.25;
    vec3 linear = vec3(0.);
    for (int i = 0; i < layers; i++) {
      float v = texture(atlas, vec3(location, float(i)))[frame / 16];
      linear += 4. * v * texture(lut, vec3(v, .5, float(i))).rgb;
    }
    color = vec4(pow(1. - exp(-linear), vec3(1. / 2.2)), 1.);
  }`;
  const program = gl.createProgram();
  for (const [kind, source] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
    const shader = gl.createShader(kind);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    gl.attachShader(program, shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const loc = key => gl.getUniformLocation(program, key);
  const frameLoc = loc('frame'), countLoc = loc('layers');
  gl.uniform1i(loc('atlas'), 0);
  gl.uniform1i(loc('lut'), 1);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  const target = gl.TEXTURE_2D_ARRAY;
  async function upload(layers, key, width, height, format, channels) {
    const tex = gl.createTexture();
    gl.bindTexture(target, tex);
    gl.texStorage3D(target, 1, format, width, height, layers.length);
    for (let i = 0; i < layers.length; i++) {
      const raw = await unpackAtlasBytes(layers[i][key]);
      gl.texSubImage3D(target, 0, 0, 0, i, width, height, 1, channels, gl.UNSIGNED_BYTE, raw);
    }
    gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(target, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(target, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }
  const platforms = {};
  for (const [name, layers] of Object.entries(window.rabbitBakerData)) {
    const side = layers[0].side;
    const atlas = await upload(layers, 'atlas', side, side, gl.RGBA8, gl.RGBA);
    const lut = await upload(layers, 'ramp', 256, 1, gl.SRGB8, gl.RGB);
    platforms[name] = { atlas, lut, count: layers.length };
  }
  if (gl.getError() !== gl.NO_ERROR) throw new Error('序列贴图上传失败');
  return function (frame, platform) {
    gl.viewport(0, 0, canvas.width, canvas.height);
    const { atlas, lut, count } = platforms[platform];
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(target, atlas);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(target, lut);
    gl.uniform1i(countLoc, count);
    gl.uniform1i(frameLoc, frame);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
};
