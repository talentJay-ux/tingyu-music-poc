import assert from 'node:assert/strict';
import {songPlayback,searchSongs} from '../src/gequhai.mjs';

globalThis.window={location:{origin:'https://www.gequhai.com'}};
const calls=[];
let onceExpired=false;
globalThis.fetch=async (input, options)=>{
  const path=new URL(input).pathname;
  assert.equal(new URL(input).origin,window.location.origin);
  const h=new Headers(options.headers);
  assert.equal(h.has('Cookie'),false);assert.equal(h.has('Origin'),false);assert.equal(h.has('Referer'),false);
  assert.equal(options.credentials,'same-origin');calls.push(path);
  if(path==='/api/s')return Response.json({code:1});
  if(path==='/search')return new Response('<table><tr><td><a href="/play/335">黄昏</a></td><td>周传雄</td></tr></table>');
  if(path==='/play/335')return new Response('<script>window.mp3_title="黄昏";window.mp3_author="周传雄";window.play_id="source-key";window.mp3_type=0;</script>');
  if(path==='/api/music') {
    if(onceExpired){onceExpired=false;return Response.json({code:0,msg:'会话已过期，请刷新页面重试'});}
    assert.equal(options.referrer,'https://www.gequhai.com/play/335');
    assert.equal(h.get('x-requested-with'),'http');assert.equal(options.body.get('id'),'source-key');
    return Response.json({data:{url:'https://car-lv.kuwo.cn/music/test.mp3'}});
  }
  throw Error(path);
};
assert.deepEqual((await searchSongs('贾斯汀')).songs.map(x=>x.id),['335']);
await songPlayback('335');await songPlayback('335',true);
assert.equal(calls.filter(x=>x==='/api/music').length,2);
console.log('Source-origin browser protocol: same-origin API, browser session, fresh resolver and search.');

onceExpired=true;await songPlayback('335',true);
assert.deepEqual(calls.slice(-4),['/play/335','/api/music','/play/335','/api/music']);
