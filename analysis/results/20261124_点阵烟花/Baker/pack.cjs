// 逐点轨迹栅格化以后沿用烘焙器的多层序列、命名、PNG 和导出门禁。
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');

const [scratch, output] = process.argv.slice(2);
const root = path.resolve(__dirname, '../../../..');
const source = path.join(root, 'tool', 'src', 'js');
const context = vm.createContext({ Blob, Response, CompressionStream, TextEncoder, TextDecoder,
  Uint8Array, crypto: webcrypto, structuredClone, console });
for (const name of ['00_util', '10_types', '31_plan40', '60_export', '61_naming',
    '62_resource_rules', '63_gate', '66_fwlcascade', '67_fwlcombo']) {
  const file = path.join(source, name + '.js');
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, {filename: file});
}
const baker = vm.runInContext('({ VERSION, keysFromTicks40, cutoutFiles, encodePNG, rampPixels, fwlCombo, applyPackNaming, packTidy, packFinalize, utf8 })', context);

async function main() {
  const data = JSON.parse(fs.readFileSync(path.join(scratch, 'layers.json'), 'utf8'));
  const base = 'DotRabbitDemo';
  const ticks = Array.from({length: data.frames}, (_, i) => i);
  const layout = {cols: 4, rows: 4, chans: 4, F: data.frames, per: 16};
  const files = [], names = [], groups = {pc: [], mobile: []};
  for (const layer of data.layers) {
    const side = 4 * layer.cell_size;
    const rgba = new Uint8Array(fs.readFileSync(path.join(scratch, layer.name + '.rgba')));
    if (rgba.byteLength !== side*side*4) throw Error('图集尺寸错误');
    const b = {form: 'master', P: {type: 'dotMotion'}, meta: {L: layout,
      keys: baker.keysFromTicks40(ticks, data.frames), t0: 0, duration: data.frames/data.fps,
      Ww: data.widthM, Wh: data.widthM, cx: 0, cy: 0, zoom: false}};
    const L = {stages: [[0, '#ffffff']], ramp0: layer.halo_rgb, ramp1: layer.halo_rgb,
      ramp2: layer.core_rgb, ramp3: layer.core_rgb, headInt: 1, tailInt: 1};
    const ln = 'DotPC_' + layer.name, mn = 'DotMobile_' + layer.name;
    const texName = layer.mobile ? mn : ln;
    groups[layer.mobile ? 'mobile' : 'pc'].push({b, L, texName});
    names.push({ln, mn, b, layer: layer.name, pcTex: !layer.mobile, extra: layer.mobile});
    files.push(['T_' + texName + '.png', await baker.encodePNG(rgba, side, side)]);
    files.push(...await baker.cutoutFiles([rgba], side, side, layout, 'T_' + texName + '_Cutout'));
    files.push(['T_' + texName + '_Ramp.png', await baker.encodePNG(baker.rampPixels(L), 256, 8)]);
  }
  for (const [platform, layers] of Object.entries(groups)) {
    const mobile = platform === 'mobile';
    const spec = baker.fwlCombo(base, layers, mobile);
    spec.source.motion_sha256 = data.motion_sha256;
    spec.source.input = '外部逐点轨迹，经离线适配器栅格化';
    spec.notes.push(mobile ? '手机演示合成一张中性白序列，保留所有点及其运动。' : '白、金、青三个点组各用一张序列，按灰度查色。');
    files.push([mobile ? 'cascade_mobile.json' : 'cascade.json', baker.utf8(JSON.stringify(spec))]);
  }
  const named = baker.applyPackNaming(files, base, names);
  const tidy = await baker.packTidy(named);
  const final = await baker.packFinalize(tidy.files);
  // 运行实际离线导入器的配置检查，无 UE 请求。
  const {loadBackend} = require(path.join(root, 'tool/importer/import-backend.cjs'));
  const backend = loadBackend(() => {throw Error('离线验证不应访问 UE')}, undefined,
    {htmlFile: path.join(root, 'tool/importer/reference/df-fireworks-delivery_locmai.html')});
  for (const [file, data] of final.filter(([name]) => /^cascade.*\.json$/.test(name))) {
    const spec = JSON.parse(new TextDecoder().decode(data));
    const errors = backend.validate(spec, file);
    if (errors.length) throw new Error(file + ' 导入格式检查失败：' + errors.join('、'));
    backend.makePlan(spec, spec.name, {baseName: spec.name, assetIndex: '01', particleNumbered: false, assetNaming: 'formal'});
    for (const tex of Object.values(spec.textures)) {
      if (!tex.sha256 || !final.some(([name]) => name === tex.file)) throw Error('缺少资源 ' + tex.file);
    }
  }
  fs.mkdirSync(output, {recursive: true});
  for (const [file, data] of final) {
    const bytes = data instanceof Blob ? new Uint8Array(await data.arrayBuffer()) : data;
    fs.writeFileSync(path.join(output, file), bytes);
  }
  console.log(`烘焙器 ${baker.VERSION} 规范门禁与离线导入配置验证通过，${final.length} 个文件。`);
}

main().catch(error => {console.error(error); process.exitCode = 1;});
