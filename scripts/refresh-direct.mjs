import {readFile, writeFile, rename} from 'node:fs/promises';
import {chartSongs, searchSongs, songPlayback} from '../src/gequhai.mjs';
import {verifyStream} from './verify-stream.mjs';

const file = new URL('../mobile/catalog.json', import.meta.url);
const site = 'https://talentjay-ux.github.io/tingyu-music-poc/catalog.json';
const relay = 'https://tingyu-music-jay.xkcnjsfdny.chatgpt.site';
const artists = ['Taylor Swift','周杰伦','林俊杰','陈奕迅','邓紫棋','许巍','孙燕姿'];
const chartKinds = ['hot','new','surge','classic','douyin','electronic'];
const numeric = id => /^[1-9]\d{0,11}$/.test(id);
async function json(url) {
  const response = await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(20000)});
  if (!response.ok) throw new Error('HTTP '+response.status);
  return response.json();
}
let previous = JSON.parse(await readFile(file,'utf8'));
try {
  const live = await json(site+'?refresh='+Date.now());
  if (live.tracks?.length && Date.parse(live.updatedAt)>Date.parse(previous.updatedAt)) previous=live;
} catch { /* The source checkout contains a usable baseline. */ }
const previousById = new Map(previous.tracks.map(track=>[track.id,track]));
const tracks = new Map();
const charts = {...previous.charts};
function collect(rows) {
  for (const {id,title,artist,cover} of rows) {
    if (numeric(id)) tracks.set(id,{id,title,artist,cover,source:'gequhai'});
  }
}
collect(previous.tracks);
for (const artist of artists) {
  try {
    const first = await searchSongs(artist,1);
    collect(first.songs);
    if (artist==='Taylor Swift' && first.hasMore) collect((await searchSongs(artist,2)).songs);
  } catch { console.warn('Keeping last catalogue entries for',artist); }
}
for (const kind of chartKinds) {
  try {
    const {songs} = await chartSongs(kind);
    if (songs.some(track=>numeric(track.id))) {
      collect(songs);
      charts[kind]=songs.filter(track=>numeric(track.id)).map(track=>track.id);
    }
  } catch { console.warn('Keeping previous chart:',kind); }
}
async function refresh(track) {
  const prior = previousById.get(track.id);
  const seen = new Set();
  const candidates = [()=>songPlayback(track.id),()=>json(relay+'/api/play/'+track.id),()=>prior];
  for (const candidate of candidates) {
    try {
      const detail=await candidate();
      const url=detail?.url || detail?.audio;
      if (String(detail?.id)!==track.id || !url || seen.has(url)) continue;
      seen.add(url);
      if (await verifyStream(url)) {
        track.audio=url;
        track.cover=detail.cover || track.cover;
        track.verifiedAt=new Date().toISOString();
        return;
      }
    } catch { /* Continue with the independent resolver or the previous address. */ }
  }
  console.warn('No verified direct audio for',track.id);
}
const remaining = [...tracks.values()];
await Promise.all(Array.from({length:4},async()=>{
  while (remaining.length) await refresh(remaining.shift());
}));
const rows=[...tracks.values()];
const playable=rows.filter(track=>track.audio).length;
const previousPlayable=previous.tracks.filter(track=>track.audio).length;
if (!playable || playable < previousPlayable * 0.7) {
  throw new Error('Widespread upstream outage; retaining the previous release');
}
const staging=new URL('catalog.next.json',file);
await writeFile(staging,JSON.stringify({updatedAt:new Date().toISOString(),charts,tracks:rows}));
await rename(staging,file);
console.log('Verified',playable,'of',rows.length,'direct media URLs.');
