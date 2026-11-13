import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,cpSync,rmSync} from 'node:fs';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root),'utf8');
rmSync(new URL('dist/client',root),{recursive:true,force:true});mkdirSync(new URL('dist/client',root),{recursive:true});
for(const file of ['index.html','mobile.css','mobile.js','catalog.json'])cpSync(new URL('mobile/'+file,root),new URL('dist/client/'+file,root));
writeFileSync(new URL('dist/client/.nojekyll',root),'');
const version = name => createHash('sha256').update(read('mobile/'+name)).digest('hex').slice(0,12);
let page=read('mobile/index.html');
const scriptName='mobile.'+version('mobile.js')+'.js';
const styleName='mobile.'+version('mobile.css')+'.css';
for (const [source,target] of [['mobile.js',scriptName],['mobile.css',styleName]]) {
  cpSync(new URL('mobile/'+source,root),new URL('dist/client/'+target,root));
}
const published = page.replace('./mobile.js"', './'+scriptName+'"')
  .replace('./mobile.css"', './'+styleName+'"');
writeFileSync(new URL('dist/client/index.html',root),published);
page=page.replace(/<link[^>]+href=["'](?:\.\/)?mobile\.css["'][^>]*>/i,()=>'<style>'+read('mobile/mobile.css')+'</style>');
page=page.replace(/<script[^>]+src=["'](?:\.\/)?mobile\.js["'][^>]*>\s*<\/script>/i,()=>'<script type="module">'+read('mobile/mobile.js')+'</script>');
if(/SoundHelix|soundhelix\.com|demo-[123]/i.test(page))throw new Error('Non-Gequhai audio leaked into mobile build');
writeFileSync(new URL('tingyu-poc.html',root),page);
console.log('Built Gequhai-only mobile frontend.');
