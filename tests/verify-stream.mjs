import assert from 'node:assert/strict';
import {verifyStream} from '../scripts/verify-stream.mjs';

const host='https://car-er.kuwo.cn/example';
const bytes=Uint8Array.from([0,0,0,32,102,116,121,112,109,112,52,50,0,0,0,0]);
function response(body=bytes,status=206) {
  return new Response(body,{status,headers:{'Content-Range':'bytes 0-15/2048','Content-Type':'application/octet-stream'}});
}
assert.equal(await verifyStream(host,async(_u,opts)=>{
  assert.equal(opts.headers.Range,'bytes=0-511');
  return response();
}),true,'MP4/M4A containers may use octet-stream');
assert.equal(await verifyStream(host,async()=>response('<html>expired</html>')),false);
assert.equal(await verifyStream(host,async()=>response(bytes,410)),false);
assert.equal(await verifyStream('https://example.com/audio',async()=>{throw Error('unexpected host')}),false);
console.log('Media verification: audio container bytes, range, expired URL, unexpected payload.');
