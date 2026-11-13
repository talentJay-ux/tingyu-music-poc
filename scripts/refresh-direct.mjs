// Build a Pages catalogue using public Gequhai metadata. Audio stays on the source CDN.
import {mkdir, writeFile, rename} from 'node:fs/promises';
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
  charts[kind] = result.songs.map(song => song.id);
}
let playable = 0;
await mapLimit(tracks.values(), 4, async track => {
  try {
    const detail = await songPlayback(track.id);
    const url = new URL(detail.url);
    if (url.protocol === 'https:' && !url.username && !url.password &&
        (url.hostname.endsWith('.kuwo.cn') || url.hostname === 'www.gequhai.com')) {
      track.audio = url.href;
      track.cover = detail.cover || track.cover;
      playable++;
    }
  } catch (error) {
    console.warn('Unavailable', track.id, error.code || 'SOURCE_UNAVAILABLE');
  }
});
if (playable < tracks.size * 0.65 || ![...tracks.values()].some(t => t.artist === 'Taylor Swift' && t.audio)) {
  throw new Error('Too few playable songs to replace the current catalogue');
}
const directory = new URL('../mobile/', import.meta.url);
await mkdir(directory, {recursive:true});
const file = new URL('catalog.json', directory);
const staging = new URL('catalog.next.json', directory);
await writeFile(staging, JSON.stringify({updatedAt:new Date().toISOString(),charts,tracks:[...tracks.values()]}));
await rename(staging, file);
console.log('Published catalogue data:', tracks.size, 'tracks;', playable, 'media URLs');
