/* 双 UV 取自导出的 FBX，纹理数据与 EXR 半浮点通道相同。 */
window.createRabbitVAT = function createRabbitVAT(canvas) {
  const gl = canvas.getContext("webgl2", {alpha: false, antialias: false});
  if (!gl || !gl.getExtension("EXT_color_buffer_float")) {
    throw new Error("VAT 对照需要 WebGL 2 和浮点渲染目标。");
  }
  const data = window.rabbitVATAssets;
  const unpack = (text, Type) => new Type(Uint8Array.from(atob(text), c => c.charCodeAt(0)).buffer);
  function compile(vertex, fragment) {
    const program = gl.createProgram();
    for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]]) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, "#version 300 es\nprecision highp float;\n" + source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(shader));
      gl.attachShader(program, shader);
      gl.deleteShader(shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
    return program;
  }
  function newTexture() {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
  }
  function dataTexture(encoded) {
    const texture = newTexture();
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, data.width, data.height, 0,
                  gl.RGBA, gl.HALF_FLOAT, unpack(encoded, Uint16Array));
    return texture;
  }
  const position = dataTexture(data.position);
  const color = dataTexture(data.color);
  const vertices = unpack(data.mesh, Float32Array);
  const mesh = gl.createVertexArray();
  gl.bindVertexArray(mesh);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 16, 0);
  const program = compile(`
    layout(location=0) in vec4 uv;
    uniform sampler2D positions;
    uniform sampler2D colors;
    uniform int frame;
    uniform float sideCm;
    uniform float radiusUV;
    out vec2 radial;
    flat out vec4 tint;
    void main() {
      ivec2 size = textureSize(positions, 0);
      ivec2 address = ivec2(vec2(uv.z, 1.0 - uv.w) * vec2(size)) + ivec2(0, frame);
      vec4 p = texelFetch(positions, address, 0);
      vec4 cd = texelFetch(colors, address, 0);
      float brightness = max(cd.r, max(cd.g, cd.b));
      tint = vec4(cd.rgb / max(brightness, 1e-8), brightness * cd.a);
      radial = (uv.xy * 2.0 - 1.0) * 5.0;
      gl_Position = vec4(2.0 * (p.xz / sideCm + radial * p.a * radiusUV), 0.0, 1.0);
    }`, `
    in vec2 radial;
    flat in vec4 tint;
    out vec4 outColor;
    void main() {
      float d2 = dot(radial, radial);
      float g = 2.0 * tint.a * (0.95 * exp2(-d2 / (0.43*0.43)) + 0.05 * exp2(-d2 / (1.05*1.05)));
      outColor = vec4(4.0 * min(g, 253.0/255.0) * tint.rgb, 1.0);
    }`);
  const tonemap = compile(`
    void main() {
      vec2 vertex = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
      gl_Position = vec4(vertex * 2.0 - 1.0, 0.0, 1.0);
    }`, `
    uniform sampler2D scene;
    out vec4 outColor;
    void main() {
      vec3 linear = texelFetch(scene, ivec2(gl_FragCoord.xy), 0).rgb;
      outColor = vec4(pow(1.0-exp(-linear), vec3(1.0/2.2)), 1.0);
    }`);
  const uniform = (p, n) => gl.getUniformLocation(p, n);
  gl.useProgram(program);
  gl.uniform1i(uniform(program, "positions"), 0);
  gl.uniform1i(uniform(program, "colors"), 1);
  gl.uniform1f(uniform(program, "sideCm"), data.sideCm);
  gl.uniform1f(uniform(program, "radiusUV"), data.radiusUV);
  const time = uniform(program, "frame");
  const fbo = gl.createFramebuffer();
  const accumulation = newTexture();
  let width = 0, height = 0;
  return function drawFrame(frame) {
    if (width !== canvas.width || height !== canvas.height) {
      width = canvas.width;
      height = canvas.height;
      gl.bindTexture(gl.TEXTURE_2D, accumulation);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.HALF_FLOAT, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, accumulation, 0);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw Error("VAT 浮点帧缓冲未就绪");
    }
    gl.viewport(0, 0, width, height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(program);
    gl.uniform1i(time, Math.max(0, Math.min(data.height - 1, Math.floor(frame))));
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, position);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, color);
    gl.bindVertexArray(mesh);
    gl.drawArrays(gl.TRIANGLES, 0, vertices.length/4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.disable(gl.BLEND);
    gl.useProgram(tonemap);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, accumulation);
    gl.bindVertexArray(null);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
};
