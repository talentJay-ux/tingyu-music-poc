// Build a Pages catalogue using public Gequhai metadata. Audio stays on the source CDN.
import {mkdir, writeFile, rename, readFile} from 'node:fs/promises';
import {chartSongs, searchSongs, songPlayback} from '../src/gequhai.mjs';

const artists = ['Taylor Swift','周杰伦','林俊杰','陈奕迅','邓紫棋','许巍','孙燕姿'];
const chartKinds = ['hot','new','surge','classic','douyin','electronic'];
const charts = {};
const tracks = new Map();

async function mapLimit(items, count, fn) {
  const pending = [...items];
  await Promise.all(Array.from({length: count}, async () => {
    while (pending.length) await fn(pending.shift());
  }));
}

function collect(rows) {
  for (const {id, title, artist, cover} of rows) {
    if (!/^[1-9]\d*$/.test(id)) continue;
    if (!tracks.has(id)) tracks.set(id, {id, title, artist, cover, source: 'gequhai'});
  }
}

for (const artist of artists) {
  const result = await searchSongs(artist, 1);
  collect(result.songs);
  if (artist === 'Taylor Swift' && result.hasMore) collect((await searchSongs(artist, 2)).songs);
}
for (const kind of chartKinds) {
  const result = await chartSongs(kind);
  collect(result.songs);
  charts[kind] = result.songs.map(song => song.id).filter(id=>tracks.has(id));
}
const file = new URL('../mobile/catalog.json', import.meta.url);
const previous = new Map(JSON.parse(await readFile(file,'utf8')).tracks.map(t=>[t.id,t]));
const resolver = 'https://tingyu-music-jay.xkcnjsfdny.chatgpt.site/api/play/';

async function resolveTrack(id) {
  try { return await songPlayback(id); }
  catch {
    const response = await fetch(resolver+id,{signal:AbortSignal.timeout(20000)});
    if (!response.ok) throw new Error('Cannot resolve '+id);
    const detail = await response.json();
    if (String(detail.id)!==id) throw new Error('Mismatched track ID');
    return detail;
  }
}
async function stillPlays(track) {
  if (!track?.audio) return false;
  try {
    const response = await fetch(track.audio,{headers:{Range:'bytes=0-31'},signal:AbortSignal.timeout(8000)});
    const valid=response.status===206 && response.headers.get('content-type')?.startsWith('audio/');
    await response.body?.cancel();
    return valid;
  } catch { return false; }
}
let playable = 0;
await mapLimit(tracks.values(), 4, async track => {
  try {
    const detail = await resolveTrack(track.id);
    const url = new URL(detail.url);
    if (url.protocol === 'https:' && !url.username && !url.password && !url.port &&
        (url.hostname.endsWith('.kuwo.cn') || url.hostname === 'www.gequhai.com')) {
      track.audio = url.href;
      track.cover = detail.cover || track.cover;
      playable++;
    }
  } catch (error) {
    const old = previous.get(track.id);
    if (await stillPlays(old)) {
      track.audio=old.audio; playable++;
    } else {
      console.warn('Unavailable',track.id,error.code || 'SOURCE_UNAVAILABLE');
    }
  }
});
if (playable < tracks.size * 0.65 || ![...tracks.values()].some(t => t.artist === 'Taylor Swift' && t.audio)) {
  throw new Error('Too few playable songs to replace the current catalogue');
}
const required = new Set([...charts.hot,...charts.new].filter(id=> id!=='0' && previous.get(id)?.audio));
for (const id of required) {
  if (!tracks.get(id)?.audio) throw new Error('Retaining previous release: lost a playable chart track '+id);
}
const directory = new URL('../mobile/', import.meta.url);
await mkdir(directory, {recursive:true});

const staging = new URL('catalog.next.json', directory);
await writeFile(staging, JSON.stringify({updatedAt:new Date().toISOString(),charts,tracks:[...tracks.values()]}));
await rename(staging, file);
console.log('Published catalogue data:', tracks.size, 'tracks;', playable, 'media URLs');
