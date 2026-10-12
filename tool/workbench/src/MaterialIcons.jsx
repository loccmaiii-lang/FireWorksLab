import React from 'react';
// Material Symbols（Outlined，wght 400，Apache-2.0），内联 SVG，离线可用；24 网格，按 size 缩放。
const PATHS = {
  computer: 'M80-120q-17 0-28.5-11.5T40-160q0-17 11.5-28.5T80-200h800q17 0 28.5 11.5T920-160q0 17-11.5 28.5T880-120H80Zm80-120q-33 0-56.5-23.5T80-320v-440q0-33 23.5-56.5T160-840h640q33 0 56.5 23.5T880-760v440q0 33-23.5 56.5T800-240H160Zm0-80h640v-440H160v440Zm0 0v-440 440Z',
  smartphone: 'M280-40q-33 0-56.5-23.5T200-120v-720q0-33 23.5-56.5T280-920h400q33 0 56.5 23.5T760-840v720q0 33-23.5 56.5T680-40H280Zm0-120v40h400v-40H280Zm0-80h400v-480H280v480Zm0-560h400v-40H280v40Zm0 0v-40 40Zm0 640v40-40Z',
  check: 'M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z',
};
export function MaterialSymbol({name, size = 18, className = '', ...rest}) {
  return <svg className={'material-symbol ' + className} width={size} height={size} viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true" focusable="false" {...rest}><path d={PATHS[name]}/></svg>;
}
