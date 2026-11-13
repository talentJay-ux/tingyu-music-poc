import assert from 'node:assert/strict';
import worker from '../worker/api.mjs';
import {parseSongs, parseDetail} from '../src/gequhai.mjs';

// Regressions discovered while checking the actual Gequhai site and media CDN.
const rows = '<table><tbody><tr><td>1</td><td><a href="/play/12">歌名 &amp; 回声</a></td><td>歌手甲</td></tr></tbody></table>';
assert.deepEqual(parseSongs(rows), [{id:'12',title:'歌名 & 回声',artist:'歌手甲',cover:'',source:'gequhai'}]);
const detail = id => `<script>window.appData={"mp3_title":"真实歌曲 ${id}","mp3_author":"歌手甲"};window.play_id='hash-${id}';window.mp3_type=0;window.mp3_cover='';</script><div id="content-lrc2">[00:01.00]第一行<br>[00:02.00]第二行 &amp; 回声</div>`;
assert.equal(parseDetail(detail('12'),'12').cover, '');
assert.equal(parseDetail(detail('12'),'12').title, '真实歌曲 12');
assert.equal(parseDetail(detail('12'),'12').lyrics, '[00:01.00]第一行\n[00:02.00]第二行 & 回声');

const calls = [];
globalThis.fetch = async (input, options={}) => {
  const url = new URL(input), headers = new Headers(options.headers);
  calls.push({url:url.href, method:options.method||'GET', headers});
  if (url.hostname === 'www.gequhai.com') {
    if (url.pathname === '/') return new Response('normal session', {headers:{'Set-Cookie':'session=ordinary; Max-Age=3600; Path=/; HttpOnly'}});
    assert.equal(headers.get('cookie'), 'session=ordinary');
    if (url.pathname === '/api/s') return Response.json({code:1,msg:'ok'});
    if (url.pathname === '/search') {
      assert.equal(url.searchParams.get('page'),'2');
      return new Response(rows+'<a href="?s=test&amp;page=3">尾页</a>');
    }
    if (url.pathname.startsWith('/play/')) return new Response(detail(url.pathname.split('/').pop()));
    if (url.pathname === '/api/music') {
      assert.equal(headers.get('X-Requested-With'),'http');
      assert.equal(headers.get('X-Custom-Header'),'Key');
      const form = new URLSearchParams(options.body);
      assert.equal(form.get('type'),'0');
      return Response.json({code:200,data:{url:form.get('id')==='hash-13'?'https://car-er.kuwo.cn/redirect':'https://car-er.kuwo.cn/song.mp3'}});
    }
  }
  if (url.hostname === 'car-er.kuwo.cn') {
    assert.equal(headers.has('Referer'),false, 'Public CDN rejects a Gequhai Referer');
    assert.equal(headers.has('Cookie'),false, 'Do not transmit upstream cookies to media CDN');
    if (url.pathname === '/redirect') return new Response(null,{status:302,headers:{Location:'http://127.0.0.1/private'}});
    if (headers.get('Range') === 'bytes=9000-') return new Response(null,{status:416,headers:{'Content-Range':'bytes */4096'}});
    assert.equal(headers.get('Range'),'bytes=0-1023');
    return new Response(new Uint8Array(1024),{status:206,headers:{'Content-Type':'audio/mpeg','Content-Length':'1024','Content-Range':'bytes 0-1023/4096','Accept-Ranges':'bytes'}});
  }
  throw new Error('Unexpected upstream host: '+url.hostname);
};

const req = (path, range) => new Request('https://music.test'+path,{headers:{Origin:'https://talentjay-ux.github.io',...(range?{Range:range}:{})}});
let response = await worker.fetch(req('/api/search?q=test&page=2.9'));
assert.equal(response.status,200);
let json = await response.json();
assert.equal(json.page,2);assert.equal(json.total,null);assert.equal(json.totalPages,3);assert.equal(json.hasMore,true);
response = await worker.fetch(req('/api/play/12'));json=await response.json();assert.equal(json.id,'12');assert.equal(json.source,'gequhai');assert.equal(json.audio,'/api/audio/12');
response = await worker.fetch(req('/api/audio/12','bytes=0-1023'));
assert.equal(response.status,206);assert.equal(response.headers.get('Access-Control-Allow-Origin'),'https://talentjay-ux.github.io');assert.equal(response.headers.get('Content-Range'),'bytes 0-1023/4096');assert.equal((await response.arrayBuffer()).byteLength,1024);
response = await worker.fetch(req('/api/audio/12','bytes=9000-'));assert.equal(response.status,416);assert.equal(response.headers.get('Content-Range'),'bytes */4096');
const before = calls.length;
response = await worker.fetch(req('/api/audio/12','bytes=-'));assert.equal(response.status,416);assert.equal(calls.length,before);
response = await worker.fetch(req('/api/audio/13','bytes=0-1023'));assert.equal(response.status,502);json=await response.json();assert.equal(json.error,'MEDIA_HOST_UNSUPPORTED');assert.equal(calls.some(c=>c.url.startsWith('http://127.0.0.1')),false);
response=await worker.fetch(req('/api/search?q='));assert.equal(response.status,400);
response=await worker.fetch(new Request('https://music.test/api/search',{method:'POST'}));assert.equal(response.status,405);
console.log('Backend contracts passed: real-source parsing, session/form headers, pagination, CORS, Range streaming, redirect boundary.');
