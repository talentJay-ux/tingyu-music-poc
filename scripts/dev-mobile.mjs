import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {Readable} from 'node:stream';
import api from '../worker/api.mjs';
const mime={'.json':'application/json; charset=utf-8','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8'};
const server=http.createServer(async(req,res)=>{
 const controller=new AbortController();res.on('close',()=>controller.abort());
 try{
  const path=new URL(req.url,'http://localhost').pathname;
  if(path==='/mobile-qa.html'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end('<!doctype html><title>听屿手机验证</title><body style="margin:0;display:grid;place-items:center;height:100vh;background:#ebe9e6"><iframe title="听屿手机视图" src="/" style="width:390px;height:844px;border:0;border-radius:12px;background:#fbf9f6"></iframe>');return;}
  if(path.startsWith('/api/')){
   const request=new Request('http://127.0.0.1:'+server.address().port+req.url,{method:req.method,headers:req.headers,signal:controller.signal});
   const response=await api.fetch(request,{},{});res.writeHead(response.status,Object.fromEntries(response.headers));
   if(!response.body||req.method==='HEAD'){res.end();return;}
   Readable.fromWeb(response.body).on('error',()=>res.destroy()).pipe(res);return;
  }
  const files={'/':'index.html','/index.html':'index.html','/mobile.css':'mobile.css','/mobile.js':'mobile.js'};
  const name=/^\/lyrics\/[0-9a-f]\.json$/.test(path)?path.slice(1):files[path];if(!name){res.writeHead(404);res.end('Not found');return;}
  const body=await readFile(new URL('../mobile/'+name,import.meta.url));const ext=name.slice(name.lastIndexOf('.'));
  res.writeHead(200,{'Content-Type':mime[ext],'Cache-Control':'no-cache'});res.end(body);
 }catch(error){if(!res.headersSent)res.writeHead(502,{'Content-Type':'application/json'});res.end(JSON.stringify({message:'音乐连接失败，请重试。'}));}
});
const port=Number(process.env.PORT||4173);server.listen(port,'0.0.0.0',()=>console.log('Local: http://127.0.0.1:'+port+'/'));
