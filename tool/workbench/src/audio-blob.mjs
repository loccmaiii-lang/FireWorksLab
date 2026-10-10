// Keep the complete audio in the programme file, but use a short Blob URL in
// the live DOM. Revoke it when music changes or the workspace unmounts.
export function audioBlobUrl(dataUrl) {
 const match=/^data:(audio\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/]+=*)$/i.exec(dataUrl||'');
 if(!match)throw Error('离线节目音频格式无效');
 const decoded=atob(match[2]),bytes=new Uint8Array(decoded.length);
 for(let i=0;i<decoded.length;i++)bytes[i]=decoded.charCodeAt(i);
 return URL.createObjectURL(new Blob([bytes],{type:match[1]}));
}

// 地址的创建和释放必须属于同一次 effect 安装。
// StrictMode 会安装→清理→重装；不能清理仍被 useMemo 复用的地址。
export function bindProgrammeAudio(musicStatus,audioRef,publish){
 const src=musicStatus==='none'||audioRef===null?undefined:
  audioRef?.kind==='embedded'?audioBlobUrl(audioRef.dataUrl):'./music.wav';
 publish(src);
 return ()=>{if(src?.startsWith('blob:'))URL.revokeObjectURL(src)};
}
