const enc=new TextEncoder();
const table=new Uint32Array(256);
for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;table[n]=c>>>0;}
export function crc32(data){let c=0xffffffff;for(const b of data)c=table[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function chunk(type,data) {
  const name=enc.encode(type),out=new Uint8Array(data.length+12),v=new DataView(out.buffer);
  v.setUint32(0,data.length);out.set(name,4);out.set(data,8);v.setUint32(data.length+8,crc32(out.subarray(4,data.length+8)));return out;
}
export async function rawPNG(width,height,pixels) {
  if(pixels.length!==width*height*4)throw new Error('PNG pixel size mismatch');
  const header=new Uint8Array(13),v=new DataView(header.buffer);
  v.setUint32(0,width);v.setUint32(4,height);header.set([8,6,0,0,0],8);
  const compressor=new CompressionStream('deflate'),writer=compressor.writable.getWriter();
  const compressed=new Response(compressor.readable).arrayBuffer();
  for(let y=0;y<height;y++) {
    const row=new Uint8Array(1+width*4);
    row.set(pixels.subarray(y*width*4,(y+1)*width*4),1);
    await writer.write(row);
  }await writer.close();
  // No Canvas or sRGB/gAMA chunk: alpha remains the fourth data bank.
  return new Blob([new Uint8Array([137,80,78,71,13,10,26,10]),chunk('IHDR',header),
    chunk('IDAT',new Uint8Array(await compressed)),chunk('IEND',new Uint8Array())],{type:'image/png'});
}
export function download(blob,name) {
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
}
export const jsonBlob=value=>new Blob([JSON.stringify(value,null,2)],{type:'application/json'});
export function flipRows(bytes,w,h) {
  const out=new Uint8Array(bytes.length),row=w*4;
  for(let y=0;y<h;y++)out.set(bytes.subarray(y*row,(y+1)*row),(h-y-1)*row);
  return out;
}
// PFM is a standard floating-point linear RGB image, not an 8-bit screenshot.
export function pfm(width,height,rgba) {
  const rgb=new Float32Array(width*height*3);
  for(let i=0;i<width*height;i++)rgb.set(rgba.subarray(i*4,i*4+3),i*3);
  return new Blob([enc.encode('PF\n'+width+' '+height+'\n-1.0\n'),rgb],{type:'application/octet-stream'});
}
