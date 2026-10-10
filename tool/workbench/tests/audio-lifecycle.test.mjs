import test from 'node:test';
import assert from 'node:assert/strict';
import {bindProgrammeAudio} from '../src/audio-blob.mjs';

const audioRef={kind:'embedded',dataUrl:'data:audio/wav;base64,UklGRg=='};
test('音频在 StrictMode 的安装、清理、重新安装后仍可读取',async()=>{
 let source;
 const publish=value=>{source=value};
 const firstCleanup=bindProgrammeAudio('embedded',audioRef,publish),first=source;
 firstCleanup();
 const cleanup=bindProgrammeAudio('embedded',audioRef,publish);
 assert.notEqual(source,first);
 await assert.rejects(fetch(first));
 assert.equal(await (await fetch(source)).text(),'RIFF');
 cleanup();
 await assert.rejects(fetch(source));
});
test('切换歌曲时旧清理函数不会释放新歌曲',async()=>{
 let source;
 const oldCleanup=bindProgrammeAudio('embedded',audioRef,value=>{source=value});
 const cleanup=bindProgrammeAudio('embedded',{...audioRef,dataUrl:'data:audio/wav;base64,TkVX'},value=>{source=value});
 oldCleanup();
 assert.equal(await (await fetch(source)).text(),'NEW');
 cleanup();
});
test('无音乐和仅节奏参考不产生音频地址，内置歌曲仍使用原路径',()=>{
 let source;
 bindProgrammeAudio('none',audioRef,value=>{source=value})();assert.equal(source,undefined);
 bindProgrammeAudio('loaded',null,value=>{source=value})();assert.equal(source,undefined);
 bindProgrammeAudio('loaded',{kind:'bundled'},value=>{source=value})();assert.equal(source,'./music.wav');
});
