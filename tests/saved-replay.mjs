// Exercise the shipped player with a cold catalogue, expired CDN links and rapid selection.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const code = readFileSync(new URL('../mobile/mobile.js',import.meta.url),'utf8');
const stateKey = 'tingyu:mobile:v2';
const storage = new Map();
const mediaHost = 'https://car-lv.kuwo.cn';
const first = {id:'41',title:'First',artist:'Artist',audio:mediaHost+'/a'};
const second = {id:'42',title:'Second',artist:'Artist',audio:mediaHost+'/b'};
const tick = () => new Promise(resolve => setImmediate(resolve));

function boot(fetch, rejectedUrls=[]) {
  const nodes = new Map();
  const calls = [];
  function node(id) {
    if (nodes.has(id)) return nodes.get(id);
    const events = new Map();
    const el = {
      src:'', volume:1, paused:true, error:null, currentTime:0, style:{setProperty(){}}, dataset:{},
      classList:{toggle(){},add(){},remove(){}},
      addEventListener(name,fn){if(!events.has(name))events.set(name,[]);events.get(name).push(fn);},
      dispatch(name,event={}){for(const fn of events.get(name)||[])fn({...event,target:this});},
      getBoundingClientRect(){return {left:20,width:200};},setPointerCapture(){},
      querySelector(){return null;},scrollIntoView(){},
      setAttribute(){}, getAttribute(name){return this[name];}, removeAttribute(name){this[name]='';},
      querySelectorAll(){return [];}, pause(){this.paused=true;}, load(){this.error=null;},
      play(){
        calls.push(this.src);
        if (rejectedUrls.includes(this.src)) return Promise.reject(new Error('expired'));
        this.paused=false;
        return Promise.resolve();
      }
    };
    nodes.set(id,el);
    return el;
  }
  const sandbox={
    URL,AbortController,AbortSignal,setTimeout,clearTimeout,console,fetch,
    navigator:{userAgent:'',platform:''}, location:{hostname:'talentjay-ux.github.io',origin:'https://talentjay-ux.github.io',hash:'#/library'},
    localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},
    document:{body:node('body'),querySelector:node,querySelectorAll:()=>[],addEventListener(){}},window:{addEventListener(){}}
  };
  const app=runInNewContext(code+'\n;({state,like,remember,playTrack,save,readCatalogue,loadLyrics,lines:()=>lyrics.length})',sandbox);
  return {...app,calls,node,emit:(id,name,event={})=>node(id).dispatch(name,event)};
}

const offline=async()=>{throw new Error('network unavailable');};
let app=boot(offline);
app.remember([first,second]);
app.like(first.id);
assert.deepEqual(JSON.parse(storage.get(stateKey)).liked,[first.id],'favorite saved before returning from tap');
app.state.playlists.push({id:'p-1',name:'通勤',songIds:[second.id,first.id]});
app.save(true);

app=boot(offline);
assert.deepEqual(Array.from(app.state.playlists[0].songIds),[second.id,first.id]);
app.playTrack(app.state.liked[0],app.state.liked);
assert.deepEqual(app.calls,[first.audio],'cold favorite starts immediately without metadata network');
await tick();
app.playTrack(app.state.playlists[0].songIds[0],app.state.playlists[0].songIds);
assert.equal(app.calls.at(-1),second.audio);
await tick();
assert.deepEqual(Array.from(app.state.queue),[second.id,first.id]);

const freshURL=mediaHost+'/renewed';
app=boot(async path=>{
  if (path.includes('catalog.json')) return {ok:true,json:async()=>({tracks:[first]})};
  return {ok:true,json:async()=>({...first,url:freshURL})};
},[first.audio]);
app.playTrack(first.id);
await tick();
assert.deepEqual(app.calls,[first.audio,freshURL],'expired favorite resolves by ID');
assert.equal(JSON.parse(storage.get(stateKey)).tracks[first.id].playbackUrl,freshURL);

const legacy=JSON.parse(storage.get(stateKey));
delete legacy.tracks[first.id].playbackUrl;
storage.set(stateKey,JSON.stringify(legacy));
let finish;
app=boot(()=>new Promise(resolve=>{finish=resolve;}));
app.playTrack(first.id);
app.playTrack(second.id);
finish({ok:true,json:async()=>({tracks:[first]})});
await tick();
assert.deepEqual(app.calls,[second.audio],'late lookup must not switch away from the selected song');
app.playTrack(first.id);
await tick();
assert.equal(app.calls.at(-1),first.audio,'legacy favorite without a URL recovers from catalogue');
assert.equal(app.state.liked[0],first.id);
// A renewed catalogue entry must win over an expired link in saved favorites.
const currentIndex = mediaHost+'/checked-index';
const neverLive = async path => {
  assert.ok(path.includes('catalog.json'),'fresh index playback should not need live metadata');
  return {ok:true,json:async()=>({tracks:[{...first,audio:currentIndex}]})};
};
app=boot(neverLive);
await app.readCatalogue();
app.playTrack(first.id);
await tick();
assert.deepEqual(app.calls,[currentIndex]);

console.log('Saved replay passed: immediate persistence, cold replay, playlist order, expired URLs, legacy records and rapid selection.');


const net=[];
app=boot(async path=>{
  net.push(path);
  if (path.includes('/lyrics/')) return {ok:true,json:async()=>({[first.id]:'[00:00.00]A\n[00:10.20]B'})};
  throw new Error('live API unavailable');
});
app.playTrack(first.id);
await tick();
await app.loadLyrics(first.id);
assert.equal(app.lines(),2,'lyrics come from the Pages origin with the relay offline');
assert.equal(net.some(path=>path.includes('/api/')),false);
const media=app.node('#audio'),slider=app.node('#seek');
media.duration=210; media.currentTime=12; media.dispatch('loadedmetadata');
app.emit('#seek','pointerdown',{button:0,pointerId:1,clientX:70,preventDefault(){}});
app.emit('#seek','pointermove',{pointerId:1,clientX:140});
media.dispatch('timeupdate');
assert.equal(Number(slider.value),600,'timeupdate must not pull the thumb away from the finger');
assert.equal(media.currentTime,12,'seek only when the finger lifts');
app.emit('#seek','pointerup',{pointerId:1,clientX:140});
assert.equal(media.currentTime,126,'touch release seeks to the selected time');
media.duration=NaN;media.dispatch('durationchange');
assert.equal(slider.disabled,true,'unloaded media must not show a usable slider');
console.log('Lyrics and touch regressions passed.');
