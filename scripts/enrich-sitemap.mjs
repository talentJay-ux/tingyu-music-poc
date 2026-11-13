// Resume title/artist extraction from verified IDs; no audio, artwork, or lyrics in this index.
import {readFile,writeFile,rename} from 'node:fs/promises';
import {songDetail} from '../src/gequhai.mjs';

const base=new URL('../mobile/search-index/',import.meta.url);
const data=JSON.parse(await readFile(new URL('compact.json',base),'utf8'));
const seen=new Set(data.rows.map(r=>Number(r[0])));
const limit=Number(process.argv[2] || 100);
if(!Number.isSafeInteger(limit) || limit<1) throw Error('Supply a positive integer batch size');
const raw=await readFile(new URL('sitemap.ids',base));
let total=0,delta=0,multiplier=1;
const pending=[];
for(const byte of raw) {
  delta+=(byte&127)*multiplier;
  if(byte&128){multiplier*=128;continue;}
  total+=delta;delta=0;multiplier=1;
  if(!seen.has(total))pending.push(total);
}
const missed=pending.length;
const offset=(Number.isSafeInteger(data.scanAfter)?pending.findIndex(id=>id>data.scanAfter):0);
const start=offset<0?0:offset;
const queue=pending.slice(start).concat(pending.slice(0,start)).slice(0,limit);
let added=0,failed=0,consecutiveFailures=0;
async function save(){
  const temp=new URL('compact.next.json',base);
  await writeFile(temp,JSON.stringify(data));
  await rename(temp,new URL('compact.json',base));
}
for(const id of queue) {
  data.scanAfter=id;
  try {
    const detail=await songDetail(String(id));
    if(!detail.title || !detail.artist)throw Error('incomplete metadata');
    data.rows.push([id,detail.title,detail.artist]);
    added++;consecutiveFailures=0;
    if(added%50===0)await save();
  } catch {failed++;consecutiveFailures++;}
  if(consecutiveFailures>=3)break;
  await new Promise(resolve=>setTimeout(resolve,300));
}
await save();
console.log('New titles:',added,'unresolved in batch:',failed,'remaining sitemap titles:',missed-added);
