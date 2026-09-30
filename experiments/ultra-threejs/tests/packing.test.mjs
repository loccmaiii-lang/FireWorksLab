import test from 'node:test';
import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';
import { atlasLayout, packFrame } from '../src/bake.js';
import { rawPNG, crc32 } from '../src/export.js';
test('RGBA relay uses channel banks and flips GPU rows exactly once',()=>{
  const L={size:4,per:4,cols:2,rows:2,cellW:2,cellH:2};
  const atlas=new Uint8Array(4*4*4);
  for(let f=0;f<16;f++) {
    const image=new Uint8Array(16);
    for(let p=0;p<4;p++)image[p*4]=10*f+p;
    packFrame(atlas,f,L,image);
  }
  assert.deepEqual(Array.from(atlas.slice(0,4)),[2,42,82,122]);
  assert.deepEqual(Array.from(atlas.slice(8,12)),[12,52,92,132]);
  assert.deepEqual(Array.from(atlas.slice(48,52)),[20,60,100,140]);
  const tail=atlasLayout(2048,64,true);
  assert.equal(tail.cellW,128);assert.equal(tail.cellH,2048);assert.equal(tail.chans,4);
  assert.throws(()=>atlasLayout(1024,64));
});
test('PNG preserves RGB even under zero alpha, including the fourth bank',async()=>{
  const bytes=new Uint8Array([255,200,100,0,90,80,70,25,60,50,40,128,30,20,10,255]);
  const png=new Uint8Array(await (await rawPNG(2,2,bytes)).arrayBuffer());
  const view=new DataView(png.buffer),idat=[];
  for(let o=8;o<png.length;) {
    const n=view.getUint32(o),type=new TextDecoder().decode(png.subarray(o+4,o+8));
    assert.equal(crc32(png.subarray(o+4,o+8+n)),view.getUint32(o+8+n));
    if(type==='IDAT')idat.push(png.subarray(o+8,o+8+n));
    o+=n+12;
  }
  const raw=inflateSync(Buffer.concat(idat));
  assert.equal(raw[0],0);assert.equal(raw[9],0);
  assert.deepEqual(Array.from(raw.subarray(1,9)),Array.from(bytes.subarray(0,8)));
  assert.deepEqual(Array.from(raw.subarray(10)),Array.from(bytes.subarray(8)));
});
