// Input is JSON mapping a source keyword to its ordered Gequhai search rows.
// Output is local metadata, never a cache of signed playback URLs.
import {readFile,writeFile} from 'node:fs/promises';
const input=process.argv[2];
if(!input) throw Error('Usage: node scripts/pack-search-catalog.mjs source-query-rows.json');
const base=new URL('../mobile/',import.meta.url);
const artists=JSON.parse(await readFile(input,'utf8'));
const catalog=JSON.parse(await readFile(new URL('catalog.json',base),'utf8'));
const rows=new Map(catalog.tracks.map(t=>[String(t.id),[Number(t.id),t.title,t.artist]]));
const queries=Object.create(null);
for(const [keyword,songs] of Object.entries(artists)){
  const ids=new Set();
  for(const t of songs){
    if(!/^[1-9]\d{0,11}$/.test(String(t.id)) || !t.title || !t.artist)continue;
    rows.set(String(t.id),[Number(t.id),t.title,t.artist]);
    ids.add(Number(t.id));
  }
  if(ids.size) queries[keyword.trim().toLocaleLowerCase()]=[...ids];
}
await writeFile(new URL('search-index/compact.json',base),JSON.stringify({rows:[...rows.values()],queries}));
console.log('Search index:',rows.size,'unique titles;',Object.keys(queries).length,'source queries');
