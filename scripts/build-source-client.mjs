import {readFile,writeFile} from 'node:fs/promises';

const root=new URL('../',import.meta.url);
const output=new URL('dist/client/',root);
const read=p=>readFile(new URL(p,root),'utf8');
const [html,css,ui,adapter]=await Promise.all(['mobile/index.html','mobile/mobile.css','mobile/mobile.js','src/gequhai.mjs'].map(read));
const body=html.split('<body>')[1].split('</body>')[0].replace(/<script[\s\S]*?<\/script>/g,'');
const searchIndex=await read('mobile/search-index/compact.json');
const version='1.0.1';
const bundle=`// ==UserScript==
// @name         听屿 · 歌曲海直连版
// @namespace    https://talentjay-ux.github.io/tingyu-music-poc/
// @version      ${version}
// @description  在歌曲海使用听屿的手机界面。搜索、取址与歌词请求由歌曲海当前页面直接发送。
// @match        https://www.gequhai.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==
(()=>{
  'use strict';
  if(location.origin !== 'https://www.gequhai.com' || !location.hash.startsWith('#/tingyu/'))return;
  const pick=location.hash.slice('#/tingyu/'.length);
  if(document.documentElement.dataset.tingyuSource === '1')return;
  document.documentElement.dataset.tingyuSource='1';
  window.stop();
  const style=document.createElement('style');
  style.textContent=${JSON.stringify(css)};
  const viewport=document.createElement('meta');
  viewport.name='viewport';viewport.content='width=device-width,initial-scale=1,viewport-fit=cover';
  const policy=document.createElement('meta');policy.name='referrer';policy.content='no-referrer';
  document.querySelectorAll('audio,video').forEach(media=>media.pause());
  document.head.replaceChildren(viewport,policy,style);
  document.title='听屿 · 歌曲海直连版';
  document.body.innerHTML=${JSON.stringify(body)};
  history.replaceState(null,'','#/tingyu/'+pick);
  const nativeGequhai=(()=>{
    ${adapter.replace(/^export /gm,'')}
    return {chartSongs,searchSongs,songDetail,songPlayback,searchIndex:${searchIndex}};
  })();
  ${ui}
})();\n`;
await writeFile(new URL('tingyu.user.js',output),bundle);
await writeFile(new URL('source-mode.html',output),await read('mobile/source-mode.html'));
