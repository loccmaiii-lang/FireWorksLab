// 当前原生参数页的呈现探索；不读取生产存档、不写文件或UE。
import {isolateBaker} from '../参数体验_4.9.60_2026-10-10/baker-context/isolation.mjs';
const frame=document.getElementById('baker'),base=new URL('.',location.href).href;
try {
  const response=await fetch('/tool/FireworkBaker.html',{cache:'no-cache'});
  if(!response.ok)throw Error('无法读取当前烘焙器：'+response.status);
  const reference=new URL(location.href).searchParams.get('reference')==='1';
  let html=isolateBaker(await response.text(),base,'continuous',{reference:true});
  html=html.replace('</head>',`${reference?'':`<link rel="stylesheet" href="${base}rail.css">`}</head>`);
  html=html.replace('</body>',`<script>window.FW_EMITTER_RAIL_REFERENCE=${reference};</script><script src="${base}rail.js"></script></body>`);
  frame.srcdoc=html;
}catch(error){frame.hidden=true;const message=document.getElementById('failure');message.hidden=false;message.textContent=error.message;}
